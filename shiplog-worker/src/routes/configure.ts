/**
 * Configure route for the ShipCard Worker.
 *
 * GET /configure — Serves a self-contained HTML browser configurator.
 *
 * The page reads stats from the URL hash fragment (#base64encodedJSON),
 * lets the user toggle stats and pick appearance options, shows a live
 * SVG preview, and generates CLI commands + embed snippets.
 *
 * No authentication required — the stats data is passed client-side only
 * via the hash fragment and never touches the server.
 *
 * Security note: innerHTML is used in this file to inject SVG/HTML output.
 * All user-derived strings are sanitized via escXml() before insertion.
 * The SVG templates are constructed from controlled strings + escaped values.
 */

import { Hono } from "hono";
import type { AppType } from "../types.js";

export const configureRoutes = new Hono<AppType>();

// ---------------------------------------------------------------------------
// HTML configurator page
// ---------------------------------------------------------------------------

/* eslint-disable no-secrets/no-secrets */
const CONFIGURATOR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ShipCard Card Configurator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #141413;
    --fg: #faf9f5;
    --mid: #b0aea5;
    --light: #e8e6dc;
    --orange: #d97757;
    --blue: #6a9bcc;
    --green: #788c5d;
    --surface: #1e1e1c;
    --border: #2a2a28;
    --radius: 8px;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    background: var(--bg);
    color: var(--fg);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  nav {
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 960px;
    margin: 0 auto;
    width: 100%;
  }
  .nav-brand {
    font-size: 18px;
    font-weight: 700;
    color: var(--fg);
    text-decoration: none;
    letter-spacing: -0.02em;
  }
  .nav-links { display: flex; gap: 20px; align-items: center; }
  .nav-links a {
    color: var(--mid);
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
    transition: color 0.15s;
  }
  .nav-links a:hover { color: var(--fg); }
  .badge {
    font-size: 11px;
    background: var(--surface);
    color: var(--mid);
    padding: 2px 8px;
    border-radius: 10px;
    border: 1px solid var(--border);
  }
  .layout {
    display: flex;
    flex: 1;
    gap: 24px;
    max-width: 960px;
    margin: 0 auto;
    padding: 0 24px 48px;
    width: 100%;
  }
  .sidebar {
    width: 280px;
    min-width: 280px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow-y: auto;
    padding: 20px;
  }
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 24px;
    overflow-y: auto;
  }
  .config-group { margin-bottom: 20px; }
  .config-group:last-child { margin-bottom: 0; }
  .config-group-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--mid);
    margin-bottom: 12px;
  }
  .config-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
  }
  .config-label { font-size: 13px; color: var(--light); }
  .btn-group {
    display: flex;
    gap: 0;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .btn-group button {
    flex: 1;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 600;
    background: var(--bg);
    color: var(--mid);
    border: none;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }
  .btn-group button + button { border-left: 1px solid var(--border); }
  .btn-group button.active {
    background: var(--orange);
    color: var(--bg);
  }
  .toggle {
    position: relative;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
  }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-track {
    position: absolute;
    inset: 0;
    background: var(--border);
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .toggle input:checked + .toggle-track { background: var(--orange); }
  .toggle-track::after {
    content: "";
    position: absolute;
    width: 14px;
    height: 14px;
    background: var(--fg);
    border-radius: 50%;
    top: 3px;
    left: 3px;
    transition: transform 0.15s;
  }
  .toggle input:checked + .toggle-track::after { transform: translateX(16px); }
  .reset-btn {
    width: 100%;
    padding: 8px;
    margin-top: 16px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--mid);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .reset-btn:hover { border-color: var(--orange); color: var(--orange); }
  .preview-area {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .preview-area svg { max-width: 100%; }
  .preview-label {
    font-size: 11px;
    color: var(--mid);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .snippet-wrap {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .tabs-bar {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--border);
  }
  .tab-btn {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--mid);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .tab-btn.active { color: var(--orange); border-bottom-color: var(--orange); }
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  .snippet-title {
    padding: 8px 16px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mid);
    border-bottom: 1px solid var(--border);
  }
  .code-block {
    background: #0d0d0c;
    color: var(--light);
    font-family: "SF Mono", "Fira Code", "Consolas", monospace;
    font-size: 12px;
    padding: 12px 14px;
    border-radius: var(--radius);
    overflow-x: auto;
    white-space: pre;
    position: relative;
  }
  .copy-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: var(--border);
    color: var(--mid);
    border: none;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .copy-btn:hover { background: var(--orange); color: var(--bg); }
  .copy-btn.copied { background: var(--green); color: var(--bg); }
  .no-data {
    padding: 48px 24px;
    text-align: center;
    color: var(--mid);
  }
  .no-data p { margin-bottom: 8px; }
  .no-data code {
    font-family: monospace;
    background: var(--surface);
    padding: 2px 6px;
    border-radius: 3px;
    color: var(--light);
  }
  .footer {
    text-align: center;
    padding: 24px;
    color: var(--mid);
    font-size: 13px;
  }
  .footer a { color: var(--orange); text-decoration: none; }
  .footer a:hover { text-decoration: underline; }
  @media (max-width: 700px) {
    .layout { flex-direction: column; }
    .sidebar { width: 100%; min-width: 0; }
  }
</style>
</head>
<body>
<nav>
  <a href="/" class="nav-brand">ShipCard</a>
  <div class="nav-links">
    <span class="badge">Configurator</span>
    <a href="https://github.com/jjaimealeman/shipcard" target="_blank" rel="noopener">GitHub</a>
    <a href="https://www.npmjs.com/package/shipcard" target="_blank" rel="noopener">npm</a>
    <a href="/">Home</a>
  </div>
</nav>

<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="config-group">
      <div class="config-group-title">Theme</div>
      <div class="btn-group" id="bg-theme">
        <button data-val="dark" class="active">Dark</button>
        <button data-val="light">Light</button>
      </div>
    </div>

    <div class="config-group">
      <div class="config-group-title">Layout</div>
      <div class="btn-group" id="bg-layout">
        <button data-val="classic" class="active">Classic</button>
        <button data-val="compact">Compact</button>
        <button data-val="hero">Hero</button>
      </div>
    </div>

    <div class="config-group">
      <div class="config-group-title">Style</div>
      <div class="btn-group" id="bg-style">
        <button data-val="github" class="active">GitHub</button>
        <button data-val="branded">Branded</button>
        <button data-val="minimal">Minimal</button>
      </div>
    </div>

    <div class="config-group">
      <div class="config-group-title">Stats</div>
      <div class="config-row"><span class="config-label">Sessions</span><label class="toggle"><input type="checkbox" id="tog-sessions" checked><span class="toggle-track"></span></label></div>
      <div class="config-row"><span class="config-label">Tool Calls</span><label class="toggle"><input type="checkbox" id="tog-toolCalls" checked><span class="toggle-track"></span></label></div>
      <div class="config-row"><span class="config-label">Projects</span><label class="toggle"><input type="checkbox" id="tog-projects" checked><span class="toggle-track"></span></label></div>
      <div class="config-row"><span class="config-label">Cost</span><label class="toggle"><input type="checkbox" id="tog-cost" checked><span class="toggle-track"></span></label></div>
    </div>

    <button class="reset-btn" id="btn-reset">Reset to defaults</button>
  </aside>

  <main class="main" id="main-content">
    <div class="preview-area" id="preview-area">
      <div class="preview-label">Live Preview</div>
      <div id="svg-container"></div>
    </div>

    <div class="snippet-wrap" id="snippet-wrap">
      <div class="tabs-bar">
        <button class="tab-btn active" data-tab="md">Markdown</button>
        <button class="tab-btn" data-tab="html">HTML</button>
      </div>
      <div class="tab-content active" id="tab-md">
        <div class="code-block" id="snippet-md"></div>
      </div>
      <div class="tab-content" id="tab-html">
        <div class="code-block" id="snippet-html"></div>
      </div>
    </div>

    <div class="snippet-wrap">
      <div class="snippet-title">CLI Command</div>
      <div class="code-block" id="cli-block"></div>
    </div>

    <div class="snippet-wrap">
      <div class="snippet-title">Card URL</div>
      <div class="code-block" id="url-block"></div>
    </div>
  </main>
</div>

<footer class="footer">
  <p>MIT License &middot; Made by <a href="https://github.com/jjaimealeman">jjaimealeman</a></p>
</footer>

<script>
(function() {
  // Parse stats from hash fragment
  var stats = null;
  try {
    var hash = window.location.hash.slice(1);
    if (hash) { stats = JSON.parse(atob(hash)); }
  } catch (e) { /* ignore */ }

  if (!stats) {
    document.getElementById('main-content').innerHTML =
      '<div class="no-data">' +
      '<p>No stats data found.</p>' +
      '<p>Run <code>shipcard sync</code> to open this page with your stats.</p>' +
      '</div>';
    document.getElementById('sidebar').style.display = 'none';
    return;
  }

  var username = stats.username || 'unknown';
  var workerOrigin = window.location.origin;
  var STORAGE_KEY = 'shipcard_config_' + username;
  var savedPrefs = {};
  try { savedPrefs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) {}

  var state = {
    sessions: savedPrefs.sessions !== false,
    toolCalls: savedPrefs.toolCalls !== false,
    projects: savedPrefs.projects !== false,
    cost: savedPrefs.cost !== false,
    layout: savedPrefs.layout || 'classic',
    style: savedPrefs.style || 'github',
    theme: savedPrefs.theme || 'dark',
  };

  // Apply loaded prefs to controls (toggles: checked = shown)
  document.getElementById('tog-sessions').checked = state.sessions;
  document.getElementById('tog-toolCalls').checked = state.toolCalls;
  document.getElementById('tog-projects').checked = state.projects;
  document.getElementById('tog-cost').checked = state.cost;

  function setActiveBtn(groupId, val) {
    var btns = document.getElementById(groupId).querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-val') === val);
    }
  }
  setActiveBtn('bg-theme', state.theme);
  setActiveBtn('bg-layout', state.layout);
  setActiveBtn('bg-style', state.style);

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  // Button group listeners
  ['theme','layout','style'].forEach(function(key) {
    var group = document.getElementById('bg-' + key);
    group.addEventListener('click', function(e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      state[key] = btn.getAttribute('data-val');
      setActiveBtn('bg-' + key, state[key]);
      saveState(); render();
    });
  });

  // Toggle listeners (checked = shown)
  ['sessions','toolCalls','projects','cost'].forEach(function(key) {
    document.getElementById('tog-' + key).addEventListener('change', function(e) {
      state[key] = e.target.checked;
      saveState(); render();
    });
  });

  // Reset button
  document.getElementById('btn-reset').addEventListener('click', function() {
    state = { sessions:true, toolCalls:true, projects:true, cost:true, layout:'classic', style:'github', theme:'dark' };
    document.getElementById('tog-sessions').checked = true;
    document.getElementById('tog-toolCalls').checked = true;
    document.getElementById('tog-projects').checked = true;
    document.getElementById('tog-cost').checked = true;
    setActiveBtn('bg-theme', 'dark');
    setActiveBtn('bg-layout', 'classic');
    setActiveBtn('bg-style', 'github');
    saveState(); render();
  });

  // XML escaping for all user-derived values inserted into SVG/HTML
  function escXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Theme palettes — matches the worker's SVG themes exactly
  var THEMES = {
    github: {
      dark:  { bg:'#0d1117', border:'#30363d', title:'#e6edf3', text:'#8b949e', value:'#e6edf3', icon:'#58a6ff', footer:'#8b949e' },
      light: { bg:'#ffffff', border:'#d0d7de', title:'#1f2328', text:'#656d76', value:'#1f2328', icon:'#0969da', footer:'#656d76' }
    },
    branded: {
      dark:  { bg:'#0a1929', border:'#1a3a5c', title:'#e9fdff', text:'#7eb8d8', value:'#e9fdff', icon:'#3d9cd2', footer:'#5a8aad' },
      light: { bg:'#e9fdff', border:'#b8dce6', title:'#205680', text:'#3a7a9e', value:'#205680', icon:'#205680', footer:'#5a8aad' }
    },
    minimal: {
      dark:  { bg:'#111111', border:'#222222', title:'#eeeeee', text:'#888888', value:'#cccccc', icon:'#888888', footer:'#555555' },
      light: { bg:'#ffffff', border:'#e8e8e8', title:'#111111', text:'#777777', value:'#333333', icon:'#777777', footer:'#aaaaaa' }
    }
  };

  // Stat icon paths — Lucide-style 24x24 stroke icons (matches worker)
  var ICONS = {
    sessions: 'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
    toolCalls: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
    models: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
    projects: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
    cost: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'
  };

  function iconSvg(pathD, color, x, y, size) {
    size = size || 16;
    return '<svg x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '" ' +
      'viewBox="0 0 24 24" fill="none" stroke="' + escXml(color) + '" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="' + escXml(pathD) + '"/></svg>';
  }

  function fmt(n) {
    if (typeof n !== 'number') return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString('en-US');
  }

  function buildStatItems(s) {
    var items = [];
    if (state.sessions) items.push({ key:'sessions', label:'Sessions', value:fmt(s.totalSessions), icon:ICONS.sessions });
    if (state.toolCalls) {
      var tc = Object.values(s.toolCallSummary || {}).reduce(function(a,b){return a+b;},0);
      items.push({ key:'toolCalls', label:'Tool Calls', value:fmt(tc), icon:ICONS.toolCalls });
    }
    if (state.projects) items.push({ key:'projects', label:'Projects', value:fmt(s.projectCount||0), icon:ICONS.projects });
    if (state.cost) items.push({ key:'cost', label:'Est. Cost', value:escXml(s.totalCost||'~$0.00'), icon:ICONS.cost });
    return items;
  }

  function getTheme() {
    var s = THEMES[state.style] || THEMES.github;
    return s[state.theme] || s.dark;
  }

  // Classic layout — matches worker's classic.ts exactly
  function renderClassic(s, c) {
    var items = buildStatItems(s);
    var W = 495, P = 20, TY = 35, SY = 60, RH = 30, FM = 20;
    var h = SY + items.length * RH + FM + 20;
    var rows = items.map(function(it, i) {
      var ry = SY + i * RH;
      var tb = ry + 14;
      return iconSvg(it.icon, c.icon, P, ry) +
        '<text x="' + (P + 24) + '" y="' + tb + '" font-size="13" fill="' + c.text + '">' + it.label + '</text>' +
        '<text x="' + (W - P) + '" y="' + tb + '" font-size="13" font-weight="600" text-anchor="end" fill="' + c.value + '">' + it.value + '</text>';
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + h + '" viewBox="0 0 ' + W + ' ' + h + '">' +
      '<style>text { font-family: "Segoe UI", Ubuntu, "Helvetica Neue", Sans-Serif; }</style>' +
      '<rect width="' + W + '" height="' + h + '" rx="4.5" fill="' + c.bg + '" stroke="' + c.border + '" stroke-width="1"/>' +
      '<text x="' + P + '" y="' + TY + '" font-size="18" font-weight="600" fill="' + c.title + '">ShipCard Stats</text>' +
      rows.join('') +
      '<text x="' + (W / 2) + '" y="' + (h - 10) + '" font-size="10" text-anchor="middle" opacity="0.6" fill="' + c.footer + '">ShipCard</text>' +
      '</svg>';
  }

  // Compact layout — matches worker's compact.ts
  function renderCompact(s, c) {
    var items = buildStatItems(s);
    var W = 495, P = 20, TY = 32, SY = 52, CH = 44, IS = 14;
    var CW = (W - P * 2) / 2;
    var left = items.filter(function(_, i) { return i % 2 === 0; });
    var right = items.filter(function(_, i) { return i % 2 === 1; });
    var rowCount = Math.max(left.length, right.length);
    var h = SY + rowCount * CH + 14;
    function renderCol(arr, colX) {
      return arr.map(function(it, i) {
        var cy = SY + i * CH;
        return iconSvg(it.icon, c.icon, colX, cy, IS) +
          '<text x="' + (colX + IS + 6) + '" y="' + (cy + IS) + '" font-size="11" fill="' + c.text + '">' + it.label + '</text>' +
          '<text x="' + colX + '" y="' + (cy + IS + 16) + '" font-size="14" font-weight="600" fill="' + c.value + '">' + it.value + '</text>';
      }).join('');
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + h + '" viewBox="0 0 ' + W + ' ' + h + '">' +
      '<style>text { font-family: "Segoe UI", Ubuntu, "Helvetica Neue", Sans-Serif; }</style>' +
      '<rect width="' + W + '" height="' + h + '" rx="4.5" fill="' + c.bg + '" stroke="' + c.border + '" stroke-width="1"/>' +
      '<text x="' + P + '" y="' + TY + '" font-size="16" font-weight="600" fill="' + c.title + '">ShipCard Stats</text>' +
      renderCol(left, P) + renderCol(right, P + CW) +
      '<text x="' + (W / 2) + '" y="' + (h - 6) + '" font-size="10" text-anchor="middle" opacity="0.6" fill="' + c.footer + '">ShipCard</text>' +
      '</svg>';
  }

  // Hero layout — matches worker's hero.ts
  function renderHero(s, c) {
    var items = buildStatItems(s);
    var W = 495, P = 20, TY = 30, HY = 55, HIS = 28, HVS = 36;
    var secY = 155, secCW = (W - P * 2) / 4, secIS = 13, H = 220;
    var hero = items[0] || { label:'Sessions', value:'0', icon:ICONS.sessions };
    var rest = items.slice(1, 5);
    var divY = secY - 16;
    var secRows = rest.map(function(it, i) {
      var cx = P + i * secCW;
      return iconSvg(it.icon, c.icon, cx, secY, secIS) +
        '<text x="' + cx + '" y="' + (secY + secIS + 14) + '" font-size="11" font-weight="600" fill="' + c.value + '">' + it.value + '</text>' +
        '<text x="' + cx + '" y="' + (secY + secIS + 26) + '" font-size="10" fill="' + c.text + '">' + it.label + '</text>';
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<style>text { font-family: "Segoe UI", Ubuntu, "Helvetica Neue", Sans-Serif; }</style>' +
      '<rect width="' + W + '" height="' + H + '" rx="4.5" fill="' + c.bg + '" stroke="' + c.border + '" stroke-width="1"/>' +
      '<text x="' + P + '" y="' + TY + '" font-size="16" font-weight="600" fill="' + c.title + '">ShipCard Stats</text>' +
      iconSvg(hero.icon, c.icon, P, HY, HIS) +
      '<text x="' + (P + HIS + 12) + '" y="' + (HY + HVS - 4) + '" font-size="' + HVS + '" font-weight="700" fill="' + c.value + '">' + hero.value + '</text>' +
      '<text x="' + P + '" y="' + (HY + HIS + 28) + '" font-size="14" fill="' + c.text + '">' + hero.label + '</text>' +
      '<line x1="' + P + '" y1="' + divY + '" x2="' + (W - P) + '" y2="' + divY + '" stroke="' + c.border + '" stroke-width="1" opacity="0.5"/>' +
      secRows.join('') +
      '<text x="' + (W / 2) + '" y="' + (H - 8) + '" font-size="10" text-anchor="middle" opacity="0.6" fill="' + c.footer + '">ShipCard</text>' +
      '</svg>';
  }

  function renderSvg(s) {
    var c = getTheme();
    if (state.layout === 'compact') return renderCompact(s, c);
    if (state.layout === 'hero') return renderHero(s, c);
    return renderClassic(s, c);
  }

  function buildQs() {
    var p = [];
    if (state.theme !== 'dark') p.push('theme=' + state.theme);
    if (state.layout !== 'classic') p.push('layout=' + state.layout);
    if (state.style !== 'github') p.push('style=' + state.style);
    if (!state.sessions) p.push('hide=sessions');
    if (!state.toolCalls) p.push('hide=toolCalls');
    if (!state.projects) p.push('hide=projects');
    if (!state.cost) p.push('hide=cost');
    return p.length ? '?' + p.join('&') : '';
  }

  function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(function() {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
    }).catch(function() {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }

  function setBlockContent(blockId, text) {
    var block = document.getElementById(blockId);
    while (block.firstChild) block.removeChild(block.firstChild);
    block.appendChild(document.createTextNode(text));
    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', function() { copyText(text, btn); });
    block.appendChild(btn);
  }

  // Tab switching
  var tabBtns = document.querySelectorAll('.tab-btn');
  for (var i = 0; i < tabBtns.length; i++) {
    tabBtns[i].addEventListener('click', function(e) {
      var tab = e.target.getAttribute('data-tab');
      var allBtns = document.querySelectorAll('.tab-btn');
      for (var j = 0; j < allBtns.length; j++) allBtns[j].classList.remove('active');
      e.target.classList.add('active');
      document.getElementById('tab-md').classList.toggle('active', tab === 'md');
      document.getElementById('tab-html').classList.toggle('active', tab === 'html');
    });
  }

  function render() {
    var qs = buildQs();
    var cardUrl = workerOrigin + '/u/' + stats.username + qs;
    var cliExtra = '';
    if (state.theme !== 'dark') cliExtra += ' --theme ' + state.theme;
    if (state.layout !== 'classic') cliExtra += ' --layout ' + state.layout;
    if (state.style !== 'github') cliExtra += ' --style ' + state.style;

    // SVG preview — safe: constructed from controlled templates + escXml'd user values
    document.getElementById('svg-container').innerHTML = renderSvg(stats);

    // Tabs: Markdown + HTML
    setBlockContent('snippet-md', '![ShipCard Stats](' + cardUrl + ')');
    setBlockContent('snippet-html', '<img src="' + cardUrl + '" alt="ShipCard Stats" />');

    // Separate blocks
    setBlockContent('cli-block', 'shipcard sync --confirm' + cliExtra);
    setBlockContent('url-block', cardUrl);
  }

  render();
})();
</script>
</body>
</html>`;

/**
 * GET /configure
 *
 * Serves the self-contained HTML configurator page.
 * Stats data is passed as a base64-encoded JSON hash fragment by the CLI.
 * No authentication required — stats are client-side only via hash.
 */
configureRoutes.get("/", (c) => {
  return c.html(CONFIGURATOR_HTML);
});
