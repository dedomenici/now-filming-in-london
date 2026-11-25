// node scripts/shot.js [url] — renders screenshots into ./screenshots-local (dev only)
const { chromium } = require('/workspace/now-filming-tools/node_modules/playwright-core');
(async()=>{
  const url = process.argv[2] || 'http://localhost:8765/';
  const out = process.argv[3] || '/workspace/now-filming';
  const b = await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const errs=[];
  for (const [w,h,name] of [[1280,900,'screenshot.png'],[390,844,'screenshot-mobile.png']]){
    const p = await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:w<500?2:1});
    p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
    await p.goto(url,{waitUntil:'networkidle'}); await p.waitForTimeout(2500);
    await p.screenshot({path:`${out}/${name}`,fullPage:w>500});
    if(w>500){ await p.click('#sched tbody tr'); await p.waitForTimeout(2000); await p.screenshot({path:`${out}/screenshot-card.png`}); }
  }
  console.log('errors:',errs); await b.close();
})();
