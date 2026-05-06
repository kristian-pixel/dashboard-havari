
const dk = new Intl.NumberFormat('da-DK');
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const median=a=>{if(!a.length)return null;let s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2};
const fmtMin=v=>v==null?'–':`${Math.round(v)} min.`;
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
async function init(){const res=await fetch('assets/assistancer-public.json');raw=(await res.json()).records;setupFilterControls(raw,applyFilters);setupMap();document.getElementById('playBtn').onclick=togglePlay;document.getElementById('timeline').oninput=e=>{currentStep=+e.target.value;renderTimeline();};document.getElementById('exportBtn').onclick=()=>window.print();applyFilters();}
function applyFilters(){filtered=applyFilterTo(raw);updateDashboard();resetTimeline();}
function updateDashboard(){document.getElementById('kpiAssists').textContent=dk.format(filtered.length);document.getElementById('kpiPersons').textContent=dk.format(filtered.reduce((s,r)=>s+(r.persons||0),0));let causes=sortedEntries(byCount(filtered,r=>r.cause));document.getElementById('kpiTopCause').textContent=causes[0]?.[0]||'–';let months=sortedEntries(byCount(filtered,r=>r.month));document.getElementById('kpiTopMonth').textContent=monthName(months[0]?.[0]);const monthEntries=Object.entries(byCount(filtered,r=>r.month)).sort().map(([k,v])=>[monthName(k),v]);renderChart(charts,'monthlyChart','bar',monthEntries,'Assistancer');renderChart(charts,'causeChart','doughnut',causes.slice(0,9),'Årsager');document.querySelector('#pressTable tbody').innerHTML=Object.entries(byCount(filtered,r=>`${r.month}|${r.cause}`)).sort().map(([k,v])=>{const [m,c]=k.split('|');return `<tr><td>${monthName(m)}</td><td>${c}</td><td>${dk.format(v)}</td></tr>`}).join('')||'<tr><td colspan="3">Ingen data i det valgte filter.</td></tr>';}

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

function setupMap(){map=L.map('map').setView([56.05,10.8],7);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(map);addStationMarkers();}
function resetTimeline(){const valid=validGeo(filtered);document.getElementById('timeline').max=Math.max(0,valid.length-1);currentStep=valid.length?valid.length-1:0;document.getElementById('timeline').value=currentStep;renderTimeline();}
function renderTimeline(){markers.forEach(m=>map.removeLayer(m));markers=[];clearRescueRoute();const valid=validGeo(filtered);const shown=valid.slice(0,currentStep+1);shown.forEach((r,i)=>{const marker=L.circleMarker([r.lat,r.lon],{radius:i===shown.length-1?9:5,weight:2,fillOpacity:.65}).bindPopup(`<strong>${r.date}</strong><br>${r.station}<br>${r.cause}<br>${r.persons??'–'} personer ombord<br>${weatherLabel(r)}`);marker.addTo(map);markers.push(marker);});const overlay=document.getElementById('nightOverlay');if(shown.length){let last=shown[shown.length-1];document.getElementById('timelineLabel').textContent=`Viser ${shown.length} af ${valid.length} – seneste punkt: ${last.date}, ${last.station}, ${last.cause}`;document.getElementById('weatherBadge').textContent=`${DSRSWeather.dayNightInfo(last).icon} ${DSRSWeather.dayNightInfo(last).label} · ${weatherLabel(last)}`;setNightEffect(last);updateWeatherBadgeForRecord(last);showRescueRoute(last);}else{document.getElementById('timelineLabel').textContent='Ingen punkter i dette filter.';document.getElementById('weatherBadge').textContent='Vejrdata hentes automatisk ved valgt punkt';overlay.style.opacity=0; const wrap=overlay.closest('.mapWrap'); if(wrap){wrap.classList.remove('nightActive','twilightActive');} if(map&&map.getPane('tilePane'))map.getPane('tilePane').style.filter='';}}
function togglePlay(){const btn=document.getElementById('playBtn');if(playTimer){clearInterval(playTimer);playTimer=null;btn.textContent='▶ Afspil';return;}currentStep=0;document.getElementById('timeline').value=0;btn.textContent='⏸ Pause';playTimer=setInterval(()=>{const max=+document.getElementById('timeline').max;if(currentStep>=max){togglePlay();return;}currentStep++;document.getElementById('timeline').value=currentStep;renderTimeline();},+document.getElementById('speedRange').value);}
init();
