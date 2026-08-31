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
  await idle(p); await p.screenshot({path:'./shots/d1.png'});
  await p.click('#p_all'); await p.click('#p_go'); await idle(p);
  for(let i=0;i<4;i++){await p.evaluate(i=>wfClick(i),i);await p.waitForFunction(i=>S.wf>i,i,{timeout:20000});await idle(p);}
  await p.waitForFunction(()=>S.stage==='run',{timeout:20000}); await idle(p);
  await p.screenshot({path:'./shots/d2.png'});
  // 手动推进到第5项 beat3（监控后台，已发令）
  for(let k=0;k<50;k++){
    const s=await p.evaluate(()=>({n:STEPS[S.idx].no,b:S.beat}));
    if(s.n==='5'&&s.b===3) break;
    await p.evaluate(()=>autoStep()); await idle(p); await w(p,60);
  }
  await p.evaluate(()=>goLoc('hmi')); await w(p,400);
  await p.screenshot({path:'./shots/d3.png'});
  console.log('at', JSON.stringify(await p.evaluate(()=>({n:STEPS[S.idx].no,b:S.beat,loc:S.loc}))));
  // 就地控制柜
  await p.evaluate(()=>{S.dev.CB1163='open';S.dev.DS11634='open';S.dev.DS11632='open';S.verify={v1:true,v2:true};goLoc('cab');});
  await w(p,400); await p.screenshot({path:'./shots/d4.png'});
  // 红线弹层
  await p.evaluate(()=>{S.verify={v1:false,v2:false};});
  await p.evaluate(()=>document.querySelector('#dm_red').click());
  await w(p,2600); await p.screenshot({path:'./shots/d5.png'});
  await b.close(); console.log('done');
})();
