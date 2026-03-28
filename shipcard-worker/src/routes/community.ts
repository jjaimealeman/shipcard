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
import { listUsers } from "../kv.js";

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
  const users = await listUsers(c.env.USER_DATA_KV, 1000);

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
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Community — ShipCard</title>
<meta name="description" content="See who's shipping with ShipCard. Leaderboard of Claude Code developers.">
<style>
  :root {
    --bg: #16161a;
    --fg: #e8e6dc;
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
    font-family: Georgia, serif;
    font-size: 16px;
    line-height: 1.6;
    background: var(--bg);
    color: var(--fg);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, nav, label, button, .sort-tabs button {
    font-family: system-ui, sans-serif;
  }

  .container {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* ---------- NAV ---------- */
  .nav-wrap {
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: var(--bg);
    z-index: 10;
  }
  nav {
    padding: 16px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .nav-brand {
    font-size: 18px;
    font-weight: 700;
    color: var(--fg);
    text-decoration: none;
    letter-spacing: -0.02em;
    font-family: system-ui, sans-serif;
  }
  .nav-links { display: flex; gap: 20px; align-items: center; }
  .nav-links a {
    color: var(--mid);
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
    font-family: system-ui, sans-serif;
    transition: color 0.15s;
  }
  .nav-links a:hover { color: var(--fg); }
  .nav-links a.active { color: var(--orange); }

  /* ---------- PAGE HEADER ---------- */
  .page-header {
    padding: 48px 0 32px;
    text-align: center;
  }
  .page-header h1 {
    font-size: clamp(24px, 4vw, 36px);
    font-weight: 700;
    letter-spacing: -0.03em;
    margin-bottom: 8px;
  }
  .page-header .subtitle {
    color: var(--mid);
    font-size: 16px;
  }

  /* ---------- SORT TABS ---------- */
  .sort-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .sort-tabs button {
    padding: 7px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    color: var(--mid);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .sort-tabs button:hover { color: var(--fg); border-color: var(--mid); }
  .sort-tabs button.active {
    background: var(--orange);
    border-color: var(--orange);
    color: #fff;
  }

  /* ---------- TABLE ---------- */
  .table-wrap {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow-x: auto;
    margin-bottom: 48px;
  }
  .leaderboard-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  .leaderboard-table thead th {
    padding: 11px 14px;
    text-align: left;
    font-family: system-ui, sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mid);
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }
  .leaderboard-table thead th:hover { color: var(--fg); }
  .leaderboard-table thead th.sort-active { color: var(--orange); }
  .leaderboard-table thead th.sort-active.asc::after { content: ' ↑'; }
  .leaderboard-table thead th.sort-active.desc::after { content: ' ↓'; }
  .leaderboard-table tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;
  }
  .leaderboard-table tbody tr:last-child { border-bottom: none; }
  .leaderboard-table tbody tr:hover { background: rgba(255,255,255,0.03); }
  .leaderboard-table td {
    padding: 11px 14px;
    color: var(--fg);
  }
  .leaderboard-table td.rank {
    color: var(--mid);
    font-family: monospace;
    font-size: 12px;
    width: 40px;
  }
  .leaderboard-table td.username a {
    color: var(--blue);
    text-decoration: none;
    font-weight: 600;
    font-family: system-ui, sans-serif;
  }
  .leaderboard-table td.username a:hover { text-decoration: underline; }
  .leaderboard-table td.num {
    font-family: monospace;
    color: var(--mid);
  }
  .leaderboard-table td.cost { color: var(--green); font-family: monospace; }
  .empty-state {
    padding: 48px 24px;
    text-align: center;
    color: var(--mid);
    font-size: 15px;
  }
  .empty-state code {
    background: var(--bg);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 13px;
    color: var(--light);
  }

  /* ---------- FOOTER ---------- */
  footer {
    border-top: 1px solid var(--border);
    padding: 32px 0;
    text-align: center;
    color: var(--mid);
    font-size: 14px;
  }
  .footer-links {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-bottom: 12px;
  }
  .footer-links a {
    color: var(--mid);
    text-decoration: none;
    font-family: system-ui, sans-serif;
    font-weight: 600;
    font-size: 13px;
    transition: color 0.15s;
  }
  .footer-links a:hover { color: var(--orange); }
</style>
</head>
<body>

<div class="nav-wrap">
  <div class="container">
    <nav>
      <a href="/" class="nav-brand">ShipCard</a>
      <div class="nav-links">
        <a href="/community" class="active">Community</a>
        <a href="/configure">Configurator</a>
        <a href="https://www.npmjs.com/package/shipcard" target="_blank" rel="noopener">npm</a>
        <a href="https://github.com/jjaimealeman/shipcard" target="_blank" rel="noopener">GitHub</a>
      </div>
    </nav>
  </div>
</div>

<div class="page-header">
  <div class="container">
    <h1>Community</h1>
    <p class="subtitle">See who's shipping with ShipCard</p>
  </div>
</div>

<div class="container" x-data="leaderboard()" x-init="init()">
  <div class="sort-tabs">
    <button :class="{ active: sortKey === 'syncedAt' }" @click="setSort('syncedAt', 'desc')">Most Recent</button>
    <button :class="{ active: sortKey === 'totalSessions' }" @click="setSort('totalSessions', 'desc')">Most Active</button>
    <button :class="{ active: sortKey === 'costNum' }" @click="setSort('costNum', 'desc')">Highest Cost</button>
    <button :class="{ active: sortKey === 'totalTokens' }" @click="setSort('totalTokens', 'desc')">Most Tokens</button>
  </div>

  <div class="table-wrap">
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>#</th>
          <th
            :class="{ 'sort-active': sortKey === 'username', 'asc': sortKey === 'username' && sortDir === 'asc', 'desc': sortKey === 'username' && sortDir === 'desc' }"
            @click="toggleSort('username')"
          >Username</th>
          <th
            :class="{ 'sort-active': sortKey === 'costNum', 'asc': sortKey === 'costNum' && sortDir === 'asc', 'desc': sortKey === 'costNum' && sortDir === 'desc' }"
            @click="toggleSort('costNum')"
          >Est. Cost</th>
          <th
            :class="{ 'sort-active': sortKey === 'projectCount', 'asc': sortKey === 'projectCount' && sortDir === 'asc', 'desc': sortKey === 'projectCount' && sortDir === 'desc' }"
            @click="toggleSort('projectCount')"
          >Projects</th>
          <th
            :class="{ 'sort-active': sortKey === 'totalSessions', 'asc': sortKey === 'totalSessions' && sortDir === 'asc', 'desc': sortKey === 'totalSessions' && sortDir === 'desc' }"
            @click="toggleSort('totalSessions')"
          >Sessions</th>
          <th
            :class="{ 'sort-active': sortKey === 'totalTokens', 'asc': sortKey === 'totalTokens' && sortDir === 'asc', 'desc': sortKey === 'totalTokens' && sortDir === 'desc' }"
            @click="toggleSort('totalTokens')"
          >Tokens</th>
        </tr>
      </thead>
      <tbody>
        <template x-if="sorted.length === 0">
          <tr>
            <td colspan="6" class="empty-state">
              Be the first — run <code>shipcard sync</code> to join
            </td>
          </tr>
        </template>
        <template x-for="(user, idx) in sorted" :key="user.username">
          <tr>
            <td class="rank" x-text="idx + 1"></td>
            <td class="username">
              <a :href="'/u/' + encodeURIComponent(user.username) + '/dashboard'" x-text="user.username"></a>
            </td>
            <td class="cost" x-text="user.totalCost ?? '—'"></td>
            <td class="num" x-text="user.projectCount !== null ? user.projectCount : '—'"></td>
            <td class="num" x-text="user.totalSessions !== null ? user.totalSessions : '—'"></td>
            <td class="num" x-text="user.totalTokens !== null ? Number(user.totalTokens).toLocaleString() : '—'"></td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</div>

<footer>
  <div class="container">
    <div class="footer-links">
      <a href="https://github.com/jjaimealeman/shipcard" target="_blank" rel="noopener">GitHub</a>
      <a href="https://www.npmjs.com/package/shipcard" target="_blank" rel="noopener">npm</a>
      <a href="/configure">Configurator</a>
    </div>
    <p>MIT License &middot; Made by <a href="https://github.com/jjaimealeman" style="color:var(--orange);text-decoration:none;">jjaimealeman</a></p>
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
