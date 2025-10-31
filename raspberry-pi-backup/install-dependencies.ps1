# Requirements Installation Script
# Windows ortamında gerekli paketleri kur

# Python dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Green
pip install aiohttp paramiko

# Check if packages installed successfully
Write-Host "`nTesting installations..." -ForegroundColor Yellow
python -c "import aiohttp; print('✓ aiohttp: OK')"
python -c "import paramiko; print('✓ paramiko: OK')"
python -c "import sqlite3; print('✓ sqlite3: OK')"
python -c "import json; print('✓ json: OK')"
python -c "import asyncio; print('✓ asyncio: OK')"

Write-Host "`n✅ Python dependencies ready!" -ForegroundColor Green