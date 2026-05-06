// DSRS weather + day/night helper for static GitHub Pages dashboards.
// Uses SunCalc for proper sunrise/sunset and Open-Meteo for historical weather at the selected assistance point.
window.DSRSWeather = (() => {
  const weatherText = {
    0: 'Klart vejr', 1: 'Overvejende klart', 2: 'Delvist skyet', 3: 'Overskyet',
    45: 'Tåge', 48: 'Rimtåge', 51: 'Let støvregn', 53: 'Støvregn', 55: 'Kraftig støvregn',
    56: 'Let frostregn', 57: 'Frostregn', 61: 'Let regn', 63: 'Regn', 65: 'Kraftig regn',
    66: 'Let isslag', 67: 'Isslag', 71: 'Let sne', 73: 'Sne', 75: 'Kraftig sne', 77: 'Snefnug',
    80: 'Let regnbyge', 81: 'Regnbyge', 82: 'Kraftig regnbyge',
    85: 'Let snebyge', 86: 'Kraftig snebyge', 95: 'Torden', 96: 'Torden med hagl', 99: 'Kraftig torden med hagl'
  };
  const weatherIcon = code => {
    if (code == null) return '🌤️';
    if (code === 0) return '☀️';
    if ([1,2].includes(code)) return '⛅';
    if (code === 3) return '☁️';
    if ([45,48].includes(code)) return '🌫️';
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return '🌧️';
    if ([71,73,75,77,85,86].includes(code)) return '🌨️';
    if ([95,96,99].includes(code)) return '⛈️';
    return '🌤️';
  };
  const cacheKey = r => `dsrs-weather-v2:${round(r.lat)}:${round(r.lon)}:${r.date}:${hourOf(r)}`;
  const round = v => Math.round(Number(v) * 100) / 100;
  const hourOf = r => {
    const t = cleanTime(r.alarm_time || r.departure_time || r.home_time || '12:00');
    const m = String(t).match(/^(\d{1,2})/);
    const h = m ? Math.max(0, Math.min(23, Number(m[1]))) : 12;
    return String(h).padStart(2,'0') + ':00';
  };
  const eventDate = r => {
    const time = cleanTime(r.alarm_time || r.departure_time || r.home_time || '12:00');
    return new Date(`${r.date}T${time}`);
  };
  function cleanTime(t){
    const s = String(t || '12:00').trim();
    const m = s.match(/^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?/);
    if(!m) return '12:00:00';
    const hh = String(Math.max(0, Math.min(23, Number(m[1])))).padStart(2,'0');
    const mm = String(Math.max(0, Math.min(59, Number(m[2]||0)))).padStart(2,'0');
    const ss = String(Math.max(0, Math.min(59, Number(m[3]||0)))).padStart(2,'0');
    return `${hh}:${mm}:${ss}`;
  }
  function dayNightInfo(r){
    const h = parseInt(cleanTime(r.alarm_time || r.departure_time || r.home_time || '12:00').slice(0,2),10);
    const fallbackNight = Number.isNaN(h) ? false : (h >= 22 || h < 6);
    const d = eventDate(r);
    if (!window.SunCalc || !r.lat || !r.lon || isNaN(d)) {
      return {label: fallbackNight ? 'Nat' : 'Dag', icon: fallbackNight ? '🌙' : '☀️', overlay: fallbackNight ? 0.78 : 0};
    }
    const times = SunCalc.getTimes(d, Number(r.lat), Number(r.lon));
    if (d < times.dawn || d > times.dusk) return {label:'Nat', icon:'🌙', overlay:0.78};
    if (d < times.sunrise || d > times.sunset) return {label:'Skumring', icon:'🌘', overlay:0.45};
    return {label:'Dag', icon:'☀️', overlay:0};
  }
  function cachedLabel(r){
    try {
      const cached = localStorage.getItem(cacheKey(r));
      if (cached) return format(JSON.parse(cached));
    } catch(e) {}
    return 'Vejrdata hentes ved valgt punkt';
  }
  function format(w){
    if (!w || w.error) return 'Vejrdata ikke fundet';
    const parts = [`${weatherIcon(w.code)} ${weatherText[w.code] || 'Vejr'}`];
    if (w.temp != null) parts.push(`${Math.round(w.temp)}°C`);
    if (w.wind != null) parts.push(`${Math.round(w.wind)} km/t vind`);
    if (w.precip != null && Number(w.precip) > 0) parts.push(`${Number(w.precip).toFixed(1).replace('.', ',')} mm nedbør`);
    return parts.join(' · ');
  }
  async function fetchWeather(r){
    if (!r || !r.date || !r.lat || !r.lon) return {error:true};
    const key = cacheKey(r);
    try {
      const cached = localStorage.getItem(key);
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    const lat = Number(r.lat).toFixed(4), lon = Number(r.lon).toFixed(4);
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${r.date}&end_date=${r.date}&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=Europe%2FCopenhagen`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('weather fetch failed');
      const data = await res.json();
      const times = data?.hourly?.time || [];
      const wanted = `${r.date}T${hourOf(r)}`;
      let idx = times.indexOf(wanted);
      if (idx < 0) idx = Math.max(0, times.findIndex(t => t.startsWith(r.date)));
      const w = {
        code: data.hourly?.weather_code?.[idx] ?? null,
        temp: data.hourly?.temperature_2m?.[idx] ?? null,
        precip: data.hourly?.precipitation?.[idx] ?? null,
        wind: data.hourly?.wind_speed_10m?.[idx] ?? null,
        source: 'Open-Meteo'
      };
      try { localStorage.setItem(key, JSON.stringify(w)); } catch(e) {}
      return w;
    } catch(e) {
      return {error:true};
    }
  }
  async function updateBadge(el, r){
    if (!el || !r) return;
    const dn = dayNightInfo(r);
    el.textContent = `${dn.icon} ${dn.label} · henter vejr…`;
    const w = await fetchWeather(r);
    el.textContent = `${dn.icon} ${dn.label} · ${format(w)}`;
  }
  return {dayNightInfo, cachedLabel, fetchWeather, updateBadge, format};
})();
