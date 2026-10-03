<#
  reap-orphan-node.ps1 — Kill ORPHANED node.exe processes on Windows.

  WHY: MCP servers (npx-launched: playwright, chrome-devtools, etc.) and one-off node
  tasks (builds, dev tools) are NOT always killed when their parent (an AI-agent host
  like Claude Code / Cursor, a terminal, or a crashed session) dies. The orphans keep
  running in the background, pile up over hours, eat RAM, and lag the whole machine.

  SAFE: kills ONLY node.exe that is orphaned (parent process gone, OR the parent PID was
  recycled by a newer process) AND older than -MinAgeMinutes. It NEVER touches a node
  process whose parent is still alive — your active session, dev server, and editor all
  have living parents, so they are left untouched.

  USAGE:
    powershell -File reap-orphan-node.ps1 -DryRun        # show what it WOULD kill, kill nothing
    powershell -File reap-orphan-node.ps1                # kill orphans now
    powershell -File reap-orphan-node.ps1 -Install       # register a Scheduled Task (every 15 min)
    powershell -File reap-orphan-node.ps1 -Uninstall     # remove the Scheduled Task
    powershell -File reap-orphan-node.ps1 -IncludeChrome # also reap orphaned chrome.exe (left by browser MCPs)
  Log: %LOCALAPPDATA%\node-reaper\reap.log
#>
param(
  [int]$MinAgeMinutes = 3,
  [switch]$DryRun,
  [switch]$Install,
  [switch]$Uninstall,
  [switch]$IncludeChrome
)

$ErrorActionPreference = 'Stop'
$TaskName = 'Reap Orphan Node'
$logDir = Join-Path $env:LOCALAPPDATA 'node-reaper'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force -Path $logDir | Out-Null }
$log = Join-Path $logDir 'reap.log'

if ($Install) {
  $self = $MyInvocation.MyCommand.Path
  $arg = "-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$self`""
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
             -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650)
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
  Write-Output "Registered Scheduled Task '$TaskName' — runs every 15 minutes (log: $log)."
  return
}
if ($Uninstall) {
  try { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop; Write-Output "Removed Scheduled Task '$TaskName'." }
  catch { Write-Output "Task '$TaskName' not found (already removed or never installed)." }
  return
}

$now = Get-Date

# Map every PID -> process object, to look up parents and detect PID recycling.
$allById = @{}
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ForEach-Object { $allById[[int]$_.ProcessId] = $_ }

$names = @('node.exe')
if ($IncludeChrome) { $names += 'chrome.exe' }

$killed = @()
foreach ($name in $names) {
  $procs = Get-CimInstance Win32_Process -Filter "Name='$name'" -ErrorAction SilentlyContinue
  foreach ($p in $procs) {
    $created = $p.CreationDate
    if (-not $created) { continue }
    $ageMin = ($now - $created).TotalMinutes
    if ($ageMin -lt $MinAgeMinutes) { continue }            # too new -> skip (avoid racing a fresh spawn)
    $ppid = [int]$p.ParentProcessId
    $parent = $allById[$ppid]
    $isOrphan = $false
    if (-not $parent) { $isOrphan = $true }                          # parent gone
    elseif ($parent.CreationDate -gt $created) { $isOrphan = $true } # parent PID recycled (parent newer than child)
    if (-not $isOrphan) { continue }
    $mb = [int]($p.WorkingSetSize / 1MB)
    $killed += [PSCustomObject]@{ Name=$name; PID=[int]$p.ProcessId; PPID=$ppid; RAM_MB=$mb; AgeMin=[int]$ageMin }
    if (-not $DryRun) {
      try { Stop-Process -Id ([int]$p.ProcessId) -Force -ErrorAction Stop } catch {}
    }
  }
}

$stamp = $now.ToString('yyyy-MM-dd HH:mm:ss')
if ($killed.Count -gt 0) {
  $sumMb = ($killed | Measure-Object RAM_MB -Sum).Sum
  if ($DryRun) { $mode = 'DRY-RUN (killed nothing)' } else { $mode = 'KILLED' }
  $line = "$stamp  $mode  $($killed.Count) orphan(s), ~${sumMb}MB"
  Add-Content -Path $log -Value $line -Encoding utf8
  Write-Output $line
  $killed | Format-Table -AutoSize | Out-String -Width 200 | Write-Output
} else {
  $line = "$stamp  0 orphans (clean)"
  Add-Content -Path $log -Value $line -Encoding utf8
  Write-Output $line
}
