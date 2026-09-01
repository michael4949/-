const { chromium } = require('playwright');
const F=require('url').pathToFileURL(require('path').resolve(__dirname,'dist','小瓦特练_倒闸操作陪练舱_高保真原型.html')).href;
const w=(p,ms)=>p.waitForTimeout(ms);
const idle=p=>p.waitForFunction(()=>!DH.speaking,{timeout:20000});
const st=p=>p.evaluate(()=>({stage:S.stage,no:STEPS[S.idx]&&STEPS[S.idx].no,beat:S.beat,vio:S.vio.length}));
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewportSize:{width:1680,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(F+'#arena'); await w(p,1000);
  await p.evaluate(()=>{window.__DH_MUTE=true;window.__DH_SPEED=0.06;S.toured=true;});
  await p.click('#en_go'); await w(p,400);            // 完整票，教学模式
  await p.evaluate(()=>{});
  await idle(p);
  await p.click('#p_all'); await p.click('#p_go'); await idle(p);
  for(let i=0;i<4;i++){await p.evaluate(i=>wfClick(i),i);await p.waitForFunction(i=>S.wf>i,i,{timeout:20000});await idle(p);}
  await w(p,500);
  await p.evaluate(()=>{const g=document.querySelector('#pv_go'); if(g) g.click();}); await idle(p);
  for(let k=0;k<400;k++){
    const s=await st(p); if(s.stage==='end') {console.log('ENDED',k);break;}
    if(await p.evaluate(()=>!!document.querySelector('.mask'))) { await p.evaluate(()=>{const g=document.querySelector('#pv_go'); if(g) g.click();}); await w(p,200); continue; }
    await p.evaluate(()=>autoStep()); await idle(p); await w(p,50);
  }
  console.log('final',JSON.stringify(await st(p)));
  // 教学模式宽容判定：走错间隔一次
  console.log('ERR',errs.length?errs.join('\n'):'none');
  await b.close();
})();
