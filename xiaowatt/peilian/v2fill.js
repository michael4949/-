const { chromium } = require('playwright');
const F=require('url').pathToFileURL(require('path').resolve(__dirname,'dist','小瓦特练_倒闸操作陪练舱_高保真原型.html')).href;
const w=(p,ms)=>p.waitForTimeout(ms);
const idle=p=>p.waitForFunction(()=>!DH.speaking,{timeout:20000});
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewportSize:{width:1680,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(F+'#arena'); await w(p,900);
  await p.evaluate(()=>{window.__DH_MUTE=true;window.__DH_SPEED=0.06;S.toured=true;});
  await p.click('#en_go'); await idle(p); await w(p,500);
  console.log('stage', await p.evaluate(()=>S.stage), '| pool', await p.evaluate(()=>document.querySelectorAll('[data-fadd]').length));
  await p.screenshot({path:'./shots/fill_empty.png'});
  // 故意写错：漏一项、多一项、顺序颠倒、票头填错
  await p.evaluate(()=>{
    S.fill.head={unit:'深圳地调',from:'李明',to:'陈志远',task:'将110kV仿真站110kV培训三线1163线路由运行转检修'};
    S.fill.rows=['1','2','3','4','6','5','7','12'];   // 漏第8项、5和6颠倒、多写第12项
    renderFill();
  });
  await w(p,200); await p.screenshot({path:'./shots/fill_filled.png'});
  await p.evaluate(()=>auditFill()); await w(p,400);
  const r=await p.evaluate(()=>S.fill.last);
  console.log('score', r.total, '| head', r.hs, 'items', r.ps, 'order', r.os, '| errs', r.errs.length);
  console.log('groups', JSON.stringify([...new Set(r.errs.map(e=>e.g))]));
  console.log('every err has rule+why', r.errs.every(e=>!!e.rule && !!e.why));
  await p.screenshot({path:'./shots/fill_audit.png',fullPage:true});
  await p.click('#f_next'); await idle(p); await w(p,600);
  console.log('after fill stage', await p.evaluate(()=>S.stage), '| score kept', await p.evaluate(()=>S.fill.score));
  await p.screenshot({path:'./shots/fill_prep.png'});
  // 满分路径
  const p2=await b.newPage({viewportSize:{width:1680,height:950}});
  p2.on('pageerror',e=>errs.push(e.message));
  await p2.goto(F+'#arena'); await w(p2,1000);
  await p2.evaluate(()=>{window.__DH_MUTE=true;window.__DH_SPEED=0.06;S.toured=true;});
  await p2.click('#en_go'); await idle(p2); await w(p2,400);
  await p2.evaluate(()=>{
    S.fill.head={unit:'深圳中调',from:'李明',to:'陈志远',task:'将110kV仿真站110kV培训三线1163线路由运行转检修'};
    S.fill.rows=fillRight().map(x=>x.no); renderFill(); auditFill();
  });
  await w(p2,400);
  console.log('perfect', await p2.evaluate(()=>S.fill.last.total), '| errs', await p2.evaluate(()=>S.fill.last.errs.length));
  await p2.screenshot({path:'./shots/fill_ok.png',fullPage:true});
  console.log('ERR', errs.length?errs.join('\n'):'none');
  await b.close();
})();
