# 01 · Orphan Node Reaper (Windows)

**Symptom / Triệu chứng:** After a few hours of coding — especially with AI agents and MCP servers — your machine gets sluggish. Task Manager shows a dozen+ `node.exe` processes eating hundreds of MB, and you didn't start them.

Sau vài giờ làm việc (nhất là khi dùng AI agent + MCP server), máy chậm dần. Task Manager hiện cả tá `node.exe` ngốn hàng trăm MB mà bạn không hề mở.

## Why it happens / Vì sao

MCP servers are launched via `npx` (Playwright, Chrome DevTools, etc.). Each is a small node process. When the parent — the agent host (Claude Code, Cursor), a terminal, or a crashed session — exits **without cleanly killing its children**, those node processes become **orphans**. Nothing reaps them. They keep running until reboot, accumulating across every session.

MCP server chạy qua `npx` (mỗi cái là 1 node nhỏ). Khi tiến trình cha (host agent / terminal / session crash) thoát mà **không kill con**, các node đó thành **mồ côi** — không ai dọn, chạy tới khi khởi động lại, tích tụ qua từng phiên.

## The fix / Cách sửa

A reaper that kills **only orphaned** node processes:
- **Orphan** = parent process is gone, *or* the parent PID was recycled by a newer process (creation-time check — avoids the classic PID-reuse false negative).
- Plus a minimum-age guard so it never races a just-spawned process.
- **Your active work is safe:** anything with a *living* parent (current session, dev server, editor) is never touched.

Reaper chỉ kill node **mồ côi**: parent đã chết, hoặc PID parent bị tái dụng bởi process mới hơn (so creation-time — tránh bẫy PID-reuse). Có ngưỡng tuổi tối thiểu để không giết nhầm process vừa spawn. Node có parent còn sống (session/dev/editor) **không bao giờ bị đụng**.

## Use / Dùng

```powershell
# See what it would kill — safe, kills nothing
powershell -File reap-orphan-node.ps1 -DryRun

# Kill orphans now
powershell -File reap-orphan-node.ps1

# Set-and-forget: a Scheduled Task that reaps every 15 minutes
powershell -File reap-orphan-node.ps1 -Install

# Also clean orphaned chrome.exe left by browser MCPs
powershell -File reap-orphan-node.ps1 -IncludeChrome

# Remove the background task
powershell -File reap-orphan-node.ps1 -Uninstall
```

Log: `%LOCALAPPDATA%\node-reaper\reap.log`

## How the orphan check works (the important bit)

Naively "kill node whose parent doesn't exist" is wrong on Windows: PIDs get **recycled**, so a dead parent's PID may now belong to an unrelated new process, making the orphan look alive. This script compares **creation times** — if the current holder of the parent PID was created *after* the child, the real parent is gone and the child is an orphan. That one check is why it's safe to run unattended.

Điểm mấu chốt: "kill node không có parent" là SAI trên Windows vì PID bị tái dụng. Script so **thời điểm tạo** — nếu process đang giữ parent-PID được tạo *sau* con thì parent thật đã chết → con mồ côi. Nhờ vậy chạy nền tự động vẫn an toàn.
