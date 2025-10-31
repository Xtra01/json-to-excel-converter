#!/bin/bash

# Quick System Check Script
# Bu script mevcut sistemin durumunu hızlıca kontrol eder

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Raspberry Pi System Health Check${NC}"
echo -e "${BLUE}====================================${NC}\n"

# System Info
echo -e "${YELLOW}📊 System Information:${NC}"
echo "Hostname: $(hostname)"
echo "User: $(whoami)"
echo "Uptime: $(uptime -p)"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
echo "Memory: $(free -h | awk 'NR==2{printf "%.1f/%.1f GB (%.2f%%)", $3/1024, $2/1024, $3*100/$2}')"
echo "Disk: $(df -h / | awk 'NR==2{printf "%s/%s (%s)", $3, $2, $5}')"
echo ""

# Network Info
echo -e "${YELLOW}🌐 Network Information:${NC}"
LOCAL_IP=$(hostname -I | awk '{print $1}')
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "Unable to fetch")
echo "Local IP: $LOCAL_IP"
echo "Public IP: $PUBLIC_IP"
echo ""

# Service Status
echo -e "${YELLOW}🔧 Service Status:${NC}"

# Cloudflared
if systemctl is-active --quiet cloudflared-tunnel 2>/dev/null; then
    echo -e "${GREEN}✓ Cloudflared Tunnel: RUNNING${NC}"
    # Get tunnel info
    if command -v cloudflared &> /dev/null; then
        TUNNEL_STATUS=$(cloudflared tunnel info 2>/dev/null | head -5 || echo "Status bilgisi alınamadı")
        echo "  Details: $TUNNEL_STATUS"
    fi
else
    echo -e "${RED}✗ Cloudflared Tunnel: NOT RUNNING${NC}"
fi

# Docker
if command -v docker &> /dev/null; then
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q json; then
        echo -e "${GREEN}✓ Docker Container: RUNNING${NC}"
        docker ps --format "  {{.Names}}: {{.Status}}" | grep json || true
    else
        echo -e "${YELLOW}! Docker: No JSON containers running${NC}"
    fi
else
    echo -e "${RED}✗ Docker: NOT INSTALLED${NC}"
fi

# Cron Jobs
if crontab -l 2>/dev/null | grep -q health-check; then
    echo -e "${GREEN}✓ Cron Jobs: CONFIGURED${NC}"
    echo "  Jobs: $(crontab -l 2>/dev/null | grep -E "(health-check|ip-monitor)" | wc -l) active"
else
    echo -e "${RED}✗ Cron Jobs: NOT CONFIGURED${NC}"
fi

echo ""

# File System Check
echo -e "${YELLOW}📁 Configuration Files:${NC}"

# Cloudflared config
if [ -f "/home/$(whoami)/.cloudflared/config.yml" ]; then
    echo -e "${GREEN}✓ Cloudflared config: FOUND${NC}"
else
    echo -e "${RED}✗ Cloudflared config: MISSING${NC}"
fi

# Scripts
SCRIPT_COUNT=$(ls /home/$(whoami)/*.sh 2>/dev/null | wc -l)
if [ $SCRIPT_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ Scripts: $SCRIPT_COUNT found${NC}"
else
    echo -e "${RED}✗ Scripts: MISSING${NC}"
fi

# Project directory
if [ -d "/home/$(whoami)/json-to-excel" ]; then
    echo -e "${GREEN}✓ Project directory: FOUND${NC}"
    PROJECT_SIZE=$(du -sh /home/$(whoami)/json-to-excel 2>/dev/null | cut -f1)
    echo "  Size: $PROJECT_SIZE"
else
    echo -e "${RED}✗ Project directory: MISSING${NC}"
fi

echo ""

# Log Files
echo -e "${YELLOW}📋 Recent Logs:${NC}"

# Health check logs
if [ -f "/home/$(whoami)/logs/health-check.log" ]; then
    LAST_HEALTH=$(tail -1 /home/$(whoami)/logs/health-check.log 2>/dev/null)
    echo "Last health check: $LAST_HEALTH"
else
    echo -e "${YELLOW}! Health check log: NOT FOUND${NC}"
fi

# IP monitor logs
if [ -f "/home/$(whoami)/logs/ip-monitor.log" ]; then
    LAST_IP=$(tail -1 /home/$(whoami)/logs/ip-monitor.log 2>/dev/null)
    echo "Last IP check: $LAST_IP"
else
    echo -e "${YELLOW}! IP monitor log: NOT FOUND${NC}"
fi

echo ""

# Connectivity Test
echo -e "${YELLOW}🌍 Connectivity Test:${NC}"

# Test local services
if curl -s -o /dev/null http://localhost:3000; then
    echo -e "${GREEN}✓ Local service (3000): RESPONDING${NC}"
else
    echo -e "${RED}✗ Local service (3000): NOT RESPONDING${NC}"
fi

# Test tunnel
if curl -s -o /dev/null -w "%{http_code}" https://devtestenv.org | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Public tunnel: ACCESSIBLE${NC}"
else
    echo -e "${RED}✗ Public tunnel: NOT ACCESSIBLE${NC}"
fi

echo ""

# Quick Actions
echo -e "${BLUE}🛠️  Quick Actions:${NC}"
echo "Restart tunnel: sudo systemctl restart cloudflared-tunnel"
echo "View tunnel logs: journalctl -u cloudflared-tunnel -f"
echo "Check Docker: docker ps"
echo "Restart Docker: docker-compose restart"
echo "View health logs: tail -f ~/logs/health-check.log"
echo "Check cron: crontab -l"

echo ""
echo -e "${GREEN}Health check completed at $(date)${NC}"