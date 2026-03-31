/**
 * Landing page route for the ShipCard Worker.
 *
 * GET / — Serves a self-contained HTML landing page that sells ShipCard
 * with a live card showcase, theme gallery, and embed quickstart.
 *
 * No authentication required — the page fetches public card data from
 * the /u/:username endpoint.
 *
 * Security note: Username values are sanitized via encodeURIComponent
 * for URL construction and escHtml() for display.
 */

import { Hono } from "hono";
import type { AppType } from "../types.js";
import { listUsers, getCardsServedCount } from "../kv.js";

export const landingRoutes = new Hono<AppType>();

// ---------------------------------------------------------------------------
// HTML landing page
// ---------------------------------------------------------------------------

/* eslint-disable no-secrets/no-secrets */
const LANDING_HTML = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>ShipCard — Your Claude Code Stats in one card</title>
<meta name="description" content="One command parses your Claude Code sessions and generates an SVG stats card. Embed it in your README, portfolio, or dotfiles." />
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
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.theme-card img {
  width: 100%;
  height: auto;
  display: block;
}
</style>
</head>
<body class="bg-background text-on-surface font-body selection:bg-primary selection:text-on-primary">

<!-- NAVIGATION BAR -->
<nav class="sticky top-0 z-50 w-full border-b border-outline-variant/10 bg-background/80 backdrop-blur-md">
<div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
  <div class="flex items-center gap-2">
    <div class="w-6 h-6 text-primary">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 6H25V18L16 26L7 18V6Z" fill="currentColor"/>
        <rect x="11" y="11" width="10" height="3" fill="#0a0a0f"/>
      </svg>
    </div>
    <span class="font-headline text-xl font-bold tracking-tight text-on-surface">ShipCard</span>
  </div>
  <div class="hidden md:flex items-center gap-8 text-on-surface-variant text-sm font-medium">
    <a class="hover:text-on-surface transition-colors" href="/community">Community</a>
    <a class="hover:text-on-surface transition-colors" href="/configure">Configurator</a>
    <a class="hover:text-on-surface transition-colors" href="https://www.npmjs.com/package/@jjaimealeman/shipcard" target="_blank" rel="noopener">npm</a>
    <a class="hover:text-on-surface transition-colors" href="https://github.com/jjaimealeman/shipcard" target="_blank" rel="noopener">GitHub</a>
  </div>
  <a href="https://github.com/jjaimealeman/shipcard" target="_blank" rel="noopener" class="border border-primary/20 hover:border-primary/40 text-primary px-4 py-2 text-sm font-medium transition-all inline-flex items-center gap-2">
    <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">star</span> Star on GitHub
  </a>
</div>
</nav>

<!-- HERO SECTION -->
<section class="relative pt-24 pb-32 overflow-hidden">
<div class="absolute inset-0 bg-dot-grid pointer-events-none"></div>
<div class="absolute inset-0 hero-glow pointer-events-none"></div>
<div class="max-w-4xl mx-auto px-6 text-center relative z-10">
  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-8 uppercase tracking-widest">
    <span class="relative flex h-2 w-2">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
    </span>
    v\${__APP_VERSION__} is live
  </div>
  <h1 class="font-headline text-5xl md:text-7xl font-bold tracking-tight text-on-surface mb-6 leading-[1.1]">
    Your Claude Code stats,<br/>in one card.
  </h1>
  <p class="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto mb-12 font-body leading-relaxed">
    One command parses your sessions and generates an SVG stats card. Embed it in your README, portfolio, or dotfiles.
  </p>
  <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
    <div class="flex items-center bg-surface-container-lowest border border-outline-variant px-4 py-3 gap-4 group cursor-pointer" onclick="navigator.clipboard.writeText('npx @jjaimealeman/shipcard summary')">
      <code class="text-primary font-body text-sm">npx @jjaimealeman/shipcard summary</code>
      <span class="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-on-surface">content_copy</span>
    </div>
    <a href="https://github.com/jjaimealeman/shipcard" target="_blank" rel="noopener" class="px-6 py-3 border border-primary/20 text-primary font-medium hover:bg-primary/5 transition-colors flex items-center gap-2">
      View on GitHub <span class="material-symbols-outlined text-sm">arrow_forward</span>
    </a>
  </div>

  <!-- FLOATING CARD PREVIEW -->
  <div class="relative max-w-2xl mx-auto">
    <div class="absolute inset-0 bg-primary/20 blur-[100px] rounded-full"></div>
    <div class="relative bg-surface-container-low border border-outline-variant p-8 rounded-lg shadow-2xl overflow-hidden">
      <div class="flex justify-between items-start mb-12">
        <div>
          <div class="text-on-surface-variant text-[10px] uppercase tracking-[0.2em] mb-1">CLAUDE_CODE_STATS</div>
          <div class="font-headline text-2xl">Engineer Identity</div>
        </div>
        <div class="text-primary">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.578 8.578C5.528 11.628 3.451 15.514 2.609 19.745c-.841 4.23-.41 8.616 1.241 12.601 1.65 3.985 4.446 7.391 8.032 9.788 3.587 2.396 7.804 3.675 12.118 3.675 4.314 0 8.53-1.279 12.117-3.675 3.586-2.397 6.382-5.803 8.032-9.788 1.651-3.985 2.083-8.371 1.241-12.601-.842-4.231-2.919-8.117-5.969-11.167L24 24 8.578 8.578z" fill="currentColor"></path>
          </svg>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-8 text-left">
        <div class="space-y-1">
          <div class="text-on-surface-variant text-xs uppercase tracking-widest">Sessions</div>
          <div class="text-3xl font-headline text-on-surface">513</div>
        </div>
        <div class="space-y-1">
          <div class="text-on-surface-variant text-xs uppercase tracking-widest">Tool Calls</div>
          <div class="text-3xl font-headline text-on-surface">39.5k</div>
        </div>
        <div class="space-y-1">
          <div class="text-on-surface-variant text-xs uppercase tracking-widest">Projects</div>
          <div class="text-3xl font-headline text-on-surface">61</div>
        </div>
        <div class="space-y-1">
          <div class="text-on-surface-variant text-xs uppercase tracking-widest">Est. Cost</div>
          <div class="text-3xl font-headline text-primary">~$3,601</div>
        </div>
      </div>
      <div class="mt-12 pt-6 border-t border-outline-variant/30 flex justify-between items-center">
        <div class="text-[10px] text-on-surface-variant font-body">GENERATED VIA SHIPCARD CLI</div>
        <div class="flex gap-1">
          <div class="w-2 h-2 rounded-full bg-primary/40"></div>
          <div class="w-2 h-2 rounded-full bg-primary/20"></div>
          <div class="w-2 h-2 rounded-full bg-primary/10"></div>
        </div>
      </div>
    </div>
  </div>

  <!--CARDS_SERVED_PLACEHOLDER-->
</div>
</section>

<!-- CARD SHOWCASE -->
<section class="py-32 bg-surface-dim border-y border-outline-variant/10">
<div class="max-w-7xl mx-auto px-6">
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
    <div>
      <h2 class="font-headline text-4xl font-bold mb-4">9 curated themes.</h2>
      <p class="text-on-surface-variant max-w-md">Every developer has a signature style. Choose a theme that matches your environment.</p>
    </div>
    <a class="text-primary font-bold inline-flex items-center gap-2 hover:gap-4 transition-all" href="/configure">
      Open the configurator <span class="material-symbols-outlined text-sm">arrow_forward</span>
    </a>
  </div>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <div class="theme-card bg-surface-container-low border border-outline-variant p-4 hover:border-primary/50 transition-colors">
      <img src="/u/jjaimealeman?theme=catppuccin&layout=classic" alt="catppuccin theme" loading="lazy" />
      <div class="mt-3 flex justify-between items-center text-[10px] text-on-surface-variant uppercase tracking-widest">
        <span>catppuccin</span>
        <span class="text-primary">LIVE</span>
      </div>
    </div>
    <div class="theme-card bg-surface-container-low border border-outline-variant p-4 hover:border-primary/50 transition-colors">
      <img src="/u/jjaimealeman?theme=dracula&layout=classic" alt="dracula theme" loading="lazy" />
      <div class="mt-3 flex justify-between items-center text-[10px] text-on-surface-variant uppercase tracking-widest">
        <span>dracula</span>
        <span class="text-primary">LIVE</span>
      </div>
    </div>
    <div class="theme-card bg-surface-container-low border border-outline-variant p-4 hover:border-primary/50 transition-colors">
      <img src="/u/jjaimealeman?theme=tokyo-night&layout=classic" alt="tokyo-night theme" loading="lazy" />
      <div class="mt-3 flex justify-between items-center text-[10px] text-on-surface-variant uppercase tracking-widest">
        <span>tokyo-night</span>
        <span class="text-primary">LIVE</span>
      </div>
    </div>
    <div class="theme-card bg-surface-container-low border border-outline-variant p-4 hover:border-primary/50 transition-colors">
      <img src="/u/jjaimealeman?theme=nord&layout=classic" alt="nord theme" loading="lazy" />
      <div class="mt-3 flex justify-between items-center text-[10px] text-on-surface-variant uppercase tracking-widest">
        <span>nord</span>
        <span class="text-primary">LIVE</span>
      </div>
    </div>
    <div class="theme-card bg-surface-container-low border border-outline-variant p-4 hover:border-primary/50 transition-colors">
      <img src="/u/jjaimealeman?theme=gruvbox&layout=classic" alt="gruvbox theme" loading="lazy" />
      <div class="mt-3 flex justify-between items-center text-[10px] text-on-surface-variant uppercase tracking-widest">
        <span>gruvbox</span>
        <span class="text-primary">LIVE</span>
      </div>
    </div>
    <div class="theme-card bg-surface-container-low border border-outline-variant p-4 hover:border-primary/50 transition-colors">
      <img src="/u/jjaimealeman?theme=solarized-dark&layout=classic" alt="solarized-dark theme" loading="lazy" />
      <div class="mt-3 flex justify-between items-center text-[10px] text-on-surface-variant uppercase tracking-widest">
        <span>solarized-dark</span>
        <span class="text-primary">LIVE</span>
      </div>
    </div>
    <div class="theme-card bg-surface-container-low border border-outline-variant p-4 hover:border-primary/50 transition-colors">
      <img src="/u/jjaimealeman?theme=solarized-light&layout=classic" alt="solarized-light theme" loading="lazy" />
      <div class="mt-3 flex justify-between items-center text-[10px] text-on-surface-variant uppercase tracking-widest">
        <span>solarized-light</span>
        <span class="text-primary">LIVE</span>
      </div>
    </div>
    <div class="theme-card bg-surface-container-low border border-outline-variant p-4 hover:border-primary/50 transition-colors">
      <img src="/u/jjaimealeman?theme=one-dark&layout=classic" alt="one-dark theme" loading="lazy" />
      <div class="mt-3 flex justify-between items-center text-[10px] text-on-surface-variant uppercase tracking-widest">
        <span>one-dark</span>
        <span class="text-primary">LIVE</span>
      </div>
    </div>
    <div class="theme-card bg-surface-container-low border border-outline-variant p-4 hover:border-primary/50 transition-colors">
      <img src="/u/jjaimealeman?theme=monokai&layout=classic" alt="monokai theme" loading="lazy" />
      <div class="mt-3 flex justify-between items-center text-[10px] text-on-surface-variant uppercase tracking-widest">
        <span>monokai</span>
        <span class="text-primary">LIVE</span>
      </div>
    </div>
  </div>
</div>
</section>

<!-- HOW IT WORKS -->
<section class="py-32">
<div class="max-w-7xl mx-auto px-6">
  <h2 class="font-headline text-4xl font-bold mb-16 text-center">Three commands. That's it.</h2>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
    <div class="space-y-6">
      <div class="text-primary text-4xl font-headline opacity-30">01</div>
      <div>
        <h3 class="font-headline text-xl mb-3">See your stats</h3>
        <p class="text-on-surface-variant text-sm mb-4 leading-relaxed">Instantly parse your local Claude sessions and see the numbers.</p>
        <div class="bg-surface-container-lowest border border-outline-variant p-3 font-body text-xs text-primary">npx @jjaimealeman/shipcard summary</div>
      </div>
    </div>
    <div class="space-y-6">
      <div class="text-primary text-4xl font-headline opacity-30">02</div>
      <div>
        <h3 class="font-headline text-xl mb-3">Authenticate</h3>
        <p class="text-on-surface-variant text-sm mb-4 leading-relaxed">Securely connect to your ShipCard profile to sync stats to the cloud.</p>
        <div class="bg-surface-container-lowest border border-outline-variant p-3 font-body text-xs text-primary">shipcard login</div>
      </div>
    </div>
    <div class="space-y-6">
      <div class="text-primary text-4xl font-headline opacity-30">03</div>
      <div>
        <h3 class="font-headline text-xl mb-3">Publish your card</h3>
        <p class="text-on-surface-variant text-sm mb-4 leading-relaxed">Update your public SVG URL with your latest session breakthroughs.</p>
        <div class="bg-surface-container-lowest border border-outline-variant p-3 font-body text-xs text-primary">shipcard sync</div>
      </div>
    </div>
  </div>
  <div class="mt-20 p-6 bg-surface-container-low border border-outline-variant flex flex-col md:flex-row items-center justify-between gap-6">
    <div class="flex items-center gap-4">
      <div class="w-10 h-10 bg-primary/10 flex items-center justify-center rounded text-primary">
        <span class="material-symbols-outlined">dns</span>
      </div>
      <div>
        <div class="font-bold text-sm">MCP Server Ready</div>
        <p class="text-xs text-on-surface-variant">Connect directly to Claude Desktop for live stat tracking.</p>
      </div>
    </div>
    <a href="https://github.com/jjaimealeman/shipcard#mcp-config" target="_blank" rel="noopener" class="text-primary text-sm font-bold border-b border-primary/20 hover:border-primary transition-colors">Setup MCP Server &rarr;</a>
  </div>
</div>
</section>

<!-- WHAT'S ON THE CARD -->
<section class="py-32 bg-surface-dim">
<div class="max-w-4xl mx-auto px-6 text-center">
  <h2 class="font-headline text-4xl font-bold mb-16">What's on the card.</h2>
  <div class="relative inline-block mx-auto">
    <div class="bg-surface-container-low border border-outline-variant p-8 w-full max-w-xl text-left relative z-10">
      <div class="space-y-4 mb-8">
        <div class="h-4 w-1/3 bg-surface-container-high rounded"></div>
        <div class="h-8 w-1/2 bg-surface-container-high rounded"></div>
      </div>
      <div class="grid grid-cols-2 gap-6">
        <div class="p-4 bg-surface-container-high/30 border border-outline-variant/30 rounded">
          <div class="h-10 w-full bg-surface-container-high rounded"></div>
        </div>
        <div class="p-4 bg-surface-container-high/30 border border-outline-variant/30 rounded">
          <div class="h-10 w-full bg-surface-container-high rounded"></div>
        </div>
      </div>
    </div>
    <div class="absolute -top-12 -left-12 bg-primary/10 border border-primary/20 px-4 py-2 text-[10px] text-primary font-bold rounded-full z-20">SESSION COUNT</div>
    <div class="absolute top-1/2 -right-16 bg-primary/10 border border-primary/20 px-4 py-2 text-[10px] text-primary font-bold rounded-full z-20">PROJECT SCOPE</div>
    <div class="absolute -bottom-8 left-1/4 bg-primary/10 border border-primary/20 px-4 py-2 text-[10px] text-primary font-bold rounded-full z-20">ESTIMATED SPEND</div>
  </div>
  <div class="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
    <div class="flex flex-col items-center gap-3">
      <span class="material-symbols-outlined text-primary text-3xl">lock</span>
      <p class="text-sm font-body text-on-surface-variant">No API keys</p>
    </div>
    <div class="flex flex-col items-center gap-3">
      <span class="material-symbols-outlined text-primary text-3xl">visibility_off</span>
      <p class="text-sm font-body text-on-surface-variant">No telemetry</p>
    </div>
    <div class="flex flex-col items-center gap-3">
      <span class="material-symbols-outlined text-primary text-3xl">account_circle_off</span>
      <p class="text-sm font-body text-on-surface-variant">No account required</p>
    </div>
  </div>
</div>
</section>

<!-- COMMUNITY -->
<section class="py-32 overflow-hidden">
<div class="max-w-7xl mx-auto px-6 text-center">
  <h2 class="font-headline text-4xl font-bold mb-16">Builders who ship in the open.</h2>
  <!--COMMUNITY_TEASER_PLACEHOLDER-->
</div>
</section>

<!-- CONFIGURATOR PLACEHOLDER -->
<section class="py-32 bg-surface-dim">
<div class="max-w-5xl mx-auto px-6">
  <div class="text-center mb-16">
    <h2 class="font-headline text-4xl font-bold mb-4">Make it yours.</h2>
    <p class="text-on-surface-variant">Live editor for themes, layouts, and data visibility.</p>
  </div>
  <div class="w-full aspect-[4/3] max-h-[580px] bg-surface-container-lowest border border-outline-variant relative group overflow-hidden">
    <div class="absolute inset-0 bg-dot-grid opacity-20"></div>
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <span class="material-symbols-outlined text-4xl text-primary/40">settings_input_component</span>
        <span class="text-on-surface-variant font-headline uppercase tracking-[0.3em] text-xs">Live Configurator</span>
        <a href="/configure" class="mt-4 px-6 py-2 bg-primary text-on-primary font-bold text-sm inline-block hover:brightness-110 transition-all">Launch Editor</a>
      </div>
    </div>
    <div class="absolute top-4 left-4 flex gap-2">
      <div class="w-2 h-2 rounded-full bg-outline-variant"></div>
      <div class="w-2 h-2 rounded-full bg-outline-variant"></div>
      <div class="w-2 h-2 rounded-full bg-outline-variant"></div>
    </div>
  </div>
</div>
</section>

<!-- PRICING -->
<section class="py-32">
<div class="max-w-5xl mx-auto px-6">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
    <!-- Free Tier -->
    <div class="p-10 bg-surface-container-low border border-outline-variant flex flex-col justify-between">
      <div>
        <div class="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Core</div>
        <h3 class="text-4xl font-headline font-bold mb-6">Free</h3>
        <ul class="space-y-4 mb-10 text-on-surface-variant text-sm">
          <li class="flex items-center gap-3"><span class="material-symbols-outlined text-primary text-sm">check</span> Local CLI tool</li>
          <li class="flex items-center gap-3"><span class="material-symbols-outlined text-primary text-sm">check</span> MCP server</li>
          <li class="flex items-center gap-3"><span class="material-symbols-outlined text-primary text-sm">check</span> 9 curated themes</li>
          <li class="flex items-center gap-3"><span class="material-symbols-outlined text-primary text-sm">check</span> Cloud sync</li>
          <li class="flex items-center gap-3"><span class="material-symbols-outlined text-primary text-sm">check</span> Analytics dashboard</li>
        </ul>
      </div>
      <div class="w-full py-4 bg-surface-container-high border border-outline-variant text-on-surface font-bold text-center cursor-pointer hover:bg-surface-container-highest transition-colors" onclick="navigator.clipboard.writeText('npx @jjaimealeman/shipcard summary')">
        npx @jjaimealeman/shipcard summary
      </div>
    </div>
    <!-- PRO Tier -->
    <div class="p-10 bg-surface-container-low border border-secondary/30 relative flex flex-col justify-between">
      <div class="absolute -top-3 right-6 bg-secondary text-on-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-widest">Recommended</div>
      <div>
        <div class="flex items-center gap-2 mb-4">
          <div class="text-sm font-bold uppercase tracking-widest text-secondary">Advanced</div>
          <span class="material-symbols-outlined text-secondary text-sm" style="font-variation-settings: 'FILL' 1;">star</span>
        </div>
        <h3 class="text-4xl font-headline font-bold mb-2">$2 <span class="text-lg text-on-surface-variant font-normal">/ mo</span></h3>
        <p class="text-xs text-secondary/60 mb-8">Support the project and get the flex.</p>
        <ul class="space-y-4 mb-10 text-on-surface-variant text-sm">
          <li class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary text-sm">check</span> Custom colors (BYOT)</li>
          <li class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary text-sm">check</span> Custom URL slugs</li>
          <li class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary text-sm">check</span> PRO badge on card</li>
          <li class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary text-sm">check</span> AI coding insights</li>
          <li class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary text-sm">check</span> Priority cache refresh</li>
        </ul>
      </div>
      <a href="/billing/checkout?interval=month" class="w-full py-4 bg-secondary text-on-secondary font-bold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(240,160,48,0.2)] text-center block">
        Go PRO
      </a>
    </div>
  </div>
</div>
</section>

<!-- FINAL CTA -->
<section class="py-40 bg-[#0f0f16] border-t border-outline-variant/10 text-center relative overflow-hidden">
<div class="absolute inset-0 bg-dot-grid opacity-10"></div>
<div class="max-w-3xl mx-auto px-6 relative z-10">
  <h2 class="font-headline text-5xl font-bold mb-12">Ready to ship?</h2>
  <div class="flex items-center justify-between bg-surface-container-lowest border border-outline-variant p-6 group max-w-lg mx-auto cursor-pointer" onclick="navigator.clipboard.writeText('npx @jjaimealeman/shipcard summary')">
    <code class="text-primary font-body text-lg">npx @jjaimealeman/shipcard summary</code>
    <span class="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface">content_copy</span>
  </div>
  <p class="mt-8 text-on-surface-variant text-sm">Join the developers already tracking their progress.</p>
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

</body>
</html>`;

// ---------------------------------------------------------------------------
// Helpers for community teaser HTML generation
// ---------------------------------------------------------------------------

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCommunityTeaser(
  users: Array<{ username: string; meta: { syncedAt: string; totalSessions: number; totalCost: string; projectCount: number; totalTokens: number } | null }>
): string {
  const sorted = [...users].sort((a, b) => {
    const aTime = a.meta?.syncedAt ?? "";
    const bTime = b.meta?.syncedAt ?? "";
    return bTime.localeCompare(aTime);
  });
  const top10 = sorted.slice(0, 10);

  const rowsHtml = top10.length === 0
    ? `<tr><td colspan="6" class="text-center text-on-surface-variant py-8">Be the first &mdash; run <code class="text-primary">shipcard sync</code> to join</td></tr>`
    : top10.map((u, i) => {
        const m = u.meta;
        const cost = m ? escHtml(m.totalCost) : "\u2014";
        const projects = m ? String(m.projectCount) : "\u2014";
        const sessions = m ? String(m.totalSessions) : "\u2014";
        const tokens = m ? m.totalTokens.toLocaleString() : "\u2014";
        return `<tr class="border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors">
          <td class="py-3 px-4 text-on-surface-variant text-xs">${i + 1}</td>
          <td class="py-3 px-4"><a href="/u/${encodeURIComponent(u.username)}/dashboard" class="text-primary hover:underline text-sm">${escHtml(u.username)}</a></td>
          <td class="py-3 px-4 text-on-surface-variant text-sm">${cost}</td>
          <td class="py-3 px-4 text-on-surface-variant text-sm">${projects}</td>
          <td class="py-3 px-4 text-on-surface-variant text-sm">${sessions}</td>
          <td class="py-3 px-4 text-on-surface-variant text-sm">${tokens}</td>
        </tr>`;
      }).join("\n");

  return `
  <div class="max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-8">
      <h3 class="font-headline text-xl font-bold text-left">Recent members</h3>
      <a href="/community" class="text-primary text-sm font-bold inline-flex items-center gap-2 hover:gap-4 transition-all">View all <span class="material-symbols-outlined text-sm">arrow_forward</span></a>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-left" id="community-teaser">
        <thead>
          <tr class="border-b border-outline-variant/20">
            <th class="py-3 px-4 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">#</th>
            <th class="py-3 px-4 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Username</th>
            <th class="py-3 px-4 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Est. Cost</th>
            <th class="py-3 px-4 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Projects</th>
            <th class="py-3 px-4 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Sessions</th>
            <th class="py-3 px-4 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Tokens</th>
          </tr>
        </thead>
        <tbody id="community-teaser-body">
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  </div>`;
}

/**
 * GET /
 *
 * Serves the self-contained HTML landing page.
 * Fetches community data server-side for the teaser table and cards-served counter.
 * No authentication required.
 */
landingRoutes.get("/", async (c) => {
  const kv = c.env.USER_DATA_KV;
  const [users, cardsServed] = await Promise.all([
    listUsers(kv, 1000),
    getCardsServedCount(kv),
  ]);

  const cardsServedHtml = cardsServed >= 100
    ? `<p class="mt-6 text-on-surface-variant text-sm font-body">Serving <span class="text-primary font-bold">${cardsServed.toLocaleString()}</span> cards</p>`
    : "";

  const communityTeaserHtml = buildCommunityTeaser(users);

  const html = LANDING_HTML
    .replace("<!--CARDS_SERVED_PLACEHOLDER-->", cardsServedHtml)
    .replace("<!--COMMUNITY_TEASER_PLACEHOLDER-->", communityTeaserHtml);

  return c.html(html);
});
