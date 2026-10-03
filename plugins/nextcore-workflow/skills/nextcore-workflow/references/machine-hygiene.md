# Machine hygiene — the dev box that agents run on

Long agent sessions leave debris on the machine they run on, and the agent usually works around it badly
("please check your browser", "try restarting"). Three self-contained fixes, each with the symptom, the root cause
and a drop-in script. Scripts only touch what they prove is orphaned or broken.

| Problem | Fix |
|---|---|
| Node processes (MCP servers, dev tasks that never exit) pile up on Windows and lag the whole machine | [`machine-hygiene/orphan-node-reaper`](../machine-hygiene/orphan-node-reaper/README.md) |
| Browser MCP reports "lost connection" / "browser already running" and the agent asks the human to check | [`machine-hygiene/chrome-mcp-resilience`](../machine-hygiene/chrome-mcp-resilience/README.md) |
| An AI CLI's memory creeps up over a long session until the machine needs a reboot | [`machine-hygiene/long-running-ai-cli-hygiene`](../machine-hygiene/long-running-ai-cli-hygiene/README.md) |

Rule behind all three: **the agent recovers its own tools.** A failing browser, a dead MCP server or a full machine is
a measurable state with a known fix — run the fix, verify, continue. Escalate to a human only when the fix needs
something physical (a login, an OTP, a hardware button).
