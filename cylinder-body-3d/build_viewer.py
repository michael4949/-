"""
Assemble a SINGLE self-contained interactive HTML viewer:
  three.js (r128) + OrbitControls + GLTFLoader inlined, model embedded as
  base64 GLB.  Works fully offline (no network / CDN needed).
  Features: free orbit, zoom, pan, auto-rotate, live section clipping.
Run:  python build_viewer.py   ->  cylinder_body_viewer.html
"""
import base64, pathlib

three = pathlib.Path("/tmp/three/three.min.js").read_text()
orbit = pathlib.Path("/tmp/three/OrbitControls.js").read_text()
gltf  = pathlib.Path("/tmp/three/GLTFLoader.js").read_text()
glb   = base64.b64encode(pathlib.Path("cylinder_body.glb").read_bytes()).decode()

for name, code in [("three", three), ("orbit", orbit), ("gltf", gltf)]:
    assert "</script>" not in code, f"{name} contains literal </script>"

HTML = r"""<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<title>气缸体 3D 交互查看器 · Cylinder body S1-2505</title>
<style>
  html,body{margin:0;height:100%;overflow:hidden;font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;}
  #app{position:fixed;inset:0;background:radial-gradient(circle at 50% 38%,#2a3340 0%,#12161c 72%);}
  canvas{display:block;}
  .title{position:fixed;top:0;left:0;right:0;padding:12px 18px;color:#e8edf3;
    background:linear-gradient(#0e1116cc,#0e111600);pointer-events:none;z-index:5;}
  .title h1{margin:0;font-size:15px;font-weight:600;}
  .title p{margin:2px 0 0;font-size:11px;color:#9fb0c2;}
  .panel{position:fixed;left:14px;bottom:14px;z-index:6;display:flex;flex-direction:column;gap:8px;
    background:#161d27e6;border:1px solid #2b3645;border-radius:12px;padding:12px;backdrop-filter:blur(6px);width:230px;}
  .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
  .panel button{flex:1;min-width:60px;background:#1e2735;color:#cdd8e4;border:1px solid #33414f;
    border-radius:8px;padding:7px 6px;font-size:12px;cursor:pointer;}
  .panel button:hover{background:#28344599;}
  .panel button.on{background:#2f6df0;border-color:#2f6df0;color:#fff;}
  .lab{color:#8fa0b3;font-size:11px;margin:2px 0 -2px;}
  input[type=range]{width:100%;accent-color:#2f6df0;}
  .seg button{padding:6px 4px;font-size:11px;}
  .hint{position:fixed;right:14px;bottom:14px;z-index:6;font-size:11px;
    color:#8094a8;background:#161d27c0;border:1px solid #2b3645;border-radius:8px;padding:8px 10px;max-width:220px;}
  #spin{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#9fb0c2;font-size:14px;z-index:7;}
</style>
</head>
<body>
<div id="app"></div>
<div class="title">
  <h1>气缸体 / Cylinder body — 图号 S1-2505 · 材料 ZG08Cr19Ni9</h1>
  <p>八角形铸造气缸体（含内部水腔/气腔）· 包络 ≈ 900 × 825 × 827 mm · 体积 ≈ 0.125 m³</p>
</div>
<div id="spin">正在载入三维模型…</div>

<div class="panel">
  <div class="row">
    <button id="btnSpin" class="on">⟳ 自动旋转</button>
    <button id="btnReset">⟲ 复位视角</button>
  </div>
  <div class="row">
    <button id="btnWire">线框</button>
    <button id="btnGrid" class="on">网格</button>
  </div>
  <div class="lab">剖切轴 Section axis</div>
  <div class="row seg">
    <button data-ax="off" class="on">关</button>
    <button data-ax="x">X</button>
    <button data-ax="y">Y</button>
    <button data-ax="z">Z</button>
  </div>
  <div class="lab">剖切位置 Section position</div>
  <input id="cut" type="range" min="0" max="100" value="50" disabled>
</div>
<div class="hint">拖动 = 旋转 · 滚轮/双指 = 缩放 · 右键拖动 = 平移<br>选 X/Y/Z 后拖动滑块可实时剖切，查看内部腔体。</div>

<script>__THREE__</script>
<script>__ORBIT__</script>
<script>__GLTF__</script>
<script>
const GLB_B64="__GLB__";
function b64buf(b){const s=atob(b),n=s.length,a=new Uint8Array(n);for(let i=0;i<n;i++)a[i]=s.charCodeAt(i);return a.buffer;}

const app=document.getElementById('app');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.localClippingEnabled=true;
renderer.outputEncoding=THREE.sRGBEncoding;
app.appendChild(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(42,window.innerWidth/window.innerHeight,1,20000);

scene.add(new THREE.HemisphereLight(0xdfe8f5,0x2a2f38,0.95));
function dir(x,y,z,i){const l=new THREE.DirectionalLight(0xffffff,i);l.position.set(x,y,z);scene.add(l);}
dir(700,900,800,0.9); dir(-800,400,-300,0.45); dir(0,-600,400,0.25);

const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=0.08;
controls.autoRotate=true;controls.autoRotateSpeed=1.4;
controls.minDistance=600;controls.maxDistance=8000;

const plane=new THREE.Plane(new THREE.Vector3(1,0,0),1e6);
let model=null,grid=null,radius=600,curAx='off',wire=false;

const loader=new THREE.GLTFLoader();
loader.parse(b64buf(GLB_B64),'',function(g){
  model=g.scene;
  const box=new THREE.Box3().setFromObject(model);
  const c=box.getCenter(new THREE.Vector3());
  model.position.sub(c);                         // centre at origin
  const size=box.getSize(new THREE.Vector3());radius=size.length()/2;
  const mat=new THREE.MeshPhongMaterial({color:0x9aa4b0,specular:0x2a313a,shininess:26,
       side:THREE.DoubleSide,flatShading:true,clippingPlanes:[],clipShadows:true});
  model.traverse(o=>{if(o.isMesh){if(!o.geometry.attributes.normal)o.geometry.computeVertexNormals();o.material=mat;}});
  scene.add(model);
  grid=new THREE.GridHelper(Math.ceil(radius*4/100)*100,40,0x3a4656,0x232c38);
  grid.position.y=-size.y/2-10;scene.add(grid);
  resetView();
  document.getElementById('spin').style.display='none';
},function(e){document.getElementById('spin').textContent='载入失败：'+e;});

function resetView(){
  const d=radius/Math.sin(THREE.MathUtils.degToRad(camera.fov)/2)*1.15;
  camera.position.set(d*0.62,d*0.5,d*0.78);camera.lookAt(0,0,0);
  controls.target.set(0,0,0);controls.update();
}

// ---- UI ----
const $=id=>document.getElementById(id);
$('btnSpin').onclick=function(){controls.autoRotate=!controls.autoRotate;this.classList.toggle('on',controls.autoRotate);};
$('btnReset').onclick=resetView;
$('btnWire').onclick=function(){wire=!wire;this.classList.toggle('on',wire);if(model)model.traverse(o=>{if(o.isMesh)o.material.wireframe=wire;});};
$('btnGrid').onclick=function(){if(grid){grid.visible=!grid.visible;this.classList.toggle('on',grid.visible);}};

const AX={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
document.querySelectorAll('.seg button').forEach(b=>b.onclick=function(){
  document.querySelectorAll('.seg button').forEach(x=>x.classList.remove('on'));
  this.classList.add('on');curAx=this.dataset.ax;
  const cut=$('cut');
  if(curAx==='off'){cut.disabled=true;if(model)model.traverse(o=>{if(o.isMesh)o.material.clippingPlanes=[];});}
  else{cut.disabled=false;plane.normal.set(...AX[curAx]);applyCut();
       if(model)model.traverse(o=>{if(o.isMesh)o.material.clippingPlanes=[plane];});}
});
function applyCut(){const t=($('cut').value/100)*2-1;plane.constant=-t*radius*1.05;}
$('cut').oninput=applyCut;

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
(function loop(){requestAnimationFrame(loop);controls.update();renderer.render(scene,camera);})();
</script>
</body>
</html>"""

HTML = (HTML.replace("__THREE__", three).replace("__ORBIT__", orbit)
            .replace("__GLTF__", gltf).replace("__GLB__", glb))
pathlib.Path("cylinder_body_viewer.html").write_text(HTML)
print("wrote cylinder_body_viewer.html  (%.2f MB)" % (len(HTML)/1e6))
