# Chia York Lim, A0258147X

param(
    [int]$TargetPid,
    [string]$OutputFile = "node_metrics_log.csv",
    [int]$DurationSeconds = 0 # 0 means it will run forever until you press Ctrl+C
)

"Time,PID,CPUPercent,MemoryMB" | Out-File $OutputFile

$prevCpu = $null
$prevTime = $null
$startTime = Get-Date # Start the timer

if ($DurationSeconds -gt 0) {
    Write-Host "Monitoring PID $TargetPid for $DurationSeconds seconds..."
} else {
    Write-Host "Monitoring PID $TargetPid indefinitely (Press Ctrl+C to stop)..."
}

while ($true) {
    try {
        $now = Get-Date

        # Check if the timer has expired
        if ($DurationSeconds -gt 0 -and ($now - $startTime).TotalSeconds -ge $DurationSeconds) {
            Write-Host "Timer complete ($DurationSeconds seconds). Stopping monitor."
            break
        }

        $p = Get-Process -Id $TargetPid -ErrorAction Stop

        if ($prevCpu -ne $null) {
            $deltaCpu = $p.CPU - $prevCpu
            $deltaTime = ($now - $prevTime).TotalSeconds

            if ($deltaTime -gt 0) {
                $cpuPercent = ($deltaCpu / $deltaTime) * 100 / [Environment]::ProcessorCount
            } else {
                $cpuPercent = 0
            }

            $memoryMB = [math]::Round($p.WorkingSet64 / 1MB, 2)

            "$($now.ToString("HH:mm:ss")),$TargetPid,$([math]::Round($cpuPercent,2)),$memoryMB" |
                Out-File $OutputFile -Append
        }

        $prevCpu = $p.CPU
        $prevTime = $now

        Start-Sleep -Seconds 1
    }
    catch {
        Write-Host "Process ended or not found."
        break
    }
}

# Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Where-Object { $_.CommandLine -like "*server.js*" } | Select-Object ProcessId, Name, CommandLine
# powershell -ExecutionPolicy Bypass -File .\monitor-node.ps1 -TargetPid <PID> -DurationSeconds 60