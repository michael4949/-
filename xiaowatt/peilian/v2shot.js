const { chromium } = require('playwright');
const F=require('url').pathToFileURL(require('path').resolve(__dirname,'dist','小瓦特练_倒闸操作陪练舱_高保真原型.html')).href;
const w=(p,ms)=>p.waitForTimeout(ms);
const idle=p=>p.waitForFunction(()=>!DH.speaking,{timeout:20000});
const st=p=>p.evaluate(()=>({stage:S.stage,no:STEPS[S.idx]&&STEPS[S.idx].no,beat:S.beat}));
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewportSize:{width:1680,height:950}});
  await p.goto(F); await w(p,1000);
  await p.evaluate(()=>{window.__DH_MUTE=true;window.__DH_SPEED=0.06;S.toured=true;});
  await p.click('input[name=plan][value=p2]'); await p.click('#en_go'); await w(p,400);
  await p.evaluate(()=>{S.trap.armed=false;S.abn.armed=false;});
  await p.evaluate(()=>{const g=document.querySelector('#pv_go'); if(g) g.click();}); await idle(p);
  for(let k=0;k<60;k++){ const s=await st(p); if(s.no==='10'&&s.beat===1) break; await p.evaluate(()=>autoStep()); await idle(p); await w(p,50); }
  // 收起抽屉展示对练居中
  await p.evaluate(()=>{Sheet.manual='closed';Sheet.close();}); await w(p,500);
  await p.screenshot({path:'./shots/v2_dialog.png'});
  await p.evaluate(()=>{Sheet.manual=null;Sheet.sync();}); await w(p,500);
  await p.screenshot({path:'./shots/v2_hmi.png'});
  await b.close(); console.log('ok');
})();
