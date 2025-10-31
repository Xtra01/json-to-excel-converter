# Git Backup Test - Windows PowerShell Version
# Tests Git backup functionality in Windows environment

Write-Host "Git Backup System - Test Mode" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Test configuration
$testDir = "git-backup-test"
$logFile = "git-test.log"

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
    "# Test Backup Repository`n`nCreated: $(Get-Date)" | Out-File -FilePath "README.md" -Encoding UTF8

    "# System Information`n`n**Generated:** $(Get-Date)`n**Hostname:** $(hostname)`n**User:** $($env:USERNAME)" | Out-File -FilePath "SYSTEM_INFO.md" -Encoding UTF8

    "*.log`n*.tmp`n*~`n.DS_Store`nThumbs.db" | Out-File -FilePath ".gitignore" -Encoding UTF8

    # Stage and commit
    Write-Log "Creating initial commit..."
    git add .
    git commit -m "Initial commit: Test backup repository"
    
    # Create version tag
    $versionTag = "v$(Get-Date -Format 'yyyy.MM.dd-HHmmss')"
    git tag -a $versionTag -m "Test backup version $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

    Write-Log "Version tag created: $versionTag"
    
    # Show Git status
    Write-Host ""
    Write-Log "Git repository status:"
    git log --oneline --decorate --graph -n 5
    Write-Host ""
    git status
    Write-Host ""
    
    Set-Location ..
    
    Write-Log "Git operations test completed successfully!"
}

# Test file operations
function Test-FileOperations {
    Write-Log "Testing file operations..."
    
    Set-Location $testDir
    
    # Simulate file changes
    "`n## Update`nLast updated: $(Get-Date)" | Out-File -Append -FilePath "README.md" -Encoding UTF8
    
    # Check for changes
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Log "Changes detected in test repository"
        
        # Stage changes
        git add .
        
        # Create commit
        git commit -m "Test update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        
        Write-Log "Changes committed successfully!"
    } else {
        Write-Log "No changes detected"
    }
    
    Set-Location ..
}

# Main test function
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

Write-Log "Git backup system test completed successfully!"
Write-Log "Test repository created in: $testDir"
Write-Log "Test log saved in: $logFile"

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review test results in $testDir"
Write-Host "2. Check git log: cd $testDir && git log --oneline"
Write-Host "3. Configure real backup with git-backup script"