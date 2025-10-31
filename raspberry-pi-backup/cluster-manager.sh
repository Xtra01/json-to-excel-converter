#!/bin/bash

# Multi-Pi Cluster Management Script
# Bu script tüm Pi cluster'ını yönetir ve koordine eder

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/pi_config.json"
LOG_FILE="$SCRIPT_DIR/logs/cluster-management.log"
DASHBOARD_PORT=8080

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
    echo "[WARNING] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    echo "[ERROR] $1" >> "$LOG_FILE"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    local deps=("python3" "pip3" "ssh" "rsync" "git")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing dependencies: ${missing_deps[*]}"
        echo "Please install missing dependencies:"
        echo "sudo apt update && sudo apt install -y ${missing_deps[*]}"
        exit 1
    fi
    
    # Check Python packages
    python3 -c "import aiohttp, paramiko" 2>/dev/null || {
        log "Installing Python dependencies..."
        pip3 install aiohttp paramiko sqlite3
    }
    
    log "All dependencies satisfied"
}

# Setup SSH keys for all Pi devices
setup_ssh_keys() {
    log "Setting up SSH keys for Pi cluster..."
    
    # Generate SSH key if it doesn't exist
    if [ ! -f ~/.ssh/id_rsa ]; then
        log "Generating SSH key..."
        ssh-keygen -t rsa -b 4096 -C "pi-cluster-management" -f ~/.ssh/id_rsa -N ""
    fi
    
    # Read Pi IPs from config
    local pi_ips=($(python3 -c "
import json
with open('$CONFIG_FILE') as f:
    config = json.load(f)
    for device in config['devices']:
        print(device['ip_address'])
"))
    
    log "Found ${#pi_ips[@]} Pi devices in config"
    
    # Copy SSH key to each Pi
    for ip in "${pi_ips[@]}"; do
        log "Setting up SSH key for $ip..."
        
        # Test if already setup
        if ssh -o ConnectTimeout=5 -o BatchMode=yes "ekrem@$ip" "echo 'SSH key already setup'" 2>/dev/null; then
            log "✓ SSH key already setup for $ip"
        else
            log "Setting up SSH key for $ip (you may need to enter password)"
            ssh-copy-id "ekrem@$ip" || warn "Failed to setup SSH key for $ip"
        fi
    done
}

# Deploy monitoring scripts to all Pi devices
deploy_scripts_to_cluster() {
    log "Deploying monitoring scripts to cluster..."
    
    local scripts=("auto-sync.sh" "git-backup.sh" "health-check.sh" "ip-monitor.sh" "telegram-notify.sh")
    local pi_ips=($(python3 -c "
import json
with open('$CONFIG_FILE') as f:
    config = json.load(f)
    for device in config['devices']:
        print(device['ip_address'])
"))
    
    for ip in "${pi_ips[@]}"; do
        log "Deploying scripts to $ip..."
        
        # Test connection
        if ! ssh -o ConnectTimeout=5 "ekrem@$ip" "echo 'Connection test'" >/dev/null 2>&1; then
            warn "Cannot connect to $ip, skipping..."
            continue
        fi
        
        # Create directories
        ssh "ekrem@$ip" "mkdir -p ~/scripts ~/logs" || warn "Failed to create directories on $ip"
        
        # Copy scripts
        for script in "${scripts[@]}"; do
            if [ -f "$SCRIPT_DIR/home/ekrem/$script" ]; then
                scp "$SCRIPT_DIR/home/ekrem/$script" "ekrem@$ip:~/scripts/" || warn "Failed to copy $script to $ip"
                ssh "ekrem@$ip" "chmod +x ~/scripts/$script" || warn "Failed to set permissions for $script on $ip"
                log "✓ Deployed $script to $ip"
            fi
        done
        
        # Setup cron jobs
        ssh "ekrem@$ip" '
            # Remove existing cron jobs
            crontab -l 2>/dev/null | grep -v "~/scripts/" | crontab - 2>/dev/null || true
            
            # Add new cron jobs
            (crontab -l 2>/dev/null; echo "*/5 * * * * ~/scripts/health-check.sh >/dev/null 2>&1") | crontab -
            (crontab -l 2>/dev/null; echo "*/5 * * * * ~/scripts/ip-monitor.sh >/dev/null 2>&1") | crontab -
            (crontab -l 2>/dev/null; echo "0 */4 * * * ~/scripts/auto-sync.sh >/dev/null 2>&1") | crontab -
            (crontab -l 2>/dev/null; echo "0 2 * * * ~/scripts/git-backup.sh >/dev/null 2>&1") | crontab -
        ' || warn "Failed to setup cron jobs on $ip"
        
        log "✓ Deployed and configured monitoring for $ip"
    done
    
    log "Cluster deployment completed"
}

# Start monitoring dashboard
start_dashboard() {
    log "Starting Multi-Pi monitoring dashboard..."
    
    # Kill existing dashboard process
    pkill -f "multi-pi-monitor.py" 2>/dev/null || true
    
    # Start dashboard in background
    cd "$SCRIPT_DIR"
    nohup python3 multi-pi-monitor.py > dashboard.log 2>&1 &
    local dashboard_pid=$!
    
    # Wait a moment and check if it started
    sleep 3
    if kill -0 $dashboard_pid 2>/dev/null; then
        log "✓ Dashboard started successfully (PID: $dashboard_pid)"
        log "Dashboard available at: http://localhost:$DASHBOARD_PORT"
        log "Dashboard logs: $SCRIPT_DIR/dashboard.log"
        
        # Save PID for later management
        echo $dashboard_pid > "$SCRIPT_DIR/dashboard.pid"
    else
        error "Failed to start dashboard"
        cat dashboard.log
        exit 1
    fi
}

# Stop monitoring dashboard
stop_dashboard() {
    log "Stopping monitoring dashboard..."
    
    if [ -f "$SCRIPT_DIR/dashboard.pid" ]; then
        local pid=$(cat "$SCRIPT_DIR/dashboard.pid")
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            log "✓ Dashboard stopped (PID: $pid)"
        else
            warn "Dashboard process not running"
        fi
        rm -f "$SCRIPT_DIR/dashboard.pid"
    else
        pkill -f "multi-pi-monitor.py" 2>/dev/null || warn "No dashboard process found"
    fi
}

# Execute command on all Pi devices
execute_on_cluster() {
    local command="$1"
    log "Executing command on cluster: $command"
    
    local pi_ips=($(python3 -c "
import json
with open('$CONFIG_FILE') as f:
    config = json.load(f)
    for device in config['devices']:
        print(device['ip_address'])
"))
    
    for ip in "${pi_ips[@]}"; do
        log "Executing on $ip..."
        
        if ssh -o ConnectTimeout=5 "ekrem@$ip" "$command" 2>/dev/null; then
            log "✓ Command completed on $ip"
        else
            warn "Command failed on $ip"
        fi
    done
}

# Cluster health check
cluster_health_check() {
    log "Performing cluster health check..."
    
    python3 -c "
import asyncio
import sys
sys.path.append('$SCRIPT_DIR')

async def health_check():
    from multi-pi-monitor import PiMonitor
    monitor = PiMonitor('$CONFIG_FILE')
    result = await monitor.monitor_all_devices()
    
    print(f'Cluster Status: {result[\"online\"]}/{result[\"total\"]} devices online')
    
    for device_data in result['devices']:
        status = '✓' if device_data['status'] == 'online' else '✗'
        print(f'{status} {device_data[\"hostname\"]} ({device_data[\"ip_address\"]}) - {device_data[\"status\"]}')

asyncio.run(health_check())
"
}

# Sync all Pi devices
sync_cluster() {
    log "Triggering sync on all Pi devices..."
    execute_on_cluster "~/scripts/auto-sync.sh"
}

# Backup all Pi devices
backup_cluster() {
    log "Triggering backup on all Pi devices..."
    execute_on_cluster "~/scripts/git-backup.sh"
}

# Update all Pi devices
update_cluster() {
    log "Updating all Pi devices..."
    execute_on_cluster "sudo apt update && sudo apt upgrade -y"
}

# Restart services on all Pi devices
restart_services() {
    log "Restarting services on all Pi devices..."
    execute_on_cluster "sudo systemctl restart cloudflared-tunnel; docker-compose restart"
}

# Show cluster status
show_status() {
    echo -e "${BLUE}Multi-Pi Cluster Management${NC}"
    echo "=================================="
    
    # Dashboard status
    if [ -f "$SCRIPT_DIR/dashboard.pid" ] && kill -0 $(cat "$SCRIPT_DIR/dashboard.pid") 2>/dev/null; then
        echo -e "Dashboard: ${GREEN}Running${NC} (PID: $(cat "$SCRIPT_DIR/dashboard.pid"))"
        echo "URL: http://localhost:$DASHBOARD_PORT"
    else
        echo -e "Dashboard: ${RED}Stopped${NC}"
    fi
    
    echo ""
    cluster_health_check
}

# Show help
show_help() {
    echo "Multi-Pi Cluster Management Tool"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup              - Initial cluster setup (dependencies, SSH keys)"
    echo "  deploy             - Deploy monitoring scripts to all Pi devices"
    echo "  start-dashboard    - Start monitoring dashboard"
    echo "  stop-dashboard     - Stop monitoring dashboard"
    echo "  restart-dashboard  - Restart monitoring dashboard"
    echo "  status             - Show cluster status"
    echo "  health             - Perform health check"
    echo "  sync               - Trigger sync on all devices"
    echo "  backup             - Trigger backup on all devices"
    echo "  update             - Update all Pi devices"
    echo "  restart            - Restart services on all devices"
    echo "  exec 'command'     - Execute command on all devices"
    echo "  help               - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 setup                    # Initial cluster setup"
    echo "  $0 start-dashboard          # Start monitoring"
    echo "  $0 exec 'docker ps'         # Check Docker containers"
    echo "  $0 exec 'df -h'             # Check disk usage"
}

# Main script logic
case "${1:-}" in
    "setup")
        check_dependencies
        setup_ssh_keys
        log "Cluster setup completed"
        ;;
    "deploy")
        deploy_scripts_to_cluster
        ;;
    "start-dashboard")
        start_dashboard
        ;;
    "stop-dashboard")
        stop_dashboard
        ;;
    "restart-dashboard")
        stop_dashboard
        sleep 2
        start_dashboard
        ;;
    "status")
        show_status
        ;;
    "health")
        cluster_health_check
        ;;
    "sync")
        sync_cluster
        ;;
    "backup")
        backup_cluster
        ;;
    "update")
        update_cluster
        ;;
    "restart")
        restart_services
        ;;
    "exec")
        if [ -z "$2" ]; then
            error "Please provide a command to execute"
            exit 1
        fi
        execute_on_cluster "$2"
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo "Unknown command: ${1:-}"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac