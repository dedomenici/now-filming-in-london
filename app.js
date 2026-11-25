(function(){
"use strict";
const I = window.NFIL_ICONS;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const LAUNCH = "2026-11-25";
const londonToday = () => new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London"}).format(new Date());
const fmtD = d => { if(!d) return "—"; if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; const x=new Date(d+"T12:00:00Z"); return x.toLocaleDateString("en-GB",{day:"numeric",month:"short",timeZone:"UTC"}).toUpperCase(); };
const confRank = {high:0,medium:1,low:2};
let DATA, map, layer, routeLayer, markersById = {};
function timingOf(s,l){
  const ct=l.call_time||{};
  if(ct.start&&ct.end) return {txt:`${ct.start}–${ct.end}`,basis:"reported",note:ct.note||""};
  if(l.night) return {txt:"evening/night",basis:"est.",note:ct.note||"Seen shooting after dark."};
  if(l.kind==="unit_base") return {txt:"06:00–11:00 busiest",basis:"est.",note:"Unit bases: crew call ~07:00."};
  const th=s.typical_hours||{start:"08:00",end:"18:00"};
  return {txt:`${th.start}–${th.end}`,basis:"est.",note:ct.note||""};
}
function datesOf(l){ return (l.schedule_dates&&l.schedule_dates.length)? l.schedule_dates.map(fmtD).join(", ") : fmtD(l.date); }
function timingHTML(s,l){ const t=timingOf(s,l); return `<span class="lbl ${t.basis==="reported"?"rep":"est"}">${t.basis==="reported"?"REPORTED":"EST."} ${esc(t.txt)}</span> <small>${esc(datesOf(l))}</small>`; }
function smallImgs(s,n){ return (s.images||[]).filter(i=>!i.large).slice(0,n); }
function thumbHTML(i,w,h){ return `<a href="${esc(i.link)}" target="_blank" rel="noopener" title="📷 ${esc(i.credit)}: ${esc(i.caption)}"><img src="${esc(i.thumb)}" alt="${esc(i.caption)}" loading="lazy" referrerpolicy="no-referrer" width="${w}" height="${h}" style="object-fit:cover;width:${w}px;height:${h}px;border:1.5px solid #111" onerror="this.style.display='none'"></a>`; }

const CREW = [
 ["PRODUCTION","Producer","Richard DeDomenici","07:00"],
 ["PRODUCTION","Executive Producers","Everyone who posts on r/whatsfilminginlondon","ON CALL"],
 ["LOCATIONS","Location Manager","Reddit · X · local papers · trade press (the sources)","06:00"],
 ["LOCATIONS","Location Scout","You, with a phone, on the way to Tesco","ANY TIME"],
 ["LOCATIONS","Unit Base Manager","The Winnebago markers","05:30"],
 ["CAMERA","Director of Photography","OpenStreetMap contributors (base map)","07:00"],
 ["CAMERA","Focus Puller","Leaflet.js (zoom, pan, pull focus)","07:00"],
 ["ELECTRICAL","Gaffer","Open-Meteo (weather, sunrise, sunset)","06:30"],
 ["ELECTRICAL","Spark","Film-light markers (sets lighting up soon)","06:30"],
 ["GRIP","Key Grip","GitHub Pages (holds the whole rig up)","07:00"],
 ["ART","Props: Signage","Lamppost arrows (hand-drawn SVG)","07:00"],
 ["ART","Props: Clapperboards","One per set. Mind your fingers.","07:00"],
 ["ADs","1st AD","The daily refresh routine","08:00 DAILY"],
 ["ADs","2nd AD","digest.py (writes tomorrow's call sheet)","08:05"],
 ["ADs","Runner","GoatCounter (counts who turned up)","ALL DAY"],
 ["SCRIPT","Script Supervisor","Continuity: every entry dated & sourced","ALWAYS"],
 ["SECURITY","Set Security","\"Honestly mate, I don't know what it is\"","ALL DAY"],
 ["CATERING","Craft Services","Tea, two sugars, Greggs","10:30"],
 ["POST","Research & Assembly","Grok Bot","WRAP"],
];

function codeOf(s){ return (s.signage?.[0]?.text || s.working_title || (s.codenames||[])[0] || "LOC").replace(/\(.*?\)/g,"").trim().split(/[\s\/]+/).slice(0,2).join(" ").toUpperCase().slice(0,9); }
function iconFor(s, l){
  const today = londonToday();
  let html, size, anchor;
  if (l.kind === "unit_base"){ html = I.winnebago(); size=[44,30]; anchor=[22,28]; }
  else if (l.kind === "signage"){ html = I.arrow(codeOf(s), s.id.startsWith("unknown")||s.confidence==="low" ? "#ff8ac4" : "#ffd400"); size=[70,25]; anchor=[4,12]; }
  else if (l.date && /^\d{4}-\d{2}-\d{2}$/.test(l.date) && l.date >= today){ html = I.light(); size=[38,38]; anchor=[16,36]; }
  else { const f = s.type==="tv" ? "#8b1a1a" : s.type==="film" ? "#111" : "#666"; html = I.clapper(f, s.confidence==="low" ? "#ff8ac4" : "#fff"); size=[36,36]; anchor=[18,34]; }
  if (l.approx) html += `<span class="approx">≈</span>`;
  return L.divIcon({className:"nf-pin "+s.confidence, html, iconSize:size, iconAnchor:anchor, popupAnchor:[0,-anchor[1]+4]});
}

function legend(){
  $("#legend").innerHTML = [
    [I.clapper("#111","#fff"),"FILM SET"],[I.clapper("#8b1a1a","#fff"),"TV SET"],[I.clapper("#666","#ff8ac4"),"UNIDENTIFIED"],
    [I.light(),"SET-UP / UPCOMING"],[I.arrow("LOC"),"LAMPPOST ARROW"],[I.winnebago(),"UNIT BASE / TRAILERS"]
  ].map(([s,t])=>`<span><i>${s}</i>${t}</span>`).join("") + `<span><b>≈</b> APPROX PIN</span>`;
}

function initMap(){
  map = L.map("map",{zoomControl:true,scrollWheelZoom:false}).setView([51.515,-0.11],12);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,className:"nf-tiles",attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  map.on("click",()=>map.scrollWheelZoom.enable());
  layer = L.layerGroup().addTo(map);
}

function filtered(){
  const t=$("#fType").value,b=$("#fBorough").value,d=$("#fDate").value,c=$("#fConf").value,live=$("#fLive").checked;
  return DATA.shoots.filter(s=>{
    if(t && s.type!==t) return false;
    if(c && s.confidence!==c) return false;
    if(live && !["filming","wrapping"].includes(s.status)) return false;
    if(b && !(s.locations||[]).some(l=>l.borough===b)) return false;
    if(d){ const ds=[s.dates?.last_seen,...(s.dates?.expected||[]),...(s.locations||[]).map(l=>l.date)].filter(x=>/^\d{4}-\d{2}/.test(x||"")); if(!ds.some(x=>x>=d)) return false; }
    return true;
  });
}

function render(){
  const list = filtered();
  layer.clearLayers(); markersById = {};
  const pts=[];
  list.forEach(s=>(s.locations||[]).forEach(l=>{
    const m=L.marker([l.lat,l.lng],{icon:iconFor(s,l),title:s.title,riseOnHover:true}).addTo(layer);
    const im=smallImgs(s,3);
    m.bindPopup(`<div class="pop"><b>${esc(s.title)}</b><br>${esc(l.name)}<br><small>${esc(l.kind.replace("_"," ").toUpperCase())} · ${s.confidence.toUpperCase()}</small><div>${timingHTML(s,l)}</div>${im.length?`<div class="popimgs">${im.map(i=>thumbHTML(i,74,56)).join("")}</div><small class="cred">📷 ${esc([...new Set(im.map(i=>i.credit))].join(", "))}</small><br>`:""}<button type="button" data-open="${esc(s.id)}" data-goat="marker-card" data-goat-title="${esc(s.title)}">OPEN CALL SHEET CARD</button></div>`);
    (markersById[s.id] ||= []).push(m);
    if(l.borough!=="outside London") pts.push([l.lat,l.lng]);
  }));
  $("#mapcount").textContent = `${list.length} PRODUCTIONS · ${pts.length} PINS IN TOWN`;
  // schedule
  const latest = s => [...(s.locations||[]).map(l=>l.date),...(s.dates?.expected||[])].filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x||"")).sort().pop() || "0";
  const rows = list.slice().sort((a,b)=>latest(b).localeCompare(latest(a)) || (confRank[a.confidence]-confRank[b.confidence]));
  $("#sched tbody").innerHTML = rows.map((s,i)=>{
    const l=(s.locations||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
    const codes=[...new Set([...(s.signage||[]).map(x=>x.text),...(s.codenames||[])].map(c=>c.replace(/\(.*?\)/g,"").replace(/['"]/g,"").trim()))].filter(c=>c && c.length<=14).slice(0,3);
    return `<tr data-open="${esc(s.id)}" data-goat="row-card" data-goat-title="${esc(s.title)}">
      <td class="sc">${i+1}</td>
      <td class="thumbcell">${(()=>{const im=smallImgs(s,1)[0]; const nAll=(s.images||[]).length; return im?`<img src="${esc(im.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode('📷'))"><small>📷 ${nAll} · ${esc(im.credit)}</small>`:`<span class="noimg">${window.NFIL_ICONS.clapper("#ddd","#fff")}</span><small>NO PHOTO YET</small>`;})()}</td>
      <td data-l="TITLE"><span class="t">${esc(s.title)}</span>${s.working_title?`<div class="wt">W/T: ${esc(s.working_title)}</div>`:""}<span class="status ${s.status}">${esc((s.status||"").toUpperCase())}</span></td>
      <td data-l="TYPE">${esc((s.type||"").toUpperCase())}</td>
      <td data-l="SET">${l.length?esc(l[0].name)+(l.length>1?` <small>+${l.length-1} more</small>`:"")+`<div>${timingHTML(s,l[0])}</div>`:"<i>LOCATION TBC</i>"+`<div><span class="lbl est">EST. ${esc((s.typical_hours||{start:"08:00"}).start)}–${esc((s.typical_hours||{end:"18:00"}).end)}</span></div>`}</td>
      <td data-l="BOROUGH">${esc([...new Set(l.map(x=>x.borough))].join(", ")||"—")}</td>
      <td data-l="DATES">${fmtD(s.dates?.first_seen)} → ${fmtD(s.dates?.last_seen)}${(s.dates?.expected||[]).length?`<br><small>NEXT: ${s.dates.expected.map(fmtD).join(", ")}</small>`:""}</td>
      <td data-l="SIGNAGE">${codes.map(c=>`<span class="code">${esc(c)}</span>`).join("")||"—"}</td>
      <td data-l="CONF"><span class="conf ${s.confidence}">${s.confidence.toUpperCase()}</span></td></tr>`;
  }).join("") || `<tr><td colspan="9">Nothing on the call sheet for those filters. Have a biscuit.</td></tr>`;
}

function statics(){
  const all = DATA.shoots;
  // arrows
  const sg = all.flatMap(s=>(s.signage||[]).filter(x=>x.text && !x.text.startsWith("(")).map(x=>({...x,s})));
  sg.sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  $("#arrows").innerHTML = sg.map(x=>{ const pink=/pink/i.test(x.colour||""); const t=x.text.replace(/\(.*?\)/g,"").trim().toUpperCase();
    return `<div class="arrow" data-open="${esc(x.s.id)}" data-goat="arrow" data-goat-title="${esc(t)}" title="${esc(x.s.title)}">${I.arrow(t.slice(0,12), pink?"#ff8ac4":"#ffd400")}<div>${esc(x.where)} · ${fmtD(x.date)}</div></div>`; }).join("");
  // bases
  const bases = all.flatMap(s=>(s.locations||[]).filter(l=>l.kind==="unit_base").map(l=>({l,s})));
  $("#bases tbody").innerHTML = bases.map(({l,s})=>`<tr data-open="${esc(s.id)}" style="cursor:pointer"><td>${I.winnebago()}</td><td>${esc(l.name)}<br><small>${esc(l.note||"")}</small></td><td>${esc(s.title)}</td><td>${fmtD(l.date)}</td></tr>`).join("") || `<tr><td colspan=4>No bases spotted. Trailers are hiding.</td></tr>`;
  $("#parking").innerHTML = all.filter(s=>s.parking_notes).map(s=>`<li data-open="${esc(s.id)}" style="cursor:pointer"><b>${esc(s.title)}:</b> ${esc(s.parking_notes)}</li>`).join("");
  // crew
  $("#crew tbody").innerHTML = CREW.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("");
  // boroughs
  const bs=[...new Set(all.flatMap(s=>(s.locations||[]).map(l=>l.borough)))].sort();
  $("#fBorough").innerHTML = `<option value="">ALL</option>`+bs.map(b=>`<option>${esc(b)}</option>`).join("");
  // sources
  $("#srcs").innerHTML = "SOURCES CHECKED THIS ROUND: " + (DATA.sources_checked||[]).map(x=>`${esc(x.name)} <i>(${esc(x.status)})</i>`).join(" · ");
  // header
  const upd = new Date(DATA.last_updated);
  $("#updated").textContent = upd.toLocaleString("en-GB",{timeZone:"Europe/London",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).toUpperCase()+" LONDON";
  const today = londonToday();
  const dayN = Math.max(1, Math.round((new Date(today)-new Date(LAUNCH))/864e5)+1);
  $("#dayline").textContent = `DAY ${dayN} OF ∞`;
  $("#dateline").textContent = new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Europe/London"}).toUpperCase();
  const now = new Date().toLocaleTimeString("en-GB",{timeZone:"Europe/London",hour:"2-digit",minute:"2-digit"});
  $("#calltime").textContent = `07:00 · (IT'S ${now} IN LONDON)`;
}

function openCard(id){
  const s = DATA.shoots.find(x=>x.id===id); if(!s) return;
  const n = DATA.shoots.indexOf(s)+1;
  const imgs=s.images||[];
  const photos = imgs.length ? `<div class="photos">${imgs.map(p=>`<figure><a href="${esc(p.link)}" target="_blank" rel="noopener"><img src="${esc(p.thumb)}" alt="${esc(p.caption)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('figure').innerHTML='<div class=nophoto>Photo unavailable. <a href=&quot;${esc(p.link)}&quot; target=_blank>See it at the source →</a></div>'"></a><figcaption>${esc(p.caption)}${p.date?` · ${fmtD(p.date)}`:""}<br>📷 ${esc(p.credit)} · <a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.platform||"source")}</a>${p.large?" · full-size":""}</figcaption></figure>`).join("")}</div>`
    : `<div class="nophoto">No crowdsourced photo yet. Any agency set photos stay with their owners, so we link out rather than copy them. ${s.references?.[0]?`<a href="${esc(s.references[0].url)}" target="_blank" rel="noopener">See the source →</a>`:""}</div>`;
  $("#cardBody").innerHTML = `
   <div class="ch"><div class="slate">SC. ${n} · ${esc((s.type||"").toUpperCase())} · ${esc((s.status||"").toUpperCase())} · CONFIDENCE ${esc(s.confidence.toUpperCase())}</div><h2 id="cardTitle">${esc(s.title)}</h2></div>
   <div class="cgrid">
     <div><span>WORKING TITLE / CODENAME</span>${esc([s.working_title,...(s.codenames||[])].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(" · ")||"none known")}</div>
     <div><span>PRODUCTION CO. / STUDIO</span>${esc(s.company||"unknown")}</div>
     <div><span>TIMINGS</span>${(s.locations||[]).length?timingHTML(s,(s.locations||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""))[0]):`<span class="lbl est">EST. ${esc((s.typical_hours||{start:"08:00"}).start)}–${esc((s.typical_hours||{end:"18:00"}).end)}</span>`}${s.typical_hours?.note?`<br><small>${esc(s.typical_hours.note)}</small>`:""}</div>
     <div><span>DATES</span>First seen ${fmtD(s.dates?.first_seen)} · last ${fmtD(s.dates?.last_seen)}${(s.dates?.expected||[]).length?` · next ${s.dates.expected.map(fmtD).join(", ")}`:""}</div>
   </div>
   <div class="csec"><p>${esc(s.summary)}</p>
   <h3>LOOK OUT FOR <small>(✔ confirmed attached · ? reported; attached ≠ on set that day)</small></h3><div class="lookout">${window.NFIL_ITIN.people(s)}</div>
   <h3>CROWDSOURCED PHOTOS (${imgs.length})</h3>${photos}
   <h3>LOCATIONS</h3><ul class="locs">${(s.locations||[]).map((l,i)=>`<li><a href="#" data-fly="${esc(s.id)}|${i}">${esc(l.name)}</a>${l.approx?" ≈":""} (${esc(l.borough)}) · ${esc(l.kind.replace("_"," "))} · ${timingHTML(s,l)}${l.note?` · ${esc(l.note)}`:""}</li>`).join("")||"<li>Location TBC: no street sightings published yet.</li>"}</ul>
   <h3>SIGNAGE</h3>${(s.signage||[]).length?`<ul class="locs">${s.signage.map(x=>`<li><span class="code" style="background:${/pink/i.test(x.colour)?"#ff8ac4":"#ffd400"};border:1px solid #111;padding:0 6px;font-weight:900;font-family:Arial Black,Arial">${esc(x.text)}</span> ${esc(x.colour)} · ${esc(x.where)} · ${fmtD(x.date)} · via ${esc(x.source)}</li>`).join("")}</ul>`:"<p>No lamppost arrows reported. Keep your eyes up.</p>"}
   ${s.parking_notes?`<h3>PARKING / RESIDENT LETTERS</h3><p>${esc(s.parking_notes)}</p>`:""}
   <h3>REFERENCES</h3><ol class="refs">${(s.references||[]).map(r=>`<li><a href="${esc(r.url)}" target="_blank" rel="noopener" data-goat="ref" data-goat-title="${esc(r.publisher)}">${esc(r.title)}</a>. <i>${esc(r.publisher)}</i>, ${esc(r.date)}</li>`).join("")}</ol>
   </div>`;
  $("#card").hidden=false; document.body.style.overflow="hidden";
  if(location.hash!=="#"+id) history.replaceState(null,"","#"+id);
}
function closeCard(){ $("#card").hidden=true; document.body.style.overflow=""; history.replaceState(null,"",location.pathname+location.search); }

document.addEventListener("click",e=>{
  const fly=e.target.closest("[data-fly]");
  if(fly){ e.preventDefault(); const [id,i]=fly.dataset.fly.split("|"); const s=DATA.shoots.find(x=>x.id===id); const l=s.locations[+i]; closeCard(); $("#map").scrollIntoView({behavior:"smooth"}); map.flyTo([l.lat,l.lng],16); return; }
  const o=e.target.closest("[data-open]"); const a=e.target.closest("a"); if(o && (!a || a===o)){ if(a) e.preventDefault(); openCard(o.dataset.open); }
});
$("#cardClose").addEventListener("click",closeCard);
$("#card").addEventListener("click",e=>{ if(e.target.id==="card") closeCard(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape" && !$("#card").hidden) closeCard(); });
["#fType","#fBorough","#fDate","#fConf","#fLive"].forEach(s=>$(s).addEventListener("change",render));
$("#fReset").addEventListener("click",()=>{["#fType","#fBorough","#fDate","#fConf"].forEach(s=>$(s).value="");$("#fLive").checked=false;render();});


// ---------- ITINERARY ("Plan my set-spotting day") ----------
const IT = window.NFIL_ITIN;
let geoStart=null, lastPlan=null, lastOpts=null;
function setupPlanForm(){
  $("#pStart").innerHTML = Object.entries(IT.STARTS).map(([k,v])=>`<option value="${k}">${esc(v.name.toUpperCase())}</option>`).join("")+`<option value="geo">📍 USE MY LOCATION</option>`;
  $("#pDate").value = londonToday();
  $("#pStart").addEventListener("change",()=>{ if($("#pStart").value==="geo") locate(); });
}
function locate(cb){
  if(!navigator.geolocation){ $("#pMsg").textContent="No geolocation in this browser, so starting from Charing Cross."; $("#pStart").value="charing-cross"; return; }
  $("#pMsg").textContent="Finding you…";
  navigator.geolocation.getCurrentPosition(p=>{ geoStart={name:"Your location",lat:+p.coords.latitude.toFixed(4),lng:+p.coords.longitude.toFixed(4)}; $("#pMsg").textContent="Got you. Hit ACTION!"; cb&&cb(); },
    ()=>{ $("#pMsg").textContent="Couldn't get your location, so starting from Charing Cross."; $("#pStart").value="charing-cross"; cb&&cb(); },{timeout:10000});
}
function openPlan(){ $("#planSec").hidden=false; $("#planSec").scrollIntoView({behavior:"smooth"}); }
function readOpts(){
  const sv=$("#pStart").value;
  let start = sv==="geo" ? (geoStart||IT.STARTS["charing-cross"]) : sv.startsWith("@") ? null : IT.STARTS[sv];
  return {date:$("#pDate").value||londonToday(), startKey:sv, start, startTime:$("#pTime").value||"09:00", hours:+$("#pHours").value, maxStops:+$("#pStops").value, recentDays:+$("#pRecent").value};
}
function generate(){
  const o=readOpts(); const res=IT.plan(DATA,o); lastPlan=res; lastOpts=o;
  const dlabel=new Date(o.date+"T12:00:00Z").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}).toUpperCase();
  let h=`<div class="planhead"><b>MOVEMENT ORDER · ${esc(dlabel)}</b><br>UNIT CALL ${esc(o.startTime)} at <b>${esc(o.start.name)}</b> · ${o.hours}H AVAILABLE · ${res.stops.length} STOP${res.stops.length===1?"":"S"}</div>`;
  if(res.stops.length){
    h+=`<div class="tablewrap"><table class="mo"><thead><tr><th>#</th><th>ARR–LEAVE</th><th>SET / LOCATION</th><th>PRODUCTION</th><th>WINDOW &amp; CONFIDENCE</th></tr></thead><tbody>`;
    res.stops.forEach((st,i)=>{ const s=st.c.s,l=st.c.l,w=st.c.w;
      const wait = st.begin>st.arr ? ` <small>(arrive ${IT.toHHMM(st.arr)}, wait for the window)</small>`:"";
      h+=`<tr class="tv"><td></td><td colspan="4">🚶 ${i?"FROM STOP "+i:"FROM UNIT CALL"}: ~${st.tr.min} MIN ${st.tr.mode} (${st.tr.km.toFixed(1)} KM) <span class="lbl est">ESTIMATE</span></td></tr>`;
      const im=(s.images||[]).filter(x=>!x.large).slice(0,2);
      h+=`<tr class="stop"><td class="n">${i+1}</td>
        <td><span class="tm">${IT.toHHMM(st.begin)}–${IT.toHHMM(st.leave)}</span>${wait}<br><span class="lbl est">PLANNED (ESTIMATE)</span></td>
        <td><b>${esc(l.name)}</b>${l.approx?" ≈":""}<br><small>${esc(l.borough)} · ${esc(l.kind.replace("_"," "))}${l.note?` · ${esc(l.note)}`:""}</small>${im.length?`<div class="popimgs">${im.map(x=>`<a href="${esc(x.link)}" target="_blank" rel="noopener"><img src="${esc(x.thumb)}" loading="lazy" referrerpolicy="no-referrer" style="width:64px;height:48px;object-fit:cover;border:1px solid #111" alt=""></a>`).join("")}</div>`:""}</td>
        <td><a href="#" data-open="${esc(s.id)}"><b>${esc(s.title)}</b></a>${(s.codenames||[]).length?`<br><small>CODE: ${esc(s.codenames[0])}</small>`:""}</td>
        <td><span class="lbl ${w.basis==="REPORTED"?"rep":"est"}">${w.basis==="REPORTED"?"REPORTED":"EST."} ${esc(w.label)}</span>${w.src?` <a href="${esc(w.src)}" target="_blank" rel="noopener"><small>source</small></a>`:""}<br><span class="lbl ${st.c.conf}">${st.c.conf}: ${st.c.why==="SCHEDULED"?"date "+(w.basis==="REPORTED"?"& hours reported":"reported, hours estimated"):"seen in the last "+o.recentDays+" days, may have moved"}</span>${w.note?`<br><small>${esc(w.note)}</small>`:""}</td></tr>
        <tr><td></td><td colspan="4"><div class="lookout"><b>LOOK OUT FOR:</b> ${IT.people(s)}<br><small>✔ = confirmed attached to the production, ? = reported. Being attached doesn't mean they're on set that day.</small></div></td></tr>`;
    });
    h+=`</tbody></table></div>`;
    const last=res.stops[res.stops.length-1]; h+=`<div class="planhead">WRAP ≈ ${IT.toHHMM(last.leave)} (ESTIMATE). Travel times are straight-line × 1.3 at walking pace or about 20 km/h by tube/bus, plus 12 min for stations. They're rough; check TfL for real routes.</div>`;
  } else {
    h+=`<div class="planhead">🎬 <b>NO SOURCED SETS FOR THIS DATE.</b> Nothing has a published schedule or a recent sighting for ${esc(dlabel)} within your hours. Try another date, more hours, or include more recent days. We don't make sets up.</div>`;
  }
  if(res.skipped.length) h+=`<div class="planhead"><small>DIDN'T FIT: ${res.skipped.map(c=>esc(c.l.name)+" ("+esc(c.w.label)+")").join("; ")}</small></div>`;
  if(res.standby.length){
    h+=`<div class="bhead sub">STANDBY: SHOOTING IN LONDON, STREET UNKNOWN (KEEP EYES PEELED)</div><ul class="standby">${res.standby.map(s=>`<li><a href="#" data-open="${esc(s.id)}"><b>${esc(s.title)}</b></a> · last dated source ${fmtD(s.dates?.last_seen)} · watch for: ${esc((s.cast||[]).slice(0,4).map(p=>p.name).join(", ")||"unknown")}</li>`).join("")}</ul>`;
  }
  $("#planOut").innerHTML=h;
  map.closePopup(); drawRoute(res,o);
  const q=new URLSearchParams({plan:1,d:o.date,s:o.startKey==="geo"&&geoStart?`@${geoStart.lat},${geoStart.lng}`:o.startKey,t:o.startTime,h:o.hours,n:o.maxStops,r:o.recentDays});
  history.replaceState(null,"","?"+q.toString());
  window.__gcTrack && window.__gcTrack("plan-built-"+res.stops.length,"Itinerary built");
}
function drawRoute(res,o){
  if(routeLayer) routeLayer.remove(); routeLayer=L.layerGroup().addTo(map);
  const pts=[[o.start.lat,o.start.lng],...res.stops.map(st=>[st.c.l.lat,st.c.l.lng])];
  L.marker(pts[0],{icon:L.divIcon({className:"nf-start",html:"UNIT CALL",iconAnchor:[28,10]})}).addTo(routeLayer);
  if(pts.length>1){
    L.polyline(pts,{color:"#111",weight:5,opacity:.85}).addTo(routeLayer);
    L.polyline(pts,{color:"#ffd400",weight:2.5,dashArray:"8 8"}).addTo(routeLayer);
    res.stops.forEach((st,i)=>L.marker([st.c.l.lat,st.c.l.lng],{icon:L.divIcon({className:"nf-num",html:String(i+1),iconSize:[26,26],iconAnchor:[13,13]}),zIndexOffset:1000}).bindTooltip(`${i+1}. ${IT.toHHMM(st.begin)} ${st.c.l.name}`).addTo(routeLayer));
    map.fitBounds(pts,{padding:[40,40],maxZoom:14});
  }
}
function applyParams(){
  const q=new URLSearchParams(location.search); if(!q.get("plan")) return false;
  if(q.get("d")) $("#pDate").value=q.get("d");
  const sk=q.get("s")||"charing-cross";
  if(sk.startsWith("@")){ const [a,b]=sk.slice(1).split(",").map(Number); if(isFinite(a)&&isFinite(b)){ geoStart={name:"Shared start point",lat:a,lng:b}; $("#pStart").value="geo"; } }
  else if(IT.STARTS[sk]) $("#pStart").value=sk;
  if(q.get("t")) $("#pTime").value=q.get("t");
  [["h","#pHours"],["n","#pStops"],["r","#pRecent"]].forEach(([k,sel])=>{ const v=q.get(k); if(v && [...$(sel).options].some(o=>o.value===v||o.text===v)) $(sel).value=v; });
  openPlan(); generate(); return true;
}
["#planBtn","#planBtn2"].forEach(b=>$(b).addEventListener("click",e=>{ e.stopPropagation(); openPlan(); if(!lastPlan) generate(); }));
$("#pGo").addEventListener("click",()=>{ if($("#pStart").value==="geo" && !geoStart) locate(generate); else generate(); });
$("#pPrint").addEventListener("click",()=>{ document.body.classList.add("printplan"); window.print(); setTimeout(()=>document.body.classList.remove("printplan"),500); });
$("#pCopy").addEventListener("click",async()=>{ if(!lastPlan) generate(); const t=IT.textVersion(lastPlan,lastOpts)+"\n"+location.href; try{ await navigator.clipboard.writeText(t); $("#pMsg").textContent="Copied. Paste it wherever you like."; }catch(e){ $("#pMsg").textContent="Clipboard blocked. Select the schedule text instead."; } });
$("#pShare").addEventListener("click",async()=>{ if(!lastPlan) generate(); const url=location.href; if(navigator.share){ try{ await navigator.share({title:"My set-spotting day: Now Filming in London",url}); return; }catch(e){} } try{ await navigator.clipboard.writeText(url); $("#pMsg").textContent="Link copied: "+url; }catch(e){ $("#pMsg").textContent=url; } });

async function weather(){
  try{
    const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=51.5072&longitude=-0.1276&current=temperature_2m,weather_code,wind_speed_10m&daily=sunrise,sunset,precipitation_probability_max&timezone=Europe%2FLondon&forecast_days=1");
    const w = await r.json();
    const code = w.current.weather_code;
    const txt = code===0?"CLEAR":code<=3?"CLOUDY":code<=48?"FOG":code<=67?"RAIN":code<=77?"SNOW (REAL, NOT FAKE)":code<=82?"SHOWERS":"STORMS";
    $("#weather").textContent = `${txt}, ${Math.round(w.current.temperature_2m)}°C · WIND ${Math.round(w.current.wind_speed_10m)} KM/H · RAIN ${w.daily.precipitation_probability_max[0]}%`;
    $("#sun").textContent = `${w.daily.sunrise[0].slice(11)} / ${w.daily.sunset[0].slice(11)}`;
  }catch(e){ $("#weather").textContent="LOOK OUT OF THE WINDOW"; }
}

fetch("data/shoots.json",{cache:"no-cache"}).then(r=>r.json()).then(d=>{
  DATA=d; legend(); initMap(); statics(); render(); setupPlanForm();
  const pts = DATA.shoots.flatMap(s=>(s.locations||[]).filter(l=>l.borough!=="outside London").map(l=>[l.lat,l.lng]));
  if(pts.length) map.fitBounds(pts,{padding:[30,30],maxZoom:13});
  const planned = applyParams();
  if(!planned && location.hash.length>1) openCard(decodeURIComponent(location.hash.slice(1)));
});
weather();
})();
