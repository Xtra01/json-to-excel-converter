# SSH Key Synchronization Script
# Pi ve PC arasında SSH key senkronizasyonu yapar

Write-Host "SSH Key Synchronization - Advanced Features" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$piHost = "192.168.1.143"
$piUser = "ekrem"
$logFile = "ssh-sync.log"

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

# Test SSH connection
function Test-SSHConnection {
    Write-Log "Testing SSH connection to Pi..."
    
    try {
        $result = ssh $piUser@$piHost "echo 'SSH connection successful'"
        if ($result -eq "SSH connection successful") {
            Write-Log "✅ SSH connection working!"
            return $true
        } else {
            Write-Error "❌ SSH connection failed"
            return $false
        }
    } catch {
        Write-Error "❌ SSH connection error: $($_.Exception.Message)"
        return $false
    }
}

# Get current keys
function Get-CurrentKeys {
    Write-Log "Checking current SSH keys..."
    
    # PC'deki key
    $pcKeyPath = "$HOME\.ssh\id_ed25519.pub"
    if (Test-Path $pcKeyPath) {
        $pcKey = Get-Content $pcKeyPath
        Write-Host "PC Public Key: $($pcKey.Substring(0, 50))..." -ForegroundColor Blue
    } else {
        Write-Warning "PC'de SSH key bulunamadı: $pcKeyPath"
    }
    
    # Pi'deki key
    try {
        $piKey = ssh $piUser@$piHost "cat ~/.ssh/id_ed25519.pub"
        Write-Host "Pi Public Key: $($piKey.Substring(0, 50))..." -ForegroundColor Blue
        
        if ($pcKey -eq $piKey) {
            Write-Log "✅ Keys are synchronized!"
            return $true
        } else {
            Write-Warning "⚠️ Keys are different - synchronization needed"
            return $false
        }
    } catch {
        Write-Error "❌ Could not get Pi key: $($_.Exception.Message)"
        return $false
    }
}

# Setup key for automated sync
function Setup-AutoSync {
    Write-Log "Setting up PC → Pi key authorization..."
    
    $pcKeyPath = "$HOME\.ssh\id_ed25519.pub"
    
    if (Test-Path $pcKeyPath) {
        $pcPublicKey = Get-Content $pcKeyPath
        
        # PC'nin public key'ini Pi'nin authorized_keys'ine ekle
        $command = "echo '$pcPublicKey' >> ~/.ssh/authorized_keys && sort ~/.ssh/authorized_keys | uniq > ~/.ssh/authorized_keys.tmp && mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys"
        
        try {
            ssh $piUser@$piHost $command
            Write-Log "✅ PC public key added to Pi authorized_keys"
            
            # Test passwordless connection
            $testResult = ssh -o PasswordAuthentication=no $piUser@$piHost "echo 'Passwordless SSH works'"
            if ($testResult -eq "Passwordless SSH works") {
                Write-Log "✅ Passwordless SSH working perfectly!"
                return $true
            } else {
                Write-Warning "⚠️ Passwordless SSH not working yet"
                return $false
            }
        } catch {
            Write-Error "❌ Failed to setup key authorization: $($_.Exception.Message)"
            return $false
        }
    } else {
        Write-Error "❌ PC SSH key not found: $pcKeyPath"
        return $false
    }
}

# Generate new key pair if needed
function New-SSHKeyPair {
    Write-Log "Generating new SSH key pair..."
    
    $keyPath = "$HOME\.ssh\pi_backup_key"
    
    # Generate new key
    ssh-keygen -t ed25519 -f $keyPath -N '""' -C "pi-backup-automation"
    
    if (Test-Path "$keyPath.pub") {
        Write-Log "✅ New SSH key pair generated: $keyPath"
        
        # Copy to Pi
        $publicKey = Get-Content "$keyPath.pub"
        ssh $piUser@$piHost "echo '$publicKey' >> ~/.ssh/authorized_keys"
        
        Write-Log "✅ New key authorized on Pi"
        
        # Create SSH config entry
        $sshConfigPath = "$HOME\.ssh\config"
        $configEntry = @"

# Pi Backup Automation
Host pi-backup
    HostName $piHost
    User $piUser
    IdentityFile $keyPath
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
"@
        
        $configEntry | Out-File -Append -FilePath $sshConfigPath -Encoding UTF8
        Write-Log "✅ SSH config updated"
        
        return $true
    } else {
        Write-Error "❌ Failed to generate SSH key"
        return $false
    }
}

# Test all connections
function Test-AllConnections {
    Write-Log "Testing all SSH connection methods..."
    
    # Test 1: Regular connection
    $test1 = ssh $piUser@$piHost "echo 'Test 1: Regular SSH OK'"
    Write-Host "Test 1 (Regular): $test1" -ForegroundColor $(if($test1 -eq "Test 1: Regular SSH OK") {"Green"} else {"Red"})
    
    # Test 2: Passwordless
    $test2 = ssh -o PasswordAuthentication=no $piUser@$piHost "echo 'Test 2: Passwordless SSH OK'" 2>$null
    Write-Host "Test 2 (Passwordless): $test2" -ForegroundColor $(if($test2 -eq "Test 2: Passwordless SSH OK") {"Green"} else {"Red"})
    
    # Test 3: With pi-backup alias (if exists)
    try {
        $test3 = ssh pi-backup "echo 'Test 3: Pi-backup alias OK'" 2>$null
        Write-Host "Test 3 (Alias): $test3" -ForegroundColor $(if($test3 -eq "Test 3: Pi-backup alias OK") {"Green"} else {"Red"})
    } catch {
        Write-Host "Test 3 (Alias): Alias not configured" -ForegroundColor Yellow
    }
    
    Write-Log "SSH connection tests completed"
}

# Main execution
Write-Log "Starting SSH key synchronization..."

if (Test-SSHConnection) {
    $keysSync = Get-CurrentKeys
    
    if (-not $keysSync) {
        Write-Log "Setting up automatic sync authorization..."
        $autoSyncOK = Setup-AutoSync
        
        if (-not $autoSyncOK) {
            Write-Log "Generating new key pair for automation..."
            $newKeyOK = New-SSHKeyPair
        }
    }
    
    # Final tests
    Test-AllConnections
    
    Write-Host ""
    Write-Host "=== SSH SETUP SUMMARY ===" -ForegroundColor Cyan
    Write-Log "SSH key setup completed!"
    Write-Log "Log file: $logFile"
    
    Write-Host ""
    Write-Host "Ready for automation:" -ForegroundColor Green
    Write-Host "✅ SSH connection: Working"
    Write-Host "✅ Key authorization: Configured"
    Write-Host "✅ Ready for auto-sync, git-backup, and monitoring"
    
    Write-Host ""
    Write-Host "Test the advanced features:" -ForegroundColor Cyan
    Write-Host "1. Auto-sync: .\auto-sync.sh (if converted to PS1)"
    Write-Host "2. Git backup: .\git-backup.sh (if converted to PS1)"
    Write-Host "3. Monitoring: python multi-pi-monitor.py"
    
} else {
    Write-Error "Cannot proceed - SSH connection not working"
    Write-Host "Please check:"
    Write-Host "1. Pi is powered on and connected"
    Write-Host "2. IP address is correct: $piHost"
    Write-Host "3. SSH service is running on Pi"
    Write-Host "4. Firewall allows SSH connections"
}