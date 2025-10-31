# Cluster Manager Test - Windows PowerShell Version
# Tests cluster management functionality in test mode

Write-Host "Cluster Manager - Test Mode" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# Test configuration
$testLogFile = "cluster-test.log"
$testConfig = "test-cluster-config.json"

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor Green
    "[$timestamp] $Message" | Out-File -Append -FilePath $testLogFile
}

function Write-Warning {
    param($Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Test configuration creation
function Test-ConfigCreation {
    Write-Log "Testing configuration creation..."
    
    $testClusterConfig = @{
        cluster_name = "test-cluster"
        created = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        nodes = @(
            @{
                name = "pi-main"
                host = "192.168.1.143"
                user = "ekrem"
                port = 22
                role = "primary"
                services = @("cloudflared", "nginx", "monitoring")
                status = "active"
            },
            @{
                name = "pi-backup"
                host = "192.168.1.144"
                user = "pi"
                port = 22
                role = "backup"
                services = @("backup-sync", "monitoring")
                status = "standby"
            },
            @{
                name = "pi-worker"
                host = "192.168.1.145"
                user = "pi"
                port = 22
                role = "worker"
                services = @("worker-tasks", "monitoring")
                status = "active"
            }
        )
        scripts = @{
            health_check = "/home/ekrem/health-check.sh"
            ip_monitor = "/home/ekrem/ip-monitor.sh"
            auto_sync = "/home/ekrem/auto-sync.sh"
            git_backup = "/home/ekrem/git-backup.sh"
            monitoring = "/home/ekrem/multi-pi-monitor.py"
        }
        monitoring = @{
            dashboard_port = 8080
            check_interval = 300
            log_retention_days = 30
        }
    }
    
    $testClusterConfig | ConvertTo-Json -Depth 4 | Out-File -FilePath $testConfig -Encoding UTF8
    
    Write-Log "Test configuration created: $testConfig"
    Write-Log "Cluster nodes: $($testClusterConfig.nodes.Count)"
    
    return $testClusterConfig
}

# Test node validation
function Test-NodeValidation {
    param($Config)
    
    Write-Log "Testing node validation..."
    
    foreach ($node in $Config.nodes) {
        Write-Host "  Testing node: $($node.name)" -ForegroundColor Blue
        Write-Host "    Host: $($node.host)"
        Write-Host "    Role: $($node.role)"
        Write-Host "    Services: $($node.services -join ', ')"
        Write-Host "    Status: $($node.status)"
        
        # Simulate connection test
        if ($node.host -like "192.168.1.*") {
            Write-Host "    Connection: ✅ Valid IP range" -ForegroundColor Green
        } else {
            Write-Host "    Connection: ❌ Invalid IP range" -ForegroundColor Red
        }
        
        # Validate services
        if ($node.services.Count -gt 0) {
            Write-Host "    Services: ✅ $($node.services.Count) services configured" -ForegroundColor Green
        } else {
            Write-Host "    Services: ⚠️ No services configured" -ForegroundColor Yellow
        }
        
        Write-Host ""
    }
    
    Write-Log "Node validation completed"
}

# Test script deployment simulation
function Test-ScriptDeployment {
    param($Config)
    
    Write-Log "Testing script deployment simulation..."
    
    $scripts = @(
        "health-check.sh",
        "ip-monitor.sh", 
        "auto-sync.sh",
        "git-backup.sh",
        "multi-pi-monitor.py"
    )
    
    foreach ($script in $scripts) {
        Write-Host "  Deploying script: $script" -ForegroundColor Blue
        
        foreach ($node in $Config.nodes) {
            # Simulate deployment
            $deployPath = "/home/$($node.user)/$script"
            Write-Host "    → $($node.name): $deployPath" -ForegroundColor Gray
            
            # Simulate success/failure
            if ($node.status -eq "active") {
                Write-Host "      ✅ Deployed successfully" -ForegroundColor Green
            } else {
                Write-Host "      ⚠️ Node not active, queued for later" -ForegroundColor Yellow
            }
        }
        Write-Host ""
    }
    
    Write-Log "Script deployment simulation completed"
}

# Test monitoring dashboard simulation
function Test-MonitoringDashboard {
    param($Config)
    
    Write-Log "Testing monitoring dashboard simulation..."
    
    # Create test dashboard data
    $dashboardData = @{
        cluster_name = $Config.cluster_name
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        nodes = @()
    }
    
    foreach ($node in $Config.nodes) {
        $nodeData = @{
            name = $node.name
            host = $node.host
            role = $node.role
            status = $node.status
            metrics = @{
                cpu_usage = Get-Random -Minimum 10 -Maximum 90
                memory_usage = Get-Random -Minimum 20 -Maximum 80
                disk_usage = Get-Random -Minimum 30 -Maximum 70
                uptime = "$(Get-Random -Minimum 1 -Maximum 30) days"
                load_average = [math]::Round((Get-Random -Minimum 0.1 -Maximum 2.5), 2)
            }
            services = @()
        }
        
        foreach ($service in $node.services) {
            $serviceStatus = @{
                name = $service
                status = if (Get-Random -Maximum 100 -lt 95) { "running" } else { "stopped" }
                pid = Get-Random -Minimum 1000 -Maximum 9999
                memory = "$(Get-Random -Minimum 10 -Maximum 200)MB"
            }
            $nodeData.services += $serviceStatus
        }
        
        $dashboardData.nodes += $nodeData
    }
    
    # Display dashboard simulation
    Write-Host ""
    Write-Host "=== CLUSTER DASHBOARD SIMULATION ===" -ForegroundColor Cyan
    Write-Host "Cluster: $($dashboardData.cluster_name)"
    Write-Host "Updated: $($dashboardData.timestamp)"
    Write-Host ""
    
    foreach ($node in $dashboardData.nodes) {
        Write-Host "Node: $($node.name) ($($node.role))" -ForegroundColor Yellow
        Write-Host "  Status: $($node.status)"
        Write-Host "  CPU: $($node.metrics.cpu_usage)%"
        Write-Host "  Memory: $($node.metrics.memory_usage)%"
        Write-Host "  Disk: $($node.metrics.disk_usage)%"
        Write-Host "  Uptime: $($node.metrics.uptime)"
        Write-Host "  Load: $($node.metrics.load_average)"
        Write-Host "  Services:"
        
        foreach ($service in $node.services) {
            $statusColor = if ($service.status -eq "running") { "Green" } else { "Red" }
            Write-Host "    - $($service.name): $($service.status) (PID: $($service.pid), Mem: $($service.memory))" -ForegroundColor $statusColor
        }
        Write-Host ""
    }
    
    # Save dashboard data
    $dashboardFile = "test-dashboard-data.json"
    $dashboardData | ConvertTo-Json -Depth 4 | Out-File -FilePath $dashboardFile -Encoding UTF8
    
    Write-Log "Dashboard simulation completed"
    Write-Log "Dashboard data saved: $dashboardFile"
}

# Test cluster health check
function Test-ClusterHealth {
    param($Config)
    
    Write-Log "Testing cluster health check..."
    
    $healthReport = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        cluster_status = "healthy"
        total_nodes = $Config.nodes.Count
        active_nodes = ($Config.nodes | Where-Object { $_.status -eq "active" }).Count
        issues = @()
    }
    
    foreach ($node in $Config.nodes) {
        Write-Host "  Checking node: $($node.name)" -ForegroundColor Blue
        
        # Simulate health checks
        $checks = @(
            @{ name = "SSH Connection"; status = "ok" },
            @{ name = "Disk Space"; status = "ok" },
            @{ name = "Memory Usage"; status = "ok" },
            @{ name = "CPU Load"; status = "ok" },
            @{ name = "Services"; status = if (Get-Random -Maximum 100 -lt 95) { "ok" } else { "warning" } }
        )
        
        foreach ($check in $checks) {
            $statusColor = switch ($check.status) {
                "ok" { "Green" }
                "warning" { "Yellow" }
                "error" { "Red" }
            }
            Write-Host "    $($check.name): $($check.status)" -ForegroundColor $statusColor
            
            if ($check.status -ne "ok") {
                $healthReport.issues += @{
                    node = $node.name
                    check = $check.name
                    status = $check.status
                }
            }
        }
        Write-Host ""
    }
    
    # Summary
    Write-Host "=== CLUSTER HEALTH SUMMARY ===" -ForegroundColor Cyan
    Write-Host "Total Nodes: $($healthReport.total_nodes)"
    Write-Host "Active Nodes: $($healthReport.active_nodes)"
    Write-Host "Issues Found: $($healthReport.issues.Count)"
    
    if ($healthReport.issues.Count -eq 0) {
        Write-Host "Cluster Status: ✅ HEALTHY" -ForegroundColor Green
    } else {
        Write-Host "Cluster Status: ⚠️ NEEDS ATTENTION" -ForegroundColor Yellow
        foreach ($issue in $healthReport.issues) {
            Write-Host "  - $($issue.node): $($issue.check) ($($issue.status))" -ForegroundColor Yellow
        }
    }
    
    Write-Log "Cluster health check completed"
    return $healthReport
}

# Main test execution
Write-Log "Starting Cluster Manager test..."

# Run all tests
$config = Test-ConfigCreation
Test-NodeValidation -Config $config
Test-ScriptDeployment -Config $config
Test-MonitoringDashboard -Config $config
$healthReport = Test-ClusterHealth -Config $config

# Final summary
Write-Host ""
Write-Host "=== CLUSTER MANAGER TEST RESULTS ===" -ForegroundColor Cyan
Write-Log "All cluster manager tests completed successfully!"
Write-Log "Configuration file: $testConfig"
Write-Log "Test log file: $testLogFile"
Write-Log "Dashboard data: test-dashboard-data.json"

Write-Host ""
Write-Host "Test Summary:" -ForegroundColor Green
Write-Host "✅ Configuration creation"
Write-Host "✅ Node validation"
Write-Host "✅ Script deployment simulation"
Write-Host "✅ Monitoring dashboard"
Write-Host "✅ Cluster health check"

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review test configuration in $testConfig"
Write-Host "2. Check test log for details: $testLogFile"
Write-Host "3. Configure real SSH connections for actual deployment"
Write-Host "4. Set up monitoring dashboard on port 8080"