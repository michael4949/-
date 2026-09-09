const { chromium } = require('playwright');
const F=require('url').pathToFileURL(require('path').resolve(__dirname,'dist','小瓦特练_倒闸操作陪练舱_高保真原型.html')).href;
const w=(p,ms)=>p.waitForTimeout(ms);
const idle=p=>p.waitForFunction(()=>!DH.speaking,{timeout:20000});
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewportSize:{width:1680,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(F+'#arena'); await w(p,900);
  await p.evaluate(()=>{window.__DH_MUTE=true;window.__DH_SPEED=0.06;S.toured=true;S.filled=true;});
  await p.click('#en_go'); await w(p,500);
  await p.evaluate(()=>{S.trap.armed=false;S.abn.armed=false;});
  await p.evaluate(()=>{S.prep.audit=[1,1,1];S.prep.dress=[1,1,1];S.prep.mind=1;S.prep.risks=S.prep.risks.map(()=>true);renderPrep();enterWufang();});
  await idle(p); await p.evaluate(()=>{S.wf=4;renderPanel();startRun();}); await idle(p); await w(p,400);
  await p.evaluate(()=>{const g=document.querySelector('#pv_go'); if(g) g.click();}); await idle(p); await w(p,400);
  // 遍历每一类动作，各开一次示范
  const kinds={};
  for(let k=0;k<160;k++){
    const s=await p.evaluate(()=>({stage:S.stage,no:STEPS[S.idx]&&STEPS[S.idx].no,act:STEPS[S.idx]&&STEPS[S.idx].act,beat:S.beat}));
    if(s.stage!=='run') break;
    if(s.beat===1&&!kinds[s.act]){
      kinds[s.act]=await p.evaluate(()=>{openDemo();return demoKind(STEP());});
      await w(p,260);
      const n=await p.evaluate(()=>document.querySelectorAll('.dms').length);
      const cap=await p.evaluate(()=>document.querySelector('#dmcap b')?.textContent);
      const svg=await p.evaluate(()=>document.querySelector('#dmsvg').innerHTML.length);
      console.log('demo', s.no, s.act, '→', kinds[s.act], '| steps', n, '| cap', cap, '| svg', svg);
      if(s.no==='14') await p.screenshot({path:'./shots/demo_knob.png'});
      if(s.no==='20') await p.screenshot({path:'./shots/demo_close.png'});
      if(s.no==='1')  await p.screenshot({path:'./shots/demo_phone.png'});
      // 逐步走完
      for(let z=0;z<3;z++){ await p.evaluate(()=>{const b=document.querySelector('#dm_next'); if(b&&!b.disabled) b.click();}); await w(p,120); }
      await p.evaluate(()=>{const b=document.querySelector('#dm_close'); if(b) b.click();});
      await w(p,150);
    }
    if(await p.evaluate(()=>!!document.querySelector('#pv_go'))) { await p.evaluate(()=>document.querySelector('#pv_go').click()); await idle(p); await w(p,200); continue; }
    if(await p.evaluate(()=>!!document.querySelector('.mask'))) { console.log('mask stuck at',JSON.stringify(s)); break; }
    await p.evaluate(()=>autoStep()); await idle(p); await w(p,60);
  }
  console.log('kinds covered', JSON.stringify(kinds));
  console.log('final', await p.evaluate(()=>({stage:S.stage,vio:S.vio.length})));
  console.log('ERR', errs.length?errs.join('\n'):'none');
  await b.close();
})();
