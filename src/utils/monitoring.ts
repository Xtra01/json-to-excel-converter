// Persistent Debug System - UI donsa bile çalışır
interface LogEntry {
  timestamp: string;
  elapsed: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  memory: string;
  id: string;
}

export class PersistentDebugLogger {
  private logKey = 'json-excel-debug-logs';
  private maxLogs = 200; // Maximum logs to keep
  private startTime = Date.now();

  // Write to localStorage immediately, never loses data
  log(message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info') {
    const timestamp = new Date().toISOString();
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const memoryInfo = this.getMemoryInfo();
    
    const logEntry: LogEntry = {
      timestamp,
      elapsed: `${elapsed}s`,
      level,
      message,
      memory: memoryInfo,
      id: Math.random().toString(36).substr(2, 9)
    };

    try {
      const existingLogs = this.getLogs();
      const newLogs = [...existingLogs, logEntry].slice(-this.maxLogs);
      localStorage.setItem(this.logKey, JSON.stringify(newLogs));
      
      // Also log to console for immediate visibility
      console.log(`[${elapsed}s] ${message} | Memory: ${memoryInfo}`);
    } catch (error) {
      console.error('Failed to save debug log:', error);
    }
  }

  getLogs(): LogEntry[] {
    try {
      const logs = localStorage.getItem(this.logKey);
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  clearLogs() {
    localStorage.removeItem(this.logKey);
    this.startTime = Date.now();
  }

  exportLogs() {
    const logs = this.getLogs();
    const logText = logs.map((log: LogEntry) => 
      `[${log.timestamp}] (${log.elapsed}) [${log.level.toUpperCase()}] ${log.message} | Memory: ${log.memory}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private getMemoryInfo(): string {
    try {
      if ((performance as any).memory) {
        const mem = (performance as any).memory;
        const used = Math.round(mem.usedJSHeapSize / 1024 / 1024);
        const total = Math.round(mem.totalJSHeapSize / 1024 / 1024);
        return `${used}MB/${total}MB`;
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  }
}

// Performance Monitor - Real-time system tracking
export class PerformanceMonitor {
  private isMonitoring = false;
  private intervalId: NodeJS.Timeout | null = null;
  private logger: PersistentDebugLogger;
  private callbacks: ((data: PerformanceData) => void)[] = [];

  constructor(logger: PersistentDebugLogger) {
    this.logger = logger;
  }

  start(onUpdate?: (data: PerformanceData) => void) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    if (onUpdate) this.callbacks.push(onUpdate);
    
    this.logger.log('Performance monitoring started', 'info');
    
    this.intervalId = setInterval(() => {
      const data = this.collectPerformanceData();
      this.checkPerformanceIssues(data);
      this.callbacks.forEach(callback => callback(data));
    }, 2000); // Update every 2 seconds
  }

  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.logger.log('Performance monitoring stopped', 'info');
  }

  private collectPerformanceData(): PerformanceData {
    const memory = (performance as any).memory;
    const now = performance.now();
    const connection = (navigator as any).connection;
    
    // Check for performance issues
    let hasPerformanceIssues = false;
    if (memory) {
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      hasPerformanceIssues = usagePercent > 80; // Memory usage over 80%
    }
    
    return {
      timestamp: Date.now(),
      memory: memory ? {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      } : null,
      timing: {
        navigationStart: performance.timeOrigin,
        now: now
      },
      connection: connection ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink
      } : null,
      isOnline: navigator.onLine,
      hasPerformanceIssues: hasPerformanceIssues
    };
  }

  private checkPerformanceIssues(data: PerformanceData) {
    if (data.memory) {
      const usagePercent = (data.memory.used / data.memory.limit) * 100;
      
      if (usagePercent > 80) {
        this.logger.log(`HIGH MEMORY USAGE: ${usagePercent.toFixed(1)}%`, 'warn');
      }
      
      if (data.memory.used > data.memory.total * 0.9) {
        this.logger.log('MEMORY LEAK DETECTED: Used memory near total allocated', 'error');
      }
    }
  }
}

export interface PerformanceData {
  timestamp: number;
  memory: {
    used: number;
    total: number;
    limit: number;
  } | null;
  timing: {
    navigationStart: number;
    now: number;
  };
  connection: {
    effectiveType: string;
    downlink: number;
  } | null;
  isOnline: boolean;
  hasPerformanceIssues: boolean;
}

// Emergency Recovery System
export class EmergencyRecovery {
  private logger: PersistentDebugLogger;
  private isActive = false;
  private recoveryCallbacks: (() => void)[] = [];

  constructor(logger: PersistentDebugLogger) {
    this.logger = logger;
    this.setupEmergencyListeners();
  }

  private setupEmergencyListeners() {
    // Listen for unresponsive main thread
    let lastHeartbeat = Date.now();
    const heartbeatInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastHeartbeat > 10000) { // 10 seconds without heartbeat
        this.triggerEmergencyRecovery('Main thread unresponsive');
      }
      lastHeartbeat = now;
    }, 1000);

    // Listen for errors
    window.addEventListener('error', (event) => {
      this.logger.log(`CRITICAL ERROR: ${event.error?.message || event.message}`, 'error');
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logger.log(`UNHANDLED REJECTION: ${event.reason}`, 'error');
    });

    // Keyboard shortcut for emergency recovery (Ctrl+Shift+R)
    window.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        this.triggerEmergencyRecovery('Manual emergency recovery triggered');
      }
    });
  }

  addRecoveryCallback(callback: () => void) {
    this.recoveryCallbacks.push(callback);
  }

  private triggerEmergencyRecovery(reason: string) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.logger.log(`EMERGENCY RECOVERY TRIGGERED: ${reason}`, 'error');
    
    try {
      // Force garbage collection
      if ((window as any).gc) {
        (window as any).gc();
      }
      
      // Execute recovery callbacks
      this.recoveryCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          this.logger.log(`Recovery callback failed: ${error}`, 'error');
        }
      });
      
      this.logger.log('Emergency recovery completed', 'info');
    } catch (error) {
      this.logger.log(`Emergency recovery failed: ${error}`, 'error');
    } finally {
      this.isActive = false;
    }
  }
}

// Global instances
export const debugLogger = new PersistentDebugLogger();
export const performanceMonitor = new PerformanceMonitor(debugLogger);
export const emergencyRecovery = new EmergencyRecovery(debugLogger);