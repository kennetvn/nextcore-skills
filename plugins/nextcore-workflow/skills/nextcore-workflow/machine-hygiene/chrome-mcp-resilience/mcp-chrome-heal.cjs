#!/usr/bin/env node
/**
 * mcp-chrome-heal — reclaim a stuck Chrome DevTools MCP browser.
 *
 * WHY: chrome-devtools-mcp launches Chrome with a FIXED profile
 *   (~/.cache/chrome-devtools-mcp/chrome-profile). If a previous session ended
 *   abnormally, an orphaned chrome.exe keeps holding the profile's SingletonLock
 *   → the next launch fails with "browser already running" → every MCP browser
 *   tool errors out ("lost connection"). Killing the orphan + clearing the lock
 *   makes the browser launchable again.
 *
 * RUN:
 *   - As a startup hook (agent host SessionStart), or
 *   - Manually mid-session when the browser MCP is stuck:  node mcp-chrome-heal.cjs
 *   Then reconnect the MCP (e.g. `/mcp` in Claude Code) and retry.
 *
 * DO NOT run while a browser automation is actively mid-flow — it will kill it.
 * Exit code is always 0 so it is safe to wire as a non-blocking startup hook.
 */
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const isWin = process.platform === 'win32';
const profile = path.join(os.homedir(), '.cache', 'chrome-devtools-mcp', 'chrome-profile');

function killOrphans() {
  try {
    if (isWin) {
      const ps =
        "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" " +
        "| Where-Object { $_.CommandLine -like '*chrome-devtools-mcp*' } " +
        "| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
      execSync(`powershell -NoProfile -NonInteractive -Command "${ps}"`, { stdio: 'ignore', timeout: 12000 });
    } else {
      execSync("pkill -f 'chrome-devtools-mcp' 2>/dev/null || true", { stdio: 'ignore', timeout: 8000 });
    }
  } catch { /* no matching process — fine */ }
}

function removeLocks() {
  for (const f of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    try { fs.rmSync(path.join(profile, f), { force: true }); } catch { /* noop */ }
  }
}

killOrphans();
removeLocks();
process.exit(0);
