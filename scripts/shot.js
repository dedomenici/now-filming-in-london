// node scripts/shot.js [baseUrl] [outdir] — headless screenshots (dev only)
const { chromium } = require('/workspace/now-filming-tools/node_modules/playwright-core');
(async()=>{
  const url = process.argv[2] || 'http://localhost:8765/';
  const out = process.argv[3] || '/workspace/now-filming';
  const b = await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const errs=[];
  const hook=p=>{p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});};
  // desktop home + card
  let p = await b.newPage({viewport:{width:1280,height:900}}); hook(p);
  await p.goto(url,{waitUntil:'networkidle'}); await p.waitForTimeout(2500);
  await p.screenshot({path:`${out}/screenshot.png`,fullPage:true});
  await p.click('#sched tbody tr'); await p.waitForTimeout(2000); await p.screenshot({path:`${out}/screenshot-card.png`});
  // popup
  await p.keyboard.press('Escape'); await p.goto(url,{waitUntil:'networkidle'}); await p.waitForTimeout(1500);
  const mk = await p.$$('.leaflet-marker-icon[title^="C.L.A.Y"], .leaflet-marker-icon[title*="Queens"]'); if(mk.length){ await mk[0].click({force:true}); await p.waitForTimeout(1500); await p.locator('#map').screenshot({path:`${out}/screenshot-popup.png`}); }
  // itinerary desktop via button, then 27 Nov
  await p.click('#planBtn'); await p.waitForTimeout(800);
  await p.fill('#pDate','2026-11-27'); await p.click('#pGo'); await p.waitForTimeout(2500);
  const top = await p.$eval('#map', e=>e.getBoundingClientRect().top + window.scrollY);
  const bottom = await p.$eval('#planSec', e=>e.getBoundingClientRect().bottom + window.scrollY);
  await p.screenshot({path:`${out}/screenshot-itinerary.png`,fullPage:true,clip:{x:0,y:top-40,width:1280,height:bottom-top+50}});
  console.log('URL after plan:', p.url());
  // mobile home + itinerary
  const m = await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2}); hook(m);
  await m.goto(url,{waitUntil:'networkidle'}); await m.waitForTimeout(2000);
  await m.screenshot({path:`${out}/screenshot-mobile.png`});
  await m.goto(url+'?plan=1&d=2026-11-27&s=charing-cross&t=09:00&h=8&n=5&r=7',{waitUntil:'networkidle'}); await m.waitForTimeout(2500);
  await m.screenshot({path:`${out}/screenshot-itinerary-mobile.png`,fullPage:false});
  console.log('errors:',errs); await b.close();
})();
