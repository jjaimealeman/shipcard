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
<html class="dark" lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>ShipCard | Configure — Make your card yours.</title>
<meta name="description" content="Customize your ShipCard — toggle stats, pick a theme, choose a layout, and grab your embed code." />
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@700&family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
<script>
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-tertiary-container": "#4a4a56",
        "surface-dim": "#131318",
        "on-tertiary": "#2f2f3b",
        "inverse-surface": "#e4e1e9",
        "primary": "#00d4aa",
        "on-secondary": "#472a00",
        "on-background": "#e4e1e9",
        "on-primary": "#00382b",
        "tertiary": "#d8d6e4",
        "surface-container-high": "#2a292f",
        "on-error": "#690005",
        "error-container": "#93000a",
        "secondary-fixed": "#ffddb8",
        "secondary-container": "#ca8007",
        "surface-tint": "#28dfb5",
        "inverse-on-surface": "#303036",
        "tertiary-fixed-dim": "#c7c5d3",
        "surface-container-lowest": "#0e0e13",
        "surface": "#0a0a0f",
        "on-primary-container": "#005643",
        "on-secondary-fixed-variant": "#663e00",
        "inverse-primary": "#006b55",
        "on-surface-variant": "#8888a0",
        "surface-container-highest": "#35343a",
        "secondary": "#f0a030",
        "secondary-fixed-dim": "#ffb961",
        "tertiary-container": "#bcbac8",
        "surface-bright": "#39383e",
        "primary-fixed": "#55fcd0",
        "primary-container": "#00d4aa",
        "outline-variant": "#2a2a35",
        "on-tertiary-fixed": "#1a1b25",
        "primary-fixed-dim": "#28dfb5",
        "outline": "#85948d",
        "error": "#ffb4ab",
        "background": "#0a0a0f",
        "on-secondary-container": "#3e2400",
        "on-primary-fixed": "#002118",
        "tertiary-fixed": "#e3e1f0",
        "on-error-container": "#ffdad6",
        "surface-container-low": "#141419",
        "on-primary-fixed-variant": "#00513f",
        "on-surface": "#e8e8ed",
        "surface-container": "#1f1f25",
        "on-secondary-fixed": "#2b1700",
        "on-tertiary-fixed-variant": "#464651",
        "surface-variant": "#35343a"
      },
      fontFamily: {
        "headline": ["Instrument Sans", "sans-serif"],
        "body": ["IBM Plex Mono", "monospace"],
        "label": ["IBM Plex Mono", "monospace"]
      },
      borderRadius: {"DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "full": "0.75rem"},
    },
  },
}
</script>
<style>
.bg-dot-grid {
  background-image: radial-gradient(circle, #2a2a35 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(ellipse at center, black, transparent 80%);
}
.hero-glow {
  background: radial-gradient(circle at 50% 50%, rgba(0, 212, 170, 0.08) 0%, transparent 60%);
}
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
/* Toggle switch */
.toggle-track {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: #2a2a35;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
  display: inline-block;
}
.toggle-track::after {
  content: "";
  position: absolute;
  width: 14px;
  height: 14px;
  background: #e8e8ed;
  border-radius: 50%;
  top: 3px;
  left: 3px;
  transition: transform 0.15s;
}
.toggle-input:checked + .toggle-track {
  background: #00d4aa;
}
.toggle-input:checked + .toggle-track::after {
  transform: translateX(16px);
}
/* Button group active state */
.btn-opt.active {
  background-color: #00d4aa !important;
  color: #00382b !important;
  border-color: #00d4aa !important;
}
/* Tab active state */
.tab-btn.active {
  color: #00d4aa;
  border-bottom-color: #00d4aa;
}
/* Copy button states */
.copy-btn.copied {
  background: #00d4aa !important;
  color: #00382b !important;
}
/* Code block scrollbar */
.code-block::-webkit-scrollbar { height: 4px; }
.code-block::-webkit-scrollbar-track { background: transparent; }
.code-block::-webkit-scrollbar-thumb { background: #2a2a35; border-radius: 2px; }
</style>
</head>
<body class="bg-background text-on-surface font-body selection:bg-primary selection:text-on-primary">

<!-- NAVIGATION BAR -->
<nav class="sticky top-0 z-50 w-full border-b border-outline-variant/10 bg-background/80 backdrop-blur-md">
<div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
  <div class="flex items-center gap-2">
    <a href="/" class="flex items-center gap-2">
      <div class="w-6 h-6 text-primary">
        <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.578 8.578C5.528 11.628 3.451 15.514 2.609 19.745c-.841 4.23-.41 8.616 1.241 12.601 1.65 3.985 4.446 7.391 8.032 9.788 3.587 2.396 7.804 3.675 12.118 3.675 4.314 0 8.53-1.279 12.117-3.675 3.586-2.397 6.382-5.803 8.032-9.788 1.651-3.985 2.083-8.371 1.241-12.601-.842-4.231-2.919-8.117-5.969-11.167L24 24 8.578 8.578z" fill="currentColor"></path>
        </svg>
      </div>
      <span class="font-headline text-xl font-bold tracking-tight text-on-surface">ShipCard</span>
    </a>
  </div>
  <div class="hidden md:flex items-center gap-8 text-on-surface-variant text-sm font-medium">
    <a class="hover:text-on-surface transition-colors" href="/community">Community</a>
    <a class="text-primary transition-colors" href="/configure">Configurator</a>
    <a class="hover:text-on-surface transition-colors" href="https://www.npmjs.com/package/@jjaimealeman/shipcard" target="_blank" rel="noopener">npm</a>
    <a class="hover:text-on-surface transition-colors" href="https://github.com/jjaimealeman/shipcard" target="_blank" rel="noopener">GitHub</a>
  </div>
  <a href="https://github.com/jjaimealeman/shipcard" target="_blank" rel="noopener" class="border border-primary/20 hover:border-primary/40 text-primary px-4 py-2 text-sm font-medium transition-all inline-flex items-center gap-2">
    <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">star</span> Star on GitHub
  </a>
</div>
</nav>

<!-- PAGE HEADER -->
<section class="relative pt-16 pb-12 overflow-hidden">
<div class="absolute inset-0 bg-dot-grid pointer-events-none opacity-40"></div>
<div class="absolute inset-0 hero-glow pointer-events-none"></div>
<div class="max-w-7xl mx-auto px-6 text-center relative z-10">
  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6 uppercase tracking-widest">
    <span class="material-symbols-outlined text-sm">tune</span>
    Configurator
  </div>
  <h1 class="font-headline text-4xl md:text-5xl font-bold tracking-tight text-on-surface mb-4 leading-[1.1]">
    Make your card yours.
  </h1>
  <p class="text-on-surface-variant text-base md:text-lg max-w-xl mx-auto font-body leading-relaxed">
    Toggle stats, pick a theme, choose a layout, and grab your embed code.
  </p>
</div>
</section>

<!-- CONFIGURATOR LAYOUT -->
<section class="pb-24">
<div class="max-w-7xl mx-auto px-6">
  <div class="flex flex-col lg:flex-row gap-8" id="configurator-root">

    <!-- LEFT: CONTROLS -->
    <aside class="w-full lg:w-80 lg:min-w-[320px] flex-shrink-0" id="sidebar">
      <div class="bg-surface-container-low border border-outline-variant p-6 space-y-8 sticky top-24">

        <!-- Theme (dark/light) -->
        <div>
          <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-3">Theme</div>
          <div class="flex gap-0 border border-outline-variant rounded overflow-hidden" id="bg-theme">
            <button data-val="dark" class="btn-opt active flex-1 py-2 px-4 text-xs font-medium bg-surface-container border-r border-outline-variant text-on-surface-variant transition-all">Dark</button>
            <button data-val="light" class="btn-opt flex-1 py-2 px-4 text-xs font-medium bg-surface-container text-on-surface-variant transition-all">Light</button>
          </div>
        </div>

        <!-- Layout -->
        <div>
          <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-3">Layout</div>
          <div class="flex gap-0 border border-outline-variant rounded overflow-hidden" id="bg-layout">
            <button data-val="classic" class="btn-opt active flex-1 py-2 px-3 text-xs font-medium bg-surface-container border-r border-outline-variant text-on-surface-variant transition-all">Classic</button>
            <button data-val="compact" class="btn-opt flex-1 py-2 px-3 text-xs font-medium bg-surface-container border-r border-outline-variant text-on-surface-variant transition-all">Compact</button>
            <button data-val="hero" class="btn-opt flex-1 py-2 px-3 text-xs font-medium bg-surface-container text-on-surface-variant transition-all">Hero</button>
          </div>
        </div>

        <!-- Style -->
        <div>
          <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-3">Style</div>
          <div class="flex gap-0 border border-outline-variant rounded overflow-hidden" id="bg-style">
            <button data-val="github" class="btn-opt active flex-1 py-2 px-3 text-xs font-medium bg-surface-container border-r border-outline-variant text-on-surface-variant transition-all">GitHub</button>
            <button data-val="branded" class="btn-opt flex-1 py-2 px-3 text-xs font-medium bg-surface-container border-r border-outline-variant text-on-surface-variant transition-all">Branded</button>
            <button data-val="minimal" class="btn-opt flex-1 py-2 px-3 text-xs font-medium bg-surface-container text-on-surface-variant transition-all">Minimal</button>
          </div>
        </div>

        <!-- Stats Toggles -->
        <div>
          <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-3">Visible Stats</div>
          <div class="space-y-3">
            <label class="flex items-center justify-between cursor-pointer group">
              <span class="text-sm text-on-surface group-hover:text-primary transition-colors">Sessions</span>
              <span><input type="checkbox" id="tog-sessions" checked class="toggle-input sr-only"><span class="toggle-track"></span></span>
            </label>
            <label class="flex items-center justify-between cursor-pointer group">
              <span class="text-sm text-on-surface group-hover:text-primary transition-colors">Tool Calls</span>
              <span><input type="checkbox" id="tog-toolCalls" checked class="toggle-input sr-only"><span class="toggle-track"></span></span>
            </label>
            <label class="flex items-center justify-between cursor-pointer group">
              <span class="text-sm text-on-surface group-hover:text-primary transition-colors">Projects</span>
              <span><input type="checkbox" id="tog-projects" checked class="toggle-input sr-only"><span class="toggle-track"></span></span>
            </label>
            <label class="flex items-center justify-between cursor-pointer group">
              <span class="text-sm text-on-surface group-hover:text-primary transition-colors">Cost</span>
              <span><input type="checkbox" id="tog-cost" checked class="toggle-input sr-only"><span class="toggle-track"></span></span>
            </label>
          </div>
        </div>

        <!-- Reset -->
        <button class="w-full py-2.5 border border-outline-variant text-on-surface-variant text-xs font-medium hover:border-primary hover:text-primary transition-all rounded" id="btn-reset">
          Reset to defaults
        </button>
      </div>
    </aside>

    <!-- RIGHT: PREVIEW + SNIPPETS -->
    <main class="flex-1 space-y-6" id="main-content">

      <!-- Live Preview -->
      <div class="bg-surface-container-low border border-outline-variant p-8 md:p-12 flex flex-col items-center gap-4" id="preview-area">
        <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Live Preview</div>
        <div id="svg-container" class="w-full flex justify-center"></div>
      </div>

      <!-- Embed Code -->
      <div class="bg-surface-container-low border border-outline-variant overflow-hidden" id="snippet-wrap">
        <div class="flex border-b border-outline-variant">
          <button class="tab-btn active py-3 px-5 text-xs font-medium border-b-2 border-transparent text-on-surface-variant transition-all" data-tab="md">Markdown</button>
          <button class="tab-btn py-3 px-5 text-xs font-medium border-b-2 border-transparent text-on-surface-variant transition-all" data-tab="html">HTML</button>
        </div>
        <div class="tab-content active" id="tab-md">
          <div class="code-block relative bg-surface-container-lowest p-4 font-body text-xs text-primary overflow-x-auto whitespace-pre" id="snippet-md"></div>
        </div>
        <div class="tab-content hidden" id="tab-html">
          <div class="code-block relative bg-surface-container-lowest p-4 font-body text-xs text-primary overflow-x-auto whitespace-pre" id="snippet-html"></div>
        </div>
      </div>

      <!-- CLI Command -->
      <div class="bg-surface-container-low border border-outline-variant overflow-hidden">
        <div class="px-5 py-3 border-b border-outline-variant">
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">CLI Command</span>
        </div>
        <div class="code-block relative bg-surface-container-lowest p-4 font-body text-xs text-primary overflow-x-auto whitespace-pre" id="cli-block"></div>
      </div>

      <!-- Card URL -->
      <div class="bg-surface-container-low border border-outline-variant overflow-hidden">
        <div class="px-5 py-3 border-b border-outline-variant">
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Card URL</span>
        </div>
        <div class="code-block relative bg-surface-container-lowest p-4 font-body text-xs text-primary overflow-x-auto whitespace-pre" id="url-block"></div>
      </div>

    </main>
  </div>
</div>
</section>

<!-- FOOTER -->
<footer class="py-12 border-t border-outline-variant/5 bg-background">
<div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
  <div class="flex items-center gap-4">
    <span class="font-headline font-bold text-on-surface">ShipCard</span>
    <span class="text-on-surface-variant text-xs font-body">&copy; 2026</span>
  </div>
  <div class="flex gap-8 text-on-surface-variant text-xs font-medium">
    <a class="hover:text-on-surface" href="https://github.com/jjaimealeman/shipcard" target="_blank" rel="noopener">GitHub</a>
    <a class="hover:text-on-surface" href="https://www.npmjs.com/package/@jjaimealeman/shipcard" target="_blank" rel="noopener">npm</a>
  </div>
  <div class="text-on-surface-variant text-xs">
    MIT License &middot; Built on Cloudflare &middot; Made in El Paso
  </div>
</div>
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
    // Safe: no user-derived content in this static HTML string
    document.getElementById('main-content').innerHTML =
      '<div class="bg-surface-container-low border border-outline-variant p-12 text-center">' +
      '<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-4 block">data_object</span>' +
      '<p class="text-on-surface-variant mb-2">No stats data found.</p>' +
      '<p class="text-on-surface-variant text-sm">Run <code class="text-primary bg-surface-container-lowest px-2 py-0.5 rounded text-xs">shipcard sync</code> to open this page with your stats.</p>' +
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
    btn.className = 'copy-btn absolute top-3 right-3 bg-surface-container-high text-on-surface-variant text-[10px] font-medium px-2 py-1 rounded hover:bg-primary hover:text-on-primary transition-all cursor-pointer';
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
      document.getElementById('tab-md').classList.toggle('hidden', tab !== 'md');
      document.getElementById('tab-html').classList.toggle('active', tab === 'html');
      document.getElementById('tab-html').classList.toggle('hidden', tab !== 'html');
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
