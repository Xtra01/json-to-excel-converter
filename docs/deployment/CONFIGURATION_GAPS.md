# 🎯 PROJECT4 CONFIGURATION GAPS & MANUAL SETUP GUIDE
## Complete Setup Checklist for Production Readiness

---

## 🔍 **CONFIGURATION GAPS ANALYSIS**

Based on comprehensive project analysis, here are the manual configurations needed:

---

## 🔐 **1. GITHUB AUTHENTICATION SETUP**

### **Status**: ⚠️ REQUIRES MANUAL INPUT
### **Impact**: Critical for Git backup functionality
### **Location**: Pi scripts authentication

### **Required Actions**:

#### A. Generate GitHub Personal Access Token
```bash
# 1. Go to GitHub.com → Settings → Developer settings → Personal access tokens
# 2. Generate new token (classic) with these permissions:
#    - repo (full repository access)
#    - workflow (if using GitHub Actions)
#    - admin:public_key (for SSH key management)
```

#### B. Update Pi Scripts with Token
```bash
# SSH to Pi
ssh ekrem@192.168.1.143

# Edit git-backup.sh
nano /home/ekrem/scripts/git-backup.sh

# Update this line (around line 15-20):
# Replace YOUR_GITHUB_TOKEN with actual token
GITHUB_TOKEN="YOUR_GITHUB_TOKEN"
```

#### C. Test Git Authentication
```bash
# On Pi, test the connection
cd /home/ekrem/Project4-Pi-Backup
git push origin main
```

**📝 Copy-Paste Commands**:
```bash
# Complete GitHub setup on Pi
ssh ekrem@192.168.1.143
cd /home/ekrem/scripts
cp git-backup.sh git-backup.sh.backup
nano git-backup.sh
# Manually edit the GITHUB_TOKEN line
./git-backup.sh  # Test the backup
```

---

## 📧 **2. EMAIL NOTIFICATION SYSTEM**

### **Status**: ⚠️ REQUIRES MANUAL INPUT  
### **Impact**: System alerts and monitoring notifications
### **Location**: Monitoring scripts and health checks

### **Required Actions**:

#### A. Configure SMTP Settings
```bash
# Edit health-monitor.sh on Pi
ssh ekrem@192.168.1.143
nano /home/ekrem/scripts/health-monitor.sh

# Add these lines at the top:
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
ALERT_EMAIL="admin@yourdomain.com"
```

#### B. Install Mail Utilities
```bash
# On Pi
ssh ekrem@192.168.1.143
sudo apt update
sudo apt install -y mailutils ssmtp

# Configure ssmtp
sudo nano /etc/ssmtp/ssmtp.conf
```

#### C. SSMTP Configuration Template
```ini
# /etc/ssmtp/ssmtp.conf
root=your-email@gmail.com
mailhub=smtp.gmail.com:587
AuthUser=your-email@gmail.com
AuthPass=your-app-password
UseSTARTTLS=YES
UseTLS=YES
```

**📝 Copy-Paste Commands**:
```bash
# Email setup on Pi
ssh ekrem@192.168.1.143
sudo apt install -y mailutils ssmtp
sudo nano /etc/ssmtp/ssmtp.conf
# Manually configure SMTP settings
echo "Test email" | mail -s "Pi Test" your-email@gmail.com
```

---

## 🌐 **3. CLOUDFLARE TUNNEL CONFIGURATION**

### **Status**: ⚠️ REQUIRES MANUAL INPUT
### **Impact**: External access to Pi services
### **Location**: Cloudflare dashboard and Pi tunnel setup

### **Required Actions**:

#### A. Cloudflare Account Setup
```bash
# 1. Create Cloudflare account at cloudflare.com
# 2. Add your domain to Cloudflare
# 3. Update nameservers at your domain registrar
```

#### B. Install Cloudflared on Pi
```bash
# SSH to Pi
ssh ekrem@192.168.1.143

# Download and install cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb

# Login to Cloudflare
cloudflared tunnel login
```

#### C. Create and Configure Tunnel
```bash
# Create tunnel
cloudflared tunnel create project4-tunnel

# Create config file
nano ~/.cloudflared/config.yml

# Configuration template:
tunnel: project4-tunnel
credentials-file: /home/ekrem/.cloudflared/[tunnel-id].json

ingress:
  - hostname: project4.yourdomain.com
    service: http://localhost:3000
  - hostname: monitor.yourdomain.com
    service: http://localhost:8080
  - service: http_status:404
```

#### D. DNS and Route Setup
```bash
# Set up DNS routing
cloudflared tunnel route dns project4-tunnel project4.yourdomain.com
cloudflared tunnel route dns project4-tunnel monitor.yourdomain.com

# Install as service
sudo cloudflared service install
```

**📝 Copy-Paste Commands**:
```bash
# Cloudflare tunnel setup on Pi
ssh ekrem@192.168.1.143
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb
cloudflared tunnel login
# Follow browser authentication
cloudflared tunnel create project4-tunnel
nano ~/.cloudflared/config.yml
# Manually configure domains
sudo cloudflared service install
```

---

## 🖥️ **4. MULTI-PI DEVICE CONFIGURATION**

### **Status**: ⚠️ REQUIRES MANUAL INPUT
### **Impact**: Expanding monitoring to multiple Pi devices
### **Location**: multi-pi-monitor.py configuration

### **Required Actions**:

#### A. Update Device List in Monitor
```python
# Edit multi-pi-monitor.py
# Location: e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup\multi-pi-monitor.py
# Around line 80-90, update the devices list:

devices = [
    PiDevice(
        hostname="pixtra",
        ip_address="192.168.1.143",
        description="Main Pi - Production Server",
        tunnel_url="https://project4.yourdomain.com"
    ),
    # Add more Pi devices here:
    PiDevice(
        hostname="pi-node-2",
        ip_address="192.168.1.144",  # Update with actual IP
        description="Secondary Pi - Load Balancer",
        tunnel_url="https://node2.yourdomain.com"
    ),
    PiDevice(
        hostname="pi-node-3", 
        ip_address="192.168.1.145",  # Update with actual IP
        description="Tertiary Pi - Database Server",
        tunnel_url="https://node3.yourdomain.com"
    )
]
```

#### B. SSH Key Distribution
```bash
# Copy SSH keys to new Pi devices
ssh-copy-id ekrem@192.168.1.144
ssh-copy-id ekrem@192.168.1.145

# Test connections
ssh ekrem@192.168.1.144 "uptime"
ssh ekrem@192.168.1.145 "uptime"
```

**📝 Copy-Paste Commands**:
```bash
# Edit monitoring configuration
cd "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup"
cp multi-pi-monitor.py multi-pi-monitor.py.backup
# Manually edit the devices list in multi-pi-monitor.py
python multi-pi-monitor.py  # Test with new devices
```

---

## 🔗 **5. NETWORK CONFIGURATION UPDATES**

### **Status**: ⚠️ REQUIRES MANUAL INPUT
### **Impact**: Network changes, IP address updates
### **Location**: Multiple configuration files

### **Required Actions**:

#### A. Static IP Configuration (if needed)
```bash
# On each Pi device
ssh ekrem@192.168.1.143
sudo nano /etc/dhcpcd.conf

# Add these lines for static IP:
interface eth0
static ip_address=192.168.1.143/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

#### B. Update Scripts with IP Changes
```bash
# Files to update if IP addresses change:
# 1. multi-pi-monitor.py (device list)
# 2. cluster-manager.sh (Pi IP addresses)
# 3. health-monitor.sh (remote monitoring)
# 4. Documentation files
```

**📝 Copy-Paste Commands**:
```bash
# Network configuration check
ssh ekrem@192.168.1.143
ip addr show eth0
cat /etc/dhcpcd.conf | grep static
# Update IP addresses in scripts if needed
```

---

## 📊 **6. DATABASE OPTIMIZATION**

### **Status**: ⚠️ REQUIRES MANUAL INPUT
### **Impact**: Performance and scalability
### **Location**: SQLite database in monitoring system

### **Required Actions**:

#### A. Database Location and Backup
```bash
# Current database location (in multi-pi-monitor.py):
# /tmp/pi_monitoring.db (temporary - will be lost on reboot)

# Recommended: Move to persistent location
# Update line ~75 in multi-pi-monitor.py:
# Change: self.db_path = "/tmp/pi_monitoring.db"
# To: self.db_path = "/home/ekrem/data/pi_monitoring.db"
```

#### B. Create Persistent Data Directory
```bash
# On Pi
ssh ekrem@192.168.1.143
mkdir -p /home/ekrem/data
chmod 755 /home/ekrem/data
```

#### C. Database Backup Script
```bash
# Create backup script
ssh ekrem@192.168.1.143
nano /home/ekrem/scripts/db-backup.sh

# Add to crontab for daily backups:
# 0 2 * * * /home/ekrem/scripts/db-backup.sh
```

**📝 Copy-Paste Commands**:
```bash
# Database optimization
ssh ekrem@192.168.1.143
mkdir -p /home/ekrem/data
# Edit multi-pi-monitor.py to use persistent database path
# Create database backup script
```

---

## 🔒 **7. SSL CERTIFICATE SETUP**

### **Status**: ⚠️ REQUIRES MANUAL INPUT
### **Impact**: HTTPS security for web interfaces
### **Location**: Web server configuration

### **Required Actions**:

#### A. Let's Encrypt Certificates
```bash
# Install certbot on Pi
ssh ekrem@192.168.1.143
sudo apt install -y certbot

# Generate certificates (requires domain setup)
sudo certbot certonly --standalone -d project4.devtestenv.org
```

#### B. Update Web Server Configuration
```bash
# For Next.js production deployment
# Update next.config.mjs to handle HTTPS
# Add SSL middleware for production
```

**📝 Copy-Paste Commands**:
```bash
# SSL setup on Pi
ssh ekrem@192.168.1.143
sudo apt install -y certbot
# sudo certbot certonly --standalone -d yourdomain.com
# Update web server configuration for HTTPS
```

---

## 📋 **CONFIGURATION COMPLETION CHECKLIST**

### **Priority 1 (Critical)**
- [ ] **GitHub Token**: Update git-backup.sh with personal access token
- [ ] **SSH Keys**: Verify all Pi devices have proper SSH access
- [ ] **Database Path**: Move SQLite database to persistent location
- [ ] **Network IPs**: Verify and update IP addresses in all scripts

### **Priority 2 (Important)**
- [ ] **Email Alerts**: Configure SMTP for system notifications
- [ ] **Cloudflare Tunnel**: Set up external access to services
- [ ] **Multi-Pi Setup**: Add additional Pi devices to monitoring
- [ ] **Static IPs**: Configure static IP addresses for Pi devices

### **Priority 3 (Optional)**
- [ ] **SSL Certificates**: Set up HTTPS for web interfaces
- [ ] **Custom Domain**: Configure custom domain for services
- [ ] **Database Backup**: Implement automated database backups
- [ ] **Load Balancing**: Set up Nginx for multiple Pi instances

---

## 🎯 **QUICK CONFIGURATION COMMANDS**

### **Complete Setup Script**
```bash
#!/bin/bash
# configuration-setup.sh - Run this to complete manual configurations

echo "🔧 PROJECT4 Configuration Setup"
echo "================================"

# 1. GitHub Token Setup
echo "📝 Step 1: Update GitHub Token"
echo "Edit /home/ekrem/scripts/git-backup.sh"
echo "Replace YOUR_GITHUB_TOKEN with actual token"
read -p "Press Enter when completed..."

# 2. Email Configuration
echo "📧 Step 2: Configure Email Alerts"
ssh ekrem@192.168.1.143 "sudo apt install -y mailutils ssmtp"
echo "Edit /etc/ssmtp/ssmtp.conf with SMTP settings"
read -p "Press Enter when completed..."

# 3. Database Path
echo "📊 Step 3: Update Database Path"
ssh ekrem@192.168.1.143 "mkdir -p /home/ekrem/data"
echo "Edit multi-pi-monitor.py database path to /home/ekrem/data/"
read -p "Press Enter when completed..."

# 4. Network Verification
echo "🌐 Step 4: Verify Network Configuration"
ssh ekrem@192.168.1.143 "ip addr show && ping -c 3 google.com"

echo "✅ Configuration setup completed!"
```

### **Verification Script**
```bash
#!/bin/bash
# verify-configuration.sh - Check configuration status

echo "🔍 PROJECT4 Configuration Verification"
echo "======================================="

# Check GitHub authentication
echo "📝 Checking GitHub authentication..."
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git status"

# Check email configuration
echo "📧 Checking email configuration..."
ssh ekrem@192.168.1.143 "which mail && ls -la /etc/ssmtp/"

# Check database path
echo "📊 Checking database configuration..."
ssh ekrem@192.168.1.143 "ls -la /home/ekrem/data/"

# Check network connectivity
echo "🌐 Checking network connectivity..."
ssh ekrem@192.168.1.143 "ping -c 3 192.168.1.143"

echo "✅ Verification completed!"
```

---

## 📞 **SUPPORT FOR MANUAL CONFIGURATION**

### **If You Get Stuck**
1. **Check Documentation**: Refer to specific guide in `DOCUMENTATION_HUB.md`
2. **Verify Prerequisites**: Ensure all dependencies are installed
3. **Test Connections**: Use ping and SSH to verify connectivity
4. **Check Logs**: Use `journalctl` to view system logs
5. **Restart Services**: Use `systemctl --user restart service-name`

### **Common Configuration Issues**
- **Permission Denied**: Use `sudo` for system-level configurations
- **Network Unreachable**: Verify IP addresses and network connectivity
- **Service Not Found**: Install required packages with `apt install`
- **File Not Found**: Check file paths and create directories if needed

---

*📊 Configuration Status: ⚠️ Manual Input Required*  
*🕒 Last Updated: $(Get-Date)*  
*📋 Total Manual Steps: 7 categories*  
*⚡ System Impact: Production Readiness*