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
  await idle(p);
  await p.click('#p_all'); await p.click('#p_go'); await idle(p);
  for(let i=0;i<4;i++){await p.evaluate(i=>wfClick(i),i);await p.waitForFunction(i=>S.wf>i,i,{timeout:20000});await idle(p);}
  await w(p,900);
  await p.screenshot({path:'./shots/g_preview.png'});     // 阶段预习卡
  await p.evaluate(()=>{const m=document.querySelector('#pv_go'); if(m) m.click();});
  await w(p,1600);
  await p.screenshot({path:'./shots/g_tour.png'});        // 界面导览
  await p.evaluate(()=>{const s=document.querySelector('#tr_skip'); if(s) s.click();});
  await idle(p); await w(p,500);
  // 走到第5项，展示任务指令条 + 知识点卡
  for(let k=0;k<40;k++){
    const s=await p.evaluate(()=>({n:STEPS[S.idx].no,b:S.beat}));
    if(s.n==='5'&&s.b===1) break;
    await p.evaluate(()=>autoStep()); await idle(p);
  }
  await p.evaluate(()=>goLoc('hmi')); await w(p,500);
  await p.screenshot({path:'./shots/g_task.png'});
  // 提示
  await p.evaluate(()=>useHint()); await idle(p);
  await p.evaluate(()=>useHint()); await idle(p); await w(p,400);
  await p.screenshot({path:'./shots/g_hint.png'});
  // 知识地图
  await p.evaluate(()=>openKnow('yandian')); await w(p,600);
  await p.screenshot({path:'./shots/g_know.png'});
  await b.close(); console.log('done');
})();
