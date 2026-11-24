'use strict';
/*
 * PocasieC8 – app logic
 * Data sources (all free, commercial use allowed with attribution):
 *  - Forecast: MET Norway Locationforecast 2.0 (CC BY 4.0) – api.met.no
 *  - Places:   GeoNames cities1000, Europe (CC BY 4.0) – bundled in places.txt (offline)
 *  - Map:      OpenFreeMap vector tiles (OpenMapTiles schema, © OpenStreetMap)
 *  - Radar:    RainViewer (personal/educational use only – replace before Google Play)
 */

/* ============ helpers ============ */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('pc8.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('pc8.' + k, JSON.stringify(v)); } catch (e) {} }
};
const Cap = window.Capacitor;
const plug = (n) => (Cap && Cap.Plugins && Cap.Plugins[n]) || null;
const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
const fmt1 = (n) => (Math.round(n * 10) / 10).toString().replace('.', ',');
const DAYS = ['Ned', 'Pon', 'Uto', 'Str', 'Štv', 'Pia', 'Sob'];
const DIRS = ['S', 'SV', 'V', 'JV', 'J', 'JZ', 'Z', 'SZ'];
const dirTxt = (d) => DIRS[Math.round((((d % 360) + 360) % 360) / 45) % 8];
const nowS = () => Math.floor(Date.now() / 1000);
const hm = (t) => { const d = new Date(t * 1000); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
function dayWord(t) {
  const d = new Date(t * 1000), n = new Date();
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000);
  return diff === 0 ? 'Dnes' : diff === 1 ? 'Zajtra' : DAYS[d.getDay()];
}
const whenTxt = (t) => dayWord(t) + ' ' + hm(t);
const COUNTRY_SK = { SK: 'Slovensko', CZ: 'Česko', AT: 'Rakúsko', HU: 'Maďarsko', PL: 'Poľsko', DE: 'Nemecko', SI: 'Slovinsko', HR: 'Chorvátsko', IT: 'Taliansko', CH: 'Švajčiarsko', RO: 'Rumunsko', UA: 'Ukrajina',
  FR: 'Francúzsko', ES: 'Španielsko', PT: 'Portugalsko', GB: 'Spojené kráľovstvo', IE: 'Írsko', NL: 'Holandsko', BE: 'Belgicko', LU: 'Luxembursko', DK: 'Dánsko', SE: 'Švédsko', NO: 'Nórsko', FI: 'Fínsko',
  EE: 'Estónsko', LV: 'Lotyšsko', LT: 'Litva', BY: 'Bielorusko', MD: 'Moldavsko', BG: 'Bulharsko', RS: 'Srbsko', BA: 'Bosna a Hercegovina', ME: 'Čierna Hora', MK: 'Severné Macedónsko', AL: 'Albánsko',
  XK: 'Kosovo', GR: 'Grécko', TR: 'Turecko', CY: 'Cyprus', MT: 'Malta', IS: 'Island', LI: 'Lichtenštajnsko', AD: 'Andorra', MC: 'Monako', SM: 'San Maríno', VA: 'Vatikán' };

/* ============ symbols & icons ============ */
function sym(code) {
  const c = String(code || 'cloudy');
  const day = !c.endsWith('_night');
  const b = c.replace(/_(day|night|polartwilight)$/, '');
  const T = { clearsky: 'Jasno', fair: 'Prevažne jasno', partlycloudy: 'Polojasno', cloudy: 'Zamračené', fog: 'Hmla',
    lightrain: 'Slabý dážď', rain: 'Dážď', heavyrain: 'Silný dážď', lightrainshowers: 'Slabé prehánky', rainshowers: 'Prehánky', heavyrainshowers: 'Silné prehánky',
    lightsleet: 'Slabý dážď so snehom', sleet: 'Dážď so snehom', heavysleet: 'Silný dážď so snehom', lightsleetshowers: 'Prehánky so snehom', sleetshowers: 'Prehánky so snehom', heavysleetshowers: 'Silné prehánky so snehom',
    lightsnow: 'Slabé sneženie', snow: 'Sneženie', heavysnow: 'Silné sneženie', lightsnowshowers: 'Slabé snehové prehánky', snowshowers: 'Snehové prehánky', heavysnowshowers: 'Silné snehové prehánky' };
  let kind = 'cloud';
  if (b.includes('thunder')) kind = 'storm';
  else if (b.includes('snow') || b.includes('sleet')) kind = 'snow';
  else if (b.includes('rain')) kind = 'rain';
  else if (b === 'fog') kind = 'fog';
  else if (b === 'partlycloudy') kind = 'partly';
  else if (b === 'clearsky' || b === 'fair') kind = day ? 'sun' : 'moon';
  const text = T[b] || (kind === 'storm' ? 'Búrka' : 'Zamračené');
  return { kind, text, snow: b.includes('snow') || b.includes('sleet'), day };
}
function icon(k, s = 28) {
  const c = '<path d="M7 18a4.5 4.5 0 0 1 .6-9A6 6 0 0 1 19 10.5 3.8 3.8 0 0 1 18 18z" fill="#CBD5E1"/>';
  const I = {
    sun: '<circle cx="12" cy="12" r="4.5" fill="#FBBF24"/><g stroke="#FBBF24" stroke-width="2" stroke-linecap="round"><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="#E2E8F0"/>',
    partly: '<circle cx="15" cy="8" r="4.5" fill="#FBBF24"/><path d="M6 20a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.5 2 3 3 0 0 1-.5 6z" fill="#CBD5E1"/>',
    cloud: c,
    fog: '<path d="M7 13a4.5 4.5 0 0 1 .6-9A6 6 0 0 1 19 5.5 3.8 3.8 0 0 1 18 13z" fill="#94A3B8"/><g stroke="#CBD5E1" stroke-width="2" stroke-linecap="round"><path d="M4 17h16M6 21h12"/></g>',
    rain: '<path d="M7 15a4.5 4.5 0 0 1 .6-9A6 6 0 0 1 19 7.5 3.8 3.8 0 0 1 18 15z" fill="#94A3B8"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>',
    snow: '<path d="M7 14a4.5 4.5 0 0 1 .6-9A6 6 0 0 1 19 6.5 3.8 3.8 0 0 1 18 14z" fill="#CBD5E1"/><g stroke="#BFFFFF" stroke-width="1.8" stroke-linecap="round"><path d="M8 17v4M6 19h4M16 17v4M14 19h4"/></g>',
    storm: '<path d="M7 14a4.5 4.5 0 0 1 .6-9A6 6 0 0 1 19 6.5 3.8 3.8 0 0 1 18 14z" fill="#64748B"/><path d="M13 14l-3 5h3l-2 4 5-6h-3l2-3z" fill="#FACC15"/>'
  };
  return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true">' + (I[k] || c) + '</svg>';
}
const rainWord = (mm) => mm < 0.5 ? 'slabý' : mm < 4 ? 'mierny' : mm < 10 ? 'silný' : 'veľmi silný';

/* ============ sun times (SunCalc algorithm, MIT) ============ */
function sunTimes(date, lat, lng) {
  const rad = Math.PI / 180, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397, J0 = 0.0009;
  const d = date.valueOf() / 864e5 - 0.5 + J1970 - J2000, lw = rad * -lng, phi = rad * lat;
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = J0 + lw / (2 * Math.PI) + n;
  const M = rad * (357.5291 + 0.98560028 * ds);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
  const a = J0 + (w + lw) / (2 * Math.PI) + n;
  const Jset = J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const Jrise = Jnoon - (Jset - Jnoon);
  const toS = (j) => Math.round((j + 0.5 - J1970) * 86400);
  return isNaN(w) ? null : { rise: toS(Jrise), set: toS(Jset) };
}
function feelsLike(t, kmh, rh) {
  if (t <= 10 && kmh > 4.8) { const v = Math.pow(kmh, 0.16); return 13.12 + 0.6215 * t - 11.37 * v + 0.3965 * t * v; }
  if (t >= 27) { const e = rh / 100 * 6.105 * Math.exp(17.27 * t / (237.7 + t)); return t + 0.33 * e - 4; }
  return t;
}

/* ============ places (offline, GeoNames) ============ */
let PLACES = null, REGIONS = [];
let placesPromise = null;
function loadPlaces() {
  if (!placesPromise) placesPromise = fetch('places.txt').then((r) => r.text()).then((t) => {
    const lines = t.split('\n');
    REGIONS = lines[0].slice(3).split('|');
    PLACES = [];
    for (let i = 1; i < lines.length; i++) {
      const p = lines[i].split('|'); if (p.length < 5) continue;
      PLACES.push({ n: p[0], k: fold(p[0]), lat: +p[1], lon: +p[2], cc: p[3], r: +p[4] });
    }
    return PLACES;
  }).catch(() => (PLACES = []));
  return placesPromise;
}
function fold(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function placeSub(p) { return [REGIONS[p.r], COUNTRY_SK[p.cc] || p.cc].filter(Boolean).join(', '); }
function searchPlaces(q) {
  const k = fold(q.trim()); if (!PLACES || k.length < 2) return [];
  const home = place || { lat: 48.7, lon: 19.5 };
  const dist = (p) => Math.hypot(p.lat - home.lat, (p.lon - home.lon) * 0.66);
  const starts = [], contains = [];
  for (const p of PLACES) {
    if (p.k.startsWith(k)) starts.push(p);
    else if (contains.length < 40 && p.k.includes(k)) contains.push(p);
  }
  const score = (p) => (p.cc === 'SK' ? -1000 : 0) + (p.k === k ? -500 : 0) + dist(p);
  return starts.sort((a, b) => score(a) - score(b)).concat(contains.sort((a, b) => score(a) - score(b))).slice(0, 10);
}
async function nearestPlace(lat, lon) {
  await loadPlaces();
  let best = null, bd = 1e9;
  for (const p of PLACES) { const d = (p.lat - lat) ** 2 + ((p.lon - lon) * Math.cos(lat * Math.PI / 180)) ** 2; if (d < bd) { bd = d; best = p; } }
  return best;
}

/* ============ state ============ */
const COUNTRIES = {
  SK: [[16.83, 47.73], [22.57, 49.61]], CZ: [[12.09, 48.55], [18.86, 51.06]], AT: [[9.53, 46.37], [17.16, 49.02]], HU: [[16.11, 45.74], [22.9, 48.59]],
  PL: [[14.12, 49.0], [24.15, 54.84]], DE: [[5.87, 47.27], [15.04, 55.06]], SI: [[13.38, 45.42], [16.6, 46.88]], HR: [[13.49, 42.39], [19.45, 46.55]],
  IT: [[6.6, 36.6], [18.5, 47.1]], CH: [[5.96, 45.82], [10.49, 47.81]], RO: [[20.26, 43.62], [29.7, 48.27]], UA: [[22.14, 44.38], [40.23, 52.38]], EU: [[-10, 36], [32, 60]]
};
const CNAME = (c) => c === 'EU' ? 'Európa' : COUNTRY_SK[c];
let place = store.get('place', null);           // {name, sub, lat, lon, cc, auto}
let myCountry = store.get('myCountry', 'SK');
let settings = Object.assign({ notify: { rain: true, snow: true, wind: true, frost: false }, lead: 30, windMin: 60, country: 'auto', remember: true }, store.get('settings', {}));
let saved = store.get('saved', []);
const saveSettings = () => store.set('settings', settings);
let N = null; // normalized forecast

/* ============ routing ============ */
function route() {
  const r = (location.hash || '#home').slice(1);
  const full = r === 'radar';
  ['home', 'search', 'alerts'].forEach((id) => $(id).classList.toggle('on', id === r || (full && id === 'home')));
  $('radarCard').classList.toggle('full', full);
  $('nav').classList.toggle('hide', full);
  document.querySelectorAll('nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === r));
  if (map) {
    full ? map.cooperativeGestures.disable() : map.cooperativeGestures.enable();
    setTimeout(() => map.resize(), 60);
  }
  if (r === 'search') renderSaved();
  if (r === 'alerts') renderAlertsPage();
}
window.addEventListener('hashchange', route);

/* ============ location ============ */
async function getGPS() {
  const G = plug('Geolocation');
  if (G && isNative) {
    try { const p = await G.checkPermissions(); if (p.location !== 'granted') await G.requestPermissions(); } catch (e) {}
    const pos = await G.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
    return [pos.coords.latitude, pos.coords.longitude];
  }
  return new Promise((res, rej) => navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => res([p.coords.latitude, p.coords.longitude]), rej, { timeout: 15000, maximumAge: 300000 }) : rej(new Error('no geo')));
}
async function useMyLocation() {
  $('placeName').textContent = 'Hľadám polohu…';
  try {
    const [lat, lon] = await getGPS();
    const p = await nearestPlace(lat, lon);
    if (p && COUNTRIES[p.cc]) { myCountry = p.cc; store.set('myCountry', myCountry); }
    place = { name: p ? p.n : 'Moja poloha', sub: p ? placeSub(p) : '', lat, lon, cc: p ? p.cc : '', auto: true };
    store.set('place', place);
    if (location.hash === '#search') location.hash = '#home';
    await load();
  } catch (e) {
    if (!place) place = { name: 'Bratislava', sub: 'Bratislavský kraj, Slovensko', lat: 48.1486, lon: 17.1077, cc: 'SK', auto: false };
    showErr('Nepodarilo sa zistiť polohu. Povoľ polohu pre appku v nastaveniach telefónu, alebo vyhľadaj mesto.');
    await load();
  }
}

/* ============ forecast: MET Norway ============ */
async function fetchMet(lat, lon) {
  // MET requires max 4 decimals; we use 3 so nearby requests share the cache.
  const u = 'https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=' + lat.toFixed(3) + '&lon=' + lon.toFixed(3);
  const r = await fetch(u, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
function normalize(j, lat, lon) {
  const ts = j.properties.timeseries;
  const hours = ts.map((e) => {
    const i = e.data.instant.details, n1 = e.data.next_1_hours, n6 = e.data.next_6_hours, nx = n1 || n6 || e.data.next_12_hours;
    const s = sym(nx && nx.summary && nx.summary.symbol_code);
    const step = n1 ? 1 : n6 ? 6 : 12;
    const det = (n1 || n6 || {}).details || {};
    return {
      t: Date.parse(e.time) / 1000, step, temp: i.air_temperature, rh: i.relative_humidity, wind: (i.wind_speed || 0) * 3.6, dir: i.wind_from_direction || 0,
      gust: (i.wind_speed_of_gust ?? i.wind_speed * 1.5) * 3.6, pres: i.air_pressure_at_sea_level, dew: i.dew_point_temperature, cloud: i.cloud_area_fraction,
      uv: i.ultraviolet_index_clear_sky, mm: det.precipitation_amount || 0, prob: det.probability_of_precipitation ?? null,
      tmax: n6 && n6.details.air_temperature_max, tmin: n6 && n6.details.air_temperature_min, kind: s.kind, text: s.text, snow: s.snow, day: s.day
    };
  });
  const now = nowS();
  let ci = hours.findIndex((h) => h.t + 3600 > now); if (ci < 0) ci = 0;
  const c = hours[ci];
  // days
  const days = [], byDay = {};
  hours.forEach((h) => {
    const d = new Date(h.t * 1000), key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    if (!byDay[key]) { byDay[key] = { t: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000, temps: [], mm: 0, snow: 0, prob: 0, syms: [], gust: 0 }; days.push(byDay[key]); }
    const D = byDay[key];
    D.temps.push(h.temp); if (h.tmax != null) D.temps.push(h.tmax, h.tmin);
    D.mm += h.mm; if (h.snow) D.snow += h.mm; D.prob = Math.max(D.prob, h.prob ?? (h.mm >= 0.1 ? 60 : 0)); D.gust = Math.max(D.gust, h.gust);
    const hr = d.getHours(); D.syms.push({ hr, kind: h.kind, w: Math.abs(hr - 13) });
  });
  const sev = { storm: 6, snow: 5, rain: 4, fog: 3, cloud: 2, partly: 1, sun: 0, moon: 0 };
  days.forEach((D) => {
    D.max = Math.max(...D.temps); D.min = Math.min(...D.temps);
    const dayS = D.syms.filter((s) => s.hr >= 7 && s.hr <= 19); const pool = dayS.length ? dayS : D.syms;
    D.kind = pool.reduce((a, b) => (sev[b.kind] > sev[a.kind] ? b : a)).kind;
    if (D.kind === 'moon') D.kind = 'sun';
    if (D.mm < 0.3 && ['rain', 'snow', 'storm'].includes(D.kind)) D.kind = 'cloud';
  });
  const sun = sunTimes(new Date(), lat, lon);
  return {
    updated: j.properties.meta && j.properties.meta.updated_at,
    current: { temp: c.temp, feels: feelsLike(c.temp, c.wind, c.rh), rh: c.rh, wind: c.wind, dir: c.dir, gust: c.gust, pres: c.pres, dew: c.dew, cloud: c.cloud, uv: c.uv, kind: c.kind, text: c.text },
    hours, ci, days: days.filter((D) => D.t + 86400 > now).slice(0, 8), sun
  };
}
function showErr(msg) {
  let e = $('errBox');
  if (!e) { e = document.createElement('div'); e.id = 'errBox'; e.className = 'err'; $('home').insertBefore(e, $('home').children[1]); }
  e.textContent = msg; e.classList.remove('hide');
  setTimeout(() => e.classList.add('hide'), 7000);
}
let loading = false;
async function load() {
  if (!place || loading) return;
  loading = true;
  $('placeName').textContent = place.name;
  $('placeSub').textContent = (place.auto ? 'Podľa polohy' : (place.sub || '')) + ' · načítavam…';
  try {
    const j = await fetchMet(place.lat, place.lon);
    store.set('lastMet', { t: Date.now(), j, place });
    N = normalize(j, place.lat, place.lon);
    renderHome();
    scheduleNotifications();
  } catch (e) {
    const c = store.get('lastMet', null);
    if (c && c.place && Math.abs(c.place.lat - place.lat) < 0.01) { N = normalize(c.j, place.lat, place.lon); renderHome(); $('placeSub').textContent = 'Offline · uložené dáta'; }
    showErr('Nepodarilo sa načítať predpoveď. Skontroluj internet.');
  }
  loading = false;
  if (map && meMarker) { meMarker.setLngLat([place.lon, place.lat]); if (view === 'local') map.jumpTo({ center: [place.lon, place.lat], zoom: 7.5 }); }
}

/* ============ alerts computation ============ */
function computeAlerts() {
  const out = [];
  if (!N) return out;
  const H = N.hours, now = nowS(), ci = N.ci;
  const within = (h, hrs) => h.t < now + hrs * 3600;
  const end = (i, test) => { let j = i; while (j + 1 < H.length && test(H[j + 1])) j++; return j; };
  const hEnd = (h) => h.t + h.step * 3600;
  // RAIN (24 h)
  const isRain = (h) => h.mm >= 0.2 && !h.snow && (h.prob == null || h.prob >= 40);
  for (let i = ci; i < H.length && within(H[i], 24); i++) {
    if (!isRain(H[i])) continue;
    const j = end(i, isRain); let sum = 0, mx = 0; for (let k = i; k <= j; k++) { sum += H[k].mm; mx = Math.max(mx, H[k].mm / H[k].step); }
    const started = H[i].t <= now;
    const mins = Math.round((H[i].t - now) / 60);
    const title = started ? 'Teraz prší' : mins <= 90 ? 'Dážď začne o ~' + Math.max(5, Math.round(mins / 5) * 5) + ' min' : 'Dážď ' + whenTxt(H[i].t);
    out.push({ type: 'rain', start: H[i].t, end: hEnd(H[j]), title, chip: started ? 'Teraz prší' : mins <= 90 ? 'Dážď o ~' + Math.max(5, Math.round(mins / 5) * 5) + ' min' : 'Dážď ' + whenTxt(H[i].t).replace('Dnes ', ''),
      sub: rainWord(mx).replace(/^./, (c) => c.toUpperCase()) + ' dážď do ' + hm(hEnd(H[j])) + ' · ' + fmt1(sum) + ' mm' + (H[i].prob != null ? ' · ' + Math.round(H[i].prob) + ' %' : ''), sum });
    break;
  }
  // SNOW (48 h) – ~1 cm of new snow per 1 mm of water
  const isSnow = (h) => h.snow && h.mm >= 0.1;
  for (let i = ci; i < H.length && within(H[i], 48); i++) {
    if (!isSnow(H[i])) continue;
    const j = end(i, isSnow); let cm = 0, tmin = 99; for (let k = i; k <= j; k++) { cm += H[k].mm; tmin = Math.min(tmin, H[k].temp); }
    out.push({ type: 'snow', start: H[i].t, end: hEnd(H[j]), cm, tmin, title: 'Sneženie ' + whenTxt(H[i].t), chip: 'Sneh ' + whenTxt(H[i].t).replace('Dnes ', 'dnes '),
      sub: 'do ' + hm(hEnd(H[j])) + ' · ' + (cm < 1 ? 'poprašok do 1 cm' : '~' + Math.round(cm) + ' cm nového snehu') });
    break;
  }
  // WIND (48 h)
  const isWind = (h) => h.gust >= settings.windMin;
  for (let i = ci; i < H.length && within(H[i], 48); i++) {
    if (!isWind(H[i])) continue;
    const j = end(i, isWind); let mx = 0, dir = 0; for (let k = i; k <= j; k++) if (H[k].gust > mx) { mx = H[k].gust; dir = H[k].dir; }
    const lvl = mx >= 90 ? 3 : mx >= 75 ? 2 : 1;
    const gusts = []; for (let k = Math.max(ci, i - 3); k <= Math.min(H.length - 1, j + 3); k++) gusts.push(H[k].gust);
    out.push({ type: 'wind', start: H[i].t, end: hEnd(H[j]), mx, lvl, dir, gusts, title: (mx >= 75 ? 'Víchrica ' : 'Silný vietor ') + whenTxt(H[i].t),
      chip: (mx >= 75 ? 'Víchrica ' : 'Vietor ') + whenTxt(H[i].t).replace('Dnes ', ''), sub: 'do ' + hm(hEnd(H[j])) + ' · nárazy ' + Math.round(mx) + ' km/h' });
    break;
  }
  // FROST (24 h)
  const isFrost = (h) => h.temp <= 0;
  for (let i = ci; i < H.length && within(H[i], 24); i++) {
    if (!isFrost(H[i])) continue;
    const j = end(i, isFrost); let mn = 99; for (let k = i; k <= j; k++) mn = Math.min(mn, H[k].temp);
    out.push({ type: 'frost', start: H[i].t, end: hEnd(H[j]), title: 'Mráz ' + whenTxt(H[i].t), chip: 'Mráz ' + whenTxt(H[i].t).replace('Dnes ', ''), sub: 'najnižšie ' + Math.round(mn) + '° · pozor na poľadovicu' });
    break;
  }
  return out;
}

/* ============ render home ============ */
const CLS = { rain: 'c-rain', snow: 'c-snow', wind: 'c-wind', frost: 'c-frost' };
function renderHome() {
  const C = N.current, D = N.days, H = N.hours;
  $('placeName').textContent = place.name;
  $('placeSub').textContent = (place.auto ? 'Podľa polohy' : (place.sub || '')) + ' · aktualizované ' + hm(nowS());
  $('curTemp').textContent = Math.round(C.temp) + '°';
  $('curText').textContent = C.text;
  $('curMinMax').textContent = 'Max ' + Math.round(D[0].max) + '° · Min ' + Math.round(D[0].min) + '°';
  $('curFeel').textContent = 'Pocitovo ' + Math.round(C.feels) + '° · vietor ' + Math.round(C.wind) + ' km/h';
  $('curIcon').innerHTML = icon(C.kind, 64);

  const A = computeAlerts();
  $('chips').innerHTML = A.length ? A.map((a) => '<a class="pill ' + CLS[a.type] + '" href="#alerts">' + (a.type === 'rain' || a.type === 'snow' ? icon(a.type, 18) : '') + esc(a.chip) + '</a>').join('')
    : '<span class="pill c-ok">Bez dažďa, snehu a víchrice</span>';
  $('badge').textContent = A.length; $('badge').classList.toggle('hide', !A.length);

  // precipitation next 6 hours + alert cards
  const next = H.slice(N.ci, N.ci + 6).filter((h) => h.step === 1);
  const mx = Math.max(1, ...next.map((h) => h.mm));
  const r = A.find((a) => a.type === 'rain');
  let html = '<div class="sec acard c-rain" style="background:#10243A"><div style="display:flex;align-items:center;gap:10px">' + icon('rain', 30) +
    '<div style="display:flex;flex-direction:column"><span style="font-size:15px;font-weight:600;color:#EAF0FA">' + esc(r ? r.title : 'Najbližších 6 hodín bez dažďa') + '</span><span style="font-size:13px;color:#A9C1DA">' + esc(r ? r.sub : 'Zrážky po hodinách') + '</span></div></div>' +
    '<div style="display:flex;align-items:flex-end;gap:6px;height:48px">' + next.map((h) => {
      const v = h.mm, hgt = v < 0.05 ? 4 : 8 + Math.min(40, v / mx * 40);
      return '<div title="' + fmt1(v) + ' mm" style="flex:1;border-radius:4px;height:' + hgt + 'px;background:' + (v < 0.05 ? '#1E3A5F' : h.snow ? '#BFFFFF' : v >= 4 ? '#FFEE00' : v >= 1 ? '#00A3E0' : '#88DDEE') + '"></div>';
    }).join('') + '</div><div style="display:flex;justify-content:space-between;font-size:11px;color:#A9C1DA">' + next.map((h, i) => '<span>' + (i === 0 ? 'Teraz' : hm(h.t)) + '</span>').join('') + '</div></div>';
  const others = A.filter((a) => a.type !== 'rain');
  if (others.length) {
    html += '<div class="sec" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">' + others.map((a) => {
      const lbl = { snow: 'Sneženie', wind: a.mx >= 75 ? 'Víchrica' : 'Vietor', frost: 'Mráz' }[a.type];
      return '<a href="#alerts" class="acard ' + CLS[a.type] + '" style="text-decoration:none;gap:6px"><span style="font-size:12px;font-weight:700;letter-spacing:.6px">' + lbl.toUpperCase() + '</span>' +
        '<span class="h" style="font-size:20px;font-weight:600;color:#EAF0FA">' + esc(whenTxt(a.start)) + '</span><span style="font-size:13px">' + esc(a.sub) + '</span></a>';
    }).join('') + '</div>';
  }
  $('alertCards').innerHTML = html;

  // hourly (24 h, 1-hour steps only)
  let hh = '';
  H.slice(N.ci, N.ci + 24).filter((h) => h.step === 1).forEach((h, i) => {
    hh += '<div class="hcell' + (i === 0 ? ' now' : '') + '"><span style="font-size:13px;color:#CBD5E1">' + (i === 0 ? 'Teraz' : hm(h.t)) + '</span>' + icon(h.kind) +
      '<span class="h" style="font-size:18px;font-weight:600">' + Math.round(h.temp) + '°</span><span style="font-size:12px;color:#7DD3FC;font-weight:600">' + (h.prob != null ? Math.round(h.prob) + ' %' : h.mm >= 0.1 ? fmt1(h.mm) + ' mm' : '–') + '</span></div>';
  });
  $('hourly').innerHTML = hh;

  // daily
  $('daily').innerHTML = D.slice(0, 7).map((d, i) => {
    const dt = new Date(d.t * 1000);
    return '<div class="hcell' + (i === 0 ? ' now' : '') + '"><span style="font-size:13px;font-weight:600">' + (i === 0 ? 'Dnes' : DAYS[dt.getDay()]) + '</span>' +
      '<span style="font-size:11px;color:var(--mut);margin-top:-6px">' + dt.getDate() + '.' + (dt.getMonth() + 1) + '.</span>' + icon(d.kind) +
      '<span class="h" style="font-size:18px;font-weight:600">' + Math.round(d.max) + '°</span><span style="font-size:14px;color:var(--mut)">' + Math.round(d.min) + '°</span>' +
      '<span style="font-size:12px;color:#7DD3FC;font-weight:600">' + Math.round(d.prob) + ' %</span>' +
      (d.snow >= 0.3 ? '<span style="font-size:11px;color:#BFFFFF">~' + Math.round(d.snow) + ' cm</span>' : d.mm >= 0.3 ? '<span style="font-size:11px;color:var(--mut)">' + fmt1(d.mm) + ' mm</span>' : '') + '</div>';
  }).join('');

  // details
  const uv = C.uv ?? 0;
  const T = [
    ['Vietor', Math.round(C.wind) + ' km/h', dirTxt(C.dir) + ' · nárazy ' + Math.round(C.gust)],
    ['Vlhkosť', Math.round(C.rh) + ' %', 'Rosný bod ' + Math.round(C.dew) + '°'],
    ['UV index', fmt1(uv), uv < 3 ? 'Nízky' : uv < 6 ? 'Stredný' : uv < 8 ? 'Vysoký' : 'Veľmi vysoký'],
    ['Tlak', Math.round(C.pres), 'hPa'],
    ['Oblačnosť', Math.round(C.cloud ?? 0) + ' %', C.cloud < 20 ? 'Jasno' : C.cloud < 60 ? 'Polojasno' : 'Zamračené'],
    ['Slnko', N.sun ? hm(N.sun.rise) : '–', N.sun ? 'Západ ' + hm(N.sun.set) : '']
  ];
  $('details').innerHTML = T.map((t) => '<div class="tile"><span class="lbl" style="font-size:11px">' + t[0] + '</span><b class="h">' + t[1] + '</b><small>' + t[2] + '</small></div>').join('');
}

/* ============ alerts page ============ */
function renderAlertsPage() {
  if (!N) return;
  const A = computeAlerts(), now = nowS(), span = 48 * 3600;
  $('alSub').textContent = place.name + ' · najbližších 48 hodín';
  const rows = [['rain', 'Dážď', '#38BDF8', '#BAE6FD'], ['snow', 'Sneženie', '#BFFFFF', '#DDF3FF'], ['wind', 'Vietor', '#FB923C', '#FED7AA'], ['frost', 'Mráz', '#64748B', '#CBD5E1']];
  $('timeline').innerHTML = rows.map(([t, n, col, tc]) => {
    const a = A.find((x) => x.type === t);
    let bar = '';
    if (a) { const l = Math.max(0, (a.start - now) / span * 100), w = Math.max(1.5, Math.min(100 - l, (a.end - Math.max(a.start, now)) / span * 100)); bar = '<div style="position:absolute;left:' + l + '%;width:' + w + '%;top:0;bottom:0;background:' + col + ';border-radius:6px"></div>'; }
    return '<span style="color:' + tc + ';font-weight:600">' + n + '</span><div style="position:relative;height:12px;background:#1B2740;border-radius:6px">' + bar + '</div>';
  }).join('');
  const tips = { rain: 'Zober si dáždnik.', snow: 'Cesty môžu byť šmykľavé, počítaj s dlhšou cestou.', wind: 'Zabezpeč voľné predmety a neparkuj pod stromami.', frost: 'Ráno pozor na námrazu a poľadovicu.' };
  $('alertList').innerHTML = A.length ? A.map((a) => {
    let extra = '';
    if (a.type === 'wind') {
      const mx = Math.max(...a.gusts, 1);
      extra = '<div style="display:flex;align-items:flex-end;gap:3px;height:56px">' + a.gusts.map((g) => '<div style="flex:1;border-radius:3px;height:' + Math.round(g / mx * 56) + 'px;background:' + (g >= settings.windMin ? '#FB923C' : '#7C4A1E') + '"></div>').join('') + '</div>' +
        '<span style="font-size:13px">Nárazy až <b style="color:#EAF0FA">' + Math.round(a.mx) + ' km/h</b> · smer ' + dirTxt(a.dir) + ' · stupeň ' + a.lvl + '</span>';
    }
    if (a.type === 'snow') extra = '<span style="font-size:13px">Nový sneh <b style="color:#EAF0FA">' + (a.cm < 1 ? 'do 1 cm' : '~' + Math.round(a.cm) + ' cm') + '</b> · teplota do ' + Math.round(a.tmin) + '°</span>';
    return '<div class="acard ' + CLS[a.type] + '"><span style="font-size:12px;font-weight:700;letter-spacing:.6px">' + esc(a.title.toUpperCase()) + '</span>' +
      '<span class="h" style="font-size:22px;font-weight:600;color:#EAF0FA">' + esc(hm(Math.max(a.start, now))) + ' – ' + esc(hm(a.end)) + '</span><span style="font-size:13px">' + esc(a.sub) + '</span>' + extra +
      '<span style="font-size:13px;opacity:.85">' + tips[a.type] + '</span></div>';
  }).join('') : '<div class="acard c-ok">Najbližších 48 hodín žiadne upozornenie. Užívaj pekné počasie.</div>';

  const defs = [['rain', 'Dážď', 'Kedy začne pršať'], ['snow', 'Sneženie', 'Začiatok a výška snehu'], ['wind', 'Víchrica', 'Nárazy nad ' + settings.windMin + ' km/h'], ['frost', 'Mráz a poľadovica', 'Teplota pod 0 °C']];
  $('toggles').innerHTML = defs.map(([id, n, s]) => '<div style="display:flex;align-items:center;justify-content:space-between;min-height:56px;border-top:1px solid #1B2740;gap:12px"><span><span style="display:block;font-size:15px;font-weight:600">' + n + '</span><span style="font-size:12px;color:var(--mut)">' + s + '</span></span>' +
    '<button class="sw' + (settings.notify[id] ? ' on' : '') + '" role="switch" aria-checked="' + !!settings.notify[id] + '" aria-label="' + n + '" data-t="' + id + '"></button></div>').join('');
  $('leads').innerHTML = [[15, '15 min'], [30, '30 min'], [60, '1 hod'], [180, '3 hod']].map(([v, n]) => '<button data-l="' + v + '" class="' + (settings.lead === v ? 'on' : '') + '" aria-pressed="' + (settings.lead === v) + '">' + n + '</button>').join('');
}
$('toggles').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  settings.notify[b.dataset.t] = !settings.notify[b.dataset.t]; saveSettings(); renderAlertsPage();
  if (settings.notify[b.dataset.t]) await ensureNotifPermission();
  scheduleNotifications();
});
$('leads').addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (!b) return; settings.lead = +b.dataset.l; saveSettings(); renderAlertsPage(); scheduleNotifications(); });

/* ============ notifications ============ */
async function ensureNotifPermission() {
  const L = plug('LocalNotifications'); if (!L || !isNative) return false;
  try { let p = await L.checkPermissions(); if (p.display !== 'granted') p = await L.requestPermissions(); return p.display === 'granted'; } catch (e) { return false; }
}
async function scheduleNotifications() {
  const L = plug('LocalNotifications'); if (!L || !isNative || !N) return;
  try {
    if (!(await ensureNotifPermission())) return;
    await L.cancel({ notifications: [{ id: 101 }, { id: 102 }, { id: 103 }, { id: 104 }] }).catch(() => {});
    const ids = { rain: 101, snow: 102, wind: 103, frost: 104 };
    const list = [], sent = store.get('sentAlerts', {});
    computeAlerts().forEach((a) => {
      if (!settings.notify[a.type] || a.start * 1000 < Date.now()) return;
      const key = a.type + ':' + a.start;
      let at = (a.start - settings.lead * 60) * 1000;
      if (at <= Date.now()) { if (sent[key]) return; at = Date.now() + 3000; sent[key] = 1; }
      list.push({ id: ids[a.type], title: place.name + ': ' + a.title, body: a.sub, schedule: { at: new Date(at), allowWhileIdle: true } });
    });
    Object.keys(sent).forEach((k) => { if (+k.split(':')[1] * 1000 < Date.now() - 86400000) delete sent[k]; });
    store.set('sentAlerts', sent);
    if (list.length) await L.schedule({ notifications: list });
  } catch (e) { console.warn('notif', e); }
}

/* ============ map (MapLibre + OpenFreeMap) ============ */
const MAP_STYLE = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: { ofm: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' } },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#0E1828' } },
    { id: 'wood', type: 'fill', source: 'ofm', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wood'], paint: { 'fill-color': '#10203A', 'fill-opacity': 0.6 } },
    { id: 'water', type: 'fill', source: 'ofm', 'source-layer': 'water', paint: { 'fill-color': '#0A2740' } },
    { id: 'waterway', type: 'line', source: 'ofm', 'source-layer': 'waterway', minzoom: 6, paint: { 'line-color': '#123B5C', 'line-width': 1 } },
    { id: 'roads-minor', type: 'line', source: 'ofm', 'source-layer': 'transportation', minzoom: 9, filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary']]], paint: { 'line-color': '#1A2740', 'line-width': 1 } },
    { id: 'roads', type: 'line', source: 'ofm', 'source-layer': 'transportation', minzoom: 5, filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]], paint: { 'line-color': '#24344F', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 2] } },
    // radar layers are inserted here (before 'boundary-state')
    { id: 'boundary-state', type: 'line', source: 'ofm', 'source-layer': 'boundary', minzoom: 6, filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': '#2A3A55', 'line-dasharray': [2, 2], 'line-width': 1 } },
    { id: 'boundary-country', type: 'line', source: 'ofm', 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': '#5B7BA6', 'line-width': 1.4 } },
    { id: 'place-village', type: 'symbol', source: 'ofm', 'source-layer': 'place', minzoom: 10, filter: ['in', ['get', 'class'], ['literal', ['village']]],
      layout: { 'text-field': ['coalesce', ['get', 'name:sk'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 11 }, paint: { 'text-color': '#94A3B8', 'text-halo-color': '#0B1220', 'text-halo-width': 1.2 } },
    { id: 'place-town', type: 'symbol', source: 'ofm', 'source-layer': 'place', minzoom: 7, filter: ['==', ['get', 'class'], 'town'],
      layout: { 'text-field': ['coalesce', ['get', 'name:sk'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 7, 10, 11, 13] }, paint: { 'text-color': '#B6C2D4', 'text-halo-color': '#0B1220', 'text-halo-width': 1.2 } },
    { id: 'place-city', type: 'symbol', source: 'ofm', 'source-layer': 'place', minzoom: 4, filter: ['==', ['get', 'class'], 'city'],
      layout: { 'text-field': ['coalesce', ['get', 'name:sk'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 10, 15] }, paint: { 'text-color': '#E2E8F0', 'text-halo-color': '#0B1220', 'text-halo-width': 1.4 } },
    { id: 'place-country', type: 'symbol', source: 'ofm', 'source-layer': 'place', maxzoom: 6, filter: ['==', ['get', 'class'], 'country'],
      layout: { 'text-field': ['coalesce', ['get', 'name:sk'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-transform': 'uppercase', 'text-letter-spacing': 0.1 }, paint: { 'text-color': '#7B8BA3', 'text-halo-color': '#0B1220', 'text-halo-width': 1 } }
  ]
};
let map, meMarker, frames = [], frameIdx = 0, playing = null, view = 'local', windMarkers = [], layerMode = 'prec', mapReady = false;
function initMap() {
  const start = place ? [place.lon, place.lat] : [19.5, 48.7];
  map = new maplibregl.Map({
    container: 'map', style: MAP_STYLE, center: start, zoom: 7.5, minZoom: 3, maxZoom: 12,
    attributionControl: { compact: true, customAttribution: '<a href="https://www.rainviewer.com/">RainViewer</a> · <a href="https://www.met.no/en">MET Norway</a>' },
    cooperativeGestures: true, dragRotate: false, pitchWithRotate: false,
    locale: { 'CooperativeGesturesHandler.MobileHelpText': 'Mapu posúvaj dvoma prstami', 'CooperativeGesturesHandler.WindowsHelpText': 'Priblíženie: Ctrl + koliesko', 'CooperativeGesturesHandler.MacHelpText': 'Priblíženie: ⌘ + koliesko' }
  });
  map.touchZoomRotate.disableRotation();
  const el = document.createElement('div'); el.className = 'me';
  meMarker = new maplibregl.Marker({ element: el }).setLngLat(start).addTo(map);
  $('zIn').onclick = () => map.zoomIn();
  $('zOut').onclick = () => map.zoomOut();
  $('zMe').onclick = () => { if (place) { view = 'local'; setViewBtns(); map.flyTo({ center: [place.lon, place.lat], zoom: 9 }); } };
  map.on('moveend', () => { if (layerMode === 'wind') loadWind(); });
  map.on('load', () => { mapReady = true; loadRadar(); });
  map.on('error', (e) => console.warn('map', e && e.error && e.error.message));
  setInterval(loadRadar, 10 * 60 * 1000);
}
async function loadRadar() {
  if (!mapReady) return;
  try {
    const r = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const j = await r.json();
    const past = (j.radar && j.radar.past) || [];
    if (frames.length && past.length && frames[frames.length - 1].time === past[past.length - 1].time) return;
    frames.forEach((f, i) => { if (map.getLayer('rv' + i)) map.removeLayer('rv' + i); if (map.getSource('rv' + i)) map.removeSource('rv' + i); });
    frames = past;
    frames.forEach((f, i) => {
      map.addSource('rv' + i, { type: 'raster', tiles: [j.host + f.path + '/256/{z}/{x}/{y}/2/1_1.png'], tileSize: 256, maxzoom: 7 });
      map.addLayer({ id: 'rv' + i, type: 'raster', source: 'rv' + i, paint: { 'raster-opacity': 0, 'raster-fade-duration': 0 } }, 'boundary-state');
    });
    $('frameRange').max = Math.max(0, frames.length - 1);
    if (frames.length) { const mins = Math.round((frames[frames.length - 1].time - frames[0].time) / 60); $('tlStart').textContent = '−' + (mins >= 60 ? fmt1(mins / 60) + ' h' : mins + ' min'); }
    showFrame(frames.length - 1);
  } catch (e) { $('frameLabel').textContent = 'Radar nedostupný'; }
}
function showFrame(i) {
  if (!frames.length) return;
  frameIdx = (i + frames.length) % frames.length;
  frames.forEach((f, k) => map.getLayer('rv' + k) && map.setPaintProperty('rv' + k, 'raster-opacity', k === frameIdx ? 0.8 : 0));
  $('frameRange').value = frameIdx;
  const ago = Math.round((Date.now() / 1000 - frames[frameIdx].time) / 60);
  $('frameLabel').textContent = frameIdx === frames.length - 1 ? 'Teraz · ' + hm(frames[frameIdx].time) : '−' + ago + ' min';
}
function togglePlay() {
  if (playing) { clearInterval(playing); playing = null; }
  else playing = setInterval(() => showFrame(frameIdx + 1), 700);
  $('playIco').innerHTML = playing ? '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>' : '<path d="M8 5v14l11-7z"/>';
  $('playBtn').setAttribute('aria-label', playing ? 'Pozastaviť animáciu' : 'Prehrať animáciu radaru');
}
$('playBtn').onclick = togglePlay;
$('frameRange').oninput = (e) => { if (playing) togglePlay(); showFrame(+e.target.value); };

// country view
const curCountry = () => settings.country === 'auto' ? (COUNTRIES[myCountry] ? myCountry : 'SK') : settings.country;
function setViewBtns() {
  $('vLocal').classList.toggle('on', view === 'local');
  $('vCountry').classList.toggle('on', view === 'country');
  $('countryLbl').textContent = CNAME(curCountry()) + (settings.country === 'auto' ? ' (poloha)' : '');
}
function showCountry() { view = 'country'; setViewBtns(); map.fitBounds(COUNTRIES[curCountry()], { padding: { top: 50, bottom: 60, left: 12, right: 60 }, duration: 600 }); }
$('vLocal').onclick = () => { view = 'local'; setViewBtns(); if (place) map.flyTo({ center: [place.lon, place.lat], zoom: 7.5 }); };
$('vCountry').onclick = () => { if (view === 'country') openCountryModal(); else showCountry(); };
function openCountryModal() {
  $('cAutoSub').textContent = 'Teraz: ' + CNAME(COUNTRIES[myCountry] ? myCountry : 'SK') + ' · mení sa, keď cestuješ';
  $('cAuto').style.borderColor = settings.country === 'auto' ? 'var(--acc)' : 'var(--s2)';
  $('countryList').innerHTML = Object.keys(COUNTRIES).map((c) => '<button class="row' + (settings.country === c ? ' on' : '') + '" data-c="' + c + '"><span style="flex:1">' + CNAME(c) + '</span>' +
    (settings.country === c ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>' : '') + '</button>').join('');
  $('cRemember').classList.toggle('on', settings.remember); $('cRemember').setAttribute('aria-checked', settings.remember);
  $('countryModal').classList.remove('hide');
}
function pickCountry(c) {
  settings.country = c;
  if (settings.remember) saveSettings(); else { const s = Object.assign({}, settings, { country: store.get('settings', {}).country || 'auto' }); store.set('settings', s); }
  $('countryModal').classList.add('hide'); showCountry();
}
$('countryList').onclick = (e) => { const b = e.target.closest('[data-c]'); if (b) pickCountry(b.dataset.c); };
$('cAuto').onclick = () => pickCountry('auto');
$('cRemember').onclick = () => { settings.remember = !settings.remember; $('cRemember').classList.toggle('on', settings.remember); $('cRemember').setAttribute('aria-checked', settings.remember); saveSettings(); };
document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) m.classList.add('hide'); }));

// wind layer – a small grid of MET Norway points (cached, low request count)
function setLayer(m) {
  layerMode = m;
  $('lPrec').classList.toggle('on', m === 'prec'); $('lWind').classList.toggle('on', m === 'wind');
  $('windLeg').classList.toggle('hide', m !== 'wind');
  if (m === 'wind') loadWind(); else clearWind();
}
function clearWind() { windMarkers.forEach((mk) => mk.remove()); windMarkers = []; }
$('lPrec').onclick = () => setLayer('prec');
$('lWind').onclick = () => setLayer('wind');
const windCache = {};
let windTimer = null;
function loadWind() {
  clearTimeout(windTimer);
  windTimer = setTimeout(async () => {
    const b = map.getBounds(), n = 4, pts = [];
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
      pts.push([+(b.getSouth() + (i + 0.5) * (b.getNorth() - b.getSouth()) / n).toFixed(2), +(b.getWest() + (k + 0.5) * (b.getEast() - b.getWest()) / n).toFixed(2)]);
    }
    const col = (g) => g >= 90 ? '#EF4444' : g >= 70 ? '#FB923C' : g >= 50 ? '#FACC15' : g >= 30 ? '#4ADE80' : '#7DD3FC';
    const res = [];
    for (let i = 0; i < pts.length; i += 4) {            // max 4 parallel requests
      res.push(...await Promise.all(pts.slice(i, i + 4).map(async ([la, lo]) => {
        const key = la + ',' + lo, c = windCache[key];
        if (c && Date.now() - c.t < 30 * 60 * 1000) return c.v;
        try {
          const r = await fetch('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=' + la + '&lon=' + lo);
          const d = (await r.json()).properties.timeseries[0].data.instant.details;
          const v = { la, lo, dir: d.wind_from_direction, g: (d.wind_speed_of_gust ?? d.wind_speed * 1.5) * 3.6 };
          windCache[key] = { t: Date.now(), v }; return v;
        } catch (e) { return null; }
      })));
    }
    if (layerMode !== 'wind') return;
    clearWind();
    res.filter(Boolean).forEach((p) => {
      const el = document.createElement('div');
      el.className = 'warrow'; el.style.cssText = 'width:44px;height:44px;flex-direction:column;pointer-events:none';
      el.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" style="transform:rotate(' + ((p.dir + 180) % 360) + 'deg)" aria-hidden="true"><path d="M12 3l6 9h-4v9h-4v-9H6z" fill="' + col(p.g) + '"/></svg>' + Math.round(p.g);
      windMarkers.push(new maplibregl.Marker({ element: el }).setLngLat([p.lo, p.la]).addTo(map));
    });
  }, 500);
}

// legend modal (RainViewer "Universal Blue" colours)
const LR = [['#88DDEE', 'Slabý dážď, mrholenie', 'do 0,5 mm/h'], ['#00A3E0', 'Slabý dážď', '0,5–1 mm/h'], ['#0077AA', 'Mierny dážď', '1–3 mm/h'], ['#005588', 'Mierny až silnejší', '3–6 mm/h'],
  ['#FFEE00', 'Silný dážď', '6–12 mm/h'], ['#FFAA00', 'Lejak', '12–25 mm/h'], ['#FF4400', 'Prívalový dážď', '25–50 mm/h'], ['#C10000', 'Búrka', '50–100 mm/h'], ['#FFAAFF', 'Extrémna búrka, krupobitie', 'nad 100 mm/h']];
const LS = [['#BFFFFF', 'Slabé sneženie, poletovanie', 'do 0,5 mm/h · ~0,5 cm/h'], ['#7FBFFF', 'Mierne sneženie', '0,5–1 mm/h · ~1 cm/h'], ['#3F7FFF', 'Husté sneženie', '1–2,5 mm/h · 1–3 cm/h'], ['#003FFF', 'Veľmi silné, fujavica', 'nad 2,5 mm/h · 3+ cm/h']];
const lrow = (r) => '<div style="display:flex;align-items:center;gap:12px;min-height:40px;border-top:1px solid #1B2740"><span style="width:28px;height:14px;border-radius:4px;background:' + r[0] + ';flex-shrink:0"></span><span style="flex:1;font-size:14px">' + r[1] + '</span><span style="font-size:13px;font-weight:600;color:var(--mut2);text-align:right">' + r[2] + '</span></div>';
$('legRain').innerHTML = LR.map(lrow).join(''); $('legSnow').innerHTML = LS.map(lrow).join('');
$('legInfo').onclick = () => $('legendModal').classList.remove('hide');

/* ============ search (offline) ============ */
let qTimer = null, lastResults = [];
$('q').addEventListener('input', (e) => {
  clearTimeout(qTimer);
  const q = e.target.value.trim();
  if (q.length < 2) { $('results').classList.add('hide'); return; }
  qTimer = setTimeout(async () => {
    await loadPlaces();
    lastResults = searchPlaces(q);
    $('results').innerHTML = lastResults.length ? lastResults.map((p, i) => '<button class="row" data-i="' + i + '" style="padding:10px 16px;min-height:56px;flex-direction:column;align-items:flex-start;gap:2px"><span style="color:#EAF0FA">' + esc(p.n) + '</span><span style="font-size:12px;font-weight:400;color:var(--mut)">' + esc(placeSub(p)) + '</span></button>').join('')
      : '<div style="padding:16px;color:var(--mut)">Nič som nenašiel. Skús väčšie mesto v okolí.</div>';
    $('results').classList.remove('hide');
  }, 150);
});
$('results').onclick = (ev) => {
  const b = ev.target.closest('[data-i]'); if (!b) return;
  const p = lastResults[+b.dataset.i];
  place = { name: p.n, sub: placeSub(p), lat: p.lat, lon: p.lon, cc: p.cc, auto: false };
  store.set('place', place);
  if (!saved.find((s) => Math.abs(s.lat - place.lat) < 0.01 && Math.abs(s.lon - place.lon) < 0.01)) { saved.unshift(place); saved = saved.slice(0, 8); store.set('saved', saved); }
  $('q').value = ''; $('results').classList.add('hide');
  view = 'local'; setViewBtns();
  location.hash = '#home'; load();
};
$('useLoc').onclick = () => { view = 'local'; setViewBtns(); location.hash = '#home'; useMyLocation(); };
const savedCache = {};
async function renderSaved() {
  loadPlaces();
  if (!saved.length) { $('saved').innerHTML = '<div style="grid-column:1/-1;color:var(--mut);font-size:14px">Vyhľadané mestá sa uložia sem.</div>'; return; }
  $('saved').innerHTML = saved.map((s, i) => '<div class="card" style="padding:14px;display:flex;flex-direction:column;gap:8px;position:relative"><button data-s="' + i + '" style="all:unset;cursor:pointer;display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;color:var(--mut);padding-right:36px">' + esc(s.sub || '') + '</span><span style="font-size:16px;font-weight:600">' + esc(s.name) + '</span><span class="h" id="st' + i + '" style="font-size:30px;font-weight:500">–°</span></button>' +
    '<button data-del="' + i + '" aria-label="Odstrániť ' + esc(s.name) + '" style="position:absolute;right:4px;top:4px;width:44px;height:44px;border:none;background:transparent;color:var(--mut)">✕</button></div>').join('');
  for (let i = 0; i < saved.length; i++) {
    const s = saved[i], key = s.lat.toFixed(3) + ',' + s.lon.toFixed(3);
    try {
      let v = savedCache[key];
      if (!v || Date.now() - v.t > 20 * 60 * 1000) {
        const j = await fetchMet(s.lat, s.lon), e = j.properties.timeseries[0];
        v = savedCache[key] = { t: Date.now(), temp: e.data.instant.details.air_temperature, kind: sym((e.data.next_1_hours || e.data.next_6_hours).summary.symbol_code).kind };
      }
      const el = $('st' + i); if (el) el.innerHTML = Math.round(v.temp) + '° <span style="vertical-align:middle">' + icon(v.kind, 30) + '</span>';
    } catch (e) {}
  }
}
$('saved').onclick = (e) => {
  const d = e.target.closest('[data-del]');
  if (d) { saved.splice(+d.dataset.del, 1); store.set('saved', saved); renderSaved(); return; }
  const b = e.target.closest('[data-s]'); if (!b) return;
  place = Object.assign({}, saved[+b.dataset.s], { auto: false }); store.set('place', place);
  view = 'local'; setViewBtns(); location.hash = '#home'; load();
};

/* ============ start ============ */
$('placeBtn').onclick = () => { location.hash = '#search'; };
$('refreshBtn').onclick = () => { loadRadar(); if (place && place.auto) useMyLocation(); else load(); };
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && place) { const c = store.get('lastMet', null); if (!c || Date.now() - c.t > 10 * 60 * 1000) (place.auto ? useMyLocation() : load()); }
});
setInterval(() => { if (!document.hidden && place) load(); }, 15 * 60 * 1000);

(async function start() {
  const c = store.get('lastMet', null);
  if (c && place) { try { N = normalize(c.j, place.lat, place.lon); renderHome(); } catch (e) {} }
  initMap();
  setViewBtns();
  route();
  if (!place || place.auto) await useMyLocation(); else await load();
  if (settings.country !== 'auto' && settings.remember && store.get('settings', {}).country) map.once('idle', showCountry);
})();
