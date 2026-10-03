# 02 · Chrome MCP Resilience — never make the human "check the browser"

**Symptom / Triệu chứng:** Your AI agent tries to use a browser MCP (Chrome DevTools MCP / Playwright MCP / "Claude in Chrome") and gets *"lost connection"*, *"browser already running"*, or a dead tab. The agent shrugs and says **"the browser MCP is disconnected, please check it."** — handing a machine problem back to you.

Agent dùng browser MCP thì gặp *"mất kết nối"* / *"browser already running"* / tab chết, rồi dừng bảo **"chrome mcp mất kết nối, bạn kiểm tra lại"** — đẩy lỗi máy về cho người dùng.

## Why it happens / Vì sao

`chrome-devtools-mcp` launches Chrome with a **fixed profile**. Two things break it:
1. **A crashed prior session** left an orphaned `chrome.exe` holding the profile's `SingletonLock` → new launch refused.
2. **Parallel agents** (multiple CLI/editor windows) fight over the *same* fixed profile → only one wins; the others error.

The agent controls the machine, so it should **recover itself** — not delegate to a human.

Nguyên nhân: profile CỐ ĐỊNH. (1) Session cũ crash để lại chrome mồ côi giữ `SingletonLock`; (2) nhiều agent song song tranh cùng 1 profile. Agent điều khiển được máy → phải TỰ khôi phục.

## The strategy / Chiến lược (recover, don't delegate)

A resilient agent should follow this order **before ever asking the human**:

1. **Heal the lock.** Run [`mcp-chrome-heal.cjs`](./mcp-chrome-heal.cjs) — kills the orphaned chrome-devtools-mcp process and deletes the stale `SingletonLock` / `SingletonCookie` / `SingletonSocket`. Reconnect the MCP and retry. Fixes ~90% of "lost connection" (dead prior session).
2. **Still stuck = a live parallel agent owns it.** Don't fight. **Switch to a different browser MCP:**
   - **Playwright MCP** — launches its own *isolated* browser; every agent gets its own, zero contention. Best default fallback.
   - **Claude-in-Chrome** — drives the human's *real* Chrome via extension; use when you need existing logins.
3. **Only escalate to the human** if *all* browser MCPs fail *after* healing — and then say exactly what you tried.

Thứ tự TRƯỚC khi hỏi người: (1) heal lock + retry; (2) còn kẹt do agent song song → đổi sang Playwright MCP (browser riêng, isolated) hoặc Claude-in-Chrome (Chrome thật); (3) chỉ báo người khi cả 3 fail sau heal.

## Why fixed profiles collide (and what to do for parallel work)

The fixed profile keeps you logged in across sessions — great for one agent, fatal for N. For parallel agents, let **one** agent own the fixed-profile Chrome and route the rest to **Playwright's isolated browser** (fresh profile per launch → no lock, no collision). Reserve the fixed profile for the flow that genuinely needs a persistent login.

Profile cố định giữ đăng nhập (tốt cho 1 agent, chết cho nhiều). Song song: 1 agent giữ profile cố định, còn lại dùng Playwright isolated (profile mới mỗi lần → không lock, không tranh). Chỉ để profile cố định cho luồng thực sự cần login sẵn.

## Drop-in

- [`mcp-chrome-heal.cjs`](./mcp-chrome-heal.cjs) — the healer. Wire it as a startup hook and keep it as a manual mid-session command.
- Bonus: reap orphaned `chrome.exe` in the background with [`../orphan-node-reaper`](../orphan-node-reaper/) using `-IncludeChrome`.

## The one rule that matters

> On any browser-MCP failure, the agent's job is to **recover**, not to report. "Please check the browser" is a last resort after heal + retry + fallback — not a first reflex.

> Gặp lỗi browser MCP: việc của agent là **khôi phục**, không phải báo cáo. "Bạn kiểm tra lại giúp" là phương án cuối sau heal + retry + fallback — không phải phản xạ đầu tiên.
