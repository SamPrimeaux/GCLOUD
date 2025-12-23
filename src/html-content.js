/**
 * Inline HTML content for GCLOUD Worker
 * This ensures the dashboard serves even if R2 fetch fails
 */

export const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MeauxAccess | Unified Operations Hub</title>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
          colors: {
            meaux: { cyan: '#00D4FF', blue: '#0077FF', purple: '#8b5cf6', pink: '#ec4899', indigo: '#6366f1' },
            slate: { 850: '#151e2e', 900: '#0f172a', 950: '#020617' }
          },
          animation: { 'float': 'float 6s ease-in-out infinite' },
          keyframes: { float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } } }
        }
      }
    };
  </script>

  <style>
    body { cursor: none; }
    .cursor-dot, .cursor-outline { position: fixed; top: 0; left: 0; transform: translate(-50%, -50%); border-radius: 50%; z-index: 9999; pointer-events: none; }
    .cursor-dot { width: 8px; height: 8px; background-color: #00D4FF; }
    .cursor-outline { width: 40px; height: 40px; border: 1px solid rgba(0, 212, 255, 0.5); transition: width 0.2s, height 0.2s, background-color 0.2s; }
    body.hovering .cursor-outline { width: 60px; height: 60px; background-color: rgba(0, 212, 255, 0.05); border-color: #00D4FF; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #020617; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #334155; }
    .hero-glass { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.05); }
  </style>
</head>

<body class="bg-slate-950 text-slate-300 font-sans antialiased overflow-hidden selection:bg-meaux-cyan selection:text-white">
  <div class="cursor-dot" id="cursor-dot"></div>
  <div class="cursor-outline" id="cursor-outline"></div>

  <div class="flex h-screen w-full relative">
    <main class="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950 relative">
      <header class="h-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md z-20 flex items-center justify-between px-8">
        <div class="text-white font-bold">MeauxAccess</div>
        <div class="text-xs text-slate-500 font-mono">D1: <span id="d1-status" class="text-slate-300">checking…</span></div>
      </header>

      <div class="flex-1 overflow-y-auto relative scroll-smooth">
        <div class="max-w-[1600px] mx-auto p-6 md:p-10 space-y-8 relative z-10">
          <div class="hero-glass rounded-3xl p-8 border border-white/5 relative">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div class="space-y-6">
                <h1 class="text-5xl font-bold leading-tight text-white tracking-tight">
                  Unified <span class="text-transparent bg-clip-text bg-gradient-to-r from-meaux-cyan to-meaux-purple">Operations Hub</span>
                </h1>
                <p class="text-slate-400 text-lg leading-relaxed">Live dashboard backed by Cloudflare D1 via Worker APIs.</p>
                <button id="refreshBtn" class="px-6 py-3 rounded-xl bg-gradient-to-r from-meaux-cyan to-meaux-blue text-white font-bold shadow-lg shadow-meaux-cyan/25 hover:shadow-meaux-cyan/40 transition-all">Refresh</button>
              </div>
              <div class="h-[300px] w-full relative">
                <div id="canvas-container" class="w-full h-full absolute inset-0 rounded-2xl overflow-hidden"></div>
                <div class="absolute bottom-6 right-6 bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center gap-4 animate-float">
                  <div class="w-10 h-10 rounded-full bg-meaux-cyan/20 flex items-center justify-center text-meaux-cyan font-black">M</div>
                  <div>
                    <div class="text-xs text-slate-400 uppercase tracking-wider">Worker Health</div>
                    <div class="text-lg font-mono font-bold text-white" id="health-pill">…</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="p-4 rounded-2xl bg-slate-900/50 border border-white/10">
              <div class="text-xs text-slate-500 uppercase tracking-widest">Grants</div>
              <div id="kpi-grants" class="text-2xl font-bold text-white mt-2">—</div>
              <div id="kpi-pending-grants" class="text-xs text-slate-400 mt-1">Pending: —</div>
            </div>
            <div class="p-4 rounded-2xl bg-slate-900/50 border border-white/10">
              <div class="text-xs text-slate-500 uppercase tracking-widest">Active Projects</div>
              <div id="kpi-projects" class="text-2xl font-bold text-white mt-2">—</div>
              <div class="text-xs text-slate-400 mt-1">Operational workload</div>
            </div>
            <div class="p-4 rounded-2xl bg-slate-900/50 border border-white/10">
              <div class="text-xs text-slate-500 uppercase tracking-widest">R2 Buckets</div>
              <div id="kpi-buckets" class="text-2xl font-bold text-white mt-2">—</div>
              <div class="text-xs text-slate-400 mt-1">Registry</div>
            </div>
            <div class="p-4 rounded-2xl bg-slate-900/50 border border-white/10">
              <div class="text-xs text-slate-500 uppercase tracking-widest">SEO Pages</div>
              <div id="kpi-seo" class="text-2xl font-bold text-white mt-2">—</div>
              <div class="text-xs text-slate-400 mt-1">Published</div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="hero-glass rounded-2xl p-6 border border-white/5">
              <div class="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                <h3 class="text-xl font-bold text-white">Pending Grants</h3>
                <div class="text-xs text-slate-500 font-mono" id="pending-grants-count">—</div>
              </div>
              <div class="overflow-y-auto max-h-[350px]">
                <table class="w-full text-sm">
                  <thead class="text-xs text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th class="text-left py-2 pr-3">Applicant</th>
                      <th class="text-left py-2 pr-3">Type</th>
                      <th class="text-right py-2 pr-3">Requested</th>
                      <th class="text-left py-2 pr-3">Created</th>
                    </tr>
                  </thead>
                  <tbody id="pending-grants-rows" class="divide-y divide-white/5"></tbody>
                </table>
              </div>
            </div>

            <div class="hero-glass rounded-2xl p-6 border border-white/5">
              <div class="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                <h3 class="text-xl font-bold text-white">Overdue Tasks</h3>
                <div class="text-xs text-slate-500 font-mono" id="overdue-tasks-count">—</div>
              </div>
              <div class="overflow-y-auto max-h-[350px]">
                <table class="w-full text-sm">
                  <thead class="text-xs text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th class="text-left py-2 pr-3">Task</th>
                      <th class="text-left py-2 pr-3">Project</th>
                      <th class="text-left py-2 pr-3">Due</th>
                      <th class="text-right py-2 pr-3">P</th>
                    </tr>
                  </thead>
                  <tbody id="overdue-tasks-rows" class="divide-y divide-white/5"></tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  </div>

  <script>
    async function fetchJSON(path, init) {
      const res = await fetch(path, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || res.statusText);
      return data;
    }
    function formatMoney(n) {
      const num = Number(n);
      if (Number.isNaN(num)) return '—';
      return num.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    }
    function formatDate(d) {
      if (!d) return '—';
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return String(d);
      return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    async function hydrate() {
      const health = await fetchJSON('/health').catch(() => null);
      document.getElementById('health-pill').textContent = health?.status === 'ok' ? 'OK' : 'ERR';
      document.getElementById('d1-status').textContent = health?.features?.d1 ? 'connected' : 'missing';

      const overview = await fetchJSON('/api/dashboard/overview');
      const data = overview.data || {};
      const metricMap = Object.fromEntries((data.metrics || []).map(m => [m.metric, m.value]));
      document.getElementById('kpi-grants').textContent = metricMap['Grants'] ?? '—';
      document.getElementById('kpi-pending-grants').textContent = \`Pending: \${metricMap['Pending Grants'] ?? '—'}\`;
      document.getElementById('kpi-projects').textContent = metricMap['Active Projects'] ?? '—';
      document.getElementById('kpi-buckets').textContent = metricMap['R2 Buckets'] ?? '—';
      document.getElementById('kpi-seo').textContent = metricMap['SEO Pages'] ?? '—';

      const pending = data.pending_grants || [];
      document.getElementById('pending-grants-count').textContent = \`\${pending.length} shown\`;
      document.getElementById('pending-grants-rows').innerHTML = pending.map(g => \`
        <tr>
          <td class="py-2 pr-3 font-medium text-white">\${g.applicant_name || '—'}</td>
          <td class="py-2 pr-3 text-slate-400">\${g.grant_type || '—'}</td>
          <td class="py-2 pr-3 text-right text-white">\${formatMoney(g.amount_requested)}</td>
          <td class="py-2 pr-3 text-slate-400">\${formatDate(g.created_at)}</td>
        </tr>\`).join('') || \`<tr><td class="py-3 text-slate-500" colspan="4">No pending grants</td></tr>\`;

      const overdue = data.overdue_tasks || [];
      document.getElementById('overdue-tasks-count').textContent = \`\${overdue.length} shown\`;
      document.getElementById('overdue-tasks-rows').innerHTML = overdue.map(t => \`
        <tr>
          <td class="py-2 pr-3 font-medium text-white">\${t.title || '—'}</td>
          <td class="py-2 pr-3 text-slate-400">\${t.project_name || '—'}</td>
          <td class="py-2 pr-3 text-slate-400">\${formatDate(t.due_date)}</td>
          <td class="py-2 pr-3 text-right text-white">\${t.priority ?? 0}</td>
        </tr>\`).join('') || \`<tr><td class="py-3 text-slate-500" colspan="4">No overdue tasks</td></tr>\`;
    }

    function initGalaxy() {
      const container = document.getElementById('canvas-container');
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x0f172a, 0.04);
      const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
      camera.position.z = 25;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);

      const group = new THREE.Group(); scene.add(group);
      const starGeo = new THREE.BufferGeometry();
      const starCount = 1200;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 100;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 100;
        starPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8 }));
      group.add(stars);
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(12, 1), new THREE.MeshBasicMaterial({ color: 0x00D4FF, wireframe: true, transparent: true, opacity: 0.03 }));
      group.add(core);
      function animate() { requestAnimationFrame(animate); stars.rotation.y += 0.0005; core.rotation.y -= 0.001; core.rotation.x -= 0.0005; renderer.render(scene, camera); }
      animate();
      window.addEventListener('resize', () => { camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); });
    }

    function initCursor() {
      const dot = document.getElementById('cursor-dot');
      const outline = document.getElementById('cursor-outline');
      window.addEventListener('mousemove', (e) => {
        dot.style.left = \`\${e.clientX}px\`; dot.style.top = \`\${e.clientY}px\`;
        outline.animate({ left: \`\${e.clientX}px\`, top: \`\${e.clientY}px\` }, { duration: 500, fill: "forwards" });
      });
    }

    window.addEventListener('DOMContentLoaded', () => {
      initGalaxy();
      initCursor();
      document.getElementById('refreshBtn').addEventListener('click', () => hydrate().catch(console.warn));
      hydrate().catch(console.warn);
    });
  </script>
</body>
</html>`;
