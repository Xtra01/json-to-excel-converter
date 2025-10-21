/**
 * Enterprise-Level Logging System
 * Structured logging with performance optimization, categorization and advanced debugging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export enum LogCategory {
  SYSTEM = 'system',
  PERFORMANCE = 'performance',
  USER_ACTION = 'user_action',
  DATA_PROCESSING = 'data_processing',
  FILE_OPERATIONS = 'file_operations',
  EXPORT = 'export',
  ERROR = 'error',
  MEMORY = 'memory'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata?: Record<string, any>;
  performance?: {
    memory: string;
    timing: number;
    userAgent?: string;
  };
  stack?: string;
  sessionId: string;
}

export interface LoggerConfig {
  level: LogLevel;
  maxEntries: number;
  persistToStorage: boolean;
  enablePerformanceTracking: boolean;
  autoExportThreshold?: number;
  categories: LogCategory[];
}

export class EnterpriseLogger {
  private config: LoggerConfig;
  private sessionId: string;
  private logBuffer: LogEntry[] = [];
  private storageKey = 'enterprise-logs';
  private performanceStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  private lastCleanup = Date.now();
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      maxEntries: 500,
      persistToStorage: true,
      enablePerformanceTracking: true,
      autoExportThreshold: 1000,
      categories: Object.values(LogCategory),
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.initializeLogger();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeLogger(): void {
    this.loadExistingLogs();
    this.setupPerformanceMonitoring();
    this.setupErrorHandling();
    this.scheduleCleanup();
  }

  private loadExistingLogs(): void {
    if (!this.config.persistToStorage || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const logs = JSON.parse(stored) as LogEntry[];
        // Only keep recent logs from this session or last 100 critical logs
        this.logBuffer = logs.filter(log => 
          log.sessionId === this.sessionId || 
          (log.level >= LogLevel.ERROR && logs.indexOf(log) >= logs.length - 100)
        );
      }
    } catch (error) {
      console.error('Failed to load existing logs:', error);
    }
  }

  private setupPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceTracking || typeof window === 'undefined') return;

    // Monitor memory usage periodically
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Every 30 seconds
  }

  private setupErrorHandling(): void {
    if (typeof window === 'undefined') return;
    
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.critical(LogCategory.ERROR, 'Unhandled Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.toString()
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.critical(LogCategory.ERROR, 'Unhandled Promise Rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      });
    });
  }

  private scheduleCleanup(): void {
    setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  private performCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL) return;

    // Remove old entries beyond max limit
    if (this.logBuffer.length > this.config.maxEntries) {
      const keepCount = Math.floor(this.config.maxEntries * 0.7); // Keep 70%
      this.logBuffer = this.logBuffer.slice(-keepCount);
    }

    // Auto-export if threshold reached
    if (this.config.autoExportThreshold && 
        this.logBuffer.length > this.config.autoExportThreshold) {
      this.exportLogs('auto-export');
    }

    this.persistLogs();
    this.lastCleanup = now;
  }

  private checkMemoryUsage(): void {
    const memory = (performance as any).memory;
    if (!memory) return;

    const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    
    if (usagePercent > 80) {
      this.warn(LogCategory.MEMORY, 'High Memory Usage', {
        usagePercent: Math.round(usagePercent),
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      });
    }

    if (usagePercent > 90) {
      this.error(LogCategory.MEMORY, 'Critical Memory Usage', {
        usagePercent: Math.round(usagePercent),
        action: 'Consider reducing memory usage or refreshing page'
      });
    }
  }

  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    metadata?: Record<string, any>,
    stack?: string
  ): LogEntry {
    const timestamp = new Date().toISOString();
    const timing = typeof performance !== 'undefined' 
      ? performance.now() - this.performanceStartTime 
      : Date.now() - this.performanceStartTime;

    return {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      level,
      category,
      message,
      metadata,
      performance: this.config.enablePerformanceTracking && typeof window !== 'undefined' ? {
        memory: this.getMemoryInfo(),
        timing: Math.round(timing),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR'
      } : undefined,
      stack,
      sessionId: this.sessionId
    };
  }

  private getMemoryInfo(): string {
    try {
      const memory = (performance as any).memory;
      if (memory) {
        const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
        return `${used}MB/${total}MB`;
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    return level >= this.config.level && 
           this.config.categories.includes(category);
  }

  private addLogEntry(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Console output for development
    const consoleMessage = `[${entry.category}] ${entry.message}`;
    const consoleMetadata = entry.metadata || {};
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(consoleMessage, consoleMetadata);
        break;
      case LogLevel.INFO:
        console.info(consoleMessage, consoleMetadata);
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage, consoleMetadata);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(consoleMessage, consoleMetadata);
        break;
    }

    // Immediate persistence for critical logs
    if (entry.level >= LogLevel.ERROR && this.config.persistToStorage) {
      this.persistLogs();
    }
  }

  private persistLogs(): void {
    if (!this.config.persistToStorage || typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logBuffer));
    } catch (error) {
      console.error('Failed to persist logs:', error);
    }
  }

  // Public API Methods
  debug(category: LogCategory, message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG, category)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, category, message, metadata);
    this.addLogEntry(entry);
  }

  info(category: LogCategory, message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO, category)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, category, message, metadata);
    this.addLogEntry(entry);
  }

  warn(category: LogCategory, message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN, category)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, category, message, metadata);
    this.addLogEntry(entry);
  }

  error(category: LogCategory, message: string, metadata?: Record<string, any>): void {
    const stack = new Error().stack;
    const entry = this.createLogEntry(LogLevel.ERROR, category, message, metadata, stack);
    this.addLogEntry(entry);
  }

  critical(category: LogCategory, message: string, metadata?: Record<string, any>): void {
    const stack = new Error().stack;
    const entry = this.createLogEntry(LogLevel.CRITICAL, category, message, metadata, stack);
    this.addLogEntry(entry);
  }

  // Utility Methods
  getLogs(filter?: { 
    level?: LogLevel; 
    category?: LogCategory; 
    since?: Date;
    limit?: number;
  }): LogEntry[] {
    let logs = [...this.logBuffer];

    if (filter) {
      if (filter.level !== undefined) {
        logs = logs.filter(log => log.level >= filter.level!);
      }
      if (filter.category) {
        logs = logs.filter(log => log.category === filter.category);
      }
      if (filter.since) {
        logs = logs.filter(log => new Date(log.timestamp) >= filter.since!);
      }
      if (filter.limit) {
        logs = logs.slice(-filter.limit);
      }
    }

    return logs;
  }

  getLogSummary(): {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    memoryUsage: string;
    sessionId: string;
  } {
    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    this.logBuffer.forEach(log => {
      const levelName = LogLevel[log.level];
      byLevel[levelName] = (byLevel[levelName] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });

    return {
      total: this.logBuffer.length,
      byLevel,
      byCategory,
      memoryUsage: this.getMemoryInfo(),
      sessionId: this.sessionId
    };
  }

  exportLogs(filename?: string): void {
    const logs = this.getLogs();
    const summary = this.getLogSummary();
    
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        sessionId: this.sessionId,
        summary
      },
      logs
    };

    if (typeof window === 'undefined') {
      console.log('Export logs called in SSR environment, skipping');
      return;
    }

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `logs-${this.sessionId}-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.info(LogCategory.SYSTEM, 'Logs exported', { filename: a.download });
  }

  clearLogs(): void {
    this.logBuffer = [];
    if (this.config.persistToStorage && typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
    this.info(LogCategory.SYSTEM, 'Logs cleared');
  }

  setLogLevel(level: LogLevel): void {
    this.config.level = level;
    this.info(LogCategory.SYSTEM, `Log level set to ${LogLevel[level]}`);
  }

  enableCategory(category: LogCategory): void {
    if (!this.config.categories.includes(category)) {
      this.config.categories.push(category);
      this.info(LogCategory.SYSTEM, `Category enabled: ${category}`);
    }
  }

  disableCategory(category: LogCategory): void {
    this.config.categories = this.config.categories.filter(c => c !== category);
    this.info(LogCategory.SYSTEM, `Category disabled: ${category}`);
  }
}

// Performance Tracker for specific operations
export class PerformanceTracker {
  private startTime: number;
  private logger: EnterpriseLogger;
  private operation: string;
  private metadata: Record<string, any>;

  constructor(logger: EnterpriseLogger, operation: string, metadata: Record<string, any> = {}) {
    this.logger = logger;
    this.operation = operation;
    this.metadata = metadata;
    this.startTime = performance.now();
    
    this.logger.debug(LogCategory.PERFORMANCE, `Starting: ${operation}`, metadata);
  }

  checkpoint(message: string, metadata?: Record<string, any>): void {
    const elapsed = performance.now() - this.startTime;
    this.logger.debug(LogCategory.PERFORMANCE, `${this.operation} - ${message}`, {
      ...this.metadata,
      ...metadata,
      elapsed: `${elapsed.toFixed(2)}ms`
    });
  }

  complete(metadata?: Record<string, any>): number {
    const elapsed = performance.now() - this.startTime;
    this.logger.info(LogCategory.PERFORMANCE, `Completed: ${this.operation}`, {
      ...this.metadata,
      ...metadata,
      totalTime: `${elapsed.toFixed(2)}ms`
    });
    return elapsed;
  }

  error(error: Error, metadata?: Record<string, any>): void {
    const elapsed = performance.now() - this.startTime;
    this.logger.error(LogCategory.PERFORMANCE, `Failed: ${this.operation}`, {
      ...this.metadata,
      ...metadata,
      error: error.message,
      elapsed: `${elapsed.toFixed(2)}ms`,
      stack: error.stack
    });
  }
}

// Global logger instance
export const logger = new EnterpriseLogger({
  level: LogLevel.INFO,
  maxEntries: 1000,
  persistToStorage: true,
  enablePerformanceTracking: true,
  autoExportThreshold: 2000
});

// Helper functions for common operations
export const createPerformanceTracker = (operation: string, metadata?: Record<string, any>) => 
  new PerformanceTracker(logger, operation, metadata);

export const logUserAction = (action: string, metadata?: Record<string, any>) =>
  logger.info(LogCategory.USER_ACTION, action, metadata);

export const logSystemEvent = (event: string, metadata?: Record<string, any>) =>
  logger.info(LogCategory.SYSTEM, event, metadata);

export const logError = (error: Error | string, metadata?: Record<string, any>) => {
  const message = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error(LogCategory.ERROR, message, { ...metadata, stack });
};

export const logCritical = (message: string, metadata?: Record<string, any>) =>
  logger.critical(LogCategory.ERROR, message, metadata);