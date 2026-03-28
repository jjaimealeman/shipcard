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
<!-- heatmap styles (custom SVG, no external dep) -->
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
    padding: 24px 12px 48px;
  }
  @media (min-width: 640px) {
    .page { padding: 32px 24px 64px; }
  }

  /* -------------------------------------------------------------------------
   * Hero stats section
   * ---------------------------------------------------------------------- */
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
   * Chart panel grid (bento-style layout) — mobile-first
   * Default = single column (mobile 375px+)
   * 640px  = hero stats 2-col, filter bar shows dropdown -> button group
   * 1024px = full desktop multi-column layout
   * ---------------------------------------------------------------------- */
  .panels-overview {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .panels-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .panels-wide {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  /* Hero grid: 2-col on mobile (4 stat cards in 2x2) */
  .hero-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-bottom: 32px;
  }

  /* Mobile filter bar dropdown (shown by default, hidden on 640px+) */
  .mobile-range-select {
    display: block;
    appearance: none;
    -webkit-appearance: none;
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 28px 6px 10px;
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23b0aea5'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
  }
  .mobile-range-select option {
    background: var(--surface);
    color: var(--fg);
  }
  /* Button group hidden on mobile, shown on 640px+ */
  .btn-group {
    display: none;
  }

  /* Panel body — explicit height prevents Chart.js 0-height collapse */
  .panel-body {
    flex: 1;
    position: relative;
    display: flex;
    align-items: stretch;
    height: 220px;
  }

  /* 640px+: filter swaps to button group */
  @media (min-width: 640px) {
    .mobile-range-select { display: none; }
    .btn-group { display: flex; }
    .hero-grid { grid-template-columns: repeat(2, 1fr); }
  }

  /* 1024px+: full desktop multi-column layout */
  @media (min-width: 1024px) {
    .hero-grid {
      grid-template-columns: repeat(4, 1fr);
    }
    .panels-overview {
      grid-template-columns: 1fr 1fr;
    }
    .panels-row {
      grid-template-columns: 1fr 1fr 1fr;
    }
    .panel-body {
      height: 280px;
    }
  }

  /* -------------------------------------------------------------------------
   * Calendar heatmap container
   * ---------------------------------------------------------------------- */
  #panel-calendar-chart {
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 4px;
  }
  #heatmap-container {
    /* min-width removed — SVG width adapts to day count (mobile caps to 30 days) */
  }
  /* custom heatmap styles */
  #heatmap-container { overflow-x: auto; }
  #heatmap-container svg { display: block; }
  .hm-label { fill: var(--mid); font-family: 'Poppins', system-ui, sans-serif; font-size: 10px; }
  .hm-cell { rx: 2; ry: 2; }
  .hm-tooltip {
    position: absolute; background: var(--bg); border: 1px solid var(--border);
    border-radius: 4px; padding: 4px 8px; font-size: 11px; color: var(--fg);
    pointer-events: none; white-space: nowrap; z-index: 200; display: none;
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
  #panel-projects .panel-body {
    height: auto;
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

  /* -------------------------------------------------------------------------
   * Today's Activity section
   * ---------------------------------------------------------------------- */
  .today-section {
    margin-bottom: 32px;
  }
  .today-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  @media (min-width: 1024px) {
    .today-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  .today-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 20px 0 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .today-value {
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: var(--fg);
    line-height: 1.2;
    margin-bottom: 4px;
  }
  .today-arrow-label {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 12px;
  }
  .dir-arrow {
    font-size: 12px;
    line-height: 1;
  }
  .dir-arrow.dir-up {
    color: var(--orange);
  }
  .dir-arrow.dir-down {
    color: var(--blue);
  }
  .today-label {
    font-family: 'Poppins', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 600;
    color: var(--mid);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .today-yesterday {
    margin-top: auto;
    padding: 6px 20px;
    margin-left: -20px;
    margin-right: -20px;
    background: rgba(255, 255, 255, 0.03);
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--mid);
    font-family: 'Poppins', system-ui, sans-serif;
  }
  .today-yesterday strong {
    color: var(--light);
  }
  /* Skeleton placeholders inside today cards */
  .today-card .skel-today-value {
    height: 34px;
    width: 60%;
    margin-bottom: 8px;
  }
  .today-card .skel-today-label {
    height: 12px;
    width: 40%;
    margin-bottom: 16px;
  }
  .today-card .skel-today-bar {
    height: 28px;
    margin-left: -20px;
    margin-right: -20px;
    border-radius: 0;
  }
</style>
</head>
<body x-data x-init="$store.dashboard.load('__USERNAME__')">

<!-- =========================================================================
     STICKY FILTER BAR
     ====================================================================== -->
<div class="filter-bar">
  <div class="filter-bar-left">
    <a href="/" class="brand-link">ShipCard</a>
    <span class="divider">|</span>
    <span class="username-title"><span>__USERNAME__</span>&nbsp;Analytics</span>
  </div>
  <!-- Mobile dropdown (visible below 640px, hidden above via CSS) -->
  <select class="mobile-range-select" x-model="$store.dashboard.range">
    <option value="7d">Last 7 days</option>
    <option value="30d">Last 30 days</option>
    <option value="all">All time</option>
  </select>
  <!-- Desktop segmented control (hidden below 640px, shown above via CSS) -->
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

  <!-- Dashboard content — visible when loaded and no empty/error state -->
  <div x-show="!$store.dashboard.loading && !$store.dashboard.notFound && !$store.dashboard.error" style="display:block">

    <!-- -------------------------------------------------------------------
         HERO STATS
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
         TODAY'S ACTIVITY
         ---------------------------------------------------------------- -->
    <div class="section-title">Today's Activity</div>
    <div class="today-section">
      <div class="today-grid">

        <!-- Messages -->
        <div class="today-card">
          <div class="skel-today-value skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="skel-today-label skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div x-show="!$store.dashboard.loading" style="display:none">
            <div class="today-value" x-text="$store.dashboard.todayMessages"></div>
            <div class="today-arrow-label">
              <span class="dir-arrow"
                    x-show="$store.dashboard.dirMessages !== 0"
                    :class="$store.dashboard.dirMessages > 0 ? 'dir-up' : 'dir-down'"
                    x-text="$store.dashboard.dirMessages > 0 ? '\u25B2' : '\u25BC'"></span>
              <span class="today-label">Messages</span>
            </div>
          </div>
          <div class="today-yesterday">
            <span x-show="$store.dashboard.loading" class="skeleton" style="display:none;height:14px;width:80%;border-radius:3px"></span>
            <span x-show="!$store.dashboard.loading" style="display:none">
              Yesterday: <strong x-text="$store.dashboard.yesterdayMessages"></strong>
            </span>
          </div>
        </div>

        <!-- Sessions -->
        <div class="today-card">
          <div class="skel-today-value skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="skel-today-label skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div x-show="!$store.dashboard.loading" style="display:none">
            <div class="today-value" x-text="$store.dashboard.todaySessions"></div>
            <div class="today-arrow-label">
              <span class="dir-arrow"
                    x-show="$store.dashboard.dirSessions !== 0"
                    :class="$store.dashboard.dirSessions > 0 ? 'dir-up' : 'dir-down'"
                    x-text="$store.dashboard.dirSessions > 0 ? '\u25B2' : '\u25BC'"></span>
              <span class="today-label">Sessions</span>
            </div>
          </div>
          <div class="today-yesterday">
            <span x-show="$store.dashboard.loading" class="skeleton" style="display:none;height:14px;width:80%;border-radius:3px"></span>
            <span x-show="!$store.dashboard.loading" style="display:none">
              Yesterday: <strong x-text="$store.dashboard.yesterdaySessions"></strong>
            </span>
          </div>
        </div>

        <!-- Tools -->
        <div class="today-card">
          <div class="skel-today-value skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="skel-today-label skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div x-show="!$store.dashboard.loading" style="display:none">
            <div class="today-value" x-text="$store.dashboard.todayTools"></div>
            <div class="today-arrow-label">
              <span class="dir-arrow"
                    x-show="$store.dashboard.dirTools !== 0"
                    :class="$store.dashboard.dirTools > 0 ? 'dir-up' : 'dir-down'"
                    x-text="$store.dashboard.dirTools > 0 ? '\u25B2' : '\u25BC'"></span>
              <span class="today-label">Tools</span>
            </div>
          </div>
          <div class="today-yesterday">
            <span x-show="$store.dashboard.loading" class="skeleton" style="display:none;height:14px;width:80%;border-radius:3px"></span>
            <span x-show="!$store.dashboard.loading" style="display:none">
              Yesterday: <strong x-text="$store.dashboard.yesterdayTools"></strong>
            </span>
          </div>
        </div>

        <!-- Tokens -->
        <div class="today-card">
          <div class="skel-today-value skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div class="skel-today-label skeleton" x-show="$store.dashboard.loading" style="display:none"></div>
          <div x-show="!$store.dashboard.loading" style="display:none">
            <div class="today-value" x-text="$store.dashboard.todayTokens"></div>
            <div class="today-arrow-label">
              <span class="dir-arrow"
                    x-show="$store.dashboard.dirTokens !== 0"
                    :class="$store.dashboard.dirTokens > 0 ? 'dir-up' : 'dir-down'"
                    x-text="$store.dashboard.dirTokens > 0 ? '\u25B2' : '\u25BC'"></span>
              <span class="today-label">Tokens</span>
            </div>
          </div>
          <div class="today-yesterday">
            <span x-show="$store.dashboard.loading" class="skeleton" style="display:none;height:14px;width:80%;border-radius:3px"></span>
            <span x-show="!$store.dashboard.loading" style="display:none">
              Yesterday: <strong x-text="$store.dashboard.yesterdayTokens"></strong>
            </span>
          </div>
        </div>

      </div>
    </div>

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
          <div id="panel-calendar-chart" x-show="!$store.dashboard.loading" style="display:none;width:100%">
            <div id="heatmap-container"></div>
          </div>
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

    // Phase 15 will expose this as a user-selectable toggle (messages, tokens, cost)
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
    tooltip.style.left = (r.left + r.width / 2 - 60) + 'px';
    tooltip.style.top = (r.top - 30) + 'px';
    tooltip.style.display = 'block';
  });
  container.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
}

// ---------------------------------------------------------------------------
// Project activity horizontal bar — only shown when hasProjects
// ---------------------------------------------------------------------------
function buildProjectsChart(days) {
  const canvas = document.getElementById('panel-projects-chart');
  if (!canvas) return null;
  if (chartProjects) chartProjects.destroy();

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

  // Sort by messages (Phase 15 will make this dynamic via projectSortMetric)
  const metric = 'messages';
  const sorted = Object.entries(projectMetrics)
    .sort((a, b) => b[1][metric] - a[1][metric])
    .slice(0, 10);

  const labels = sorted.map(e => e[0]);
  const data   = sorted.map(e => e[1][metric]);

  // Set explicit container height based on bar count to prevent Chart.js resize loop
  const barHeight = 36;
  const containerHeight = Math.max(180, sorted.length * barHeight + 40);
  const container = document.getElementById('panel-projects-content');
  if (container) container.style.height = containerHeight + 'px';
  canvas.style.height = containerHeight + 'px';

  chartProjects = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: hasByProject ? 'Messages' : 'Days active',
        data,
        backgroundColor: COLORS.green + 'cc',
        borderColor: COLORS.green,
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
  if (hasProjects) buildProjectsChart(days);
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
        // Project bars — rebuild on range change (conditional visibility)
        const hasProjects = days.some(d =>
          (d.byProject && Object.keys(d.byProject).length > 0) ||
          (d.projects && d.projects.length > 0)
        );
        if (hasProjects) buildProjectsChart(days);
        // Heatmap is all-time — no update needed on range change
      } else {
        // First render — build all charts
        updateAllCharts(days, allDays);
      }
    }
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
