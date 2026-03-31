/**
 * Dashboard route for the ShipCard Worker.
 *
 * GET /u/:username/dashboard — Serves a self-contained HTML analytics dashboard.
 *
 * The page loads Alpine.js + Chart.js from CDN, fetches the user's stats and
 * time-series data from the public API, and renders a full analytics dashboard
 * with hero stats, a sticky time filter bar, skeleton loading states, and
 * placeholder panels for chart content added in Plans 02 and 03.
 *
 * Dashboards are public by default — same access model as SVG cards.
 *
 * Security note: username is sanitized to [a-zA-Z0-9-] before insertion into HTML.
 */

import { Hono } from "hono";
import type { AppType } from "../types.js";
import { isUserPro } from "../kv.js";
import { getSubscription } from "../db/subscriptions.js";

export const dashboardRoutes = new Hono<AppType>();

// ---------------------------------------------------------------------------
// HTML dashboard page template
// ---------------------------------------------------------------------------

/* eslint-disable no-secrets/no-secrets */
const DASHBOARD_HTML = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>__USERNAME__ | ShipCard Analytics</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@700&family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
<script>
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-dim": "#131318",
        "primary": "#00d4aa",
        "on-primary": "#00382b",
        "surface-container-high": "#2a292f",
        "surface-container-lowest": "#0e0e13",
        "surface": "#0a0a0f",
        "on-surface-variant": "#8888a0",
        "surface-container-highest": "#35343a",
        "secondary": "#f0a030",
        "outline-variant": "#2a2a35",
        "background": "#0a0a0f",
        "surface-container-low": "#141419",
        "on-surface": "#e8e8ed",
        "surface-container": "#1f1f25",
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
  /* Skeleton shimmer animation */
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .skeleton {
    background: linear-gradient(90deg, #1f1f25 25%, #2a292f 50%, #1f1f25 75%);
    background-size: 800px 100%;
    animation: shimmer 1.6s infinite linear;
    border-radius: 4px;
  }

  /* Chart.js canvas sizing */
  .panel-body canvas {
    width: 100% !important;
    height: 100% !important;
    min-height: 180px;
  }

  /* Heatmap tooltip positioning */
  .hm-tooltip {
    position: absolute; background: #0a0a0f; border: 1px solid #2a2a35;
    border-radius: 4px; padding: 4px 8px; font-size: 11px; color: #e8e8ed;
    pointer-events: none; white-space: nowrap; z-index: 200; display: none;
  }

  /* Heatmap cell styles */
  .hm-cell { rx: 2; ry: 2; }
  .hm-label { fill: #8888a0; font-family: 'IBM Plex Mono', monospace; font-size: 10px; }

  /* Heatmap container scrolling */
  #panel-calendar-chart { overflow-x: auto; overflow-y: hidden; padding-bottom: 4px; }
  #heatmap-container { overflow-x: auto; }
  #heatmap-container svg { display: block; }

  /* No-scrollbar utility */
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  /* Sparkline SVG styles */
  .sparkline-wrap svg { width: 100%; height: 36px; overflow: visible; }
  .sparkline-wrap polyline { fill: none; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .sparkline-area { opacity: 0.15; }

  /* Insight bar fill transition */
  .insight-bar-fill { transition: width 0.3s ease; }

  /* Material Symbols settings */
  .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
</style>
</head>
<body class="bg-background text-on-surface font-body selection:bg-primary selection:text-on-primary" x-data x-init="$store.dashboard.load('__USERNAME__')">

<!-- =========================================================================
     NAVIGATION BAR + RANGE TOGGLE
     ====================================================================== -->
<nav class="sticky top-0 z-50 w-full border-b border-outline-variant/10 bg-background/80 backdrop-blur-md">
<div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
  <div class="flex items-center gap-2">
    <a href="/" class="flex items-center gap-2">
      <div class="w-6 h-6 text-primary">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 6H25V18L16 26L7 18V6Z" fill="currentColor"/>
          <rect x="11" y="11" width="10" height="3" fill="#0a0a0f"/>
        </svg>
      </div>
      <span class="font-headline text-xl font-bold tracking-tight text-on-surface">ShipCard</span>
    </a>
    <span x-data x-show="$store.dashboard.isPro" class="bg-secondary/20 text-secondary text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 ml-2" style="display:none">PRO</span>
  </div>
  <div class="flex items-center gap-6">
    <div class="hidden md:flex items-center gap-8 text-on-surface-variant text-sm font-medium">
      <a class="hover:text-on-surface transition-colors" href="/community">Community</a>
      <a class="hover:text-on-surface transition-colors" href="/configure">Configurator</a>
      <a class="hover:text-on-surface transition-colors" href="https://www.npmjs.com/package/@jjaimealeman/shipcard" target="_blank" rel="noopener">npm</a>
      <a class="hover:text-on-surface transition-colors" href="https://github.com/jjaimealeman/shipcard" target="_blank" rel="noopener">GitHub</a>
    </div>
    <!-- Range toggle buttons -->
    <div class="flex border border-outline-variant overflow-hidden" x-data>
      <button class="px-3 py-1.5 text-xs font-bold font-headline bg-background text-on-surface-variant border-r border-outline-variant cursor-pointer transition-colors whitespace-nowrap"
        :class="$store.dashboard.range === '7d' ? '!bg-primary !text-on-primary' : 'hover:bg-surface-container hover:text-on-surface'"
        @click="$store.dashboard.range = '7d'">7d</button>
      <button class="px-3 py-1.5 text-xs font-bold font-headline bg-background text-on-surface-variant border-r border-outline-variant cursor-pointer transition-colors whitespace-nowrap"
        :class="$store.dashboard.range === '30d' ? '!bg-primary !text-on-primary' : 'hover:bg-surface-container hover:text-on-surface'"
        @click="$store.dashboard.range = '30d'">30d</button>
      <button class="px-3 py-1.5 text-xs font-bold font-headline bg-background text-on-surface-variant cursor-pointer transition-colors whitespace-nowrap"
        :class="$store.dashboard.range === 'all' ? '!bg-primary !text-on-primary' : 'hover:bg-surface-container hover:text-on-surface'"
        @click="$store.dashboard.range = 'all'">All</button>
    </div>
  </div>
</div>
</nav>

<!-- =========================================================================
     PAYMENT FAILED BANNER
     ====================================================================== -->
<div x-data x-show="$store.dashboard.paymentFailed" class="bg-red-900/20 border-b border-red-500/30 px-6 py-3 flex justify-between items-center" style="display:none">
  <span class="text-red-400 text-sm">Payment failed. Please update your payment method to keep PRO features.</span>
  <a href="/billing/portal" class="bg-primary text-on-primary px-4 py-1 text-sm font-bold no-underline whitespace-nowrap">Update Payment</a>
</div>

<!-- =========================================================================
     MAIN PAGE CONTENT
     ====================================================================== -->
<div class="max-w-7xl mx-auto px-6 py-8">

  <!-- Error bar -->
  <div class="bg-red-900/20 border border-red-500/30 text-red-400 px-6 py-3 text-sm mb-6" x-show="$store.dashboard.error" x-text="$store.dashboard.error" style="display:none"></div>

  <!-- Empty state (user not found or no data) -->
  <div class="text-center py-20 text-on-surface-variant" x-show="!$store.dashboard.loading && $store.dashboard.notFound" style="display:none">
    <h2 class="font-headline text-xl font-bold text-on-surface mb-2">No data yet</h2>
    <p class="max-w-md mx-auto mb-6">
      <strong class="text-on-surface">__USERNAME__</strong> hasn't synced any stats yet. If this is you,
      sync your data with the ShipCard CLI:
    </p>
    <p><code class="text-sm bg-surface-container border border-outline-variant px-2 py-0.5 text-primary">shipcard sync</code></p>
  </div>

  <!-- Dashboard content — visible when loaded and no empty/error state -->
  <div x-show="!$store.dashboard.loading && !$store.dashboard.notFound && !$store.dashboard.error" style="display:block">

    <!-- -------------------------------------------------------------------
         TODAY'S ACTIVITY
         ---------------------------------------------------------------- -->
    <div class="font-headline text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-6 mt-12">Today's Activity</div>
    <div class="mb-8">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">

        <!-- Messages -->
        <div class="bg-surface-container-low border border-outline-variant p-5 flex flex-col overflow-hidden">
          <div class="h-[34px] w-[60%] mb-2 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="h-3 w-[40%] mb-4 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div x-show="!$store.dashboard.loading" style="display:none">
            <div class="text-3xl font-headline font-bold text-on-surface mb-1" x-text="$store.dashboard.todayMessages"></div>
            <div class="flex items-center gap-1.5 mb-3">
              <span class="text-xs leading-none"
                    x-show="$store.dashboard.dirMessages !== 0"
                    :class="$store.dashboard.dirMessages > 0 ? 'text-primary' : 'text-secondary'"
                    x-text="$store.dashboard.dirMessages > 0 ? '\u25B2' : '\u25BC'"></span>
              <span class="text-xs uppercase tracking-widest text-on-surface-variant">Messages</span>
            </div>
          </div>
          <div class="mt-auto text-xs text-on-surface-variant pt-2 border-t border-outline-variant/30 -mx-5 px-5">
            <span x-show="$store.dashboard.loading" class="skeleton" style="display:none;height:14px;width:80%;border-radius:3px"></span>
            <span x-show="!$store.dashboard.loading" style="display:none">
              Yesterday: <strong class="text-on-surface" x-text="$store.dashboard.yesterdayMessages"></strong>
            </span>
          </div>
        </div>

        <!-- Sessions -->
        <div class="bg-surface-container-low border border-outline-variant p-5 flex flex-col overflow-hidden">
          <div class="h-[34px] w-[60%] mb-2 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="h-3 w-[40%] mb-4 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div x-show="!$store.dashboard.loading" style="display:none">
            <div class="text-3xl font-headline font-bold text-on-surface mb-1" x-text="$store.dashboard.todaySessions"></div>
            <div class="flex items-center gap-1.5 mb-3">
              <span class="text-xs leading-none"
                    x-show="$store.dashboard.dirSessions !== 0"
                    :class="$store.dashboard.dirSessions > 0 ? 'text-primary' : 'text-secondary'"
                    x-text="$store.dashboard.dirSessions > 0 ? '\u25B2' : '\u25BC'"></span>
              <span class="text-xs uppercase tracking-widest text-on-surface-variant">Sessions</span>
            </div>
          </div>
          <div class="mt-auto text-xs text-on-surface-variant pt-2 border-t border-outline-variant/30 -mx-5 px-5">
            <span x-show="$store.dashboard.loading" class="skeleton" style="display:none;height:14px;width:80%;border-radius:3px"></span>
            <span x-show="!$store.dashboard.loading" style="display:none">
              Yesterday: <strong class="text-on-surface" x-text="$store.dashboard.yesterdaySessions"></strong>
            </span>
          </div>
        </div>

        <!-- Tools -->
        <div class="bg-surface-container-low border border-outline-variant p-5 flex flex-col overflow-hidden">
          <div class="h-[34px] w-[60%] mb-2 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="h-3 w-[40%] mb-4 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div x-show="!$store.dashboard.loading" style="display:none">
            <div class="text-3xl font-headline font-bold text-on-surface mb-1" x-text="$store.dashboard.todayTools"></div>
            <div class="flex items-center gap-1.5 mb-3">
              <span class="text-xs leading-none"
                    x-show="$store.dashboard.dirTools !== 0"
                    :class="$store.dashboard.dirTools > 0 ? 'text-primary' : 'text-secondary'"
                    x-text="$store.dashboard.dirTools > 0 ? '\u25B2' : '\u25BC'"></span>
              <span class="text-xs uppercase tracking-widest text-on-surface-variant">Tools</span>
            </div>
          </div>
          <div class="mt-auto text-xs text-on-surface-variant pt-2 border-t border-outline-variant/30 -mx-5 px-5">
            <span x-show="$store.dashboard.loading" class="skeleton" style="display:none;height:14px;width:80%;border-radius:3px"></span>
            <span x-show="!$store.dashboard.loading" style="display:none">
              Yesterday: <strong class="text-on-surface" x-text="$store.dashboard.yesterdayTools"></strong>
            </span>
          </div>
        </div>

        <!-- Tokens -->
        <div class="bg-surface-container-low border border-outline-variant p-5 flex flex-col overflow-hidden">
          <div class="h-[34px] w-[60%] mb-2 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="h-3 w-[40%] mb-4 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div x-show="!$store.dashboard.loading" style="display:none">
            <div class="text-3xl font-headline font-bold text-on-surface mb-1" x-text="$store.dashboard.todayTokens"></div>
            <div class="flex items-center gap-1.5 mb-3">
              <span class="text-xs leading-none"
                    x-show="$store.dashboard.dirTokens !== 0"
                    :class="$store.dashboard.dirTokens > 0 ? 'text-primary' : 'text-secondary'"
                    x-text="$store.dashboard.dirTokens > 0 ? '\u25B2' : '\u25BC'"></span>
              <span class="text-xs uppercase tracking-widest text-on-surface-variant">Tokens</span>
            </div>
          </div>
          <div class="mt-auto text-xs text-on-surface-variant pt-2 border-t border-outline-variant/30 -mx-5 px-5">
            <span x-show="$store.dashboard.loading" class="skeleton" style="display:none;height:14px;width:80%;border-radius:3px"></span>
            <span x-show="!$store.dashboard.loading" style="display:none">
              Yesterday: <strong class="text-on-surface" x-text="$store.dashboard.yesterdayTokens"></strong>
            </span>
          </div>
        </div>

      </div>
    </div>

    <!-- -------------------------------------------------------------------
         PEAK DAYS — all-time per-metric record cards
         ---------------------------------------------------------------- -->
    <div class="font-headline text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-6 mt-12">Peak Days</div>
    <div class="mb-8">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">

        <!-- Peak Messages -->
        <div class="bg-surface-container-low border border-outline-variant p-4">
          <div class="h-6 w-[55%] mb-1.5 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="h-3 w-[75%] mb-1.5 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="h-2.5 w-[40%] mt-1 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div x-show="!$store.dashboard.loading" style="display:none">
            <div class="text-xl font-headline font-bold text-on-surface leading-tight" x-text="$store.dashboard.peakMessages ? $store.dashboard.peakMessages.value : '\u2014'"></div>
            <div class="text-[11px] text-on-surface-variant mt-0.5 min-h-[15px]" x-text="$store.dashboard.peakMessages ? ($store.dashboard.peakMessages.project ? $store.dashboard.peakMessages.date + ' \u2013 ' + $store.dashboard.peakMessages.project : $store.dashboard.peakMessages.date) : ''"></div>
            <div class="text-xs uppercase tracking-widest text-on-surface-variant mt-1 font-headline font-bold">Messages</div>
          </div>
        </div>

        <!-- Peak Sessions -->
        <div class="bg-surface-container-low border border-outline-variant p-4">
          <div class="h-6 w-[55%] mb-1.5 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="h-3 w-[75%] mb-1.5 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="h-2.5 w-[40%] mt-1 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div x-show="!$store.dashboard.loading" style="display:none">
            <div class="text-xl font-headline font-bold text-on-surface leading-tight" x-text="$store.dashboard.peakSessions ? $store.dashboard.peakSessions.value : '\u2014'"></div>
            <div class="text-[11px] text-on-surface-variant mt-0.5 min-h-[15px]" x-text="$store.dashboard.peakSessions ? ($store.dashboard.peakSessions.project ? $store.dashboard.peakSessions.date + ' \u2013 ' + $store.dashboard.peakSessions.project : $store.dashboard.peakSessions.date) : ''"></div>
            <div class="text-xs uppercase tracking-widest text-on-surface-variant mt-1 font-headline font-bold">Sessions</div>
          </div>
        </div>

        <!-- Peak Tokens -->
        <div class="bg-surface-container-low border border-outline-variant p-4">
          <div class="h-6 w-[55%] mb-1.5 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="h-3 w-[75%] mb-1.5 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="h-2.5 w-[40%] mt-1 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div x-show="!$store.dashboard.loading" style="display:none">
            <div class="text-xl font-headline font-bold text-on-surface leading-tight" x-text="$store.dashboard.peakTokens ? $store.dashboard.peakTokens.value : '\u2014'"></div>
            <div class="text-[11px] text-on-surface-variant mt-0.5 min-h-[15px]" x-text="$store.dashboard.peakTokens ? ($store.dashboard.peakTokens.project ? $store.dashboard.peakTokens.date + ' \u2013 ' + $store.dashboard.peakTokens.project : $store.dashboard.peakTokens.date) : ''"></div>
            <div class="text-xs uppercase tracking-widest text-on-surface-variant mt-1 font-headline font-bold">Tokens</div>
          </div>
        </div>

        <!-- Peak Cost -->
        <div class="bg-surface-container-low border border-outline-variant p-4">
          <div class="h-6 w-[55%] mb-1.5 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="h-3 w-[75%] mb-1.5 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="h-2.5 w-[40%] mt-1 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div x-show="!$store.dashboard.loading" style="display:none">
            <div class="text-xl font-headline font-bold text-on-surface leading-tight" x-text="$store.dashboard.peakCost ? $store.dashboard.peakCost.value : '\u2014'"></div>
            <div class="text-[11px] text-on-surface-variant mt-0.5 min-h-[15px]" x-text="$store.dashboard.peakCost ? ($store.dashboard.peakCost.project ? $store.dashboard.peakCost.date + ' \u2013 ' + $store.dashboard.peakCost.project : $store.dashboard.peakCost.date) : ''"></div>
            <div class="text-xs uppercase tracking-widest text-on-surface-variant mt-1 font-headline font-bold">Cost</div>
          </div>
        </div>

      </div>
    </div>


    <!-- =====================================================================
         INSIGHTS
         ================================================================== -->
    <div x-data="insightsPanel()">
      <div x-show="!loading">
        <div class="font-headline text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-6 mt-12">
          Insights
          <template x-if="data && data.windowDays">
            <span style="font-size:12px;font-weight:400;margin-left:6px" class="text-on-surface-variant" x-text="data.windowDays + '-day window'"></span>
          </template>
          <template x-if="staleDays > 3">
            <span class="inline-block text-[11px] text-on-surface-variant bg-outline-variant px-2 py-0.5 ml-2" x-text="'Last updated ' + staleDays + ' days ago'"></span>
          </template>
        </div>

        <!-- Empty state -->
        <template x-if="empty">
          <div class="bg-surface-container-low border border-outline-variant p-5 text-center text-on-surface-variant py-8">
            <p>Run <code class="text-primary">shipcard sync</code> to generate insights.</p>
          </div>
        </template>

        <!-- Insights content -->
        <template x-if="!empty && data">
          <div>
            <!-- PRO narrative card (only when narrative data exists) -->
            <template x-if="data.narrative">
              <div class="bg-gradient-to-br from-surface-container to-[#1a1f2e] border border-[#6a9bcc] p-5 mb-4">
                <div class="text-[11px] text-[#6a9bcc] uppercase tracking-widest mb-2">AI Weekly Summary</div>
                <div class="text-sm text-on-surface leading-relaxed" x-text="data.narrative"></div>
              </div>
            </template>

            <!-- Insight cards grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

              <!-- Peak Activity card -->
              <div class="bg-surface-container-low border border-outline-variant p-5">
                <h4 class="text-sm text-on-surface-variant uppercase tracking-widest mb-3 font-headline font-bold" x-text="data.peakHours && data.peakHours.topHours.length > 0 ? 'Peak Hours' : 'Peak Days'"></h4>
                <!-- Peak hours bar chart -->
                <template x-if="data.peakHours && data.peakHours.topHours.length > 0">
                  <div>
                    <template x-for="(item, i) in data.peakHours.topHours.slice(0, 3)" :key="i">
                      <div class="flex items-center gap-2 my-1">
                        <span class="w-10 text-xs text-on-surface-variant text-right" x-text="item.label"></span>
                        <div class="flex-1 h-1.5 bg-outline-variant rounded-full overflow-hidden">
                          <div class="insight-bar-fill h-full bg-primary rounded-full"
                            :style="'width:' + Math.round((item.totalSessions / data.peakHours.topHours[0].totalSessions) * 100) + '%'">
                          </div>
                        </div>
                        <span class="text-[11px] text-on-surface-variant w-6 text-right" x-text="item.totalSessions"></span>
                      </div>
                    </template>
                  </div>
                </template>
                <!-- Peak days bar chart (fallback when no hourly data) -->
                <template x-if="(!data.peakHours || data.peakHours.topHours.length === 0) && data.peakDays && data.peakDays.topDays.length > 0">
                  <div>
                    <template x-for="(item, i) in data.peakDays.topDays.slice(0, 3)" :key="i">
                      <div class="flex items-center gap-2 my-1">
                        <span class="w-10 text-xs text-on-surface-variant text-right" x-text="item.label"></span>
                        <div class="flex-1 h-1.5 bg-outline-variant rounded-full overflow-hidden">
                          <div class="insight-bar-fill h-full bg-primary rounded-full"
                            :style="'width:' + Math.round((item.avgSessions / data.peakDays.topDays[0].avgSessions) * 100) + '%'">
                          </div>
                        </div>
                        <span class="text-[11px] text-on-surface-variant w-8 text-right" x-text="item.avgSessions.toFixed(1)"></span>
                      </div>
                    </template>
                  </div>
                </template>
                <!-- No activity data -->
                <template x-if="(!data.peakHours || data.peakHours.topHours.length === 0) && (!data.peakDays || data.peakDays.topDays.length === 0)">
                  <div class="mt-3 text-sm text-on-surface-variant">No activity data yet.</div>
                </template>
              </div>

              <!-- Cost Trend card -->
              <div class="bg-surface-container-low border border-outline-variant p-5">
                <h4 class="text-sm text-on-surface-variant uppercase tracking-widest mb-3 font-headline font-bold">Cost Trend</h4>
                <template x-if="data.costTrend && data.costTrend.weeklyTotals && data.costTrend.weeklyTotals.length > 0">
                  <div>
                    <div class="text-3xl font-headline font-bold text-on-surface leading-tight" x-text="formatCost(data.costTrend.weeklyTotals[data.costTrend.weeklyTotals.length - 1].costCents)"></div>
                    <div class="text-xs text-on-surface-variant mt-1">
                      <span :class="data.costTrend.trend === 'up' ? 'text-primary' : data.costTrend.trend === 'down' ? 'text-secondary' : 'text-on-surface-variant'">
                        <span x-text="data.costTrend.trend === 'up' ? '\u2191' : data.costTrend.trend === 'down' ? '\u2193' : '\u2014'"></span>
                        <span x-text="data.costTrend.deltaPercent != null ? Math.abs(Math.round(data.costTrend.deltaPercent)) + '% vs last week' : 'vs last week'"></span>
                      </span>
                    </div>
                    <div class="mt-3 text-sm text-on-surface" x-show="data.costTrend.weeklyTotals.length >= 2">
                      <span x-text="data.costTrend.weeklyTotals.slice(-2).map((w, i) => 'W' + (i+1) + ': ' + formatCost(w.costCents)).join(' \u2192 ')"></span>
                    </div>
                  </div>
                </template>
                <template x-if="!data.costTrend || !data.costTrend.weeklyTotals || data.costTrend.weeklyTotals.length === 0">
                  <div class="mt-3 text-sm text-on-surface-variant">No cost data yet.</div>
                </template>
              </div>

              <!-- Coding Streak card -->
              <div class="bg-surface-container-low border border-outline-variant p-5">
                <h4 class="text-sm text-on-surface-variant uppercase tracking-widest mb-3 font-headline font-bold">Coding Streak</h4>
                <template x-if="data.streak">
                  <div>
                    <div class="text-3xl font-headline font-bold text-on-surface leading-tight">
                      <span class="text-primary">&#x1F525;</span>
                      <span x-text="data.streak.currentStreak"></span>
                    </div>
                    <div class="text-xs text-on-surface-variant mt-1" x-text="data.streak.currentStreak === 1 ? 'day streak' : 'days streak'"></div>
                    <div class="mt-3 text-sm text-on-surface">
                      <div>Longest: <span x-text="data.streak.longestStreak"></span> days</div>
                      <div>Active this week: <span x-text="data.streak.activeDaysThisWeek"></span>/7 days</div>
                    </div>
                  </div>
                </template>
                <template x-if="!data.streak">
                  <div class="mt-3 text-sm text-on-surface-variant">No streak data yet.</div>
                </template>
              </div>

            </div><!-- /insights-grid -->
          </div>
        </template>
      </div><!-- /insights loaded -->
    </div><!-- /insightsPanel -->

    <!-- -------------------------------------------------------------------
         HERO STATS
         ---------------------------------------------------------------- -->
    <div class="font-headline text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-6 mt-12">Overview</div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

      <!-- Collecting Since -->
      <div class="bg-surface-container-low border border-outline-variant p-5 flex flex-col gap-2 transition-colors hover:border-surface-container-highest" :class="{ 'loading': $store.dashboard.loading }">
        <div class="text-[11px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Collecting Since</div>
        <div class="h-8 w-[70%] skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="h-3.5 w-[50%] mt-0.5 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="h-9 w-full mt-2 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="text-3xl font-headline font-bold text-on-surface tracking-tight leading-none" x-show="!$store.dashboard.loading" x-text="$store.dashboard.heroTenure" style="display:none"></div>
        <div class="text-xs text-on-surface-variant" x-show="!$store.dashboard.loading" style="display:none">
          <strong class="text-on-surface" x-text="$store.dashboard.heroFirstDate"></strong>
        </div>
        <div class="sparkline-wrap mt-1 h-9" x-show="!$store.dashboard.loading" style="display:none">
          <svg viewBox="0 0 200 36" preserveAspectRatio="none">
            <polygon :points="$store.dashboard.sparkSessionsArea(200,36)" class="sparkline-area" fill="#00d4aa" />
            <polyline :points="$store.dashboard.sparkSessions(200,36)" stroke="#00d4aa" />
          </svg>
        </div>
      </div>

      <!-- Total Tokens -->
      <div class="bg-surface-container-low border border-outline-variant p-5 flex flex-col gap-2 transition-colors hover:border-surface-container-highest" :class="{ 'loading': $store.dashboard.loading }">
        <div class="text-[11px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Total Tokens</div>
        <div class="h-8 w-[70%] skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="h-3.5 w-[50%] mt-0.5 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="h-9 w-full mt-2 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="text-3xl font-headline font-bold text-on-surface tracking-tight leading-none" x-show="!$store.dashboard.loading" x-text="$store.dashboard.heroTokens" style="display:none"></div>
        <div class="text-xs text-on-surface-variant" x-show="!$store.dashboard.loading" style="display:none">
          <strong class="text-on-surface" x-text="$store.dashboard.heroCacheHitPct"></strong> cache hit rate
        </div>
        <div class="sparkline-wrap mt-1 h-9" x-show="!$store.dashboard.loading" style="display:none">
          <svg viewBox="0 0 200 36" preserveAspectRatio="none">
            <polygon :points="$store.dashboard.sparkTokensArea(200,36)" class="sparkline-area" fill="#6a9bcc" />
            <polyline :points="$store.dashboard.sparkTokens(200,36)" stroke="#6a9bcc" />
          </svg>
        </div>
      </div>

      <!-- Total Cost -->
      <div class="bg-surface-container-low border border-outline-variant p-5 flex flex-col gap-2 transition-colors hover:border-surface-container-highest" :class="{ 'loading': $store.dashboard.loading }">
        <div class="text-[11px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Total Cost</div>
        <div class="h-8 w-[70%] skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="h-3.5 w-[50%] mt-0.5 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="h-9 w-full mt-2 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="text-3xl font-headline font-bold text-on-surface tracking-tight leading-none" x-show="!$store.dashboard.loading" x-text="$store.dashboard.heroCost" style="display:none"></div>
        <div class="text-xs text-on-surface-variant" x-show="!$store.dashboard.loading" style="display:none">
          for <strong class="text-on-surface" x-text="$store.dashboard.heroSessions"></strong> sessions
        </div>
        <div class="sparkline-wrap mt-1 h-9" x-show="!$store.dashboard.loading" style="display:none">
          <svg viewBox="0 0 200 36" preserveAspectRatio="none">
            <polygon :points="$store.dashboard.sparkCostArea(200,36)" class="sparkline-area" fill="#00d4aa" />
            <polyline :points="$store.dashboard.sparkCost(200,36)" stroke="#00d4aa" />
          </svg>
        </div>
      </div>

      <!-- Cost / Session (ROI) -->
      <div class="bg-surface-container-low border border-outline-variant p-5 flex flex-col gap-2 transition-colors hover:border-surface-container-highest" :class="{ 'loading': $store.dashboard.loading }">
        <div class="text-[11px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Cost / Session</div>
        <div class="h-8 w-[70%] skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="h-3.5 w-[50%] mt-0.5 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="h-9 w-full mt-2 skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="text-3xl font-headline font-bold text-on-surface tracking-tight leading-none" x-show="!$store.dashboard.loading" x-text="$store.dashboard.heroCostPerSession" style="display:none"></div>
        <div class="text-xs text-on-surface-variant" x-show="!$store.dashboard.loading" style="display:none">
          avg per session &mdash; <strong class="text-on-surface" x-text="$store.dashboard.heroRange"></strong>
        </div>
        <div class="sparkline-wrap mt-1 h-9" x-show="!$store.dashboard.loading" style="display:none">
          <svg viewBox="0 0 200 36" preserveAspectRatio="none">
            <polygon :points="$store.dashboard.sparkCpsArea(200,36)" class="sparkline-area" fill="#788c5d" />
            <polyline :points="$store.dashboard.sparkCps(200,36)" stroke="#788c5d" />
          </svg>
        </div>
      </div>

    </div><!-- /hero-grid -->

    <!-- -------------------------------------------------------------------
         HERO STATS — Overview (range-reactive)
         ---------------------------------------------------------------- -->
    <div class="section-title">Overview</div>
    <div class="hero-grid">

      <!-- Collecting Since -->
      <div class="stat-card" :class="{ loading: $store.dashboard.loading }">
        <div class="stat-label">Collecting Since</div>
        <div class="skel-value skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="skel-sub skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="skel-sparkline skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="stat-value" x-show="!$store.dashboard.loading" x-text="$store.dashboard.heroTenure" style="display:none"></div>
        <div class="stat-sub" x-show="!$store.dashboard.loading" style="display:none">
          <strong x-text="$store.dashboard.heroFirstDate"></strong>
        </div>
        <div class="sparkline-wrap" x-show="!$store.dashboard.loading" style="display:none">
          <svg viewBox="0 0 200 36" preserveAspectRatio="none">
            <polygon :points="$store.dashboard.sparkSessionsArea(200,36)" class="sparkline-area" fill="var(--orange)" />
            <polyline :points="$store.dashboard.sparkSessions(200,36)" stroke="var(--orange)" />
          </svg>
        </div>
      </div>

      <!-- Total Tokens -->
      <div class="stat-card" :class="{ loading: $store.dashboard.loading }">
        <div class="stat-label">Total Tokens</div>
        <div class="skel-value skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="skel-sub skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="skel-sparkline skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="stat-value" x-show="!$store.dashboard.loading" x-text="$store.dashboard.heroTokens" style="display:none"></div>
        <div class="stat-sub" x-show="!$store.dashboard.loading" style="display:none">
          <strong x-text="$store.dashboard.heroCacheHitPct"></strong> cache hit rate
        </div>
        <div class="sparkline-wrap" x-show="!$store.dashboard.loading" style="display:none">
          <svg viewBox="0 0 200 36" preserveAspectRatio="none">
            <polygon :points="$store.dashboard.sparkTokensArea(200,36)" class="sparkline-area" fill="var(--blue)" />
            <polyline :points="$store.dashboard.sparkTokens(200,36)" stroke="var(--blue)" />
          </svg>
        </div>
      </div>

      <!-- Total Cost -->
      <div class="stat-card" :class="{ loading: $store.dashboard.loading }">
        <div class="stat-label">Total Cost</div>
        <div class="skel-value skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="skel-sub skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="skel-sparkline skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="stat-value" x-show="!$store.dashboard.loading" x-text="$store.dashboard.heroCost" style="display:none"></div>
        <div class="stat-sub" x-show="!$store.dashboard.loading" style="display:none">
          for <strong x-text="$store.dashboard.heroSessions"></strong> sessions
        </div>
        <div class="sparkline-wrap" x-show="!$store.dashboard.loading" style="display:none">
          <svg viewBox="0 0 200 36" preserveAspectRatio="none">
            <polygon :points="$store.dashboard.sparkCostArea(200,36)" class="sparkline-area" fill="var(--orange)" />
            <polyline :points="$store.dashboard.sparkCost(200,36)" stroke="var(--orange)" />
          </svg>
        </div>
      </div>

      <!-- Cost / Session (ROI) -->
      <div class="stat-card" :class="{ loading: $store.dashboard.loading }">
        <div class="stat-label">Cost / Session</div>
        <div class="skel-value skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="skel-sub skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="skel-sparkline skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="stat-value" x-show="!$store.dashboard.loading" x-text="$store.dashboard.heroCostPerSession" style="display:none"></div>
        <div class="stat-sub" x-show="!$store.dashboard.loading" style="display:none">
          avg per session &mdash; <strong x-text="$store.dashboard.heroRange"></strong>
        </div>
        <div class="sparkline-wrap" x-show="!$store.dashboard.loading" style="display:none">
          <svg viewBox="0 0 200 36" preserveAspectRatio="none">
            <polygon :points="$store.dashboard.sparkCpsArea(200,36)" class="sparkline-area" fill="var(--green)" />
            <polyline :points="$store.dashboard.sparkCps(200,36)" stroke="var(--green)" />
          </svg>
        </div>
      </div>

    </div><!-- /hero-grid -->

    <!-- -------------------------------------------------------------------
         OVERVIEW PANELS — Activity Heatmap (wide) + Daily Activity chart
         ---------------------------------------------------------------- -->
    <div class="font-headline text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-6 mt-12">Activity</div>
    <div class="grid grid-cols-1 gap-4 mb-4">
      <!-- panel-calendar: calendar heatmap -->
      <div class="bg-surface-container-low border border-outline-variant p-5 min-h-[200px] flex flex-col" id="panel-calendar">
        <div class="flex justify-between items-center mb-4 shrink-0">
          <span class="font-headline text-sm font-bold text-on-surface">Activity Heatmap</span>
          <span class="text-[10px] uppercase tracking-widest text-on-surface-variant">Calendar</span>
        </div>
        <div class="flex-1 relative flex items-stretch h-[220px] lg:h-[280px]">
          <div class="flex-1 min-h-[180px] skeleton" x-show="$store.dashboard.loading" style="display:none;min-height:120px"></div>
          <div id="panel-calendar-chart" x-show="!$store.dashboard.loading" style="display:none;width:100%">
            <div id="heatmap-container"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <!-- panel-daily: daily activity line/bar chart -->
      <div class="bg-surface-container-low border border-outline-variant p-5 min-h-[340px] flex flex-col" id="panel-daily">
        <div class="flex justify-between items-center mb-4 shrink-0">
          <span class="font-headline text-sm font-bold text-on-surface">Daily Activity</span>
          <span class="text-[10px] uppercase tracking-widest text-on-surface-variant">Timeline</span>
        </div>
        <div class="flex-1 relative flex items-stretch h-[220px] lg:h-[280px]">
          <div class="flex-1 min-h-[180px] skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-daily-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>

      <!-- panel-dow: day-of-week distribution -->
      <div class="bg-surface-container-low border border-outline-variant p-5 min-h-[340px] flex flex-col" id="panel-dow">
        <div class="flex justify-between items-center mb-4 shrink-0">
          <span class="font-headline text-sm font-bold text-on-surface">Day of Week</span>
          <span class="text-[10px] uppercase tracking-widest text-on-surface-variant">Distribution</span>
        </div>
        <div class="flex-1 relative flex items-stretch h-[220px] lg:h-[280px]">
          <div class="flex-1 min-h-[180px] skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-dow-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>
    </div>

    <!-- -------------------------------------------------------------------
         COMPOSITION PANELS — Tool, Model, Message type donuts
         ---------------------------------------------------------------- -->
    <div class="font-headline text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-6 mt-12">Composition</div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      <!-- panel-tools: tool call donut -->
      <div class="bg-surface-container-low border border-outline-variant p-5 min-h-[260px] flex flex-col" id="panel-tools">
        <div class="flex justify-between items-center mb-4 shrink-0">
          <span class="font-headline text-sm font-bold text-on-surface">Tool Usage</span>
          <span class="text-[10px] uppercase tracking-widest text-on-surface-variant">Donut</span>
        </div>
        <div class="flex-1 relative flex items-stretch h-[220px] lg:h-[280px]">
          <div class="flex-1 min-h-[180px] skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-tools-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>

      <!-- panel-models: model usage donut -->
      <div class="bg-surface-container-low border border-outline-variant p-5 min-h-[260px] flex flex-col" id="panel-models">
        <div class="flex justify-between items-center mb-4 shrink-0">
          <span class="font-headline text-sm font-bold text-on-surface">Model Mix</span>
          <span class="text-[10px] uppercase tracking-widest text-on-surface-variant">Donut</span>
        </div>
        <div class="flex-1 relative flex items-stretch h-[220px] lg:h-[280px]">
          <div class="flex-1 min-h-[180px] skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-models-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>

      <!-- panel-messages: message type donut -->
      <div class="bg-surface-container-low border border-outline-variant p-5 min-h-[260px] flex flex-col" id="panel-messages">
        <div class="flex justify-between items-center mb-4 shrink-0">
          <span class="font-headline text-sm font-bold text-on-surface">Message Types</span>
          <span class="text-[10px] uppercase tracking-widest text-on-surface-variant">Donut</span>
        </div>
        <div class="flex-1 relative flex items-stretch h-[220px] lg:h-[280px]">
          <div class="flex-1 min-h-[180px] skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-messages-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>
    </div>

    <!-- -------------------------------------------------------------------
         TOKEN PANELS — Token breakdown + cost over time
         ---------------------------------------------------------------- -->
    <div class="font-headline text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-6 mt-12">Tokens &amp; Cost</div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <!-- panel-tokens: token breakdown stacked bar -->
      <div class="bg-surface-container-low border border-outline-variant p-5 min-h-[260px] flex flex-col" id="panel-tokens">
        <div class="flex justify-between items-center mb-4 shrink-0">
          <span class="font-headline text-sm font-bold text-on-surface">Token Breakdown</span>
          <span class="text-[10px] uppercase tracking-widest text-on-surface-variant">Stacked</span>
        </div>
        <div class="flex-1 relative flex items-stretch h-[220px] lg:h-[280px]">
          <div class="flex-1 min-h-[180px] skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-tokens-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>

      <!-- panel-cost: cost over time line chart -->
      <div class="bg-surface-container-low border border-outline-variant p-5 min-h-[260px] flex flex-col" id="panel-cost">
        <div class="flex justify-between items-center mb-4 shrink-0">
          <span class="font-headline text-sm font-bold text-on-surface">Cost Over Time</span>
          <span class="text-[10px] uppercase tracking-widest text-on-surface-variant">Line</span>
        </div>
        <div class="flex-1 relative flex items-stretch h-[220px] lg:h-[280px]">
          <div class="flex-1 min-h-[180px] skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-cost-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>
    </div>

    <!-- -------------------------------------------------------------------
         PROJECT PANEL — Project activity bars (wide, 1-col)
         ---------------------------------------------------------------- -->
    <div class="font-headline text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-6 mt-12">Projects</div>
    <div class="grid grid-cols-1 gap-4 mb-4">
      <!-- panel-projects: project activity horizontal bars -->
      <div class="bg-surface-container-low border border-outline-variant p-5 min-h-[200px] flex flex-col" id="panel-projects">
        <div class="flex justify-between items-center mb-4 shrink-0">
          <span class="font-headline text-sm font-bold text-on-surface">Project Activity
            <span x-show="$store.dashboard.hasProjects" style="display:none;font-weight:400;font-size:12px" class="text-on-surface-variant">
              (showing <span x-text="Math.min(5, $store.dashboard._projectTotal)"></span> of <span x-text="$store.dashboard._projectTotal"></span>)
            </span>
          </span>
          <div class="flex border border-outline-variant overflow-hidden" x-show="$store.dashboard.hasProjects" style="display:none">
            <button class="px-2 py-1 text-[11px] font-bold font-headline bg-background text-on-surface-variant border-r border-outline-variant cursor-pointer transition-colors whitespace-nowrap"
              :class="$store.dashboard.projectSortMetric === 'messages' ? '!bg-primary !text-on-primary' : 'hover:bg-surface-container'"
              @click="$store.dashboard.projectSortMetric = 'messages'">Messages</button>
            <button class="px-2 py-1 text-[11px] font-bold font-headline bg-background text-on-surface-variant border-r border-outline-variant cursor-pointer transition-colors whitespace-nowrap"
              :class="$store.dashboard.projectSortMetric === 'tokens' ? '!bg-primary !text-on-primary' : 'hover:bg-surface-container'"
              @click="$store.dashboard.projectSortMetric = 'tokens'">Tokens</button>
            <button class="px-2 py-1 text-[11px] font-bold font-headline bg-background text-on-surface-variant border-r border-outline-variant cursor-pointer transition-colors whitespace-nowrap"
              :class="$store.dashboard.projectSortMetric === 'sessions' ? '!bg-primary !text-on-primary' : 'hover:bg-surface-container'"
              @click="$store.dashboard.projectSortMetric = 'sessions'">Sessions</button>
            <button class="px-2 py-1 text-[11px] font-bold font-headline bg-background text-on-surface-variant cursor-pointer transition-colors whitespace-nowrap"
              :class="$store.dashboard.projectSortMetric === 'cost' ? '!bg-primary !text-on-primary' : 'hover:bg-surface-container'"
              @click="$store.dashboard.projectSortMetric = 'cost'">Cost</button>
          </div>
        </div>
        <div class="flex-1 relative flex items-stretch" style="height:auto">
          <div class="flex-1 min-h-[180px] skeleton" x-show="$store.dashboard.loading" style="display:none;min-height:120px"></div>
          <div id="panel-projects-content" x-show="!$store.dashboard.loading" style="display:none;width:100%">
            <div x-show="!$store.dashboard.hasProjects" class="text-on-surface-variant text-sm py-4">
              No project breakdown available. Sync with <code class="text-primary">shipcard sync --show-projects</code> to see project data.
            </div>
            <div x-show="$store.dashboard.hasProjects" style="display:none;position:relative;width:100%;min-height:200px">
              <canvas id="panel-projects-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>


  </div><!-- /dashboard content -->
</div><!-- /page -->

<!-- =========================================================================
     FOOTER
     ====================================================================== -->
<footer class="py-12 border-t border-outline-variant/5 bg-background">
<div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
  <div class="flex items-center gap-4">
    <span class="font-headline font-bold text-on-surface">ShipCard</span>
    <span class="text-on-surface-variant text-xs font-body">&copy; 2026</span>
  </div>
  <div class="flex gap-8 text-on-surface-variant text-xs font-medium">
    <a class="hover:text-on-surface" href="https://github.com/jjaimealeman/shipcard" target="_blank" rel="noopener">GitHub</a>
    <a class="hover:text-on-surface" href="https://www.npmjs.com/package/@jjaimealeman/shipcard" target="_blank" rel="noopener">npm</a>
    <a class="hover:text-on-surface" href="/u/__USERNAME__">View Card</a>
  </div>
  <div class="text-on-surface-variant text-xs">
    MIT License &middot; Built on Cloudflare &middot; Made in El Paso
    <span x-show="$store.dashboard.syncedAt" x-text="'Synced: ' + $store.dashboard.syncedAtFormatted" style="display:none" class="ml-2"></span>
  </div>
</div>
</footer>

<!-- =========================================================================
     SCRIPTS — load order is critical
     ====================================================================== -->
<!-- 1. D3.js v7 (used by custom heatmap) -->
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js" defer></script>
<!-- 2. Chart.js 4.5.1 -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js" defer></script>
<!-- 3. chartjs-plugin-datalabels 2.2.0 (after Chart.js) -->
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js" defer></script>
<!-- 4. (cal-heatmap removed — custom SVG heatmap used instead) -->
<!-- 5. Alpine.js intersect plugin (BEFORE Alpine core) -->
<script src="https://cdn.jsdelivr.net/npm/@alpinejs/intersect@3.15.8/dist/cdn.min.js" defer></script>
<!-- 6. Alpine.js core 3.15.8 (LAST) -->
<script src="https://cdn.jsdelivr.net/npm/alpinejs@3.15.8/dist/cdn.min.js" defer></script>

<script>
// ---------------------------------------------------------------------------
// Alpine.js global store — dashboard state & data fetching
// ---------------------------------------------------------------------------
document.addEventListener('alpine:init', () => {
  Alpine.store('dashboard', {
    // State
    username: '',
    range: '30d',
    stats: null,
    timeseries: null,
    loading: true,
    // Subscription/billing state (server-injected)
    isPro: __IS_PRO__,
    paymentFailed: __PAYMENT_FAILED__,
    subscriptionStatus: '__SUBSCRIPTION_STATUS__',
    periodEnd: __PERIOD_END__,
    error: null,
    notFound: false,
    syncedAt: null,

    // ---------------------------------------------------------------------------
    // Computed: filteredDays — time-series days filtered by range
    // ---------------------------------------------------------------------------
    get filteredDays() {
      if (!this.timeseries || !this.timeseries.days) return [];
      const days = this.timeseries.days;
      if (this.range === 'all') return days;
      const n = this.range === '7d' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - n);
      const cutStr = cutoff.toISOString().slice(0, 10);
      return days.filter(d => d.date >= cutStr);
    },

    // ---------------------------------------------------------------------------
    // Computed: hasProjects — whether any day in filteredDays has project data
    // (either byProject metrics or legacy projects name array)
    // ---------------------------------------------------------------------------
    get hasProjects() {
      return this.filteredDays.some(d =>
        (d.byProject && Object.keys(d.byProject).length > 0) ||
        (d.projects && d.projects.length > 0)
      );
    },

    // Total unique projects across all-time data (for "Showing N of X" heading)
    get _projectTotal() {
      const all = this.timeseries ? this.timeseries.days : [];
      const names = new Set();
      all.forEach(d => {
        if (d.byProject) Object.keys(d.byProject).forEach(n => names.add(n));
        if (d.projects) d.projects.forEach(n => names.add(n));
      });
      return names.size;
    },

    // User-selectable sort dimension for Project Activity bar chart
    projectSortMetric: 'messages',

    // ---------------------------------------------------------------------------
    // Hero stat computed values (filtered to selected range)
    // ---------------------------------------------------------------------------
    get _filteredTokens() {
      return this.filteredDays.reduce((acc, d) => {
        acc.input      += d.tokens.input;
        acc.output     += d.tokens.output;
        acc.cacheCreate += d.tokens.cacheCreate;
        acc.cacheRead  += d.tokens.cacheRead;
        return acc;
      }, { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 });
    },

    get _filteredTotalTokens() {
      const t = this._filteredTokens;
      return t.input + t.output + t.cacheCreate + t.cacheRead;
    },

    get _filteredCostCents() {
      return this.filteredDays.reduce((s, d) => s + d.costCents, 0);
    },

    get _filteredSessions() {
      return this.filteredDays.reduce((s, d) => s + d.sessions, 0);
    },

    get heroTokens() {
      const n = this._filteredTotalTokens;
      if (n === 0 && this.filteredDays.length === 0 && this.stats) {
        // Fallback to SafeStats when no time-series data
        const t = this.stats.totalTokens;
        const total = t.input + t.output + t.cacheCreate + t.cacheRead;
        return this._fmtNum(total);
      }
      return this._fmtNum(n);
    },

    get heroCacheHitPct() {
      const t = this._filteredTokens;
      const total = t.input + t.output + t.cacheCreate + t.cacheRead;
      if (total === 0) return '0%';
      return ((t.cacheRead / total) * 100).toFixed(1) + '%';
    },

    get heroCost() {
      const cents = this._filteredCostCents;
      if (cents === 0 && this.stats && this.filteredDays.length === 0) {
        return this.stats.totalCost;
      }
      const dollars = cents / 100;
      return '~$' + dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    get heroSessions() {
      const s = this._filteredSessions;
      if (s === 0 && this.stats && this.filteredDays.length === 0) {
        return this._fmtNum(this.stats.totalSessions);
      }
      return this._fmtNum(s);
    },

    get heroCostPerSession() {
      const cents = this._filteredCostCents;
      const sessions = this._filteredSessions;
      if (sessions === 0) return '$0.00';
      const perSession = cents / sessions / 100;
      return '$' + perSession.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    get heroRange() {
      if (this.range === '7d') return 'last 7 days';
      if (this.range === '30d') return 'last 30 days';
      return 'all time';
    },

    get heroTenure() {
      if (!this.timeseries || !this.timeseries.days || this.timeseries.days.length === 0) return '—';
      const days = this.timeseries.days;
      const first = days[0].date;
      const last = days[days.length - 1].date;
      const ms = new Date(last).getTime() - new Date(first).getTime();
      const totalDays = Math.round(ms / 86400000);
      if (totalDays < 7) return totalDays + 'd';
      if (totalDays < 60) return Math.round(totalDays / 7) + 'w';
      return Math.round(totalDays / 30) + 'mo';
    },

    get heroFirstDate() {
      if (!this.timeseries || !this.timeseries.days || this.timeseries.days.length === 0) return '';
      return 'since ' + this.timeseries.days[0].date;
    },

    get syncedAtFormatted() {
      if (!this.syncedAt) return '';
      try {
        return new Date(this.syncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch { return this.syncedAt; }
    },

    // ---------------------------------------------------------------------------
    // Today's Activity — computed getters for today/yesterday metrics
    // ---------------------------------------------------------------------------

    // Returns YYYY-MM-DD in the browser's LOCAL timezone (not UTC).
    // en-CA locale always produces ISO date format — independent of OS locale.
    get _todayDate() {
      return new Date().toLocaleDateString('en-CA');
    },

    get _yesterdayDate() {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toLocaleDateString('en-CA');
    },

    // Scans ALL days (not filteredDays) — today is independent of range filter.
    get _todayStats() {
      if (!this.timeseries || !this.timeseries.days) return null;
      return this.timeseries.days.find(d => d.date === this._todayDate) || null;
    },

    get _yesterdayStats() {
      if (!this.timeseries || !this.timeseries.days) return null;
      return this.timeseries.days.find(d => d.date === this._yesterdayDate) || null;
    },

    // Sum all tool call values for a given day object.
    _totalTools(day) {
      if (!day || !day.toolCalls) return 0;
      return Object.values(day.toolCalls).reduce((s, v) => s + v, 0);
    },

    // Sum all token types for a given day object.
    _totalTokens(day) {
      if (!day) return 0;
      return day.tokens.input + day.tokens.output + day.tokens.cacheCreate + day.tokens.cacheRead;
    },

    // Returns 1 (today > yesterday), -1 (today < yesterday), 0 (equal).
    _dir(todayVal, yesterdayVal) {
      if (todayVal > yesterdayVal) return 1;
      if (todayVal < yesterdayVal) return -1;
      return 0;
    },

    // Today's raw values
    get todayMessages() {
      return this._todayStats ? this._todayStats.messages : 0;
    },
    get todaySessions() {
      return this._todayStats ? this._todayStats.sessions : 0;
    },
    get todayTools() {
      return this._totalTools(this._todayStats);
    },
    get todayTokens() {
      return this._fmtNum(this._totalTokens(this._todayStats));
    },
    get _todayTokensRaw() {
      return this._totalTokens(this._todayStats);
    },

    // Yesterday's raw values
    get yesterdayMessages() {
      return this._yesterdayStats ? this._yesterdayStats.messages : 0;
    },
    get yesterdaySessions() {
      return this._yesterdayStats ? this._yesterdayStats.sessions : 0;
    },
    get yesterdayTools() {
      return this._totalTools(this._yesterdayStats);
    },
    get yesterdayTokens() {
      return this._fmtNum(this._totalTokens(this._yesterdayStats));
    },
    get _yesterdayTokensRaw() {
      return this._totalTokens(this._yesterdayStats);
    },

    // Direction indicators (1=up, -1=down, 0=equal)
    get dirMessages() {
      return this._dir(this.todayMessages, this.yesterdayMessages);
    },
    get dirSessions() {
      return this._dir(this.todaySessions, this.yesterdaySessions);
    },
    get dirTools() {
      return this._dir(this.todayTools, this.yesterdayTools);
    },
    get dirTokens() {
      return this._dir(this._todayTokensRaw, this._yesterdayTokensRaw);
    },

    // ---------------------------------------------------------------------------
    // Peak Day — helpers and computed getters for all-time per-metric peaks
    // Scans ALL historical days (timeseries.days), NOT filteredDays.
    // ---------------------------------------------------------------------------

    // Generic reducer: finds the day with the highest value from the given extractor fn.
    // Returns the full day object, or null if no data available.
    _peakDay(fn) {
      if (!this.timeseries || !this.timeseries.days || !this.timeseries.days.length) return null;
      return this.timeseries.days.reduce((best, d) => fn(d) > fn(best) ? d : best);
    },

    // Extracts the top project name from a day's byProject data for the given metric.
    // Handles tokens (sum of all sub-fields) and cost (costCents) specially.
    // Returns null if byProject is missing or empty.
    _peakProject(day, metricKey) {
      if (!day || !day.byProject) return null;
      let best = null, bestVal = -1;
      for (const [name, stats] of Object.entries(day.byProject)) {
        let val;
        if (metricKey === 'tokens') {
          val = stats.tokens.input + stats.tokens.output + stats.tokens.cacheCreate + stats.tokens.cacheRead;
        } else if (metricKey === 'cost') {
          val = stats.costCents;
        } else {
          val = stats[metricKey];
        }
        if (val > bestVal) { bestVal = val; best = name; }
      }
      return best;
    },

    // Formats "2026-03-15" as "Mar 15" using local timezone (noon to avoid shift).
    _fmtShortDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    // Peak getters — each returns { value, date, project } or null if no data.
    get peakMessages() {
      const day = this._peakDay(d => d.messages);
      if (!day) return null;
      return {
        value: this._fmtNum(day.messages),
        date: this._fmtShortDate(day.date),
        project: this._peakProject(day, 'messages'),
      };
    },

    get peakSessions() {
      const day = this._peakDay(d => d.sessions);
      if (!day) return null;
      return {
        value: this._fmtNum(day.sessions),
        date: this._fmtShortDate(day.date),
        project: this._peakProject(day, 'sessions'),
      };
    },

    get peakTokens() {
      const day = this._peakDay(d => this._totalTokens(d));
      if (!day) return null;
      return {
        value: this._fmtNum(this._totalTokens(day)),
        date: this._fmtShortDate(day.date),
        project: this._peakProject(day, 'tokens'),
      };
    },

    get peakCost() {
      const day = this._peakDay(d => d.costCents);
      if (!day) return null;
      const dollars = day.costCents / 100;
      return {
        value: '$' + dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        date: this._fmtShortDate(day.date),
        project: this._peakProject(day, 'cost'),
      };
    },

    // ---------------------------------------------------------------------------
    // Sparkline generators — return SVG polyline point strings
    // ---------------------------------------------------------------------------
    _sparkPoints(values, w, h) {
      if (!values || values.length < 2) return '';
      const max = Math.max(...values) || 1;
      const min = Math.min(...values);
      const range = max - min || 1;
      const pts = values.map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / range) * (h - 4) - 2;
        return x.toFixed(1) + ',' + y.toFixed(1);
      });
      return pts.join(' ');
    },

    _sparkAreaPoints(values, w, h) {
      if (!values || values.length < 2) return '';
      const pts = this._sparkPoints(values, w, h);
      if (!pts) return '';
      const firstX = '0';
      const lastX = w.toFixed(1);
      return firstX + ',' + h + ' ' + pts + ' ' + lastX + ',' + h;
    },

    _sparkTokenValues() {
      return this.filteredDays.map(d => d.tokens.input + d.tokens.output + d.tokens.cacheCreate + d.tokens.cacheRead);
    },
    _sparkCostValues() {
      return this.filteredDays.map(d => d.costCents);
    },
    _sparkCpsValues() {
      return this.filteredDays.map(d => d.sessions > 0 ? d.costCents / d.sessions : 0);
    },
    _sparkSessionValues() {
      return this.filteredDays.map(d => d.sessions);
    },

    sparkTokens(w, h)       { return this._sparkPoints(this._sparkTokenValues(), w, h); },
    sparkTokensArea(w, h)   { return this._sparkAreaPoints(this._sparkTokenValues(), w, h); },
    sparkCost(w, h)         { return this._sparkPoints(this._sparkCostValues(), w, h); },
    sparkCostArea(w, h)     { return this._sparkAreaPoints(this._sparkCostValues(), w, h); },
    sparkCps(w, h)          { return this._sparkPoints(this._sparkCpsValues(), w, h); },
    sparkCpsArea(w, h)      { return this._sparkAreaPoints(this._sparkCpsValues(), w, h); },
    sparkSessions(w, h)     { return this._sparkPoints(this._sparkSessionValues(), w, h); },
    sparkSessionsArea(w, h) { return this._sparkAreaPoints(this._sparkSessionValues(), w, h); },

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------
    _fmtNum(n) {
      if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
      if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
      if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
      return String(n);
    },

    // ---------------------------------------------------------------------------
    // load — fetches both API endpoints concurrently
    // Called from x-init on body; renamed from init() to prevent Alpine's
    // automatic store.init() invocation (which passes no args → race condition).
    // ---------------------------------------------------------------------------
    async load(username) {
      if (!username) return;
      this.username = username;
      this.loading = true;
      this.error = null;
      this.notFound = false;

      try {
        const [statsRes, tsRes] = await Promise.all([
          fetch('/u/' + username + '/api/stats'),
          fetch('/u/' + username + '/api/timeseries'),
        ]);

        // 404 on stats = user not found
        if (statsRes.status === 404) {
          this.notFound = true;
          this.loading = false;
          return;
        }

        if (!statsRes.ok) {
          throw new Error('Stats API error: ' + statsRes.status);
        }

        const statsJson = await statsRes.json();
        this.stats = statsJson.data;
        this.syncedAt = statsJson.syncedAt;

        // Timeseries may 404 for v1-only users — degrade gracefully
        if (tsRes.ok) {
          const tsJson = await tsRes.json();
          this.timeseries = tsJson.data;
        } else {
          this.timeseries = null;
        }
      } catch (err) {
        this.error = 'Failed to load dashboard data. Please try refreshing.';
        console.error('[ShipCard dashboard]', err);
      } finally {
        this.loading = false;
      }
    },
  });
});

// ---------------------------------------------------------------------------
// Chart.js — color palette and global defaults
// ---------------------------------------------------------------------------
const COLORS = {
  orange:  '#d97757',
  blue:    '#6a9bcc',
  green:   '#788c5d',
  fg:      '#faf9f5',
  mid:     '#b0aea5',
  surface: '#1e1e1c',
  border:  '#2a2a28',
  bg:      '#141413',
};
const CHART_COLORS = [
  '#d97757','#6a9bcc','#788c5d','#c4a882',
  '#8b7ec8','#cc6b8e','#5bb5a2','#d4a053',
];

// Tooltip base options (reused across all charts)
const TOOLTIP_BASE = {
  backgroundColor: '#1e1e1c',
  borderColor:     '#2a2a28',
  borderWidth:     1,
  titleColor:      '#faf9f5',
  bodyColor:       '#b0aea5',
  padding:         8,
};

// Animation settings
const ANIM_OPTS = { duration: 400, easing: 'easeInOutQuart' };

// ---------------------------------------------------------------------------
// Data aggregation helpers
// ---------------------------------------------------------------------------

/** Format date string (YYYY-MM-DD) → "MMM DD" */
function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Aggregate sessions per day-of-week. Returns { labels, data } for Mon–Sun. */
function aggregateByWeekday(days) {
  const DOW_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const counts = new Array(7).fill(0);
  days.forEach(d => {
    // getDay() → 0=Sun…6=Sat; shift so Mon=0
    const dow = (new Date(d.date + 'T00:00:00').getDay() + 6) % 7;
    counts[dow] += d.sessions;
  });
  return { labels: DOW_LABELS, data: counts };
}

/** Aggregate a Record<string,number> field across all days. */
function aggregateField(days, field) {
  const totals = {};
  days.forEach(d => {
    const obj = d[field] || {};
    Object.entries(obj).forEach(([k, v]) => {
      totals[k] = (totals[k] || 0) + v;
    });
  });
  return totals;
}

/** Return top-N entries; merge the rest into "Other". */
function topN(obj, n) {
  const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  if (sorted.length <= n) return { labels: sorted.map(e => e[0]), data: sorted.map(e => e[1]) };
  const top = sorted.slice(0, n);
  const otherSum = sorted.slice(n).reduce((s, e) => s + e[1], 0);
  return {
    labels: [...top.map(e => e[0]), 'Other'],
    data:   [...top.map(e => e[1]), otherSum],
  };
}

/** Clean model display name: strip "claude-" prefix, truncate. */
function cleanModelName(name) {
  return name.replace(/^claude-/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '');
}

// ---------------------------------------------------------------------------
// Datalabels formatter for donuts — "Label: N (X%)"
// ---------------------------------------------------------------------------
function donutFormatter(value, ctx) {
  if (value === 0) return null;
  const data   = ctx.chart.data.datasets[0].data;
  const total  = data.reduce((s, v) => s + v, 0);
  if (total === 0) return null;
  const pct = ((value / total) * 100).toFixed(1);
  const label = ctx.chart.data.labels[ctx.dataIndex];
  const valFmt = value >= 1000 ? (value / 1000).toFixed(1) + 'k' : String(value);
  return label + ': ' + valFmt + ' (' + pct + '%)';
}

// ---------------------------------------------------------------------------
// Chart instances (stored module-level for update on range change)
// ---------------------------------------------------------------------------
let chartDaily    = null;
let chartCost     = null;
let chartDow      = null;
let chartTools    = null;
let chartModels   = null;
let chartMessages = null;
let chartTokens   = null;
let chartProjects = null;
let currentProjectSortMetric = 'messages';
let heatmapBuilt = false;

// ---------------------------------------------------------------------------
// Chart builders — each returns the Chart instance
// ---------------------------------------------------------------------------

function buildDailyChart(days) {
  const canvas = document.getElementById('panel-daily-chart');
  if (!canvas) return null;
  if (chartDaily) chartDaily.destroy();

  const labels   = days.map(d => fmtDate(d.date));
  const sessions = days.map(d => d.sessions);
  const tokensK  = days.map(d => (d.tokens.input + d.tokens.output + d.tokens.cacheCreate + d.tokens.cacheRead) / 1000);

  chartDaily = new Chart(canvas, {
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Sessions',
          data: sessions,
          backgroundColor: COLORS.orange + 'aa',
          borderColor: COLORS.orange,
          borderWidth: 1,
          borderRadius: 3,
          yAxisID: 'yLeft',
          order: 2,
        },
        {
          type: 'line',
          label: 'Tokens (k)',
          data: tokensK,
          borderColor: COLORS.blue,
          backgroundColor: COLORS.blue + '22',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.4,
          yAxisID: 'yRight',
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: ANIM_OPTS,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: TOOLTIP_BASE,
        datalabels: { display: false },
      },
      scales: {
        x: { grid: { color: COLORS.border }, ticks: { maxTicksLimit: 10, color: COLORS.mid } },
        yLeft:  { grid: { color: COLORS.border }, beginAtZero: true, position: 'left',  title: { display: true, text: 'Sessions', color: COLORS.mid } },
        yRight: { grid: { drawOnChartArea: false }, beginAtZero: true, position: 'right', title: { display: true, text: 'Tokens (k)', color: COLORS.mid } },
      },
    },
  });
  return chartDaily;
}

function buildCostChart(days) {
  const canvas = document.getElementById('panel-cost-chart');
  if (!canvas) return null;
  if (chartCost) chartCost.destroy();

  const labels = days.map(d => fmtDate(d.date));
  const costs  = days.map(d => +(d.costCents / 100).toFixed(4));

  chartCost = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Cost ($)',
        data: costs,
        backgroundColor: COLORS.green + 'cc',
        borderColor: COLORS.green,
        borderWidth: 1,
        borderRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: ANIM_OPTS,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...TOOLTIP_BASE,
          callbacks: {
            label: ctx => '$' + ctx.parsed.y.toFixed(4),
          },
        },
        datalabels: { display: false },
      },
      scales: {
        x: { grid: { color: COLORS.border }, ticks: { maxTicksLimit: 10, color: COLORS.mid } },
        y: { grid: { color: COLORS.border }, beginAtZero: true, ticks: { callback: v => '$' + v } },
      },
    },
  });
  return chartCost;
}

function buildDowChart(days) {
  const canvas = document.getElementById('panel-dow-chart');
  if (!canvas) return null;
  if (chartDow) chartDow.destroy();

  const { labels, data } = aggregateByWeekday(days);

  chartDow = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Sessions',
        data,
        backgroundColor: [
          '#d97757cc', // Mon - warm orange
          '#c4a882cc', // Tue - sand
          '#788c5dcc', // Wed - olive
          '#5bb5a2cc', // Thu - teal
          '#6a9bcccc', // Fri - blue
          '#8b7ec8cc', // Sat - lavender
          '#cc6b8ecc', // Sun - rose
        ],
        borderColor: [
          '#d97757', '#c4a882', '#788c5d', '#5bb5a2',
          '#6a9bcc', '#8b7ec8', '#cc6b8e',
        ],
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: ANIM_OPTS,
      plugins: {
        legend: { display: false },
        tooltip: TOOLTIP_BASE,
        datalabels: { display: false },
      },
      scales: {
        x: { grid: { color: COLORS.border }, beginAtZero: true },
        y: { grid: { color: COLORS.border } },
      },
    },
  });
  return chartDow;
}

function buildToolsChart(days) {
  const canvas = document.getElementById('panel-tools-chart');
  if (!canvas) return null;
  if (chartTools) chartTools.destroy();

  const totals = aggregateField(days, 'toolCalls');
  const { labels, data } = topN(totals, 7);

  chartTools = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: CHART_COLORS,
        borderColor: COLORS.surface,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: ANIM_OPTS,
      cutout: '60%',
      plugins: {
        legend: { display: false },
        tooltip: TOOLTIP_BASE,
        datalabels: {
          display: ctx => {
            const data  = ctx.chart.data.datasets[0].data;
            const total = data.reduce((s, v) => s + v, 0);
            return total > 0 && (ctx.dataset.data[ctx.dataIndex] / total) > 0.05;
          },
          color: COLORS.fg,
          font: { size: 10, family: "'Poppins', system-ui, sans-serif" },
          formatter: donutFormatter,
          textShadowBlur: 3,
          textShadowColor: COLORS.bg,
        },
      },
    },
  });
  return chartTools;
}

function buildModelsChart(days) {
  const canvas = document.getElementById('panel-models-chart');
  if (!canvas) return null;
  if (chartModels) chartModels.destroy();

  const totals = aggregateField(days, 'models');
  // Clean model names
  const cleaned = {};
  Object.entries(totals).forEach(([k, v]) => {
    const name = cleanModelName(k);
    cleaned[name] = (cleaned[name] || 0) + v;
  });
  const { labels, data } = topN(cleaned, 7);

  chartModels = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: CHART_COLORS,
        borderColor: COLORS.surface,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: ANIM_OPTS,
      cutout: '60%',
      plugins: {
        legend: { display: false },
        tooltip: TOOLTIP_BASE,
        datalabels: {
          display: ctx => {
            const data  = ctx.chart.data.datasets[0].data;
            const total = data.reduce((s, v) => s + v, 0);
            return total > 0 && (ctx.dataset.data[ctx.dataIndex] / total) > 0.05;
          },
          color: COLORS.fg,
          font: { size: 10, family: "'Poppins', system-ui, sans-serif" },
          formatter: donutFormatter,
          textShadowBlur: 3,
          textShadowColor: COLORS.bg,
        },
      },
    },
  });
  return chartModels;
}

function buildMessagesChart(days) {
  const canvas = document.getElementById('panel-messages-chart');
  if (!canvas) return null;
  if (chartMessages) chartMessages.destroy();

  const userMsgs     = days.reduce((s, d) => s + (d.userMessages || 0), 0);
  const totalMsgs    = days.reduce((s, d) => s + (d.messages    || 0), 0);
  const thinking     = days.reduce((s, d) => s + (d.thinkingBlocks || 0), 0);
  const assistMsgs   = Math.max(0, totalMsgs - userMsgs);

  chartMessages = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['You', 'Claude', 'Thinking'],
      datasets: [{
        data: [userMsgs, assistMsgs, thinking],
        backgroundColor: [COLORS.orange, COLORS.blue, COLORS.green],
        borderColor: COLORS.surface,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: ANIM_OPTS,
      cutout: '60%',
      plugins: {
        legend: { display: false },
        tooltip: TOOLTIP_BASE,
        datalabels: {
          display: ctx => {
            const data  = ctx.chart.data.datasets[0].data;
            const total = data.reduce((s, v) => s + v, 0);
            return total > 0 && (ctx.dataset.data[ctx.dataIndex] / total) > 0.05;
          },
          color: COLORS.fg,
          font: { size: 11, family: "'Poppins', system-ui, sans-serif" },
          formatter: donutFormatter,
          textShadowBlur: 3,
          textShadowColor: COLORS.bg,
        },
      },
    },
  });
  return chartMessages;
}

function buildTokensChart(days) {
  const canvas = document.getElementById('panel-tokens-chart');
  if (!canvas) return null;
  if (chartTokens) chartTokens.destroy();

  const labels      = days.map(d => fmtDate(d.date));
  const inputData   = days.map(d => d.tokens.input);
  const outputData  = days.map(d => d.tokens.output);
  const cacheCreate = days.map(d => d.tokens.cacheCreate);
  const cacheRead   = days.map(d => d.tokens.cacheRead);

  chartTokens = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Input',
          data: inputData,
          backgroundColor: COLORS.blue + 'cc',
          borderColor: COLORS.blue,
          borderWidth: 1,
          borderRadius: 2,
          stack: 'tokens',
        },
        {
          label: 'Output',
          data: outputData,
          backgroundColor: COLORS.orange + 'cc',
          borderColor: COLORS.orange,
          borderWidth: 1,
          borderRadius: 2,
          stack: 'tokens',
        },
        {
          label: 'Cache Write',
          data: cacheCreate,
          backgroundColor: COLORS.green + 'cc',
          borderColor: COLORS.green,
          borderWidth: 1,
          borderRadius: 2,
          stack: 'tokens',
        },
        {
          label: 'Cache Read',
          data: cacheRead,
          backgroundColor: '#c4a882cc',
          borderColor: '#c4a882',
          borderWidth: 1,
          borderRadius: 2,
          stack: 'tokens',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: ANIM_OPTS,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: TOOLTIP_BASE,
        datalabels: { display: false },
      },
      scales: {
        x: { stacked: true, grid: { color: COLORS.border }, ticks: { maxTicksLimit: 10, color: COLORS.mid } },
        y: { stacked: true, grid: { color: COLORS.border }, beginAtZero: true },
      },
    },
  });
  return chartTokens;
}

// ---------------------------------------------------------------------------
// Custom GitHub-style SVG calendar heatmap
// Always shows ALL TIME regardless of range filter (heatmap = historical view)
// ---------------------------------------------------------------------------
function buildHeatmap(allDays) {
  const container = document.getElementById('heatmap-container');
  if (!container) return;
  if (heatmapBuilt) { container.innerHTML = ''; }
  heatmapBuilt = true;

  // Mobile day cap: screens narrower than 640px show ~30 days to prevent overflow
  const maxDays = window.innerWidth < 640 ? 30 : null;
  const displayDays = maxDays !== null ? allDays.slice(-maxDays) : allDays;

  // Build date->sessions lookup
  const dataMap = {};
  displayDays.forEach(d => { dataMap[d.date] = d.sessions; });

  // Color scale thresholds (green palette matching brand)
  const colorScale = (v) => {
    if (!v || v === 0) return '#1e1e1c';
    if (v < 2)  return '#2d3a2d';
    if (v < 4)  return '#4a6b3a';
    if (v < 8)  return '#788c5d';
    return '#a4c278';
  };

  // Determine date range: from first data point (or 12 months ago) to today
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start;
  if (displayDays.length > 0) {
    const first = new Date(displayDays[0].date + 'T12:00:00');
    const twelveAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    start = first < twelveAgo ? twelveAgo : first;
  } else {
    start = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  }
  // Align start to Sunday (beginning of week)
  const startDay = new Date(start);
  startDay.setDate(startDay.getDate() - startDay.getDay());

  // Generate all days from startDay to today
  const days = [];
  const d = new Date(startDay);
  while (d <= today) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  // Layout: columns (weeks) x 7 rows (days)
  const cellSize = 12;
  const cellGap = 2;
  const step = cellSize + cellGap;
  const labelH = 20;  // month label height
  const dayLabelW = 24; // weekday label width
  const totalWeeks = Math.ceil(days.length / 7);
  const svgW = dayLabelW + totalWeeks * step + 2;
  const svgH = labelH + 7 * step + 2;

  // Month labels: find the first day of each month
  const months = [];
  let lastMonth = -1;
  days.forEach((day, i) => {
    if (day.getMonth() !== lastMonth) {
      lastMonth = day.getMonth();
      const weekIdx = Math.floor(i / 7);
      months.push({ label: day.toLocaleDateString('en', { month: 'short' }), x: dayLabelW + weekIdx * step });
    }
  });

  // Day-of-week labels
  const dowLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  // Build SVG
  let svg = '<svg width="' + svgW + '" height="' + svgH + '" xmlns="http://www.w3.org/2000/svg">';

  // Month labels
  months.forEach(m => {
    svg += '<text class="hm-label" x="' + m.x + '" y="12" font-size="10">' + m.label + '</text>';
  });

  // Day-of-week labels
  dowLabels.forEach((lbl, i) => {
    if (lbl) svg += '<text class="hm-label" x="0" y="' + (labelH + i * step + cellSize - 1) + '" font-size="9">' + lbl + '</text>';
  });

  // Cells
  days.forEach((day, i) => {
    const col = Math.floor(i / 7);
    const row = day.getDay(); // 0=Sun
    const dateStr = day.toISOString().slice(0, 10);
    const val = dataMap[dateStr] || 0;
    const x = dayLabelW + col * step;
    const y = labelH + row * step;
    const isToday = dateStr === today.toISOString().slice(0, 10);

    svg += '<rect class="hm-cell" x="' + x + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" fill="' + colorScale(val) + '"'
      + (isToday ? ' stroke="' + COLORS.orange + '" stroke-width="1.5"' : '')
      + ' data-date="' + dateStr + '" data-value="' + val + '"/>';
  });

  svg += '</svg>';
  container.innerHTML = svg;

  // Tooltip on hover
  let tooltip = document.getElementById('hm-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'hm-tooltip';
    tooltip.className = 'hm-tooltip';
    document.body.appendChild(tooltip);
  }
  container.addEventListener('mouseover', (e) => {
    const rect = e.target.closest('.hm-cell');
    if (!rect) { tooltip.style.display = 'none'; return; }
    const date = rect.getAttribute('data-date');
    const val = rect.getAttribute('data-value');
    const dateObj = new Date(date + 'T12:00:00');
    const label = dateObj.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
    tooltip.textContent = val + ' session' + (val === '1' ? '' : 's') + ' on ' + label;
    const r = rect.getBoundingClientRect();
    tooltip.style.left = (r.left + window.scrollX + r.width / 2 - 60) + 'px';
    tooltip.style.top = (r.top + window.scrollY - 30) + 'px';
    tooltip.style.display = 'block';
  });
  container.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
}

// ---------------------------------------------------------------------------
// Project activity horizontal bar — only shown when hasProjects
// ---------------------------------------------------------------------------
function buildProjectsChart(days, sortMetric) {
  const canvas = document.getElementById('panel-projects-chart');
  if (!canvas) return null;

  // Store current metric for tooltip/datalabel callbacks
  currentProjectSortMetric = sortMetric;

  // Aggregate per-project metrics across all filtered days
  const projectMetrics = {};
  const hasByProject = days.some(d => d.byProject && Object.keys(d.byProject).length > 0);

  if (hasByProject) {
    // Real metrics path: use byProject data (messages, sessions, tokens, cost)
    days.forEach(d => {
      if (!d.byProject) return;
      Object.entries(d.byProject).forEach(([name, stats]) => {
        if (!projectMetrics[name]) {
          projectMetrics[name] = { messages: 0, sessions: 0, tokens: 0, costCents: 0 };
        }
        projectMetrics[name].messages  += stats.messages;
        projectMetrics[name].sessions  += stats.sessions;
        projectMetrics[name].tokens    += stats.tokens.input + stats.tokens.output + stats.tokens.cacheCreate + stats.tokens.cacheRead;
        projectMetrics[name].costCents += stats.costCents;
      });
    });
  } else {
    // Fallback: count days active (legacy data without byProject)
    days.forEach(d => {
      (d.projects || []).forEach(p => {
        if (!projectMetrics[p]) projectMetrics[p] = { messages: 0 };
        projectMetrics[p].messages += 1; // days active as proxy
      });
    });
  }

  // Map toggle value to internal field name
  const METRIC_MAP = { messages: 'messages', tokens: 'tokens', sessions: 'sessions', cost: 'costCents' };
  const field = METRIC_MAP[sortMetric] || 'messages';

  const sorted = Object.entries(projectMetrics)
    .filter(([, m]) => (m[field] || 0) > 0)
    .sort((a, b) => (b[1][field] || 0) - (a[1][field] || 0))
    .slice(0, 5);

  const labels = sorted.map(e => e[0]);
  const data   = sorted.map(e => e[1][field] || 0);

  // Set explicit container height based on bar count to prevent Chart.js resize loop
  const barHeight = 36;
  const containerHeight = Math.max(180, sorted.length * barHeight + 40);
  const container = document.getElementById('panel-projects-content');
  if (container) container.style.height = containerHeight + 'px';
  canvas.style.height = containerHeight + 'px';

  const LABEL_MAP = { messages: 'Messages', tokens: 'Tokens', sessions: 'Sessions', cost: 'Cost' };

  // Update existing chart in-place (avoids destroy/recreate canvas issues)
  if (chartProjects) {
    chartProjects.data.labels = labels;
    chartProjects.data.datasets[0].data = data;
    chartProjects.data.datasets[0].label = hasByProject ? (LABEL_MAP[sortMetric] || 'Messages') : 'Days active';
    chartProjects.update('active');
    return chartProjects;
  }

  // First render: create the chart
  chartProjects = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: hasByProject ? (LABEL_MAP[sortMetric] || 'Messages') : 'Days active',
        data,
        backgroundColor: COLORS.orange + 'cc',
        borderColor: COLORS.orange,
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: ANIM_OPTS,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...TOOLTIP_BASE,
          callbacks: {
            label: function(ctx) {
              const v = ctx.parsed.x;
              if (currentProjectSortMetric === 'cost') return ' $' + (v / 100).toFixed(2);
              return ' ' + (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v);
            }
          }
        },
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'start',
          color: COLORS.bg,
          font: { weight: 'bold', size: 11 },
          formatter: function(v) {
            if (currentProjectSortMetric === 'cost') return '$' + (v / 100).toFixed(2);
            if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
            if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
            return v;
          }
        },
      },
      scales: {
        x: { grid: { color: COLORS.border }, beginAtZero: true },
        y: { grid: { color: COLORS.border }, ticks: { color: COLORS.mid } },
      },
    },
  });
  return chartProjects;
}

// ---------------------------------------------------------------------------
// Chart initialization — runs once after Alpine store finishes loading
// (chart.update('active') used for subsequent range changes)
// ---------------------------------------------------------------------------

/** Initialize or update all charts with the given days array. */
function updateAllCharts(days, allDays) {
  buildDailyChart(days);
  buildCostChart(days);
  buildDowChart(days);
  buildToolsChart(days);
  buildModelsChart(days);
  buildMessagesChart(days);
  buildTokensChart(days);
  // Heatmap always shows all-time data
  buildHeatmap(allDays || days);
  // Project bars only if data present (byProject metrics or legacy projects array)
  const hasProjects = days.some(d =>
    (d.byProject && Object.keys(d.byProject).length > 0) ||
    (d.projects && d.projects.length > 0)
  );
  if (hasProjects) buildProjectsChart(days, Alpine.store('dashboard').projectSortMetric);
}

/** Update chart data without rebuilding (smooth animated morph). */
function patchChart(chart, labels, datasets) {
  if (!chart) return;
  chart.data.labels = labels;
  datasets.forEach((ds, i) => {
    if (chart.data.datasets[i]) {
      chart.data.datasets[i].data = ds;
    }
  });
  chart.update('active');
}

// ---------------------------------------------------------------------------
// Bootstrap: wait for Alpine to finish initializing the store, then
// watch for loading → false and set up $watch on range changes.
// ---------------------------------------------------------------------------
document.addEventListener('alpine:init', () => {
  // Register ChartDataLabels plugin so donut labels are active
  if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
  }

  // Set global chart defaults to match dark theme
  if (typeof Chart !== 'undefined') {
    Chart.defaults.color         = COLORS.mid;
    Chart.defaults.borderColor   = COLORS.border;
    Chart.defaults.font.family   = "'Poppins', system-ui, sans-serif";
    Chart.defaults.font.size     = 12;
    Chart.defaults.plugins.legend.labels.usePointStyle    = true;
    Chart.defaults.plugins.legend.labels.pointStyle       = 'circle';
    Chart.defaults.plugins.legend.labels.pointStyleWidth  = 8;
  }
});

// After Alpine boots, set up the reactive watcher on filteredDays / range.
// We use a MutationObserver on body to wait for Alpine to attach, then
// rely on a polling check for the store to be ready.
document.addEventListener('alpine:initialized', () => {
  const store = Alpine.store('dashboard');

  // Watch range changes → update charts with smooth morph
  Alpine.effect(() => {
    const days = store.filteredDays; // reactive dependency
    const sortMetric = store.projectSortMetric; // reactive dep — triggers chart rebuild on toggle
    if (!store.loading && days.length > 0) {
      // Grab all-time days for heatmap (not filtered)
      const allDays = store.timeseries ? store.timeseries.days : days;

      // If charts already exist, do a smooth update instead of full rebuild
      if (chartDaily) {
        // Daily combo chart
        patchChart(chartDaily,
          days.map(d => fmtDate(d.date)),
          [
            days.map(d => d.sessions),
            days.map(d => (d.tokens.input + d.tokens.output + d.tokens.cacheCreate + d.tokens.cacheRead) / 1000),
          ]
        );
        // Cost chart
        patchChart(chartCost,
          days.map(d => fmtDate(d.date)),
          [days.map(d => +(d.costCents / 100).toFixed(4))]
        );
        // DoW chart
        const dow = aggregateByWeekday(days);
        patchChart(chartDow, dow.labels, [dow.data]);
        // Tools donut
        const toolTotals = aggregateField(days, 'toolCalls');
        const { labels: tl, data: td } = topN(toolTotals, 7);
        patchChart(chartTools, tl, [td]);
        // Models donut
        const modelTotals = aggregateField(days, 'models');
        const cleanedM = {};
        Object.entries(modelTotals).forEach(([k, v]) => {
          const n = cleanModelName(k);
          cleanedM[n] = (cleanedM[n] || 0) + v;
        });
        const { labels: ml, data: md } = topN(cleanedM, 7);
        patchChart(chartModels, ml, [md]);
        // Messages donut
        const userMsgs   = days.reduce((s, d) => s + (d.userMessages || 0), 0);
        const totalMsgs  = days.reduce((s, d) => s + (d.messages || 0), 0);
        const thinking   = days.reduce((s, d) => s + (d.thinkingBlocks || 0), 0);
        patchChart(chartMessages, ['You','Claude','Thinking'], [[userMsgs, Math.max(0, totalMsgs - userMsgs), thinking]]);
        // Token stacked bar
        patchChart(chartTokens,
          days.map(d => fmtDate(d.date)),
          [
            days.map(d => d.tokens.input),
            days.map(d => d.tokens.output),
            days.map(d => d.tokens.cacheCreate),
            days.map(d => d.tokens.cacheRead),
          ]
        );
        // Project bars — rebuild on range change or sort toggle change
        const hasProjects = days.some(d =>
          (d.byProject && Object.keys(d.byProject).length > 0) ||
          (d.projects && d.projects.length > 0)
        );
        if (hasProjects) buildProjectsChart(days, sortMetric);
        // Heatmap is all-time — no update needed on range change
      } else {
        // First render — build all charts
        updateAllCharts(days, allDays);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// insightsPanel() — Alpine component for the Insights section
// Fetches pre-computed insights from GET /:username/api/insights (no live LLM)
// ---------------------------------------------------------------------------
const username = '__USERNAME__';
function insightsPanel() {
  return {
    data: null,
    empty: false,
    loading: true,
    staleDays: 0,
    async init() {
      try {
        const res = await fetch('/u/' + username + '/api/insights');
        if (res.status === 404) { this.empty = true; this.loading = false; return; }
        if (!res.ok) { this.empty = true; this.loading = false; return; }
        const json = await res.json();
        this.data = json.data;
        // Compute stale days
        if (this.data && this.data.computedAt) {
          this.staleDays = Math.floor((Date.now() - new Date(this.data.computedAt).getTime()) / 86400000);
        }
      } catch {
        this.empty = true;
      }
      this.loading = false;
    },
    formatCost(cents) {
      return '$' + (cents / 100).toFixed(2);
    }
  };
}
</script>

</body>
</html>`;

// ---------------------------------------------------------------------------
// Dashboard route
// ---------------------------------------------------------------------------

dashboardRoutes.get("/:username/dashboard", async (c) => {
  const raw = c.req.param("username");

  // Sanitize: allow only alphanumeric and hyphens (GitHub username charset)
  if (!/^[a-zA-Z0-9-]+$/.test(raw)) {
    return c.text("Invalid username", 400);
  }

  const username = raw;

  // Check PRO status for BYOT gate in the Theme Configurator
  const isPro = await isUserPro(c.env.DB, username);

  // Fetch subscription details for billing UI (badge, banner, billing section)
  const subscription = await getSubscription(c.env.DB, username);

  const html = DASHBOARD_HTML
    .replace(/__USERNAME__/g, username)
    .replace(/__IS_PRO__/g, isPro ? "true" : "false")
    .replace(/__SUBSCRIPTION_STATUS__/g, subscription?.status || "free")
    .replace(/__PAYMENT_FAILED__/g, subscription?.payment_failed_at ? "true" : "false")
    .replace(/__PERIOD_END__/g, String(subscription?.current_period_end || 0));
  return c.html(html);
});
