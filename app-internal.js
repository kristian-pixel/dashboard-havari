
const INTERNAL_PASSWORD = "dsrs2026";
const dk = new Intl.NumberFormat('da-DK');
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const median=a=>{if(!a.length)return null;let s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2};
const fmtMin=v=>v==null?'–':`${Math.round(v)} min.`;

const RESPONSE_CATEGORIES = ['Assistance', 'Forebyggende SAR', 'Alarm SAR'];
const isResponseCategory = r => RESPONSE_CATEGORIES.includes(String(r.category || '').trim());
function responseRecords(records){ return records.filter(isResponseCategory); }
function callHourEntries(records){
  const hours = Array.from({length:24}, (_,h)=>[String(h).padStart(2,'0'),0]);
  records.forEach(r=>{
    const mins = parseTimeMinutes(r.alarm_time);
    if(mins == null) return;
    const h = Math.floor(mins / 60);
    if(h >= 0 && h < 24) hours[h][1]++;
  });
  return hours;
}


function parseTimeMinutes(t){
  if(!t) return null;
  const m=String(t).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if(!m) return null;
  const h=Number(m[1]), min=Number(m[2]), sec=Number(m[3]||0);
  if(h>23||min>59||sec>59) return null;
  return h*60 + min + sec/60;
}
function diffClockMinutes(start,end){
  const a=parseTimeMinutes(start), b=parseTimeMinutes(end);
  if(a==null||b==null) return null;
  let d=b-a;
  if(d<0) d+=24*60;
  return d;
}
function withCalculatedTimes(records){
  return records.map(r=>{
    const response=diffClockMinutes(r.alarm_time,r.departure_time);
    const assistance=diffClockMinutes(r.departure_time,r.home_time);
    return {...r,
      response_min_calc: response ?? r.response_min ?? null,
      assistance_min_calc: assistance ?? r.assistance_min ?? null
    };
  });
}
const respMin=r=>r.response_min_calc ?? r.response_min ?? null;
const assistMin=r=>r.assistance_min_calc ?? r.assistance_min ?? null;
const byCount=(arr,key)=>arr.reduce((m,r)=>{let k=key(r)||'Ukendt';m[k]=(m[k]||0)+1;return m},{});
const sortedEntries=o=>Object.entries(o).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'da'));
const monthName=m=>{ if(!m) return '–'; const [y,mo]=m.split('-'); return `${mo}/${y}`; };
function renderChart(charts,id,type,entries,label,opts={}){const ctx=document.getElementById(id);if(!ctx)return;if(charts[id])charts[id].destroy();charts[id]=new Chart(ctx,{type,data:{labels:entries.map(e=>e[0]),datasets:[{label,data:entries.map(e=>e[1]),tension:.25}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==='doughnut'||opts.legend}},scales:type==='doughnut'?{}:{y:{beginAtZero:true,ticks:{precision:0}}}}});}
function fillSelect(id,values,label='Alle'){const el=document.getElementById(id);el.innerHTML=`<option value="">${label}</option>`+[...values].filter(Boolean).sort().map(v=>`<option>${v}</option>`).join('');}
function getFilters(){return {y:document.getElementById('yearFilter')?.value||'',qt:document.getElementById('quarterFilter')?.value||'',from:document.getElementById('dateFrom')?.value||'',to:document.getElementById('dateTo')?.value||'',st:document.getElementById('stationFilter')?.value||'',ca:document.getElementById('causeFilter')?.value||'',q:(document.getElementById('searchBox')?.value||'').toLowerCase()};}
function recordQuarter(r){const m=parseInt((r.month||r.date||'').slice(5,7),10);return Math.ceil(m/3);}
function applyFilterTo(raw){const {y,qt,from,to,st,ca,q}=getFilters();return raw.filter(r=>(!y||String(r.year)===y)&&(!qt||String(recordQuarter(r))===qt)&&(!from||(r.date||'')>=from)&&(!to||(r.date||'')<=to)&&(!st||r.station===st)&&(!ca||r.cause===ca)&&(!q||(`${r.date} ${r.month} ${r.station} ${r.cause} ${r.vagtcentral||''} ${r.category||''} ${r.title||''}`).toLowerCase().includes(q)));}
function setupFilterControls(raw, onChange){fillSelect('yearFilter',new Set(raw.map(r=>r.year)),'Alle år');fillSelect('stationFilter',new Set(raw.map(r=>r.station)),'Alle stationer');fillSelect('causeFilter',new Set(raw.map(r=>r.cause)),'Alle årsager');['yearFilter','quarterFilter','dateFrom','dateTo','stationFilter','causeFilter','searchBox'].forEach(id=>{const el=document.getElementById(id); if(el) el.oninput=onChange; if(el) el.onchange=onChange;});document.getElementById('resetBtn').onclick=()=>{['yearFilter','quarterFilter','dateFrom','dateTo','stationFilter','causeFilter','searchBox'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});onChange();};}
function validGeo(records){return records.filter(r=>Number(r.lat)&&Number(r.lon)).sort((a,b)=>(a.date||'').localeCompare(b.date||''));}
function dayNight(r){return DSRSWeather.dayNightInfo(r).label.toLowerCase();}
function nightOpacity(r){return DSRSWeather.dayNightInfo(r).overlay;}
function weatherLabel(r){return DSRSWeather.cachedLabel(r);}
function updateWeatherBadgeForRecord(r){return DSRSWeather.updateBadge(document.getElementById('weatherBadge'), r);}

function setNightEffect(r){
  const overlay=document.getElementById('nightOverlay');
  const info=DSRSWeather.dayNightInfo(r);
  const op=Number(info.overlay||0);
  if(overlay) overlay.style.opacity = op ? Math.min(.92, op) : 0;
  const wrap = overlay?.closest('.mapWrap');
  if(wrap){ wrap.classList.toggle('nightActive', op >= .6); wrap.classList.toggle('twilightActive', op > .05 && op < .6); }
  if(map && map.getPane('tilePane')){
    const pane=map.getPane('tilePane');
    pane.style.filter = op ? `brightness(${Math.max(.36, 1 - op*.82)}) saturate(${Math.max(.45, 1 - op*.36)}) contrast(${1 + op*.18})` : '';
  }
  if(map && map.getContainer()) map.getContainer().classList.toggle('nightMap', op > .1);
}
function clearRescueRoute(){
  if(typeof boatTimer!=='undefined' && boatTimer){ cancelAnimationFrame(boatTimer); boatTimer=null; }
  [typeof boatMarker!=='undefined'?boatMarker:null, typeof stationMarker!=='undefined'?stationMarker:null, typeof routeLine!=='undefined'?routeLine:null].forEach(x=>{ if(x && map) map.removeLayer(x); });
  boatMarker=null; stationMarker=null; routeLine=null;
}
function lerp(a,b,t){ return a + (b-a)*t; }
function boatIcon(html='🚤'){
  return L.divIcon({className:'boatIcon',html,iconSize:[30,30],iconAnchor:[15,15]});
}
function stationIcon(st){
  const isGhost = (st?.icon === '👻') || /Årø/i.test(st?.name||'');
  return L.divIcon({className:'stationHouseIcon' + (isGhost ? ' ghost' : ''),html:isGhost?'👻':'🏠',iconSize:[30,30],iconAnchor:[15,15]});
}
function showRescueRoute(r){
  clearRescueRoute();
  if(!r || !Number(r.lat) || !Number(r.lon)) return;
  const st = window.DSRSStations?.lookup(r.station);
  const target=[Number(r.lat), Number(r.lon)];
  if(!st){
    boatMarker=L.marker(target,{icon:boatIcon('🚤')}).addTo(map).bindTooltip('Assistancepunkt');
    return;
  }
  const start=[Number(st.lat), Number(st.lon)];
  stationMarker=L.marker(start,{icon:stationIcon(st)}).addTo(map).bindTooltip(`${st.name}<br>${st.address}`);
  routeLine=L.polyline([start,target],{color:'#ff6a00',weight:3,opacity:.9,dashArray:'7 8',className:'rescueRoute'}).addTo(map);
  boatMarker=L.marker(start,{icon:boatIcon('🚤')}).addTo(map).bindTooltip(`${st.name} → assistance`);
  const startTime=performance.now();
  const duration=900;
  const step=(now)=>{
    const t=Math.min(1,(now-startTime)/duration);
    const eased=1-Math.pow(1-t,3);
    boatMarker.setLatLng([lerp(start[0],target[0],eased), lerp(start[1],target[1],eased)]);
    if(t<1) boatTimer=requestAnimationFrame(step);
  };
  boatTimer=requestAnimationFrame(step);
}


let raw=[],filtered=[],charts={},map,markers=[],stationMarkers=[],boatMarker=null,stationMarker=null,routeLine=null,boatTimer=null,playTimer=null,currentStep=0;
function unlock(){const ok=sessionStorage.getItem('dsrsOpsAccess')==='yes'||prompt('Indtast intern adgangskode')===INTERNAL_PASSWORD;if(!ok){document.getElementById('lock').classList.remove('hidden');document.getElementById('app').classList.add('hidden');return false;}sessionStorage.setItem('dsrsOpsAccess','yes');document.getElementById('lock').classList.add('hidden');document.getElementById('app').classList.remove('hidden');return true;}
async function init(){if(!unlock())return;const res=await fetch('assets/assistancer-internal.json');raw=withCalculatedTimes((await res.json()).records);setupFilterControls(raw,applyFilters);setupMap();document.getElementById('playBtn').onclick=togglePlay;document.getElementById('timeline').oninput=e=>{currentStep=+e.target.value;renderTimeline();};applyFilters();}
function applyFilters(){filtered=applyFilterTo(raw);updateInternal();resetTimeline();}
function updateInternal(){
  const responseData = responseRecords(filtered);
  const responses = responseData.map(r=>respMin(r)).filter(x=>x!=null);
  const assists = filtered.map(r=>assistMin(r)).filter(x=>x!=null);
  const crew = filtered.map(r=>r.crew_total).filter(x=>x>0);

  document.getElementById('kpiAssists').textContent = dk.format(filtered.length);
  document.getElementById('kpiResponse').textContent = fmtMin(mean(responses));
  document.getElementById('kpiResponseMedian').textContent = fmtMin(median(responses));
  document.getElementById('kpiAssistTime').textContent = fmtMin(mean(assists));
  document.getElementById('kpiCrew').textContent = mean(crew) ? mean(crew).toFixed(1) : '–';
  const responseCount = document.getElementById('kpiResponseCount');
  if(responseCount) responseCount.textContent = dk.format(responses.length);

  let stationCounts = sortedEntries(byCount(filtered,r=>r.station)).slice(0,14);
  renderChart(charts,'stationChart','bar',stationCounts,'Assistancer');

  let monthResp = Object.entries(responseData.reduce((m,r)=>{
    if(respMin(r)!=null){ (m[r.month]=m[r.month]||[]).push(respMin(r)); }
    return m;
  },{})).sort().map(([k,v])=>[monthName(k),Math.round(mean(v))]);
  renderChart(charts,'responseChart','line',monthResp,'Gns. reaktionstid');

  renderChart(charts,'callHourChart','bar',callHourEntries(filtered),'Opkald');

  const q=filtered.flatMap(r=>r.data_quality||[]).reduce((m,x)=>{m[x]=(m[x]||0)+1;return m},{});
  document.getElementById('qualityBox').innerHTML=Object.keys(q).length?sortedEntries(q).map(([k,v])=>`<div class="pill"><strong>${dk.format(v)}</strong><br>${k}</div>`).join(''):'<div class="pill">Ingen åbenlyse dataproblemer i det aktuelle filter.</div>';

  document.querySelector('#latestTable tbody').innerHTML=[...filtered].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,40).map(r=>`<tr><td>${r.date}</td><td>${r.station}</td><td>${r.cause}</td><td>${r.persons??'–'}</td><td>${r.rescuers??'–'}</td><td>${r.crew_total??'–'}</td><td>${fmtMin(respMin(r))}</td><td>${fmtMin(assistMin(r))}</td><td>${r.alarm_time||'–'}</td><td>${r.departure_time||'–'}</td></tr>`).join('')||'<tr><td colspan="10">Ingen data i det valgte filter.</td></tr>';

  document.querySelector('#stationTable tbody').innerHTML=Object.entries(filtered.reduce((m,r)=>{
    const k=r.station||'Ukendt';
    m[k]=m[k]||{n:0,resp:[],assist:[],crew:[]};
    m[k].n++;
    if(isResponseCategory(r) && respMin(r)!=null) m[k].resp.push(respMin(r));
    if(assistMin(r)!=null) m[k].assist.push(assistMin(r));
    if(r.crew_total) m[k].crew.push(r.crew_total);
    return m;
  },{})).sort((a,b)=>b[1].n-a[1].n).map(([st,v])=>`<tr><td>${st}</td><td>${dk.format(v.n)}</td><td>${fmtMin(mean(v.resp))}</td><td>${fmtMin(mean(v.assist))}</td><td>${mean(v.crew)?mean(v.crew).toFixed(1):'–'}</td></tr>`).join('');
}

function addStationMarkers(){
  if(!map || !window.DSRSStations) return;
  stationMarkers.forEach(m=>map.removeLayer(m));
  stationMarkers=[];
  window.DSRSStations.all().forEach(st=>{
    const m=L.marker([st.lat,st.lon],{icon:stationIcon(st),zIndexOffset:2000})
      .addTo(map)
      .bindTooltip(`<strong>${st.name}</strong><br>${st.address}`);
    stationMarkers.push(m);
  });
}

function setupMap(){map=L.map('internalMap').setView([56.05,10.8],7);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(map);addStationMarkers();}
function resetTimeline(){const valid=validGeo(filtered);document.getElementById('timeline').max=Math.max(0,valid.length-1);currentStep=valid.length?valid.length-1:0;document.getElementById('timeline').value=currentStep;renderTimeline();}
function renderTimeline(){markers.forEach(m=>map.removeLayer(m));markers=[];clearRescueRoute();const valid=validGeo(filtered);const shown=valid.slice(0,currentStep+1);shown.forEach((r,i)=>{const marker=L.circleMarker([r.lat,r.lon],{radius:i===shown.length-1?9:5,weight:2,fillOpacity:.65}).bindPopup(`<strong>${r.date} ${r.alarm_time||''}</strong><br>${r.station}<br>${r.cause}<br>Reaktion: ${fmtMin(respMin(r))}<br>Assistancetid: ${fmtMin(assistMin(r))}<br>Besætning: ${r.crew_total??'–'}<br>${weatherLabel(r)}`);marker.addTo(map);markers.push(marker);});const overlay=document.getElementById('nightOverlay');if(shown.length){let last=shown[shown.length-1];document.getElementById('timelineLabel').textContent=`Viser ${shown.length} af ${valid.length} – seneste punkt: ${last.date}, ${last.station}, ${last.cause}`;document.getElementById('weatherBadge').textContent=`${DSRSWeather.dayNightInfo(last).icon} ${DSRSWeather.dayNightInfo(last).label} · ${weatherLabel(last)}`;setNightEffect(last);updateWeatherBadgeForRecord(last);showRescueRoute(last);}else{document.getElementById('timelineLabel').textContent='Ingen punkter i dette filter.';document.getElementById('weatherBadge').textContent='Vejrdata hentes automatisk ved valgt punkt';overlay.style.opacity=0; const wrap=overlay.closest('.mapWrap'); if(wrap){wrap.classList.remove('nightActive','twilightActive');} if(map&&map.getPane('tilePane'))map.getPane('tilePane').style.filter='';}}
function togglePlay(){const btn=document.getElementById('playBtn');if(playTimer){clearInterval(playTimer);playTimer=null;btn.textContent='▶ Afspil';return;}currentStep=0;document.getElementById('timeline').value=0;btn.textContent='⏸ Pause';playTimer=setInterval(()=>{const max=+document.getElementById('timeline').max;if(currentStep>=max){togglePlay();return;}currentStep++;document.getElementById('timeline').value=currentStep;renderTimeline();},+document.getElementById('speedRange').value);}
init();
