const { chromium } = require('playwright');
const F=require('url').pathToFileURL(require('path').resolve(__dirname,'dist','小瓦特练_倒闸操作陪练舱_高保真原型.html')).href;
const st = p => p.evaluate(()=>({stage:S.stage,idx:S.idx,no:STEPS[S.idx]&&STEPS[S.idx].no,beat:S.beat,vio:S.vio.length,wf:S.wf,sp:DH.speaking}));
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewportSize:{width:1680,height:950}});
  const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text().slice(0,180));});
  await p.goto(F+'#arena'); await p.waitForTimeout(1200);
  await p.evaluate(()=>{window.__DH_MUTE=true;window.__DH_SPEED=0.08;S.trap.armed=false;S.abn.armed=false;S.toured=true;S.mode='drill';S.previewed={1:1,2:1,3:1};});
  await p.screenshot({path:'./shots/s1.png'});
  await p.click('#p_all'); await p.waitForTimeout(300);
  await p.screenshot({path:'./shots/s2.png'});
  await p.click('#p_go');
  await p.waitForFunction(()=>S.stage==='wufang'&&!DH.speaking,{timeout:20000});
  await p.screenshot({path:'./shots/s3.png'});
  for(let i=0;i<4;i++){
    await p.evaluate(i=>wfClick(i),i);
    await p.waitForFunction(i=>S.wf>i&&!DH.speaking,i,{timeout:25000});
  }
  await p.waitForFunction(()=>S.stage==='run',{timeout:25000});
  await p.waitForTimeout(400);
  await p.screenshot({path:'./shots/s4.png'});
  console.log('run start',JSON.stringify(await st(p)));
  let guard=0;
  while(guard++<900){
    const s=await st(p);
    if(s.stage==='end')  {console.log('ENDED guard',guard);break;}
    if(s.sp){await p.waitForTimeout(120);continue;}
    const hasMask=await p.evaluate(()=>!!document.querySelector('.mask'));
    if(hasMask){console.log('MASK at step',s.no,'beat',s.beat);break;}
    await p.evaluate(()=>autoStep());
    await p.waitForTimeout(260);
    if(guard%20===0)console.log(guard,JSON.stringify(await st(p)));
  }
  await p.waitForTimeout(500);
  await p.screenshot({path:'./shots/s5.png'});
  console.log('final',JSON.stringify(await st(p)));
  console.log('vio',await p.evaluate(()=>JSON.stringify(S.vio.map(v=>v.step+':'+v.title))));
  console.log('ERRORS:',errs.length?errs.slice(0,10).join('\n'):'none');
  await b.close();
})();
