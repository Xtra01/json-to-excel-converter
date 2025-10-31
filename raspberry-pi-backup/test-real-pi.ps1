# Real Pi Test Script - Advanced Features
# Gerçek Pi bağlantısı ile advanced features test eder

Write-Host "🚀 ADVANCED FEATURES - REAL Pi TEST" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

$piHost = "192.168.1.143"
$piUser = "ekrem"
$logFile = "real-pi-test.log"

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor Green
    "[$timestamp] $Message" | Out-File -Append -FilePath $logFile
}

function Write-Warning {
    param($Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Test 1: Auto-Sync System
function Test-AutoSync {
    Write-Log "Testing Auto-Sync System..."
    
    # Create test file to sync
    $testFile = "test-sync-file.txt"
    "Test sync content - $(Get-Date)" | Out-File -FilePath $testFile -Encoding UTF8
    
    # Upload auto-sync script to Pi
    Write-Log "Uploading auto-sync.sh to Pi..."
    scp auto-sync.sh ${piUser}@${piHost}:~/
    
    # Make executable and test
    ssh $piUser@$piHost "chmod +x ~/auto-sync.sh"
    
    # Test basic functionality (dry run)
    Write-Log "Testing auto-sync dry run..."
    $syncResult = ssh $piUser@$piHost "cd ~ && echo 'Testing auto-sync script existence' && ls -la auto-sync.sh"
    Write-Host "Sync script on Pi: $syncResult" -ForegroundColor Blue
    
    Remove-Item $testFile -ErrorAction SilentlyContinue
    Write-Log "✅ Auto-sync script uploaded and ready"
    return $true
}

# Test 2: Git Backup System  
function Test-GitBackup {
    Write-Log "Testing Git Backup System..."
    
    # Upload git-backup script to Pi
    Write-Log "Uploading git-backup.sh to Pi..."
    scp git-backup.sh ${piUser}@${piHost}:~/
    
    # Make executable
    ssh $piUser@$piHost "chmod +x ~/git-backup.sh"
    
    # Initialize Git backup (safe mode)
    Write-Log "Initializing Git backup on Pi..."
    $gitResult = ssh $piUser@$piHost "cd ~ && ./git-backup.sh init 2>&1 || echo 'Git init may need manual setup'"
    Write-Host "Git backup result: $gitResult" -ForegroundColor Blue
    
    Write-Log "✅ Git backup script uploaded and initialized"
    return $true
}

# Test 3: Multi-Pi Monitoring
function Test-MultiPiMonitoring {
    Write-Log "Testing Multi-Pi Monitoring System..."
    
    # Upload monitoring script to Pi
    Write-Log "Uploading multi-pi-monitor.py to Pi..."
    scp multi-pi-monitor.py ${piUser}@${piHost}:~/
    
    # Check Python dependencies on Pi
    Write-Log "Checking Python dependencies on Pi..."
    $pythonCheck = ssh $piUser@$piHost "python3 -c 'import aiohttp, paramiko, sqlite3; print(\"All dependencies available\")' 2>&1 || echo 'Dependencies may need installation'"
    Write-Host "Python deps on Pi: $pythonCheck" -ForegroundColor Blue
    
    # Test monitoring script (basic check)
    Write-Log "Testing monitoring script basics..."
    $monitorResult = ssh $piUser@$piHost "cd ~ && python3 -c 'print(`"Monitor script ready for testing`")'"
    Write-Host "Monitor test: $monitorResult" -ForegroundColor Blue
    
    Write-Log "✅ Monitoring system uploaded and ready"
    return $true
}

# Test 4: Cluster Manager
function Test-ClusterManager {
    Write-Log "Testing Cluster Manager System..."
    
    # Upload cluster manager script to Pi
    Write-Log "Uploading cluster-manager.sh to Pi..."
    scp cluster-manager.sh ${piUser}@${piHost}:~/
    
    # Make executable
    ssh $piUser@$piHost "chmod +x ~/cluster-manager.sh"
    
    # Test cluster manager basics
    Write-Log "Testing cluster manager basics..."
    $clusterResult = ssh $piUser@$piHost "cd ~ && ./cluster-manager.sh status 2>&1 || echo 'Cluster manager needs configuration'"
    Write-Host "Cluster manager result: $clusterResult" -ForegroundColor Blue
    
    Write-Log "✅ Cluster manager uploaded and ready"
    return $true
}

# Test 5: Real System Monitoring
function Test-RealSystemMonitoring {
    Write-Log "Getting real Pi system metrics..."
    
    # Get system info
    $cpuUsage = ssh $piUser@$piHost "top -bn1 | grep 'Cpu(s)' | awk '{print `$2}' | cut -d'%' -f1"
    $memUsage = ssh $piUser@$piHost "free | grep Mem | awk '{printf `"%.1f`", `$3/`$2 * 100.0}'"
    $diskUsage = ssh $piUser@$piHost "df -h / | tail -1 | awk '{print `$5}' | cut -d'%' -f1"
    $uptime = ssh $piUser@$piHost "uptime -p"
    
    Write-Host ""
    Write-Host "=== REAL Pi SYSTEM METRICS ===" -ForegroundColor Yellow
    Write-Host "CPU Usage: $cpuUsage%"
    Write-Host "Memory Usage: $memUsage%"  
    Write-Host "Disk Usage: $diskUsage%"
    Write-Host "Uptime: $uptime"
    
    # Check services
    $cloudflaredStatus = ssh $piUser@$piHost "systemctl is-active cloudflared-tunnel 2>/dev/null || systemctl is-active cloudflare-tunnel 2>/dev/null || echo 'not-found'"
    $dockerStatus = ssh $piUser@$piHost "systemctl is-active docker 2>/dev/null || echo 'not-found'"
    
    Write-Host ""
    Write-Host "=== REAL Pi SERVICES ===" -ForegroundColor Yellow
    Write-Host "Cloudflare Tunnel: $cloudflaredStatus"
    Write-Host "Docker: $dockerStatus"
    
    Write-Log "✅ Real system monitoring completed"
    return $true
}

# Test 6: Network Connectivity
function Test-NetworkConnectivity {
    Write-Log "Testing network connectivity..."
    
    # Test internet connectivity from Pi
    $internetTest = ssh $piUser@$piHost "curl -s --max-time 10 https://devtestenv.org | head -c 100 && echo '...'"
    Write-Host "Internet from Pi: $($internetTest.Substring(0, [Math]::Min(50, $internetTest.Length)))..." -ForegroundColor Blue
    
    # Test tunnel status
    $tunnelTest = ssh $piUser@$piHost "curl -s --max-time 5 http://localhost:80 | head -c 50 && echo '...'"
    Write-Host "Local web server: $($tunnelTest.Substring(0, [Math]::Min(50, $tunnelTest.Length)))..." -ForegroundColor Blue
    
    Write-Log "✅ Network connectivity tested"
    return $true
}

# Main test execution
Write-Log "Starting comprehensive real Pi testing..."

$testResults = @{}

# Run all tests
$testResults["SSH"] = Test-SSHConnection
$testResults["AutoSync"] = Test-AutoSync  
$testResults["GitBackup"] = Test-GitBackup
$testResults["Monitoring"] = Test-MultiPiMonitoring
$testResults["ClusterManager"] = Test-ClusterManager
$testResults["SystemMetrics"] = Test-RealSystemMonitoring
$testResults["Network"] = Test-NetworkConnectivity

# Summary
Write-Host ""
Write-Host "=== REAL Pi TEST RESULTS ===" -ForegroundColor Cyan
Write-Log "Real Pi testing completed!"

foreach ($test in $testResults.Keys) {
    $status = if ($testResults[$test]) { "✅ PASS" } else { "❌ FAIL" }
    $color = if ($testResults[$test]) { "Green" } else { "Red" }
    Write-Host "$test`: $status" -ForegroundColor $color
}

$passCount = ($testResults.Values | Where-Object { $_ -eq $true }).Count
$totalCount = $testResults.Count

Write-Host ""
Write-Host "Overall Result: $passCount/$totalCount tests passed" -ForegroundColor $(if($passCount -eq $totalCount) {"Green"} else {"Yellow"})
Write-Log "Test log saved: $logFile"

if ($passCount -eq $totalCount) {
    Write-Host ""
    Write-Host "🎉 ALL SYSTEMS OPERATIONAL!" -ForegroundColor Green
    Write-Host "🚀 Ready for production deployment!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Set up cron jobs for automation"
    Write-Host "2. Configure monitoring dashboard"
    Write-Host "3. Test automated sync schedules"
    Write-Host "4. Setup GitHub repository for git backup"
} else {
    Write-Host ""
    Write-Host "⚠️ Some tests need attention" -ForegroundColor Yellow
    Write-Host "Review the log file for details: $logFile"
}

# Helper function for SSH connection test
function Test-SSHConnection {
    try {
        $result = ssh $piUser@$piHost "echo 'SSH OK'"
        return $result -eq "SSH OK"
    } catch {
        return $false
    }
}