# Scraper Log Analyzer - PowerShell Script
# Usage: .\analyze_logs.ps1 -Service backend -Download

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('backend', 'nginx', 'worker', 'beat', 'all')]
    [string]$Service = 'backend',
    
    [Parameter(Mandatory=$false)]
    [int]$Lines = 100,
    
    [Parameter(Mandatory=$false)]
    [switch]$Download,
    
    [Parameter(Mandatory=$false)]
    [switch]$Summary
)

$PI_HOST = "ekrem@192.168.1.143"
$LOG_DIR = "E:\Programming\Jukka\Geliştir\Project4\logs"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

# Create log directory
if (-not (Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
}

function Get-LogSize {
    param([string]$Container)
    
    $size = ssh $PI_HOST "docker logs $Container 2>&1 | wc -c"
    $sizeMB = [math]::Round($size / 1MB, 2)
    return $sizeMB
}

function Download-ContainerLog {
    param([string]$Container, [string]$OutputFile)
    
    Write-Host "[INFO] Downloading logs from $Container..." -ForegroundColor Cyan
    $logSize = Get-LogSize -Container $Container
    
    if ($logSize -gt 10) {
        Write-Host "[WARN] Large log file: ${logSize}MB" -ForegroundColor Yellow
    }
    
    ssh $PI_HOST "docker logs $Container 2>&1" | Out-File -FilePath $OutputFile -Encoding utf8
    
    $localSize = [math]::Round((Get-Item $OutputFile).Length / 1MB, 2)
    Write-Host "[OK] Downloaded: ${localSize}MB -> $OutputFile" -ForegroundColor Green
    
    return $OutputFile
}

function Analyze-Log {
    param([string]$LogFile)
    
    Write-Host "`n[ANALYSIS] $LogFile" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor DarkGray
    
    $content = Get-Content $LogFile
    $totalLines = $content.Count
    
    $errors = ($content | Select-String -Pattern "ERROR|error|Error" -AllMatches).Count
    $warnings = ($content | Select-String -Pattern "WARNING|WARN|warning" -AllMatches).Count
    $info = ($content | Select-String -Pattern "INFO|info" -AllMatches).Count
    
    $status200 = ($content | Select-String -Pattern ' 200 ' -AllMatches).Count
    $status400 = ($content | Select-String -Pattern ' 4[0-9]{2} ' -AllMatches).Count
    $status500 = ($content | Select-String -Pattern ' 5[0-9]{2} ' -AllMatches).Count
    
    Write-Host "Total Lines: $totalLines" -ForegroundColor White
    Write-Host "Errors: $errors" -ForegroundColor Red
    Write-Host "Warnings: $warnings" -ForegroundColor Yellow
    Write-Host "Info: $info" -ForegroundColor Blue
    
    if ($status200 -gt 0 -or $status400 -gt 0 -or $status500 -gt 0) {
        Write-Host "`nHTTP Status:" -ForegroundColor Cyan
        Write-Host "  2xx Success: $status200" -ForegroundColor Green
        Write-Host "  4xx Client: $status400" -ForegroundColor Yellow
        Write-Host "  5xx Server: $status500" -ForegroundColor Red
    }
    
    if ($errors -gt 0) {
        Write-Host "`nLast 5 Errors:" -ForegroundColor Red
        $content | Select-String -Pattern "ERROR|error" | Select-Object -Last 5 | ForEach-Object {
            Write-Host "  $_" -ForegroundColor DarkRed
        }
    }
    
    Write-Host "========================================`n" -ForegroundColor DarkGray
}

# Main
Write-Host @"
==========================================
  Scraper Log Analyzer v1.0
  Service: $Service | Lines: $Lines
==========================================
"@ -ForegroundColor Cyan

$containers = @()

switch ($Service) {
    'backend' { $containers += 'scraper_prod_backend' }
    'nginx' { $containers += 'scraper_prod_nginx' }
    'worker' { $containers += 'scraper_prod_worker' }
    'beat' { $containers += 'scraper_prod_beat' }
    'all' { $containers = @('scraper_prod_backend', 'scraper_prod_nginx', 'scraper_prod_worker') }
}

foreach ($container in $containers) {
    $serviceName = $container -replace 'scraper_prod_', ''
    Write-Host "`n[SERVICE] $serviceName" -ForegroundColor Magenta
    
    $logSize = Get-LogSize -Container $container
    Write-Host "Log Size: ${logSize}MB" -ForegroundColor Gray
    
    if ($Download -or $logSize -gt 5) {
        $outputFile = Join-Path $LOG_DIR "${serviceName}_${TIMESTAMP}.log"
        $downloadedFile = Download-ContainerLog -Container $container -OutputFile $outputFile
        
        if ($Summary) {
            Analyze-Log -LogFile $downloadedFile
        }
    } else {
        Write-Host "Last $Lines lines:" -ForegroundColor Yellow
        ssh $PI_HOST "docker logs $container --tail $Lines 2>&1" | Select-Object -Last 20
    }
}

Write-Host "`n[COMPLETE] Analysis finished!" -ForegroundColor Green
Write-Host "[INFO] Logs saved to: $LOG_DIR`n" -ForegroundColor Cyan
