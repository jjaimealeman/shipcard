/**
 * Community leaderboard page for the ShipCard Worker.
 *
 * GET /community — Serves a full leaderboard of all ShipCard users,
 * sortable by multiple categories (most recent, most active, highest cost,
 * most sessions). Uses Alpine.js for client-side sorting.
 *
 * Data is loaded server-side from KV metadata via a single listUsers() call.
 * No authentication required — community data is public.
 */

import { Hono } from "hono";
import type { AppType } from "../types.js";
import { listUsers, getCardsServedCount } from "../kv.js";

export const communityRoutes = new Hono<AppType>();

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Community page HTML
// ---------------------------------------------------------------------------

/* eslint-disable no-secrets/no-secrets */

/**
 * GET /community
 *
 * Full leaderboard with all users and client-side Alpine.js sorting.
 */
communityRoutes.get("/", async (c) => {
  const [users, cardsServed] = await Promise.all([
    listUsers(c.env.USER_DATA_KV, 1000),
    getCardsServedCount(c.env.CARDS_KV),
  ]);

  // Serialize users as safe JSON for client-side Alpine.js sorting.
  // Each entry: { username, syncedAt, totalSessions, totalCost, costNum, projectCount, totalTokens }
  const usersJson = JSON.stringify(
    users.map((u) => ({
      username: escHtml(u.username),
      syncedAt: u.meta?.syncedAt ?? "",
      totalSessions: u.meta?.totalSessions ?? null,
      totalCost: u.meta ? escHtml(u.meta.totalCost) : null,
      // Parse cost string like "~$12.34" to number for sorting
      costNum: u.meta
        ? parseFloat(u.meta.totalCost.replace(/[^0-9.]/g, "")) || 0
        : 0,
      projectCount: u.meta?.projectCount ?? null,
      totalTokens: u.meta?.totalTokens ?? null,
    }))
  );

  const html = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Community — ShipCard</title>
<meta name="description" content="Builders who ship in the open. See who's building with Claude Code and ShipCard."/>
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
.sort-tab { border-bottom: 2px solid transparent; transition: all 0.15s; }
.sort-tab:hover { color: #e8e8ed; border-bottom-color: #35343a; }
.sort-tab.active { color: #00d4aa; border-bottom-color: #00d4aa; }
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
    <a class="text-primary" href="/community">Community</a>
    <a class="hover:text-on-surface transition-colors" href="/configure">Configurator</a>
    <a class="hover:text-on-surface transition-colors" href="https://www.npmjs.com/package/@jjaimealeman/shipcard" target="_blank" rel="noopener">npm</a>
    <a class="hover:text-on-surface transition-colors" href="https://github.com/jjaimealeman/shipcard" target="_blank" rel="noopener">GitHub</a>
  </div>
  <a href="https://github.com/jjaimealeman/shipcard" target="_blank" rel="noopener" class="border border-primary/20 hover:border-primary/40 text-primary px-4 py-2 text-sm font-medium transition-all inline-flex items-center gap-2">
    <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">star</span> Star on GitHub
  </a>
</div>
</nav>

<!-- HERO -->
<section class="relative pt-20 pb-12 overflow-hidden">
<div class="absolute inset-0 bg-dot-grid pointer-events-none"></div>
<div class="absolute inset-0 hero-glow pointer-events-none"></div>
<div class="max-w-4xl mx-auto px-6 text-center relative z-10">
  <h1 class="font-headline text-4xl md:text-5xl font-bold tracking-tight text-on-surface mb-4 leading-[1.1]">
    Community
  </h1>
  <p class="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto font-body leading-relaxed">
    Builders who ship in the open.
  </p>
  ${cardsServed > 0 ? `<div class="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-outline-variant text-on-surface-variant text-xs font-medium">
    <span class="material-symbols-outlined text-primary text-sm">monitoring</span>
    <span class="text-on-surface font-headline text-sm">${cardsServed.toLocaleString()}</span> cards served
  </div>` : ""}
</div>
</section>

<!-- LEADERBOARD -->
<section class="max-w-5xl mx-auto px-6 pb-24" x-data="leaderboard()" x-init="init()">

  <!-- SORT TABS -->
  <div class="flex gap-6 border-b border-outline-variant/20 mb-6 overflow-x-auto no-scrollbar">
    <button class="sort-tab pb-3 text-sm font-medium whitespace-nowrap" :class="{ active: sortKey === 'syncedAt' }" @click="setSort('syncedAt', 'desc')">Most Recent</button>
    <button class="sort-tab pb-3 text-sm font-medium whitespace-nowrap" :class="{ active: sortKey === 'totalSessions' }" @click="setSort('totalSessions', 'desc')">Most Active</button>
    <button class="sort-tab pb-3 text-sm font-medium whitespace-nowrap" :class="{ active: sortKey === 'costNum' }" @click="setSort('costNum', 'desc')">Highest Cost</button>
    <button class="sort-tab pb-3 text-sm font-medium whitespace-nowrap" :class="{ active: sortKey === 'totalTokens' }" @click="setSort('totalTokens', 'desc')">Most Tokens</button>
  </div>

  <!-- TABLE -->
  <div class="bg-surface-container-low border border-outline-variant overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-outline-variant">
          <th class="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-on-surface-variant whitespace-nowrap">#</th>
          <th class="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-on-surface-variant cursor-pointer whitespace-nowrap hover:text-on-surface transition-colors"
              :class="{ 'text-primary': sortKey === 'username' }"
              @click="toggleSort('username')">
            Username
            <template x-if="sortKey === 'username'"><span x-text="sortDir === 'asc' ? ' \\u2191' : ' \\u2193'"></span></template>
          </th>
          <th class="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-on-surface-variant cursor-pointer whitespace-nowrap hover:text-on-surface transition-colors"
              :class="{ 'text-primary': sortKey === 'costNum' }"
              @click="toggleSort('costNum')">
            Est. Cost
            <template x-if="sortKey === 'costNum'"><span x-text="sortDir === 'asc' ? ' \\u2191' : ' \\u2193'"></span></template>
          </th>
          <th class="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-on-surface-variant cursor-pointer whitespace-nowrap hover:text-on-surface transition-colors"
              :class="{ 'text-primary': sortKey === 'projectCount' }"
              @click="toggleSort('projectCount')">
            Projects
            <template x-if="sortKey === 'projectCount'"><span x-text="sortDir === 'asc' ? ' \\u2191' : ' \\u2193'"></span></template>
          </th>
          <th class="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-on-surface-variant cursor-pointer whitespace-nowrap hover:text-on-surface transition-colors"
              :class="{ 'text-primary': sortKey === 'totalSessions' }"
              @click="toggleSort('totalSessions')">
            Sessions
            <template x-if="sortKey === 'totalSessions'"><span x-text="sortDir === 'asc' ? ' \\u2191' : ' \\u2193'"></span></template>
          </th>
          <th class="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-on-surface-variant cursor-pointer whitespace-nowrap hover:text-on-surface transition-colors"
              :class="{ 'text-primary': sortKey === 'totalTokens' }"
              @click="toggleSort('totalTokens')">
            Tokens
            <template x-if="sortKey === 'totalTokens'"><span x-text="sortDir === 'asc' ? ' \\u2191' : ' \\u2193'"></span></template>
          </th>
        </tr>
      </thead>
      <tbody>
        <template x-if="sorted.length === 0">
          <tr>
            <td colspan="6" class="text-center text-on-surface-variant py-16">
              Be the first &mdash; run <code class="text-primary bg-surface-container px-2 py-0.5">shipcard sync</code> to join
            </td>
          </tr>
        </template>
        <template x-for="(user, idx) in sorted" :key="user.username">
          <tr class="border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors">
            <td class="py-3 px-4 text-on-surface-variant text-xs font-label" x-text="idx + 1"></td>
            <td class="py-3 px-4">
              <a :href="'/u/' + encodeURIComponent(user.username) + '/dashboard'" class="text-primary hover:underline font-medium" x-text="user.username"></a>
            </td>
            <td class="py-3 px-4 text-secondary font-label" x-text="user.totalCost ?? '\\u2014'"></td>
            <td class="py-3 px-4 text-on-surface-variant font-label" x-text="user.projectCount !== null ? user.projectCount : '\\u2014'"></td>
            <td class="py-3 px-4 text-on-surface-variant font-label" x-text="user.totalSessions !== null ? user.totalSessions : '\\u2014'"></td>
            <td class="py-3 px-4 text-on-surface-variant font-label" x-text="user.totalTokens !== null ? Number(user.totalTokens).toLocaleString() : '\\u2014'"></td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>

  <!-- USER COUNT -->
  <div class="mt-4 text-right text-on-surface-variant text-xs">
    <span x-text="sorted.length"></span> builders
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
var __USERS__ = ${usersJson};
</script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.15.8/dist/cdn.min.js"></script>
<script>
document.addEventListener('alpine:init', function() {
  Alpine.data('leaderboard', function() {
    return {
      users: [],
      sortKey: 'syncedAt',
      sortDir: 'desc',
      get sorted() {
        var key = this.sortKey;
        var dir = this.sortDir;
        return this.users.slice().sort(function(a, b) {
          var av = a[key];
          var bv = b[key];
          // Nulls last
          if (av === null && bv === null) return 0;
          if (av === null) return 1;
          if (bv === null) return -1;
          var cmp;
          if (typeof av === 'string') {
            cmp = av.localeCompare(bv);
          } else {
            cmp = av - bv;
          }
          return dir === 'asc' ? cmp : -cmp;
        });
      },
      init: function() {
        this.users = window.__USERS__ || [];
      },
      setSort: function(key, dir) {
        this.sortKey = key;
        this.sortDir = dir;
      },
      toggleSort: function(key) {
        if (this.sortKey === key) {
          this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortKey = key;
          this.sortDir = 'desc';
        }
      }
    };
  });
});
</script>
</body>
</html>`;

  return c.html(html);
});
