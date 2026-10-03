<#
  free-ai-cli-resources.ps1 — Reclaim RAM after a long AI-CLI session, WITHOUT rebooting.

  WHY: Running an AI coding CLI (Claude Code, Cursor, etc.) for hours slowly fills RAM
  until you reboot to recover. The culprits, and what is actually reclaimable:
    1. Orphaned node.exe (dead prior sessions/CLIs)         -> reclaimable (this script / a reaper)
    2. chrome.exe spawned by browser MCPs, left open        -> reclaimable (this script, signature-targeted)
    3. Temp browser profiles from MCPs on disk              -> reclaimable (-Temp)
    4. The heap of the RUNNING cli process itself           -> NOT script-reclaimable while it runs
       (grows with conversation context — only /clear or restarting the CLI frees it)

  SAFE: only kills chrome.exe whose command line has an MCP signature
  ('chrome-devtools-mcp' / 'playwright' / a Temp user-data-dir). It NEVER touches your
  real Chrome (your tabs). node is only killed if orphaned (parent gone / PID recycled).

  USAGE:
    powershell -File free-ai-cli-resources.ps1 -DryRun   # show what it would reclaim
    powershell -File free-ai-cli-resources.ps1           # reclaim now
    powershell -File free-ai-cli-resources.ps1 -Temp     # also clear MCP temp browser profiles on disk
#>
param([switch]$DryRun, [switch]$Temp)
$ErrorActionPreference='Stop'
function RamUsedMB { $o=Get-CimInstance Win32_OperatingSystem; [int](($o.TotalVisibleMemorySize-$o.FreePhysicalMemory)/1KB) }
$before = RamUsedMB
$now = Get-Date
$killedN=0; $killedC=0; $freedMB=0

# 1) orphaned node.exe (parent dead / PID recycled), age > 3 min
$all=@{}; Get-CimInstance Win32_Process -EA SilentlyContinue | ForEach-Object { $all[[int]$_.ProcessId]=$_ }
foreach($p in (Get-CimInstance Win32_Process -Filter "Name='node.exe'" -EA SilentlyContinue)){
  if(-not $p.CreationDate){continue}
  if(($now-$p.CreationDate).TotalMinutes -lt 3){continue}
  $par=$all[[int]$p.ParentProcessId]
  $orphan = (-not $par) -or ($par.CreationDate -gt $p.CreationDate)
  if($orphan){ $freedMB+=[int]($p.WorkingSetSize/1MB); $killedN++
    if(-not $DryRun){ try{ Stop-Process -Id ([int]$p.ProcessId) -Force -EA Stop }catch{} } }
}

# 2) chrome.exe spawned by a browser MCP (never your real Chrome)
foreach($c in (Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -EA SilentlyContinue)){
  $cmd=""+$c.CommandLine
  $isMcp = $cmd -match 'chrome-devtools-mcp' -or $cmd -match 'ms-playwright' -or $cmd -match '\\playwright' `
           -or $cmd -match '--user-data-dir=[^"]*\\(Temp|puppeteer|playwright|chrome-devtools-mcp)'
  if($isMcp){ $freedMB+=[int]($c.WorkingSetSize/1MB); $killedC++
    if(-not $DryRun){ try{ Stop-Process -Id ([int]$c.ProcessId) -Force -EA Stop }catch{} } }
}

# 3) optional: MCP temp browser profiles on disk
$diskMsg=''
if($Temp){
  foreach($pat in @("$env:TEMP\playwright*","$env:TEMP\puppeteer_dev_*","$env:TEMP\.org.chromium.*","$env:TEMP\chrome-devtools-mcp*")){
    Get-Item $pat -EA SilentlyContinue | ForEach-Object { if(-not $DryRun){ try{ Remove-Item $_ -Recurse -Force -EA Stop }catch{} } }
  }
  $diskMsg=' + cleared MCP temp profiles'
}

Start-Sleep -Milliseconds 400
$after = RamUsedMB
$mode = if($DryRun){'DRY-RUN'}else{'RECLAIMED'}
"[$mode] orphan node: $killedN | MCP chrome: $killedC | ~$freedMB MB of processes$diskMsg"
"System RAM: $before MB -> $after MB (delta $($before-$after) MB)"
if($killedN -eq 0 -and $killedC -eq 0){
  "`nNothing to reclaim (clean). If the machine is still heavy after a LONG session:"
  " - The running CLI process heap grows with context — no script can shrink a live process."
  " - Real fix: /clear (drops context) OR quit & relaunch the CLI (heap resets to ~0)."
  " - Refresh MCP servers to free their heap: reconnect MCP (/mcp) or restart the CLI."
}
