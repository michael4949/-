const { chromium } = require('playwright');
const F=require('url').pathToFileURL(require('path').resolve(__dirname,'dist','小瓦特练_倒闸操作陪练舱_高保真原型.html')).href;
const w=(p,ms)=>p.waitForTimeout(ms);
const idle=p=>p.waitForFunction(()=>!DH.speaking,{timeout:20000});
const st=p=>p.evaluate(()=>({stage:S.stage,no:STEPS[S.idx]&&STEPS[S.idx].no,beat:S.beat,vio:S.vio.length,loc:S.loc,sheet:!document.querySelector('#sheet').classList.contains('closed')}));
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewportSize:{width:1680,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(F+'#arena'); await w(p,1000);
  await p.evaluate(()=>{window.__DH_MUTE=true;window.__DH_SPEED=0.06;S.toured=true;});
  // 选择"分段·冷备用→检修"，教学模式
  await p.click('input[name=plan][value=p3]');
  await p.click('#en_go'); await w(p,600);
  await p.evaluate(()=>{S.trap.armed=false;S.abn.armed=false;});
  // 预习卡
  await p.screenshot({path:'./shots/v2_preview.png'});
  await p.evaluate(()=>{const g=document.querySelector('#pv_go'); if(g) g.click();});
  await idle(p); await w(p,600);
  console.log('after entry', JSON.stringify(await st(p)));
  await p.screenshot({path:'./shots/v2_arena.png'});
  // 走到第20项 beat3
  for(let k=0;k<80;k++){
    const s=await st(p); if(s.stage==='end') break;
    if(s.no==='20'&&s.beat===3) break;
    if(await p.evaluate(()=>!!document.querySelector('.mask'))) { console.log('mask at',JSON.stringify(s)); break; }
    await p.evaluate(()=>autoStep()); await idle(p); await w(p,80);
  }
  console.log('at20', JSON.stringify(await st(p)));
  await p.screenshot({path:'./shots/v2_cab.png'});
  // 问教练
  await p.evaluate(()=>askCoach()); await w(p,300);
  await p.evaluate(()=>{document.querySelector('#ask_in').value='为什么要先验电再接地';document.querySelector('#ask_go').click();});
  await w(p,900); await p.screenshot({path:'./shots/v2_ask.png'});
  await p.evaluate(()=>{const m=document.querySelector('.mask'); if(m) m.remove();});
  // 跑完
  for(let k=0;k<120;k++){
    const s=await st(p); if(s.stage==='end') break;
    if(await p.evaluate(()=>!!document.querySelector('.mask'))) break;
    await p.evaluate(()=>autoStep()); await idle(p); await w(p,60);
  }
  await w(p,1500);
  console.log('final', JSON.stringify(await st(p)));
  await p.screenshot({path:'./shots/v2_report.png'});
  console.log('ERR', errs.length?errs.join('\n'):'none');
  await b.close();
})();
