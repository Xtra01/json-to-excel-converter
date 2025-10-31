# 🎯 PROJECT4 MULTI-PI MONITORING SYSTEM GUIDE
## Real-time Dashboard Explanation & Setup

---

## 🔍 **WHAT IS THE MULTI-PI MONITORING SYSTEM?**

The Multi-Pi Monitoring System is a **537-line Python application** that provides:
- **Real-time monitoring** of multiple Raspberry Pi devices
- **Web-based dashboard** with professional UI
- **SQLite database** for historical data storage
- **SSH-based connections** for secure device management
- **Automated health checks** and status reporting

### **Current Status**: ✅ **FULLY IMPLEMENTED AND READY**

---

## 🏗️ **SYSTEM ARCHITECTURE**

```
MULTI-PI MONITORING DASHBOARD
├── Python Web Server (aiohttp)
│   ├── Real-time metrics collection
│   ├── Professional web interface
│   └── REST API endpoints
├── SSH Management Layer
│   ├── Paramiko for secure connections
│   ├── Passwordless authentication
│   └── Command execution
├── SQLite Database
│   ├── Device information storage
│   ├── Historical metrics
│   └── Status tracking
└── Device Management
    ├── PiDevice dataclass
    ├── Health monitoring
    └── Service status tracking
```

---

## 📊 **DASHBOARD FEATURES**

### **Real-time Metrics**
- 🖥️ **CPU Usage**: Live percentage with color-coded progress bars
- 💾 **Memory Usage**: RAM utilization monitoring
- 💿 **Disk Usage**: Storage space tracking
- 🌡️ **Temperature**: Hardware temperature monitoring
- ⏱️ **Uptime**: System uptime tracking
- 🔗 **Network Status**: IP addresses and connectivity

### **Service Monitoring**
- ✅ **Service Status**: systemd service health
- 🔄 **Auto-sync Status**: Git backup system status
- 📊 **Health Scores**: Overall system health ratings
- 📈 **Performance Trends**: Historical data visualization

### **Professional Web Interface**
- 📱 **Responsive Design**: Works on desktop and mobile
- 🎨 **Color-coded Status**: Green/Yellow/Red status indicators
- 📊 **Progress Bars**: Visual metrics representation
- 🔗 **Quick Links**: Direct access to Pi services

---

## 🚀 **HOW TO USE THE MONITORING SYSTEM**

### **🔥 Quick Start (Copy-Paste)**
```bash
# 1. Navigate to monitoring directory
cd "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup"

# 2. Start the monitoring dashboard
python multi-pi-monitor.py

# 3. Open web browser
# Go to: http://localhost:8080
```

### **🔧 Advanced Start with Configuration**
```bash
# 1. Create configuration file (optional)
cd "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup"

# 2. Copy default config template
cp pi_config.json.example pi_config.json

# 3. Edit configuration
notepad pi_config.json

# 4. Start with custom config
python multi-pi-monitor.py --config pi_config.json
```

---

## ⚙️ **CONFIGURATION SETUP**

### **🔧 Device Configuration (Lines 80-95 in multi-pi-monitor.py)**

**Current Default Configuration**:
```python
# Default device list (edit at line ~80-95)
devices = [
    PiDevice(
        hostname="pixtra",
        ip_address="192.168.1.143",
        ssh_user="ekrem",
        ssh_key_path="/home/ekrem/.ssh/id_rsa",
        description="Main Pi - Production Server",
        tunnel_url="https://project4.yourdomain.com"
    )
]
```

### **🔥 Adding More Pi Devices (Copy-Paste Setup)**
```python
# Edit multi-pi-monitor.py around line 80-95
# Replace the devices list with this expanded version:

devices = [
    PiDevice(
        hostname="pixtra",
        ip_address="192.168.1.143",
        ssh_user="ekrem",
        ssh_key_path="/home/ekrem/.ssh/id_rsa",
        description="Main Pi - Production Server",
        tunnel_url="https://project4.yourdomain.com"
    ),
    PiDevice(
        hostname="pi-node-2",
        ip_address="192.168.1.144",  # Update with actual IP
        ssh_user="ekrem",
        ssh_key_path="/home/ekrem/.ssh/id_rsa",
        description="Secondary Pi - Load Balancer",
        tunnel_url="https://node2.yourdomain.com"
    ),
    PiDevice(
        hostname="pi-node-3", 
        ip_address="192.168.1.145",  # Update with actual IP
        ssh_user="ekrem",
        ssh_key_path="/home/ekrem/.ssh/id_rsa",
        description="Tertiary Pi - Database Server",
        tunnel_url="https://node3.yourdomain.com"
    )
]
```

### **🔑 SSH Setup for Multiple Devices**
```bash
# Copy SSH keys to all Pi devices
ssh-copy-id ekrem@192.168.1.143  # Already done
ssh-copy-id ekrem@192.168.1.144  # New device
ssh-copy-id ekrem@192.168.1.145  # New device

# Test connections
ssh ekrem@192.168.1.144 "echo 'Connection test successful'"
ssh ekrem@192.168.1.145 "echo 'Connection test successful'"
```

---

## 📊 **DATABASE MANAGEMENT**

### **SQLite Database Details**
```python
# Database location (line ~45 in multi-pi-monitor.py)
self.db_path = "pi_monitoring.db"  # Current: temporary location

# Recommended: Change to persistent location
self.db_path = "/home/ekrem/data/pi_monitoring.db"
```

### **🗄️ Database Operations (Copy-Paste)**
```bash
# Create persistent data directory on Pi
ssh ekrem@192.168.1.143 "mkdir -p /home/ekrem/data"

# Check database file
cd "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup"
ls -la *.db

# View database content (if sqlite3 installed)
sqlite3 pi_monitoring.db ".tables"
sqlite3 pi_monitoring.db "SELECT * FROM devices;"

# Backup database
cp pi_monitoring.db pi_monitoring_backup_$(date +%Y%m%d).db
```

---

## 🌐 **WEB INTERFACE DETAILS**

### **Dashboard Components**
```python
# Web server configuration (lines 480-537)
class WebInterface:
    - Port: 8080 (default)
    - Interface: localhost (127.0.0.1)
    - Protocol: HTTP (HTTPS available with configuration)
    - Routes: /, /api/devices, /api/metrics
```

### **🎨 Dashboard Features**
- **📊 Device Cards**: Individual Pi status cards
- **🟢 Status Indicators**: Green (online), Yellow (warning), Red (offline)
- **📈 Progress Bars**: CPU, Memory, Disk usage visualization
- **🔗 Quick Actions**: Direct links to Pi services
- **📱 Responsive Design**: Mobile-friendly interface

### **🔥 Access the Dashboard (Copy-Paste)**
```bash
# Method 1: Direct access
python "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup\multi-pi-monitor.py"
# Then open: http://localhost:8080

# Method 2: Background running
cd "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup"
python multi-pi-monitor.py &
# Access: http://localhost:8080

# Method 3: With specific port
python multi-pi-monitor.py --port 9090
# Access: http://localhost:9090
```

---

## 🔍 **MONITORING CAPABILITIES**

### **System Metrics Collection**
```python
# Metrics collected (implementation lines 150-250):
def collect_device_metrics(self, device: PiDevice):
    """
    Collects comprehensive system metrics:
    - CPU usage percentage
    - Memory usage (RAM)
    - Disk usage (storage)
    - System temperature
    - Network connectivity
    - Service status
    - System uptime
    """
```

### **🔥 Manual Metrics Check (Copy-Paste)**
```bash
# Check metrics on specific Pi
ssh ekrem@192.168.1.143 "echo 'CPU:' && top -bn1 | grep 'Cpu(s)' && echo 'Memory:' && free -h && echo 'Disk:' && df -h / && echo 'Temp:' && vcgencmd measure_temp"

# Comprehensive health check
ssh ekrem@192.168.1.143 "cd /home/ekrem/scripts && ./health-monitor.sh"
```

### **Service Status Monitoring**
```python
# Services monitored (lines 200-230):
monitored_services = [
    "auto-sync",           # Git backup service
    "ssh",                 # SSH daemon
    "systemd-timesyncd",   # Time synchronization
    "cron",                # Cron scheduler
    # Add more services as needed
]
```

---

## 🚀 **ADVANCED FEATURES**

### **🔄 Automated Monitoring Cycle**
```python
# Monitoring cycle (lines 300-350)
async def monitoring_loop(self):
    """
    Continuous monitoring with:
    - 30-second update intervals
    - Automatic reconnection on failures
    - Database persistence
    - Error handling and recovery
    """
```

### **📊 Historical Data Storage**
```python
# Database schema (lines 70-120)
CREATE TABLE devices (
    id INTEGER PRIMARY KEY,
    hostname TEXT,
    ip_address TEXT,
    status TEXT,
    last_seen TIMESTAMP,
    cpu_usage REAL,
    memory_usage REAL,
    disk_usage REAL,
    temperature REAL
);
```

### **🔗 API Endpoints**
```python
# REST API routes (lines 450-480)
GET /                    # Dashboard web interface
GET /api/devices         # JSON device list
GET /api/metrics/{id}    # Device-specific metrics
POST /api/refresh        # Force metrics refresh
```

---

## 🔧 **CUSTOMIZATION OPTIONS**

### **🎨 UI Customization (Lines 350-450)**
```python
# Customize dashboard appearance
def generate_dashboard_html(self):
    # Color scheme customization
    colors = {
        'primary': '#2563eb',      # Blue
        'success': '#10b981',      # Green
        'warning': '#f59e0b',      # Yellow
        'danger': '#ef4444',       # Red
        'background': '#f8fafc'    # Light gray
    }
```

### **🔥 Custom Color Scheme (Copy-Paste)**
```css
/* Add to dashboard CSS (around line 380) */
:root {
    --color-primary: #6366f1;     /* Indigo */
    --color-success: #059669;     /* Emerald */
    --color-warning: #d97706;     /* Amber */
    --color-danger: #dc2626;      /* Red */
    --color-background: #f1f5f9;  /* Slate */
}
```

### **⚙️ Configuration Options**
```python
# Monitoring intervals (line ~50)
MONITORING_INTERVAL = 30        # seconds
DATABASE_CLEANUP_DAYS = 30      # days
CONNECTION_TIMEOUT = 10         # seconds
RETRY_ATTEMPTS = 3              # connection retries
```

---

## 🛠️ **TROUBLESHOOTING**

### **🔍 Common Issues & Solutions**

#### **📡 Connection Issues**
```bash
# Test SSH connectivity
ssh -v ekrem@192.168.1.143

# Check SSH keys
ssh-add -l

# Verify Pi is reachable
ping 192.168.1.143
```

#### **🐍 Python Issues**
```bash
# Check Python dependencies
pip3 show aiohttp paramiko

# Install missing dependencies
pip3 install aiohttp paramiko

# Check Python version
python3 --version  # Should be 3.7+
```

#### **🗄️ Database Issues**
```bash
# Check database permissions
ls -la pi_monitoring.db

# Reset database (if corrupted)
rm pi_monitoring.db
python multi-pi-monitor.py  # Will recreate
```

### **🔥 Debug Mode (Copy-Paste)**
```python
# Enable debug logging (add at line ~40)
logging.basicConfig(level=logging.DEBUG)

# Verbose connection testing
python -c "
import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.143', username='ekrem', key_filename='/path/to/key')
print('Connection successful')
"
```

---

## 📈 **PERFORMANCE OPTIMIZATION**

### **⚡ Performance Tips**
```python
# Optimize monitoring intervals (line ~50)
MONITORING_INTERVAL = 60        # Increase for better performance
MAX_CONCURRENT_CONNECTIONS = 5  # Limit concurrent SSH connections
CACHE_DURATION = 300           # Cache metrics for 5 minutes
```

### **🔥 Performance Monitoring (Copy-Paste)**
```bash
# Monitor dashboard performance
cd "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup"
python -m cProfile multi-pi-monitor.py

# Check memory usage
python -c "
import psutil
import time
while True:
    print(f'Memory: {psutil.virtual_memory().percent}%')
    time.sleep(5)
"
```

---

## 📊 **USAGE SCENARIOS**

### **🏢 Production Environment**
```bash
# Run as background service
cd "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup"
nohup python multi-pi-monitor.py > monitor.log 2>&1 &

# Check if running
ps aux | grep multi-pi-monitor

# View logs
tail -f monitor.log
```

### **🔧 Development Mode**
```bash
# Run with debug output
cd "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup"
python multi-pi-monitor.py --debug

# Live reload for development
python multi-pi-monitor.py --reload
```

### **📊 Monitoring Integration**
```bash
# Export metrics to file
curl http://localhost:8080/api/devices > metrics.json

# Integration with other tools
curl http://localhost:8080/api/devices | jq '.[] | select(.status=="online")'
```

---

## 🎯 **REAL-WORLD BENEFITS**

### **✅ What This System Provides**
- **🔍 Centralized Monitoring**: One dashboard for all Pi devices
- **⚡ Real-time Alerts**: Immediate notification of issues
- **📊 Historical Data**: Track performance trends over time
- **🔒 Secure Access**: SSH-based encrypted connections
- **📱 Mobile Ready**: Access from any device with web browser
- **🔧 Easy Maintenance**: Simple Python-based architecture

### **💼 Professional Use Cases**
- **🏠 Home Lab Management**: Monitor multiple Pi projects
- **🏢 Small Business**: IT infrastructure oversight
- **🎓 Educational**: Learning system administration
- **🔬 IoT Projects**: Device fleet management
- **☁️ Edge Computing**: Distributed system monitoring

---

## 🔗 **FILE LOCATIONS & KEY PATHS**

### **📁 Main Files**
```
PROJECT4 MONITORING SYSTEM
├── e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup\
│   ├── multi-pi-monitor.py          # Main monitoring application (537 lines)
│   ├── pi_config.json              # Configuration file (create if needed)
│   ├── pi_monitoring.db            # SQLite database (auto-created)
│   └── requirements.txt            # Python dependencies
├── SSH Keys:
│   ├── ~/.ssh/id_rsa               # Private SSH key
│   └── ~/.ssh/id_rsa.pub           # Public SSH key
└── Pi Scripts:
    └── /home/ekrem/scripts/        # Health monitoring scripts on Pi
```

### **🔥 Quick File Access (Copy-Paste)**
```bash
# Open main monitoring file
code "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup\multi-pi-monitor.py"

# View configuration
cat "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup\pi_config.json"

# Check database
ls -la "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup\*.db"

# Edit monitoring settings
nano "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup\multi-pi-monitor.py"
```

---

*📊 Multi-Pi Monitor Status: ✅ Production Ready*  
*🕒 Last Updated: $(Get-Date)*  
*📂 File Size: 537 lines of Python code*  
*⚡ Monitoring Status: ACTIVE*  
*🔗 Web Interface: http://localhost:8080*