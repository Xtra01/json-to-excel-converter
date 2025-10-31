#!/usr/bin/env python3

"""
Multi-Pi Management Dashboard
Centralized monitoring and management for multiple Raspberry Pi devices
"""

import json
import asyncio
import aiohttp
import paramiko
import sqlite3
import time
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional
import logging
from pathlib import Path

@dataclass
class PiDevice:
    """Raspberry Pi device information"""
    hostname: str
    ip_address: str
    ssh_user: str
    ssh_key_path: str
    description: str = ""
    status: str = "unknown"
    last_seen: Optional[datetime] = None
    uptime: str = ""
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    disk_usage: float = 0.0
    temperature: float = 0.0
    services: Dict[str, str] = None
    tunnel_url: str = ""
    
    def __post_init__(self):
        if self.services is None:
            self.services = {}

class PiMonitor:
    """Multi-Pi monitoring system"""
    
    def __init__(self, config_file: str = "pi_config.json"):
        self.config_file = config_file
        self.devices: List[PiDevice] = []
        self.db_path = "pi_monitoring.db"
        self.setup_logging()
        self.setup_database()
        self.load_config()
    
    def setup_logging(self):
        """Setup logging configuration"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('pi_monitor.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def setup_database(self):
        """Initialize SQLite database for monitoring data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pi_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hostname TEXT,
                timestamp DATETIME,
                status TEXT,
                cpu_usage REAL,
                memory_usage REAL,
                disk_usage REAL,
                temperature REAL,
                uptime TEXT,
                services TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sync_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hostname TEXT,
                timestamp DATETIME,
                sync_type TEXT,
                status TEXT,
                files_synced INTEGER,
                details TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def load_config(self):
        """Load Pi devices configuration"""
        try:
            with open(self.config_file, 'r') as f:
                config = json.load(f)
                self.devices = [PiDevice(**device) for device in config['devices']]
                self.logger.info(f"Loaded {len(self.devices)} Pi devices from config")
        except FileNotFoundError:
            self.logger.warning(f"Config file {self.config_file} not found. Creating default config.")
            self.create_default_config()
    
    def create_default_config(self):
        """Create default configuration file"""
        default_config = {
            "devices": [
                {
                    "hostname": "pi1",
                    "ip_address": "192.168.1.143",
                    "ssh_user": "ekrem",
                    "ssh_key_path": "~/.ssh/id_rsa",
                    "description": "Main JSON to Excel Pi",
                    "tunnel_url": "https://devtestenv.org"
                }
            ],
            "monitoring": {
                "check_interval": 300,
                "timeout": 30,
                "alert_thresholds": {
                    "cpu_usage": 80.0,
                    "memory_usage": 90.0,
                    "disk_usage": 85.0,
                    "temperature": 70.0
                }
            },
            "telegram": {
                "bot_token": "your_bot_token",
                "chat_id": "your_chat_id"
            }
        }
        
        with open(self.config_file, 'w') as f:
            json.dump(default_config, f, indent=2)
        
        self.logger.info(f"Created default config file: {self.config_file}")
    
    async def check_pi_status(self, device: PiDevice) -> bool:
        """Check individual Pi status via SSH"""
        try:
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Connect via SSH
            client.connect(
                device.ip_address,
                username=device.ssh_user,
                key_filename=device.ssh_key_path,
                timeout=30
            )
            
            # Get system information
            commands = {
                'uptime': 'uptime -p',
                'cpu': "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1",
                'memory': "free | grep Mem | awk '{printf \"%.1f\", $3/$2 * 100.0}'",
                'disk': "df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1",
                'temp': "vcgencmd measure_temp 2>/dev/null | cut -d'=' -f2 | cut -d\"'\" -f1 || echo '0'",
                'cloudflared': 'systemctl is-active cloudflared-tunnel',
                'docker': 'docker ps --format "{{.Names}}:{{.Status}}" 2>/dev/null || echo "none"'
            }
            
            results = {}
            for key, cmd in commands.items():
                stdin, stdout, stderr = client.exec_command(cmd)
                results[key] = stdout.read().decode().strip()
            
            # Update device status
            device.status = "online"
            device.last_seen = datetime.now()
            device.uptime = results['uptime']
            device.cpu_usage = float(results['cpu'] or 0)
            device.memory_usage = float(results['memory'] or 0)
            device.disk_usage = float(results['disk'] or 0)
            device.temperature = float(results['temp'] or 0)
            
            # Update services status
            device.services = {
                'cloudflared': results['cloudflared'],
                'docker': results['docker']
            }
            
            client.close()
            
            # Save to database
            self.save_status_to_db(device)
            
            self.logger.info(f"✓ {device.hostname} ({device.ip_address}) - Online")
            return True
            
        except Exception as e:
            device.status = "offline"
            self.logger.error(f"✗ {device.hostname} ({device.ip_address}) - {str(e)}")
            return False
    
    def save_status_to_db(self, device: PiDevice):
        """Save device status to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO pi_status (
                hostname, timestamp, status, cpu_usage, memory_usage, 
                disk_usage, temperature, uptime, services
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            device.hostname,
            datetime.now(),
            device.status,
            device.cpu_usage,
            device.memory_usage,
            device.disk_usage,
            device.temperature,
            device.uptime,
            json.dumps(device.services)
        ))
        
        conn.commit()
        conn.close()
    
    async def check_tunnel_connectivity(self, device: PiDevice) -> bool:
        """Check if Pi's tunnel is accessible"""
        if not device.tunnel_url:
            return False
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(device.tunnel_url, timeout=10) as response:
                    return response.status in [200, 301, 302]
        except:
            return False
    
    async def monitor_all_devices(self):
        """Monitor all configured Pi devices"""
        self.logger.info("Starting monitoring cycle...")
        
        tasks = []
        for device in self.devices:
            task = asyncio.create_task(self.check_pi_status(device))
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Check tunnel connectivity
        tunnel_tasks = []
        for device in self.devices:
            task = asyncio.create_task(self.check_tunnel_connectivity(device))
            tunnel_tasks.append(task)
        
        tunnel_results = await asyncio.gather(*tunnel_tasks, return_exceptions=True)
        
        # Generate summary
        online_count = sum(1 for device in self.devices if device.status == "online")
        total_count = len(self.devices)
        
        self.logger.info(f"Monitoring cycle completed: {online_count}/{total_count} devices online")
        
        return {
            'online': online_count,
            'total': total_count,
            'devices': [asdict(device) for device in self.devices]
        }
    
    def generate_html_dashboard(self) -> str:
        """Generate HTML dashboard"""
        html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Pi Management Dashboard</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
        }
        .header { 
            background: #2c3e50; 
            color: white; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
        }
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .stat-card { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
            text-align: center; 
        }
        .devices { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); 
            gap: 20px; 
        }
        .device-card { 
            background: white; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
            overflow: hidden; 
        }
        .device-header { 
            padding: 15px 20px; 
            border-bottom: 1px solid #eee; 
        }
        .device-body { 
            padding: 20px; 
        }
        .status-online { 
            color: #27ae60; 
            font-weight: bold; 
        }
        .status-offline { 
            color: #e74c3c; 
            font-weight: bold; 
        }
        .metric { 
            display: flex; 
            justify-content: space-between; 
            margin: 10px 0; 
        }
        .progress-bar { 
            width: 100%; 
            height: 8px; 
            background: #ecf0f1; 
            border-radius: 4px; 
            overflow: hidden; 
            margin: 5px 0; 
        }
        .progress-fill { 
            height: 100%; 
            transition: width 0.3s ease; 
        }
        .progress-normal { background: #27ae60; }
        .progress-warning { background: #f39c12; }
        .progress-danger { background: #e74c3c; }
        .last-updated { 
            text-align: center; 
            color: #7f8c8d; 
            margin-top: 20px; 
        }
    </style>
    <meta http-equiv="refresh" content="60">
</head>
<body>
    <div class="header">
        <h1>🍓 Multi-Pi Management Dashboard</h1>
        <p>Centralized monitoring for Raspberry Pi devices</p>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <h3>Online Devices</h3>
            <h2>{online_count}/{total_count}</h2>
        </div>
        <div class="stat-card">
            <h3>Average CPU</h3>
            <h2>{avg_cpu:.1f}%</h2>
        </div>
        <div class="stat-card">
            <h3>Average Memory</h3>
            <h2>{avg_memory:.1f}%</h2>
        </div>
        <div class="stat-card">
            <h3>System Health</h3>
            <h2>{health_status}</h2>
        </div>
    </div>
    
    <div class="devices">
        {device_cards}
    </div>
    
    <div class="last-updated">
        Last updated: {timestamp}
    </div>
</body>
</html>
        """
        
        device_card_template = """
        <div class="device-card">
            <div class="device-header">
                <h3>{hostname} <span class="status-{status_class}">{status}</span></h3>
                <p>{description}</p>
                {tunnel_link}
            </div>
            <div class="device-body">
                <div class="metric">
                    <span>IP Address:</span>
                    <span>{ip_address}</span>
                </div>
                <div class="metric">
                    <span>Uptime:</span>
                    <span>{uptime}</span>
                </div>
                <div class="metric">
                    <span>CPU Usage:</span>
                    <span>{cpu_usage:.1f}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill {cpu_class}" style="width: {cpu_usage}%"></div>
                </div>
                <div class="metric">
                    <span>Memory Usage:</span>
                    <span>{memory_usage:.1f}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill {memory_class}" style="width: {memory_usage}%"></div>
                </div>
                <div class="metric">
                    <span>Disk Usage:</span>
                    <span>{disk_usage:.1f}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill {disk_class}" style="width: {disk_usage}%"></div>
                </div>
                <div class="metric">
                    <span>Temperature:</span>
                    <span>{temperature:.1f}°C</span>
                </div>
                <div class="metric">
                    <span>Services:</span>
                    <span>{services_status}</span>
                </div>
                <div class="metric">
                    <span>Last Seen:</span>
                    <span>{last_seen}</span>
                </div>
            </div>
        </div>
        """
        
        def get_progress_class(value, warning=70, danger=85):
            if value < warning:
                return "progress-normal"
            elif value < danger:
                return "progress-warning"
            else:
                return "progress-danger"
        
        # Calculate statistics
        online_devices = [d for d in self.devices if d.status == "online"]
        online_count = len(online_devices)
        total_count = len(self.devices)
        
        avg_cpu = sum(d.cpu_usage for d in online_devices) / len(online_devices) if online_devices else 0
        avg_memory = sum(d.memory_usage for d in online_devices) / len(online_devices) if online_devices else 0
        
        # Determine health status
        if online_count == total_count:
            health_status = "🟢 Excellent"
        elif online_count > total_count * 0.7:
            health_status = "🟡 Good"
        else:
            health_status = "🔴 Poor"
        
        # Generate device cards
        device_cards = []
        for device in self.devices:
            tunnel_link = f'<a href="{device.tunnel_url}" target="_blank">🔗 Open Site</a>' if device.tunnel_url else ""
            services_status = ", ".join([f"{k}: {v}" for k, v in device.services.items()]) if device.services else "N/A"
            last_seen = device.last_seen.strftime("%H:%M:%S") if device.last_seen else "Never"
            
            card = device_card_template.format(
                hostname=device.hostname,
                status=device.status.title(),
                status_class=device.status,
                description=device.description,
                tunnel_link=tunnel_link,
                ip_address=device.ip_address,
                uptime=device.uptime or "Unknown",
                cpu_usage=device.cpu_usage,
                cpu_class=get_progress_class(device.cpu_usage),
                memory_usage=device.memory_usage,
                memory_class=get_progress_class(device.memory_usage),
                disk_usage=device.disk_usage,
                disk_class=get_progress_class(device.disk_usage),
                temperature=device.temperature,
                services_status=services_status,
                last_seen=last_seen
            )
            device_cards.append(card)
        
        return html_template.format(
            online_count=online_count,
            total_count=total_count,
            avg_cpu=avg_cpu,
            avg_memory=avg_memory,
            health_status=health_status,
            device_cards="".join(device_cards),
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
    
    async def run_monitoring_loop(self):
        """Run continuous monitoring loop"""
        while True:
            try:
                await self.monitor_all_devices()
                
                # Generate and save dashboard
                html_content = self.generate_html_dashboard()
                with open("dashboard.html", "w") as f:
                    f.write(html_content)
                
                self.logger.info("Dashboard updated")
                
                # Wait for next cycle
                await asyncio.sleep(300)  # 5 minutes
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error

async def main():
    """Main function"""
    monitor = PiMonitor()
    await monitor.run_monitoring_loop()

if __name__ == "__main__":
    asyncio.run(main())