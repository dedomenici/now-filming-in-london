// "Plan my set-spotting day": builds a movement order from data/shoots.json.
// Rules: only real sightings/schedules; every time that isn't sourced is labelled ESTIMATE.
(function(){
"use strict";
const STARTS = {
  "charing-cross":{name:"Charing Cross (centre of London)",lat:51.5080,lng:-0.1247},
  "oxford-circus":{name:"Oxford Circus",lat:51.5152,lng:-0.1419},
  "kings-cross":{name:"King's Cross St Pancras",lat:51.5308,lng:-0.1238},
  "london-bridge":{name:"London Bridge",lat:51.5049,lng:-0.0863},
  "woolwich":{name:"Woolwich (Elizabeth line)",lat:51.4920,lng:0.0710},
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const toMin = hhmm => { const [h,m]=hhmm.split(":").map(Number); return h*60+m; };
const toHHMM = m => { m=Math.round(m); const h=Math.floor(m/60)%24, mm=m%60; return String(h).padStart(2,"0")+":"+String(mm).padStart(2,"0"); };
const addDays = (d,n) => { const x=new Date(d+"T12:00:00Z"); x.setUTCDate(x.getUTCDate()+n); return x.toISOString().slice(0,10); };
const DOW = d => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(d+"T12:00:00Z").getUTCDay()];
function km(a,b){ const R=6371,r=Math.PI/180; const dl=(b.lat-a.lat)*r, dn=(b.lng-a.lng)*r; const x=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)**2; return 2*R*Math.asin(Math.sqrt(x)); }
// Travel estimate: straight line ×1.3 for streets. Walk ≤1.6 km at 4.8 km/h, else tube/bus at ~20 km/h plus 12 min for stations and waits.
function travel(a,b){ const d=km(a,b)*1.3; if(d<=1.6) return {min:Math.max(3,Math.round(d/4.8*60)),mode:"WALK",km:d}; return {min:Math.round(12+d/20*60),mode:"TUBE/BUS",km:d}; }

function windowFor(s,l,date){
  const ct=l.call_time||{};
  if(ct.start && ct.end && (!ct.date || ct.date===date)) return {start:toMin(ct.start),end:toMin(ct.end==="23:59"?"23:59":ct.end),label:`${ct.start}–${ct.end}`,basis:"REPORTED",src:ct.source_url,note:ct.note};
  if(l.night) return {start:toMin("18:00"),end:toMin("23:00"),label:"18:00–23:00",basis:"ESTIMATE",note:"An evening/night shoot was seen here before."+(ct.note?" "+ct.note:"")};
  if(l.kind==="unit_base") return {start:toMin("06:00"),end:toMin("11:00"),label:"06:00–11:00",basis:"ESTIMATE",note:"Unit bases are busiest early: crew call ~07:00, cast trailers and catering."};
  const th=s.typical_hours||{start:"08:00",end:"18:00"};
  return {start:toMin(th.start),end:toMin(th.end),label:`${th.start}–${th.end}`,basis:"ESTIMATE",note:(ct.note?ct.note+" ":"")+"Typical London location day (crew call ~07:00, shooting ~08:00–18:00).",src:th.source_url};
}

function candidates(DATA,date,recentDays){
  const out=[], standby=[];
  DATA.shoots.forEach(s=>{
    if(s.visitable===false) return;
    if(s.status==="wrapped") return;
    if((s.typical_hours?.days_off||[]).includes(DOW(date))) return;
    let any=false;
    (s.locations||[]).forEach(l=>{
      let why=null, conf=null;
      if(Array.isArray(l.schedule_dates)){
        if(l.schedule_dates.includes(date)){ why="SCHEDULED"; }
        else return;
      } else if(/^\d{4}-\d{2}-\d{2}$/.test(l.date||"") && l.date<=date && l.date>=addDays(date,-recentDays) && ["filming","recent"].includes(s.status)){
        why="RECENT";
      } else return;
      const w=windowFor(s,l,date);
      if(why==="SCHEDULED") conf = w.basis==="REPORTED" ? "HIGH" : "MEDIUM";
      else conf="LOW";
      any=true;
      out.push({s,l,why,conf,w});
    });
    if(!any && ["filming"].includes(s.status) && s.confidence!=="low") standby.push(s);
  });
  return {cands:out,standby};
}

function plan(DATA,opts){
  const {date,start,startTime,hours,maxStops,recentDays}=opts;
  const {cands,standby}=candidates(DATA,date,recentDays);
  const endT=toMin(startTime)+hours*60;
  let t=toMin(startTime), pos=start, left=cands.slice(), stops=[];
  while(left.length && stops.length<maxStops){
    let best=null;
    left.forEach((c,i)=>{
      const tr=travel(pos,c.l); const arr=t+tr.min; const dwell=c.conf==="HIGH"?45:30;
      const begin=Math.max(arr,c.w.start); const leave=begin+dwell;
      if(leave>c.w.end || leave>endT) return;
      const score=begin + (c.why==="SCHEDULED"?-25:0) + (c.conf==="LOW"?15:0);
      if(!best||score<best.score) best={i,c,tr,arr,begin,leave,dwell,score};
    });
    if(!best) break;
    stops.push(best); t=best.leave; pos=best.c.l; left.splice(best.i,1);
    // don't visit the same production twice in a row at near-identical spots
    left=left.filter(c=>!(c.s.id===best.c.s.id && km(c.l,best.c.l)<0.3));
  }
  const skipped=left.filter(c=>!stops.some(st=>st.c===c));
  return {stops,standby,skipped,endT};
}

function people(s){
  const cast=s.cast||[], crew=s.crew||[];
  if(!cast.length && !crew.length) return `<i>${esc(s.cast_note||"Unknown production, so cast and crew are unknown.")}</i>`;
  const chip=p=>`<a href="${esc(p.source_url)}" target="_blank" rel="noopener" class="pp ${p.status}" title="${esc(p.status)}. Open source">${esc(p.name)}${p.role?` <small>(${esc(p.role)})</small>`:""}<sup>${p.status==="confirmed"?"✔":"?"}</sup></a>`;
  return `${cast.length?`<div><b>CAST:</b> ${cast.map(chip).join(" ")}</div>`:""}${crew.length?`<div><b>CREW:</b> ${crew.map(chip).join(" ")}</div>`:""}`;
}

function textVersion(res,opts){
  const L=[`NOW FILMING IN LONDON — MOVEMENT ORDER`,`${opts.date} (${DOW(opts.date)}) · from ${opts.start.name} at ${opts.startTime} · ${opts.hours}h`,``];
  res.stops.forEach((st,i)=>{ const s=st.c.s,l=st.c.l;
    L.push(`${i+1}. ${toHHMM(st.begin)}–${toHHMM(st.leave)}  ${l.name} — ${s.title}`);
    L.push(`   Travel: ~${st.tr.min} min ${st.tr.mode} (estimate). Window ${st.c.w.label} (${st.c.w.basis}). Confidence ${st.c.conf}.`);
    const ppl=[...(s.cast||[]),...(s.crew||[])].map(p=>`${p.name}${p.status==="reported"?" (reported)":""}`);
    L.push(`   Look out for: ${ppl.length?ppl.join(", "):"unknown"}`);
  });
  if(!res.stops.length) L.push("No sourced sightings for that date. Try another date or include more recent days.");
  L.push("",`Times marked ESTIMATE are guesses from typical shoot hours, not published schedules. Keep your distance, no flash, be nice to residents.`);
  return L.join("\n");
}

window.NFIL_ITIN = {addDays, STARTS,plan,people,textVersion,toHHMM,DOW,esc};
})();
