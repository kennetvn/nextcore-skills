# 03 · Long-Running AI CLI Resource Hygiene

**Symptom / Triệu chứng:** You run an AI coding CLI (Claude Code, Cursor, …) for hours. RAM creeps up until the machine is so heavy you **reboot just to get it back**.

Chạy AI CLI (Claude Code, Cursor…) nhiều giờ → RAM tăng dần tới mức máy nặng đến nỗi **phải reboot chỉ để lấy lại tài nguyên**.

## The mental model / Cách hiểu đúng

Not all "AI CLI memory" is the same. Measure before you kill anything — most people blame the wrong thing:

| What | Typical size | Reclaimable while CLI runs? | How |
|------|-------------|------------------------------|-----|
| Orphaned `node.exe` (dead prior sessions/CLIs) | grows over days | ✅ yes | reaper / this script |
| `chrome.exe` spawned by **browser MCPs** | 100s of MB – GBs | ✅ yes | this script (signature-targeted) |
| MCP temp browser profiles on disk | MBs | ✅ yes | `-Temp` |
| The **running CLI process heap** (grows with context) | 0.5–1.5 GB | ❌ no | `/clear` or **restart the CLI** |
| **Your own Chrome tabs** | often the biggest | (not the CLI's fault) | close tabs yourself |

> A real diagnosis on one machine after a marathon session: `chrome` = 5.6 GB (36 procs) — but **all of it was the user's own browser tabs**, not the CLI. The actual CLI footprint was ~2 GB (cli heap + MCP node). Measure first; don't kill your browser thinking it's the agent.

Không phải "RAM của AI CLI" nào cũng như nhau. Đo TRƯỚC khi kill. Ví dụ thật: chrome 5.6GB nhưng **toàn tab của chính người dùng**, không phải CLI; footprint CLI thật ~2GB.

## The fix / Cách sửa (two layers)

**1. Automatic, always-on — reap orphans.** Install the [orphan-node-reaper](../orphan-node-reaper/) as a scheduled task (every 15 min). This clears the leftovers from crashed/closed sessions with zero effort.

**2. On-demand deep reclaim — [`free-ai-cli-resources.ps1`](./free-ai-cli-resources.ps1).** One command to reclaim, without rebooting:
- kills orphaned `node.exe`,
- kills `chrome.exe` spawned by browser MCPs (**never your real Chrome** — matched by command-line signature),
- optionally clears MCP temp browser profiles (`-Temp`),
- reports how much RAM came back.

```powershell
powershell -File free-ai-cli-resources.ps1 -DryRun   # preview, touches nothing
powershell -File free-ai-cli-resources.ps1           # reclaim now
powershell -File free-ai-cli-resources.ps1 -Temp     # also clear temp browser profiles
```

## The part no script can fix / Phần không script nào cứu được

The CLI's **own process heap grows with the conversation context** and cannot be shrunk while it runs. This is the real driver of "it gets heavy after hours." Two habits fix it:

- **`/clear`** between unrelated tasks — drops the accumulated context, freeing the biggest chunk of the CLI's own memory.
- **Restart the CLI** for true marathon sessions — a fresh process starts near zero. Quick, and far cheaper than rebooting the whole machine.
- **Refresh MCP servers** (reconnect MCP / restart CLI) to release the heap that long-lived MCP `node` processes accumulate.

Heap của chính process CLI phình theo context, KHÔNG shrink được khi đang chạy — đây mới là gốc "chạy lâu thì nặng". Thói quen: `/clear` giữa các task rời rạc · **restart CLI** cho phiên marathon (process mới ~0, rẻ hơn reboot cả máy) · làm mới MCP để nhả heap.

## TL;DR

> Reboot the machine? No. Reap orphans automatically, run the reclaim script on demand, and **restart the CLI (not the PC)** when a long session gets heavy.

> Reboot máy? Không. Dọn orphan tự động + chạy script reclaim khi cần, và **restart CLI (không phải PC)** khi phiên dài trở nặng.
