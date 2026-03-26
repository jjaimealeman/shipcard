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
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    font-size: 14px;
    background: #f0f0f0;
    color: #1a1a1a;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    background: #1a1a1a;
    color: #f0f0f0;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  header h1 { font-size: 16px; font-weight: 600; letter-spacing: 0.02em; }
  header .badge {
    font-size: 11px;
    background: #333;
    color: #aaa;
    padding: 2px 8px;
    border-radius: 10px;
  }
  .layout {
    display: flex;
    flex: 1;
    gap: 0;
  }
  .sidebar {
    width: 280px;
    min-width: 280px;
    background: #fff;
    border-right: 1px solid #e0e0e0;
    overflow-y: auto;
    padding: 20px;
  }
  .main {
    flex: 1;
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    overflow-y: auto;
  }
  .section { margin-bottom: 24px; }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 10px;
  }
  .control-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #f5f5f5;
  }
  .control-row:last-child { border-bottom: none; }
  .control-label { font-size: 13px; color: #333; }
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
    background: #ccc;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .toggle input:checked + .toggle-track { background: #2563eb; }
  .toggle-track::after {
    content: "";
    position: absolute;
    width: 14px;
    height: 14px;
    background: white;
    border-radius: 50%;
    top: 3px;
    left: 3px;
    transition: transform 0.15s;
  }
  .toggle input:checked + .toggle-track::after { transform: translateX(16px); }
  select {
    font-size: 13px;
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    color: #1a1a1a;
    cursor: pointer;
    outline: none;
  }
  select:focus { border-color: #2563eb; }
  .preview-area {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .preview-area svg { max-width: 100%; }
  .preview-label {
    font-size: 11px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .output-area {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .output-section-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 6px;
  }
  .code-block {
    background: #1a1a1a;
    color: #e8e8e8;
    font-family: "SF Mono", "Fira Code", "Consolas", monospace;
    font-size: 12px;
    padding: 12px 14px;
    border-radius: 6px;
    overflow-x: auto;
    white-space: pre;
    position: relative;
  }
  .copy-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #333;
    color: #ccc;
    border: none;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    font-family: inherit;
  }
  .copy-btn:hover { background: #444; color: #fff; }
  .copy-btn.copied { background: #1d4ed8; color: #fff; }
  .no-data {
    padding: 48px 24px;
    text-align: center;
    color: #888;
  }
  .no-data p { margin-bottom: 8px; }
  .no-data code {
    font-family: monospace;
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 3px;
  }
</style>
</head>
<body>
<header>
  <h1>ShipCard</h1>
  <span class="badge">Card Configurator</span>
</header>

<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="section">
      <div class="section-title">Stats</div>
      <div class="control-row">
        <span class="control-label">Sessions</span>
        <label class="toggle"><input type="checkbox" id="tog-sessions" checked><span class="toggle-track"></span></label>
      </div>
      <div class="control-row">
        <span class="control-label">Tool Calls</span>
        <label class="toggle"><input type="checkbox" id="tog-toolCalls" checked><span class="toggle-track"></span></label>
      </div>
      <div class="control-row">
        <span class="control-label">Models Used</span>
        <label class="toggle"><input type="checkbox" id="tog-models" checked><span class="toggle-track"></span></label>
      </div>
      <div class="control-row">
        <span class="control-label">Projects</span>
        <label class="toggle"><input type="checkbox" id="tog-projects" checked><span class="toggle-track"></span></label>
      </div>
      <div class="control-row">
        <span class="control-label">Cost</span>
        <label class="toggle"><input type="checkbox" id="tog-cost" checked><span class="toggle-track"></span></label>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Appearance</div>
      <div class="control-row">
        <span class="control-label">Layout</span>
        <select id="sel-layout">
          <option value="classic">Classic</option>
          <option value="compact">Compact</option>
          <option value="hero">Hero</option>
        </select>
      </div>
      <div class="control-row">
        <span class="control-label">Style</span>
        <select id="sel-style">
          <option value="github">GitHub</option>
          <option value="branded">Branded</option>
          <option value="minimal">Minimal</option>
        </select>
      </div>
      <div class="control-row">
        <span class="control-label">Theme</span>
        <select id="sel-theme">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
    </div>
  </aside>

  <main class="main" id="main-content">
    <div class="preview-area" id="preview-area">
      <div class="preview-label">Live Preview</div>
      <div id="svg-container"></div>
    </div>
    <div class="output-area" id="output-area"></div>
  </main>
</div>

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
    models: savedPrefs.models !== false,
    projects: savedPrefs.projects !== false,
    cost: savedPrefs.cost !== false,
    layout: savedPrefs.layout || 'classic',
    style: savedPrefs.style || 'github',
    theme: savedPrefs.theme || 'dark',
  };

  // Apply loaded prefs to controls
  document.getElementById('tog-sessions').checked = state.sessions;
  document.getElementById('tog-toolCalls').checked = state.toolCalls;
  document.getElementById('tog-models').checked = state.models;
  document.getElementById('tog-projects').checked = state.projects;
  document.getElementById('tog-cost').checked = state.cost;
  document.getElementById('sel-layout').value = state.layout;
  document.getElementById('sel-style').value = state.style;
  document.getElementById('sel-theme').value = state.theme;

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  // Event listeners
  ['sessions','toolCalls','models','projects','cost'].forEach(function(key) {
    document.getElementById('tog-' + key).addEventListener('change', function(e) {
      state[key] = e.target.checked;
      saveState(); render();
    });
  });
  ['layout','style','theme'].forEach(function(key) {
    document.getElementById('sel-' + key).addEventListener('change', function(e) {
      state[key] = e.target.value;
      saveState(); render();
    });
  });

  // XML escaping for all user-derived values inserted into SVG/HTML
  function escXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var THEMES = {
    dark: { bg:'#0d1117', border:'#30363d', title:'#c9d1d9', label:'#8b949e', value:'#c9d1d9', accent:'#58a6ff', sub:'#8b949e' },
    light: { bg:'#ffffff', border:'#d0d7de', title:'#24292f', label:'#57606a', value:'#24292f', accent:'#0969da', sub:'#57606a' }
  };

  function fmt(n) { return typeof n === 'number' ? n.toLocaleString('en-US') : '0'; }

  function buildStatItems(s) {
    var items = [];
    if (state.sessions) items.push({ label:'Sessions', value:fmt(s.totalSessions) });
    if (state.toolCalls) {
      var tc = Object.values(s.toolCallSummary || {}).reduce(function(a,b){return a+b;},0);
      items.push({ label:'Tool Calls', value:fmt(tc) });
    }
    if (state.models) items.push({ label:'Models', value:String((s.modelsUsed||[]).length) });
    if (state.projects) items.push({ label:'Projects', value:fmt(s.projectCount||0) });
    if (state.cost) items.push({ label:'Est. Cost', value:escXml(s.totalCost||'~$0.00') });
    return items;
  }

  function renderClassic(s, c) {
    var items = buildStatItems(s);
    var h = 56 + Math.max(items.length, 1) * 30;
    var rows = items.map(function(it, i) {
      var y = 54 + i * 30;
      return '<text x="16" y="' + y + '" font-size="12" fill="' + c.label + '">' + it.label + '</text>' +
             '<text x="484" y="' + y + '" font-size="12" fill="' + c.value + '" text-anchor="end">' + it.value + '</text>';
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="' + h + '">' +
      '<rect width="500" height="' + h + '" rx="8" fill="' + c.bg + '" stroke="' + c.border + '" stroke-width="1"/>' +
      '<text x="16" y="28" font-size="14" font-weight="600" fill="' + c.title + '">ShipCard</text>' +
      '<text x="16" y="42" font-size="11" fill="' + c.sub + '">@' + escXml(s.username) + '</text>' +
      '<line x1="16" y1="46" x2="484" y2="46" stroke="' + c.border + '" stroke-width="1"/>' +
      rows.join('') + '</svg>';
  }

  function renderCompact(s, c) {
    var items = buildStatItems(s);
    var cols = Math.min(Math.max(items.length, 1), 5);
    var colW = Math.floor(500 / cols);
    var cells = items.slice(0, cols).map(function(it, i) {
      var cx = i * colW + colW / 2;
      return '<text x="' + cx + '" y="42" font-size="20" font-weight="700" fill="' + c.value + '" text-anchor="middle">' + it.value + '</text>' +
             '<text x="' + cx + '" y="60" font-size="11" fill="' + c.label + '" text-anchor="middle">' + it.label + '</text>';
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="76">' +
      '<rect width="500" height="76" rx="8" fill="' + c.bg + '" stroke="' + c.border + '" stroke-width="1"/>' +
      cells.join('') + '</svg>';
  }

  function renderHero(s, c) {
    var items = buildStatItems(s);
    var hero = items[0] || { label:'Sessions', value:'0' };
    var rest = items.slice(1, 5);
    var h = 110 + rest.length * 24;
    var restRows = rest.map(function(it, i) {
      var y = 90 + i * 24;
      return '<text x="16" y="' + y + '" font-size="12" fill="' + c.label + '">' + it.label + '</text>' +
             '<text x="484" y="' + y + '" font-size="12" fill="' + c.value + '" text-anchor="end">' + it.value + '</text>';
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="' + h + '">' +
      '<rect width="500" height="' + h + '" rx="8" fill="' + c.bg + '" stroke="' + c.border + '" stroke-width="1"/>' +
      '<text x="250" y="56" font-size="48" font-weight="800" fill="' + c.accent + '" text-anchor="middle">' + hero.value + '</text>' +
      '<text x="250" y="74" font-size="13" fill="' + c.sub + '" text-anchor="middle">' + hero.label + '</text>' +
      '<line x1="16" y1="82" x2="484" y2="82" stroke="' + c.border + '" stroke-width="1"/>' +
      restRows.join('') + '</svg>';
  }

  function renderSvg(s) {
    var c = THEMES[state.theme] || THEMES.dark;
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
    if (!state.models) p.push('hide=models');
    if (!state.projects) p.push('hide=projects');
    if (!state.cost) p.push('hide=cost');
    return p.length ? '?' + p.join('&') : '';
  }

  function buildOutputContent(s) {
    var qs = buildQs();
    var cardUrl = workerOrigin + '/u/' + escXml(s.username) + qs;
    var cliExtra = '';
    if (state.theme !== 'dark') cliExtra += ' --theme ' + state.theme;
    if (state.layout !== 'classic') cliExtra += ' --layout ' + state.layout;
    if (state.style !== 'github') cliExtra += ' --style ' + state.style;
    var cliCmd = 'shipcard sync --confirm' + cliExtra;

    // Build output sections as DOM nodes to avoid innerHTML on user content
    var frag = document.createDocumentFragment();
    [
      { title: 'CLI Command', id: 'cli-block', text: cliCmd },
      { title: 'Card URL', id: 'url-block', text: workerOrigin + '/u/' + s.username + qs },
      { title: 'Markdown', id: 'md-block', text: '![ShipCard Stats](' + workerOrigin + '/u/' + s.username + qs + ')' },
      { title: 'HTML', id: 'html-block', text: '<img src="' + workerOrigin + '/u/' + s.username + qs + '" alt="ShipCard Stats" />' },
    ].forEach(function(item) {
      var wrapper = document.createElement('div');
      var titleEl = document.createElement('div');
      titleEl.className = 'output-section-title';
      titleEl.textContent = item.title;
      var block = document.createElement('div');
      block.className = 'code-block';
      block.id = item.id;
      var textNode = document.createTextNode(item.text);
      var btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.setAttribute('data-target', item.id);
      btn.addEventListener('click', function() { copyCode(item.id, item.text, btn); });
      block.appendChild(textNode);
      block.appendChild(btn);
      wrapper.appendChild(titleEl);
      wrapper.appendChild(block);
      frag.appendChild(wrapper);
    });
    return frag;
  }

  function copyCode(id, text, btn) {
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

  function render() {
    // SVG preview: safe — constructed from controlled templates + escXml'd user values
    document.getElementById('svg-container').innerHTML = renderSvg(stats);
    // Output snippets: built via DOM API (no innerHTML on user content)
    var outputArea = document.getElementById('output-area');
    while (outputArea.firstChild) { outputArea.removeChild(outputArea.firstChild); }
    outputArea.appendChild(buildOutputContent(stats));
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
