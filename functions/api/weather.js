export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const kv = env.WEATHER_KV;
  const expectedToken = env.WEATHER_TOKEN || "change-me";
  const dataKey = "latest-weather";
  const historyKey = "temp-history-24h";

  if (request.method === "POST") {
    try {
      const body = await request.json();

      if (!body || body.token !== expectedToken) {
        return json({ ok: false, error: "unauthorized" }, 401);
      }

      const nowIso = body.timestamp || new Date().toISOString();
      const record = {
        temp_f: numberOr(body.temp_f, 0),
        humidity: numberOr(body.humidity, 0),
        wind_mph: numberOr(body.wind_mph, 0),
        wind_dir: String(body.wind_dir || "N"),
        rain_today_in: numberOr(body.rain_today_in, 0),
        rain_24h_in: numberOr(body.rain_24h_in, 0),
        battery_v: numberOr(body.battery_v, 0),
        rssi: Number.isFinite(Number(body.rssi)) ? Number(body.rssi) : 0,
        timestamp: nowIso,
        updated_at: new Date().toISOString()
      };

      let history = [];
      if (kv) {
        const existingHistory = await kv.get(historyKey, "json");
        history = Array.isArray(existingHistory) ? existingHistory : [];
      }

      history.push({
        t: record.timestamp,
        temp_f: record.temp_f
      });

      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      history = history.filter((p) => {
        const ts = new Date(p.t).getTime();
        return Number.isFinite(ts) && ts >= cutoff;
      });

      if (kv) {
        await kv.put(dataKey, JSON.stringify(record));
        await kv.put(historyKey, JSON.stringify(history));
      }

      return new Response("ok");
    } catch (err) {
      return json({ ok: false, error: "bad_request", detail: String(err) }, 400);
    }
  }

  if (request.method === "GET") {
    const accept = request.headers.get("accept") || "";
    const wantsJson = url.searchParams.get("format") === "json" || accept.includes("application/json");

    let latest = null;
    let history = [];

    if (kv) {
      latest = await kv.get(dataKey, "json");
      const existingHistory = await kv.get(historyKey, "json");
      history = Array.isArray(existingHistory) ? existingHistory : [];
    }

    if (!latest) {
      latest = {
        temp_f: 72.7,
        humidity: 73,
        wind_mph: 9.7,
        wind_dir: "SSW",
        rain_today_in: 0,
        rain_24h_in: 0,
        battery_v: 0,
        rssi: -52,
        timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    if (!history.length) {
      history = demoHistory();
    }

    const payload = { ...latest, history };

    if (wantsJson) {
      return json(payload);
    }

    return new Response(renderHtml(payload), {
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-store"
      }
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store"
    }
  });
}

function numberOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(d);
}

function demoHistory() {
  const now = Date.now();
  const points = [];
  for (let i = 24; i >= 0; i--) {
    const t = new Date(now - i * 60 * 60 * 1000).toISOString();
    const base = 69 + Math.sin((24 - i) / 24 * Math.PI * 1.5) * 6;
    points.push({ t, temp_f: Number(base.toFixed(1)) });
  }
  return points;
}

function renderHtml(data) {
  const safeData = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Heltec ESP32 Weather Node</title>
  <style>
    :root {
      --bg: #0b1220;
      --panel: #111827;
      --text: #e5e7eb;
      --muted: #94a3b8;
      --line: #263244;
      --shadow: 0 10px 30px rgba(0,0,0,.35);
      --radius: 22px;
}
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(180deg, #0b1220 0%, #111827 100%);
      color: var(--text);
}
    .wrap {
      max-width: 1400px;
      margin: 0 auto;
      padding: 28px;
    }
    .shell {
      background: rgba(17,24,39,.82);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(148,163,184,.12);
      border-radius: 30px;
      box-shadow: var(--shadow);
      padding: 28px;
}
    h1 {
      margin: 0;
      text-align: center;
      font-size: clamp(2rem, 5vw, 4rem);
      line-height: 1;
      letter-spacing: -.04em;
    }
    .sub {
      margin: 12px 0 24px;
      text-align: center;
      color: var(--muted);
      font-size: clamp(1rem, 2vw, 1.35rem);
    }
    .grid-top {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
      margin-bottom: 18px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 20px;
      min-height: 220px;
    }
    .label {
      font-size: .95rem;
      letter-spacing: .04em;
      color: #cbd5e1;
      text-transform: uppercase;
      margin-bottom: 18px;
}
    .metric-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .icon {
      font-size: 3rem;
      width: 72px;
      text-align: center;
      flex: 0 0 72px;
    }
    .value {
      font-size: clamp(2.25rem, 4vw, 4.4rem);
      font-weight: 800;
      line-height: .95;
      letter-spacing: -.04em;
    }
    .unit {
      font-size: .5em;
      font-weight: 700;
      margin-left: 6px;
    }
    .meta {
      color: var(--muted);
      font-size: 1rem;
      margin-top: 14px;
    }
    .wind-dir-big {
      font-size: 2.2rem;
      font-weight: 800;
      margin-top: 18px;
    }
    .rain-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 18px;
    }
    .rain-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 20px;
      min-height: 160px;
    }
    .chart-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 20px;
    }
    .chart-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .chart-title {
      font-size: 1.2rem;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .minmax {
      display: flex;
      gap: 24px;
      font-weight: 700;
      font-size: 1.1rem;
    }
    .minmax span:first-child { color: #60a5fa; }
    .minmax span:last-child { color: #f87171; }
    svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .footer {
      text-align: center;
      color: var(--muted);
      margin-top: 16px;
      font-size: 1rem;
    }
    @media (max-width: 1100px) {
      .grid-top { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 720px) {
      .wrap { padding: 14px; }
      .shell { padding: 16px; border-radius: 20px; }
      .grid-top, .rain-row { grid-template-columns: 1fr; }
      .card { min-height: auto; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="shell">
      <h1>Heltec ESP32 Weather Node</h1>
      <div class="sub">Last Updated: <span id="lastUpdated"></span> (Last Packet)</div>

      <section class="grid-top">
        <div class="card">
          <div class="label">Temperature</div>
          <div class="metric-row">
            <div class="icon">🌡️</div>
            <div>
              <div class="value"><span id="temp">--</span><span class="unit">°F</span></div>
            </div>
          </div>
          <div class="meta">Latest ambient temperature reading</div>
        </div>

        <div class="card">
          <div class="label">Humidity</div>
          <div class="metric-row">
            <div class="icon">💧</div>
            <div>
              <div class="value"><span id="humidity">--</span><span class="unit">%</span></div>
            </div>
          </div>
          <div class="meta">Relative humidity</div>
        </div>

        <div class="card">
          <div class="label">Wind Speed</div>
          <div class="metric-row">
            <div class="icon">💨</div>
            <div>
              <div class="value"><span id="wind">--</span><span class="unit">mph</span></div>
            </div>
          </div>
          <div class="meta">Current wind speed</div>
        </div>

        <div class="card">
          <div class="label">Wind Direction</div>
          <div class="metric-row">
            <div class="icon">🧭</div>
            <div>
              <div class="wind-dir-big" id="windDir">--</div>
            </div>
          </div>
          <div class="meta">Latest cardinal direction</div>
        </div>
      </section>

      <section class="rain-row">
        <div class="rain-card">
          <div class="label">Rain Today</div>
          <div class="metric-row">
            <div class="icon">🌧️</div>
            <div>
              <div class="value"><span id="rainToday">--</span><span class="unit">in</span></div>
            </div>
          </div>
          <div class="meta">Accumulation since local midnight</div>
        </div>

        <div class="rain-card">
          <div class="label">Rain, Last 24 Hours</div>
          <div class="metric-row">
            <div class="icon">🌦️</div>
            <div>
              <div class="value"><span id="rain24h">--</span><span class="unit">in</span></div>
            </div>
          </div>
          <div class="meta">Rolling 24 hour total</div>
        </div>
      </section>

      <section class="chart-card">
        <div class="chart-head">
          <div class="chart-title">Temperature, Last 24 Hours</div>
          <div class="minmax">
            <span>Min <span id="minTemp">--</span>°F</span>
            <span>Max <span id="maxTemp">--</span>°F</span>
          </div>
        </div>
        <svg id="chart" viewBox="0 0 1200 340" preserveAspectRatio="none" aria-label="24 hour temperature trend chart"></svg>
      </section>

      <div class="footer">Built by Austin Emery • ESP32 + Cloudflare Weather System  </div>
    </div>
  </div>

  <script>
    const initialData = ${safeData};

    function setText(id, value) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }

    function render(data) {
      setText('temp', fmt1(data.temp_f));
      setText('humidity', fmt0(data.humidity));
      setText('wind', fmt1(data.wind_mph));
      setText('windDir', data.wind_dir || 'N');
      setText('rainToday', fmt2(data.rain_today_in));
      setText('rain24h', fmt2(data.rain_24h_in));
      setText('lastUpdated', formatDate(data.timestamp || data.updated_at));

      const history = Array.isArray(data.history) ? data.history : [];
      const temps = history.map(p => Number(p.temp_f)).filter(Number.isFinite);
      const min = temps.length ? Math.min(...temps) : Number(data.temp_f || 0);
      const max = temps.length ? Math.max(...temps) : Number(data.temp_f || 0);
      const age = Date.now() - new Date(data.timestamp).getTime();
if (age > 5 * 60 * 1000) {
  document.body.style.opacity = 0.6;
}
      setText('minTemp', fmt1(min));
      setText('maxTemp', fmt1(max));
      drawChart(history);
    }

    function fmt0(n) { return Number(n).toFixed(0); }
    function fmt1(n) { return Number(n).toFixed(1); }
    function fmt2(n) { return Number(n).toFixed(2); }

    function formatDate(ts) {
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return 'Unknown';
      return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
      }).format(d);
    }

    function drawChart(history) {
      const svg = document.getElementById('chart');
      const w = 1200;
      const h = 340;
      const pad = { top: 20, right: 20, bottom: 40, left: 50 };
      const innerW = w - pad.left - pad.right;
      const innerH = h - pad.top - pad.bottom;
      const points = history.length ? history : [{ t: new Date().toISOString(), temp_f: 0 }];
      const temps = points.map(p => Number(p.temp_f)).filter(Number.isFinite);
      const min = Math.min(...temps);
      const max = Math.max(...temps);
      const range = Math.max(max - min, 1);

      const coords = points.map((p, i) => {
        const x = pad.left + (i / Math.max(points.length - 1, 1)) * innerW;
        const y = pad.top + (1 - ((Number(p.temp_f) - min) / range)) * innerH;
        return [x, y];
      });

      const line = coords.map((c, i) => {
  return (i === 0 ? 'M ' : 'L ') + c[0] + ' ' + c[1];
}).join(' ');

const area =
  line +
  ' L ' + coords[coords.length - 1][0] + ' ' + (h - pad.bottom) +
  ' L ' + coords[0][0] + ' ' + (h - pad.bottom) +
  ' Z';

const grid = Array.from({ length: 5 }).map((_, i) => {
  const y = pad.top + (i / 4) * innerH;
  const val = (max - (i / 4) * range).toFixed(0);
  return '<line x1="' + pad.left + '" y1="' + y + '" x2="' + (w - pad.right) + '" y2="' + y + '" stroke="#334155" stroke-dasharray="5 6" />' +
         '<text x="8" y="' + (y + 5) + '" fill="#94a3b8" font-size="14">' + val + '</text>';
}).join('');

const xLabels = [0, .25, .5, .75, 1].map((p) => {
  const idx = Math.min(points.length - 1, Math.round((points.length - 1) * p));
  const d = new Date(points[idx].t);
  const label = Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const x = pad.left + p * innerW;
  return '<text x="' + x + '" y="' + (h - 10) + '" text-anchor="middle" fill="#94a3b8" font-size="14">' + label + '</text>';
}).join('');

const circles = coords.map((c) => {
  return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="2.2" fill="#60a5fa"></circle>';
}).join('');

svg.innerHTML =
  '<defs>' +
    '<linearGradient id="fillBlue" x1="0" x2="0" y1="0" y2="1">' +
      '<stop offset="0%" stop-color="rgba(53,114,239,.28)"/>' +
      '<stop offset="100%" stop-color="rgba(53,114,239,.06)"/>' +
    '</linearGradient>' +
  '</defs>' +
  grid +
  '<path d="' + area + '" fill="url(#fillBlue)"></path>' +
  '<path d="' + line + '" fill="none" stroke="#60a5fa" filter="drop-shadow(0 0 6px rgba(96,165,250,.4))" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>' +
  circles +
  xLabels;
    }

    render(initialData);

    setInterval(async () => {
      try {
        const res = await fetch('/api/weather?format=json', { cache: 'no-store' });
        if (!res.ok) return;
        const fresh = await res.json();
        render(fresh);
      } catch (e) {
        console.log('Refresh skipped', e);
      }
    }, 60000);
  </script>
</body>
</html>`;
}
