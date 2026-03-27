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

export const dashboardRoutes = new Hono<AppType>();

// ---------------------------------------------------------------------------
// HTML dashboard page template
// ---------------------------------------------------------------------------

/* eslint-disable no-secrets/no-secrets */
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__USERNAME__ | ShipCard Analytics</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Lora:wght@400;500&display=swap" rel="stylesheet">
<!-- cal-heatmap CSS -->
<link rel="stylesheet" href="https://unpkg.com/cal-heatmap@4.2.4/dist/cal-heatmap.css">
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
    font-family: 'Lora', Georgia, serif;
    font-size: 14px;
    line-height: 1.6;
    background: var(--bg);
    color: var(--fg);
    min-height: 100vh;
  }
  h1, h2, h3, h4, .heading {
    font-family: 'Poppins', system-ui, sans-serif;
  }

  /* -------------------------------------------------------------------------
   * Skeleton shimmer animation
   * ---------------------------------------------------------------------- */
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .skeleton {
    background: linear-gradient(90deg, var(--surface) 25%, #2a2a27 50%, var(--surface) 75%);
    background-size: 800px 100%;
    animation: shimmer 1.6s infinite linear;
    border-radius: 4px;
  }

  /* -------------------------------------------------------------------------
   * Navigation / filter bar
   * ---------------------------------------------------------------------- */
  .filter-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .filter-bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-link {
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: var(--fg);
    text-decoration: none;
    letter-spacing: -0.02em;
  }
  .username-title {
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--mid);
  }
  .username-title span {
    color: var(--fg);
  }
  .divider {
    color: var(--border);
    font-size: 18px;
    line-height: 1;
  }

  /* Segmented control — matches configurator pill style */
  .btn-group {
    display: flex;
    gap: 0;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .btn-group button {
    flex: 1;
    padding: 6px 14px;
    font-family: 'Poppins', system-ui, sans-serif;
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
  .btn-group button:hover:not(.active) {
    background: var(--surface);
    color: var(--fg);
  }

  /* -------------------------------------------------------------------------
   * Page layout
   * ---------------------------------------------------------------------- */
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }

  /* -------------------------------------------------------------------------
   * Hero stats section
   * ---------------------------------------------------------------------- */
  .hero-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 32px;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s;
  }
  .stat-card:hover { border-color: #3a3a37; }
  .stat-label {
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .stat-value {
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: var(--fg);
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .stat-sub {
    font-size: 12px;
    color: var(--mid);
  }
  .stat-sub strong {
    color: var(--light);
  }
  .sparkline-wrap {
    margin-top: 4px;
    height: 36px;
  }
  .sparkline-wrap svg {
    width: 100%;
    height: 36px;
    overflow: visible;
  }
  .sparkline-wrap polyline {
    fill: none;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .sparkline-area {
    opacity: 0.15;
  }

  /* Skeleton placeholders for hero cards */
  .stat-card.loading .stat-value {
    display: none;
  }
  .stat-card.loading .stat-sub {
    display: none;
  }
  .stat-card.loading .sparkline-wrap {
    display: none;
  }
  .skel-value {
    height: 32px;
    width: 70%;
  }
  .skel-sub {
    height: 14px;
    width: 50%;
    margin-top: 2px;
  }
  .skel-sparkline {
    height: 36px;
    width: 100%;
    margin-top: 8px;
    border-radius: 4px;
  }

  /* -------------------------------------------------------------------------
   * Section headings
   * ---------------------------------------------------------------------- */
  .section-title {
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mid);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-title::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  /* -------------------------------------------------------------------------
   * Chart panel grid (bento-style layout)
   * ---------------------------------------------------------------------- */
  .panels-overview {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .panels-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .panels-wide {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    min-height: 260px;
    display: flex;
    flex-direction: column;
  }
  .panel.panel-wide {
    min-height: 200px;
  }
  .panel.panel-tall {
    min-height: 340px;
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-shrink: 0;
  }
  .panel-title {
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: var(--light);
  }
  .panel-badge {
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mid);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 2px 8px;
  }
  .panel-body {
    flex: 1;
    position: relative;
    display: flex;
    align-items: stretch;
  }
  .panel-body canvas {
    width: 100% !important;
    height: 100% !important;
    min-height: 180px;
  }

  /* Skeleton for panels */
  .panel-skel {
    flex: 1;
    border-radius: 4px;
    min-height: 180px;
  }

  /* -------------------------------------------------------------------------
   * Empty & error states
   * ---------------------------------------------------------------------- */
  .empty-state {
    text-align: center;
    padding: 64px 24px;
  }
  .empty-state h2 {
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--fg);
    margin-bottom: 8px;
  }
  .empty-state p {
    color: var(--mid);
    max-width: 420px;
    margin: 0 auto 24px;
  }
  .empty-state code {
    font-size: 13px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 8px;
    color: var(--orange);
  }
  .error-bar {
    background: #2a1a18;
    border: 1px solid #5a2a20;
    border-radius: var(--radius);
    padding: 12px 16px;
    margin-bottom: 24px;
    color: #e07060;
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 13px;
  }

  /* -------------------------------------------------------------------------
   * Footer
   * ---------------------------------------------------------------------- */
  .footer {
    border-top: 1px solid var(--border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 12px;
    color: var(--mid);
  }
  .footer a {
    color: var(--mid);
    text-decoration: none;
    font-weight: 600;
    transition: color 0.15s;
  }
  .footer a:hover { color: var(--fg); }
  .footer-right { display: flex; align-items: center; gap: 16px; }
  .synced-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--green);
    margin-right: 4px;
    vertical-align: middle;
  }
</style>
</head>
<body x-data x-init="$store.dashboard.init('__USERNAME__')">

<!-- =========================================================================
     STICKY FILTER BAR
     ====================================================================== -->
<div class="filter-bar">
  <div class="filter-bar-left">
    <a href="/" class="brand-link">ShipCard</a>
    <span class="divider">|</span>
    <span class="username-title"><span>__USERNAME__</span>&nbsp;Analytics</span>
  </div>
  <div class="btn-group" x-data>
    <button
      :class="{ active: $store.dashboard.range === '7d' }"
      @click="$store.dashboard.range = '7d'">7d</button>
    <button
      :class="{ active: $store.dashboard.range === '30d' }"
      @click="$store.dashboard.range = '30d'">30d</button>
    <button
      :class="{ active: $store.dashboard.range === 'all' }"
      @click="$store.dashboard.range = 'all'">All</button>
  </div>
</div>

<!-- =========================================================================
     MAIN PAGE CONTENT
     ====================================================================== -->
<div class="page">

  <!-- Error bar -->
  <div class="error-bar" x-show="$store.dashboard.error" x-text="$store.dashboard.error" style="display:none"></div>

  <!-- Empty state (user not found or no data) -->
  <div class="empty-state" x-show="!$store.dashboard.loading && $store.dashboard.notFound" style="display:none">
    <h2>No data yet</h2>
    <p>
      <strong>__USERNAME__</strong> hasn't synced any stats yet. If this is you,
      sync your data with the ShipCard CLI:
    </p>
    <p><code>shipcard sync</code></p>
  </div>

  <!-- Dashboard content — visible when loaded and not 404 -->
  <div x-show="!$store.dashboard.notFound" style="display:block">

    <!-- -------------------------------------------------------------------
         HERO STATS
         ---------------------------------------------------------------- -->
    <div class="section-title">Overview</div>
    <div class="hero-grid">

      <!-- Total Tokens -->
      <div class="stat-card" :class="{ loading: $store.dashboard.loading }">
        <div class="stat-label">Total Tokens</div>
        <!-- Skeleton -->
        <div class="skel-value skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="skel-sub skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <div class="skel-sparkline skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
        <!-- Data -->
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

      <!-- Coding Tenure -->
      <div class="stat-card" :class="{ loading: $store.dashboard.loading }">
        <div class="stat-label">Coding Since</div>
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

    </div><!-- /hero-grid -->

    <!-- -------------------------------------------------------------------
         OVERVIEW PANELS — Activity Heatmap (wide) + Daily Activity chart
         ---------------------------------------------------------------- -->
    <div class="section-title">Activity</div>
    <div class="panels-wide">
      <!-- panel-calendar: calendar heatmap -->
      <div class="panel panel-wide" id="panel-calendar">
        <div class="panel-header">
          <span class="panel-title">Activity Heatmap</span>
          <span class="panel-badge">Calendar</span>
        </div>
        <div class="panel-body">
          <div class="panel-skel skeleton" x-show="$store.dashboard.loading" style="display:none;min-height:120px"></div>
          <div id="panel-calendar-chart" x-show="!$store.dashboard.loading" style="display:none;width:100%"></div>
        </div>
      </div>
    </div>

    <div class="panels-overview">
      <!-- panel-daily: daily activity line/bar chart -->
      <div class="panel panel-tall" id="panel-daily">
        <div class="panel-header">
          <span class="panel-title">Daily Activity</span>
          <span class="panel-badge">Timeline</span>
        </div>
        <div class="panel-body">
          <div class="panel-skel skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-daily-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>

      <!-- panel-dow: day-of-week distribution -->
      <div class="panel panel-tall" id="panel-dow">
        <div class="panel-header">
          <span class="panel-title">Day of Week</span>
          <span class="panel-badge">Distribution</span>
        </div>
        <div class="panel-body">
          <div class="panel-skel skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-dow-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>
    </div>

    <!-- -------------------------------------------------------------------
         COMPOSITION PANELS — Tool, Model, Message type donuts
         ---------------------------------------------------------------- -->
    <div class="section-title">Composition</div>
    <div class="panels-row">
      <!-- panel-tools: tool call donut -->
      <div class="panel" id="panel-tools">
        <div class="panel-header">
          <span class="panel-title">Tool Usage</span>
          <span class="panel-badge">Donut</span>
        </div>
        <div class="panel-body">
          <div class="panel-skel skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-tools-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>

      <!-- panel-models: model usage donut -->
      <div class="panel" id="panel-models">
        <div class="panel-header">
          <span class="panel-title">Model Mix</span>
          <span class="panel-badge">Donut</span>
        </div>
        <div class="panel-body">
          <div class="panel-skel skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-models-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>

      <!-- panel-messages: message type donut -->
      <div class="panel" id="panel-messages">
        <div class="panel-header">
          <span class="panel-title">Message Types</span>
          <span class="panel-badge">Donut</span>
        </div>
        <div class="panel-body">
          <div class="panel-skel skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-messages-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>
    </div>

    <!-- -------------------------------------------------------------------
         TOKEN PANELS — Token breakdown + cost over time
         ---------------------------------------------------------------- -->
    <div class="section-title">Tokens &amp; Cost</div>
    <div class="panels-overview">
      <!-- panel-tokens: token breakdown stacked bar -->
      <div class="panel" id="panel-tokens">
        <div class="panel-header">
          <span class="panel-title">Token Breakdown</span>
          <span class="panel-badge">Stacked</span>
        </div>
        <div class="panel-body">
          <div class="panel-skel skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-tokens-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>

      <!-- panel-cost: cost over time line chart -->
      <div class="panel" id="panel-cost">
        <div class="panel-header">
          <span class="panel-title">Cost Over Time</span>
          <span class="panel-badge">Line</span>
        </div>
        <div class="panel-body">
          <div class="panel-skel skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <canvas id="panel-cost-chart" x-show="!$store.dashboard.loading" style="display:none"></canvas>
        </div>
      </div>
    </div>

    <!-- -------------------------------------------------------------------
         PROJECT PANEL — Project activity bars (wide, 1-col)
         ---------------------------------------------------------------- -->
    <div class="section-title">Projects</div>
    <div class="panels-wide">
      <!-- panel-projects: project activity horizontal bars -->
      <div class="panel panel-wide" id="panel-projects">
        <div class="panel-header">
          <span class="panel-title">Project Activity</span>
          <span class="panel-badge">Bar Chart</span>
        </div>
        <div class="panel-body">
          <div class="panel-skel skeleton" x-show="$store.dashboard.loading" style="display:none;min-height:120px"></div>
          <div id="panel-projects-content" x-show="!$store.dashboard.loading" style="display:none;width:100%">
            <div x-show="!$store.dashboard.hasProjects" style="color:var(--mid);font-size:13px;padding:16px 0">
              No project breakdown available. Sync with <code style="color:var(--orange)">shipcard sync --show-projects</code> to see project data.
            </div>
            <canvas id="panel-projects-chart" x-show="$store.dashboard.hasProjects" style="display:none"></canvas>
          </div>
        </div>
      </div>
    </div>

  </div><!-- /dashboard content -->
</div><!-- /page -->

<!-- =========================================================================
     FOOTER
     ====================================================================== -->
<div class="footer">
  <span>
    Powered by <a href="https://shipcard.dev">ShipCard</a>
  </span>
  <div class="footer-right">
    <span x-show="$store.dashboard.syncedAt" style="display:none">
      <span class="synced-dot"></span>
      Synced <span x-text="$store.dashboard.syncedAtFormatted"></span>
    </span>
    <a href="/u/__USERNAME__">View Card</a>
  </div>
</div>

<!-- =========================================================================
     SCRIPTS — load order is critical
     ====================================================================== -->
<!-- 1. D3.js v7 (required by cal-heatmap) -->
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js" defer></script>
<!-- 2. Chart.js 4.5.1 -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js" defer></script>
<!-- 3. chartjs-plugin-datalabels 2.2.0 (after Chart.js) -->
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js" defer></script>
<!-- 4. cal-heatmap 4.2.4 (after D3) -->
<script src="https://unpkg.com/cal-heatmap@4.2.4/dist/cal-heatmap.min.js" defer></script>
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
    // ---------------------------------------------------------------------------
    get hasProjects() {
      return this.filteredDays.some(d => d.projects && d.projects.length > 0);
    },

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
    // init — fetches both API endpoints concurrently
    // ---------------------------------------------------------------------------
    async init(username) {
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
</script>

</body>
</html>`;

// ---------------------------------------------------------------------------
// Dashboard route
// ---------------------------------------------------------------------------

dashboardRoutes.get("/:username/dashboard", (c) => {
  const raw = c.req.param("username");

  // Sanitize: allow only alphanumeric and hyphens (GitHub username charset)
  if (!/^[a-zA-Z0-9-]+$/.test(raw)) {
    return c.text("Invalid username", 400);
  }

  const username = raw;
  const html = DASHBOARD_HTML.replace(/__USERNAME__/g, username);
  return c.html(html);
});
