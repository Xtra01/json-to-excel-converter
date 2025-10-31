# Git Backup Test - Windows PowerShell Version
# Tests Git backup functionality in Windows environment

Write-Host "🧪 Git Backup System - Test Mode" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Test configuration
$testDir = ".\git-backup-test"
$logFile = ".\git-test.log"

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

# Test Git operations
function Test-GitOperations {
    Write-Log "Testing Git operations..."
    
    # Clean up previous test
    if (Test-Path $testDir) {
        Remove-Item -Recurse -Force $testDir
    }
    
    # Create test directory
    New-Item -ItemType Directory -Path $testDir -Force | Out-Null
    Set-Location $testDir
    
    # Initialize Git repository
    Write-Log "Initializing Git repository..."
    git init
    git config user.name "Pi Backup Test"
    git config user.email "test@pi-backup.local"
    
    # Create test files
    @"
# Test Backup Repository

Created: $(Get-Date)
"@ | Out-File -FilePath "README.md" -Encoding UTF8

    @"
# System Information

**Generated:** $(Get-Date)
**Hostname:** $(hostname)
**User:** $($env:USERNAME)

## Test Data
- CPU: Test CPU
- Memory: 16GB
- Disk: 1TB SSD

## Software Versions
- Git: $(git --version)
- OS: Windows
- PowerShell: $($PSVersionTable.PSVersion)
"@ | Out-File -FilePath "SYSTEM_INFO.md" -Encoding UTF8

    @"
*.log
*.tmp
*~
.DS_Store
Thumbs.db
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8

    # Stage and commit
    Write-Log "Creating initial commit..."
    git add .
    git commit -m @"
Initial commit: Test backup repository

System Changes:
- Created README.md
- Created SYSTEM_INFO.md
- Created .gitignore

System Status:
- Uptime: Test uptime
- Load: Test load
- Memory: Test memory usage
- Disk: Test disk usage
"@
    
    # Create version tag
    $versionTag = "v$(Get-Date -Format 'yyyy.MM.dd-HHmmss')"
    git tag -a $versionTag -m @"
Test backup version $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

Backup includes:
- System configuration files
- Application source code
- Service definitions
- Monitoring scripts
- Deployment automation

System: Test (127.0.0.1)
"@

    Write-Log "Version tag created: $versionTag"
    
    # Show Git status
    Write-Host ""
    Write-Log "Git repository status:"
    git log --oneline --decorate --graph -n 5
    Write-Host ""
    git status
    Write-Host ""
    
    Set-Location ..
    
    Write-Log "✅ Git operations test completed successfully!"
}

# Test changelog generation
function Test-Changelog {
    Write-Log "Testing changelog generation..."
    
    Set-Location $testDir
    
    @"
# Backup Changelog

This file contains the version history of the Raspberry Pi backup.

## Version History

"@ | Out-File -FilePath "CHANGELOG.md" -Encoding UTF8
    
    # Add Git log
    try {
        git log --oneline --decorate --graph -n 20 | Out-File -Append -FilePath "CHANGELOG.md" -Encoding UTF8
    } catch {
        Write-Warning "Could not append git log to changelog"
    }
    
    Write-Log "✅ Changelog generated successfully!"
    
    Set-Location ..
}

# Test file operations
function Test-FileOperations {
    Write-Log "Testing file operations..."
    
    Set-Location $testDir
    
    # Simulate file changes
    @"

## Update
Last updated: $(Get-Date)
"@ | Out-File -Append -FilePath "README.md" -Encoding UTF8
    
    # Check for changes
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Log "Changes detected in test repository"
        
        # Stage changes
        git add .
        
        # Create commit
        git commit -m @"
Test update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

File Changes:
- Updated README.md

System Status:
- Test update successful
"@
        
        Write-Log "✅ Changes committed successfully!"
    } else {
        Write-Log "No changes detected"
    }
    
    Set-Location ..
}

# Main test function
function Main {
    Write-Log "Starting Git backup system test..."
    
    # Check Git availability
    try {
        $gitVersion = git --version
        Write-Log "Git version: $gitVersion"
    } catch {
        Write-Error "Git is not installed or not in PATH"
        exit 1
    }
    
    # Run tests
    Test-GitOperations
    Test-Changelog
    Test-FileOperations
    
    # Show final status
    Write-Host ""
    Write-Log "=== FINAL TEST RESULTS ==="
    
    Set-Location $testDir
    Write-Host "Repository location: $(Get-Location)"
    
    try {
        $commitCount = git rev-list --count HEAD
        Write-Host "Total commits: $commitCount"
        
        $latestCommit = git log -1 --format="%h - %s (%cr)"
        Write-Host "Latest commit: $latestCommit"
        
        $tags = git tag -l
        Write-Host "Tags: $($tags -join ' ')"
        
        $repoSize = (Get-ChildItem -Path ".git" -Recurse | Measure-Object -Property Length -Sum).Sum / 1KB
        Write-Host "Repository size: $([math]::Round($repoSize, 2)) KB"
    } catch {
        Write-Warning "Could not retrieve all git statistics"
    }
    
    Set-Location ..
    
    Write-Log "🎉 Git backup system test completed successfully!"
    Write-Log "💡 Test repository created in: $testDir"
    Write-Log "📝 Test log saved in: $logFile"
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Review test results in $testDir"
    Write-Host "2. Check git log: cd $testDir; git log --oneline"
    Write-Host "3. Configure real backup with: git-backup.sh"
}

# Run main function
Main