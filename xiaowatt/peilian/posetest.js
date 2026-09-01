const { chromium } = require('playwright');
const F=require('url').pathToFileURL(require('path').resolve(__dirname,'dist','小瓦特练_倒闸操作陪练舱_高保真原型.html')).href;
const POSES=['idle','call','confirm','point','explain','stop','correct','listen'];
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewportSize:{width:400,height:820}});
  await p.goto(F+'#arena'); await p.waitForTimeout(900);
  await p.evaluate(()=>{window.__DH_MUTE=true;DH.stopSpeak();
    document.querySelector('#sync').style.display='none';
    document.querySelector('.rolecard').style.display='none';
    document.querySelector('.sub').style.display='none';
    document.querySelector('.stage-tag').style.display='none';});
  for(const g of POSES){
    await p.evaluate(g=>{DH.setPose(g);},g);
    await p.waitForTimeout(1400);
    await p.locator('.stage').screenshot({path:'./shots/pose_'+g+'.png'});
  }
  await b.close(); console.log('done');
})();
