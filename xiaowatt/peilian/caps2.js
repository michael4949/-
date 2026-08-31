const { chromium } = require('playwright');
const F=require('url').pathToFileURL(require('path').resolve(__dirname,'dist','小瓦特练_倒闸操作陪练舱_高保真原型.html')).href;
const w=(p,ms)=>p.waitForTimeout(ms);
const idle=p=>p.waitForFunction(()=>!DH.speaking,{timeout:20000});
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewportSize:{width:1680,height:950}});
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto(F); await w(p,900);
  await p.evaluate(()=>{window.__DH_MUTE=true;window.__DH_SPEED=0.06;S.trap.armed=false;S.abn.armed=false;});
  await idle(p); await p.screenshot({path:'./shots/e1.png'});
  await p.click('#p_all'); await p.click('#p_go'); await idle(p);
  for(let i=0;i<4;i++){await p.evaluate(i=>wfClick(i),i);await p.waitForFunction(i=>S.wf>i,i,{timeout:20000});await idle(p);}
  await p.waitForFunction(()=>S.stage==='run',{timeout:20000}); await idle(p);
  for(let k=0;k<60;k++){
    const s=await p.evaluate(()=>({n:STEPS[S.idx].no,b:S.beat}));
    if(s.n==='11'&&s.b===4) break;
    await p.evaluate(()=>autoStep()); await idle(p);
  }
  await p.evaluate(()=>goLoc('bay')); await w(p,400);
  await p.screenshot({path:'./shots/e2.png'});           // GIS四指示
  // 异常注入 + 处置支线
  await p.evaluate(()=>{document.querySelector('#dm_abn').click();}); await w(p,500);
  await p.evaluate(()=>clickStop()); await w(p,1400);
  await p.screenshot({path:'./shots/e3.png'});
  await p.evaluate(()=>{const m=document.querySelector('.mask'); if(m) m.remove();});
  // 跑到结束看报告
  await p.evaluate(()=>{S.abn.handled=true;S.gis={hui:1,mech:1,arm:1,line:1};});
  for(let k=0;k<160;k++){
    const s=await p.evaluate(()=>S.stage); if(s==='end')break;
    const has=await p.evaluate(()=>!!document.querySelector('.mask'));
    if(has) break;
    await p.evaluate(()=>autoStep()); await idle(p);
  }
  await w(p,1200); await p.screenshot({path:'./shots/e4.png'});
  console.log('stage',await p.evaluate(()=>S.stage));
  await b.close(); console.log('done');
})();
