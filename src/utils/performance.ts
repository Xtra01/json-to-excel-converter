/**
 * Advanced Performance Optimization Utilities
 * Memory management, async processing, and performance monitoring
 */

import { logger, LogCategory, createPerformanceTracker } from './logger';
import { errorHandler, MemoryError, ProcessingError } from './errorHandler';

// ============= Memory Management =============

export interface MemoryInfo {
  used: number;
  total: number;
  limit: number;
  percentage: number;
  available: number;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private memoryThreshold = 0.8; // 80% threshold
  private criticalThreshold = 0.9; // 90% critical
  private lastCleanup = 0;
  private cleanupInterval = 60000; // 1 minute
  private gcCallbacks: (() => void)[] = [];

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private constructor() {
    this.setupMemoryMonitoring();
  }

  private setupMemoryMonitoring(): void {
    // Monitor memory every 10 seconds
    setInterval(() => {
      this.checkMemoryUsage();
    }, 10000);

    // Auto cleanup every minute
    setInterval(() => {
      this.performAutoCleanup();
    }, this.cleanupInterval);
  }

  getMemoryInfo(): MemoryInfo | null {
    try {
      const memory = (performance as any).memory;
      if (!memory) return null;

      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      const limit = memory.jsHeapSizeLimit;
      const percentage = (used / limit) * 100;
      const available = limit - used;

      return {
        used: Math.round(used / 1024 / 1024), // MB
        total: Math.round(total / 1024 / 1024), // MB
        limit: Math.round(limit / 1024 / 1024), // MB
        percentage: Math.round(percentage * 100) / 100,
        available: Math.round(available / 1024 / 1024) // MB
      };
    } catch (error) {
      logger.error(LogCategory.MEMORY, 'Failed to get memory info', { error });
      return null;
    }
  }

  private checkMemoryUsage(): void {
    const memInfo = this.getMemoryInfo();
    if (!memInfo) return;

    if (memInfo.percentage > this.criticalThreshold * 100) {
      logger.error(LogCategory.MEMORY, 'Critical memory usage detected', memInfo);
      this.forceGarbageCollection();
      this.triggerEmergencyCleanup();
    } else if (memInfo.percentage > this.memoryThreshold * 100) {
      logger.warn(LogCategory.MEMORY, 'High memory usage detected', memInfo);
      this.requestGarbageCollection();
    }
  }

  private performAutoCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) return;

    const memInfo = this.getMemoryInfo();
    if (memInfo && memInfo.percentage > 70) {
      logger.info(LogCategory.MEMORY, 'Performing automatic cleanup', memInfo);
      this.triggerCleanupCallbacks();
    }

    this.lastCleanup = now;
  }

  registerCleanupCallback(callback: () => void): void {
    this.gcCallbacks.push(callback);
  }

  private triggerCleanupCallbacks(): void {
    this.gcCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        logger.error(LogCategory.MEMORY, 'Cleanup callback failed', { error });
      }
    });
  }

  private triggerEmergencyCleanup(): void {
    logger.critical(LogCategory.MEMORY, 'Emergency cleanup triggered');
    
    // Clear various caches
    this.clearImageCache();
    this.clearStorageCache();
    this.triggerCleanupCallbacks();
    
    // Force garbage collection
    this.forceGarbageCollection();
  }

  private clearImageCache(): void {
    try {
      // Clear any image caches if present
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
      });
    } catch (error) {
      logger.error(LogCategory.MEMORY, 'Failed to clear image cache', { error });
    }
  }

  private clearStorageCache(): void {
    try {
      // Clear sessionStorage (keep localStorage for logs)
      sessionStorage.clear();
      
      // Clear any temporary data from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      logger.error(LogCategory.MEMORY, 'Failed to clear storage cache', { error });
    }
  }

  private requestGarbageCollection(): void {
    if (typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
        logger.info(LogCategory.MEMORY, 'Garbage collection requested');
      } catch (error) {
        logger.error(LogCategory.MEMORY, 'Garbage collection failed', { error });
      }
    }
  }

  private forceGarbageCollection(): void {
    this.requestGarbageCollection();
    
    // Force additional cleanup
    setTimeout(() => {
      this.requestGarbageCollection();
    }, 100);
  }

  checkMemoryForOperation(operationSize: number): boolean {
    const memInfo = this.getMemoryInfo();
    if (!memInfo) return true; // Allow if we can't check

    const requiredMB = operationSize / 1024 / 1024;
    const availableMB = memInfo.available;

    logger.debug(LogCategory.MEMORY, 'Memory check for operation', {
      requiredMB: Math.round(requiredMB),
      availableMB,
      operationSize
    });

    return availableMB > requiredMB * 1.5; // 50% safety margin
  }

  throwIfInsufficientMemory(operationSize: number, operationName: string): void {
    if (!this.checkMemoryForOperation(operationSize)) {
      const memInfo = this.getMemoryInfo();
      throw new MemoryError(
        `Insufficient memory for ${operationName}`,
        'INSUFFICIENT_MEMORY',
        `Not enough memory available for this operation. Try refreshing the page or using smaller files.`,
        {
          operationName,
          operationSize: Math.round(operationSize / 1024 / 1024),
          memoryInfo: memInfo
        }
      );
    }
  }
}

// ============= Async Processing Utilities =============

export class AsyncProcessor {
  private static readonly DEFAULT_BATCH_SIZE = 100;
  private static readonly DEFAULT_DELAY = 10;

  static async processInBatches<T, R>(
    items: T[],
    processor: (item: T, index: number) => R | Promise<R>,
    options: {
      batchSize?: number;
      delay?: number;
      onProgress?: (processed: number, total: number) => void;
      onBatchComplete?: (batchIndex: number, batchResults: R[]) => void;
      abortSignal?: AbortSignal;
    } = {}
  ): Promise<R[]> {
    const {
      batchSize = AsyncProcessor.DEFAULT_BATCH_SIZE,
      delay = AsyncProcessor.DEFAULT_DELAY,
      onProgress,
      onBatchComplete,
      abortSignal
    } = options;

    const tracker = createPerformanceTracker('batch_processing', {
      totalItems: items.length,
      batchSize
    });

    const results: R[] = [];
    const totalBatches = Math.ceil(items.length / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // Check for abort signal
      if (abortSignal?.aborted) {
        tracker.error(new Error('Processing aborted'), { batchIndex });
        throw new ProcessingError(
          'Processing was aborted',
          'PROCESSING_ABORTED',
          'The operation was cancelled.'
        );
      }

      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, items.length);
      const batch = items.slice(startIdx, endIdx);

      tracker.checkpoint(`Processing batch ${batchIndex + 1}/${totalBatches}`, {
        batchIndex,
        batchSize: batch.length
      });

      // Process batch
      const batchResults: R[] = [];
      for (let i = 0; i < batch.length; i++) {
        try {
          const result = await processor(batch[i], startIdx + i);
          batchResults.push(result);
        } catch (error) {
          logger.error(LogCategory.DATA_PROCESSING, 'Batch item processing failed', {
            batchIndex,
            itemIndex: i,
            error: (error as Error).message
          });
          throw error;
        }

        // Check memory periodically
        if (i % 10 === 0) {
          const memoryManager = MemoryManager.getInstance();
          const memInfo = memoryManager.getMemoryInfo();
          if (memInfo && memInfo.percentage > 85) {
            logger.warn(LogCategory.MEMORY, 'High memory during batch processing', memInfo);
            await AsyncProcessor.yieldToMainThread();
          }
        }
      }

      results.push(...batchResults);

      // Notify progress
      onProgress?.(results.length, items.length);
      onBatchComplete?.(batchIndex, batchResults);

      // Yield to main thread between batches
      if (batchIndex < totalBatches - 1 && delay > 0) {
        await AsyncProcessor.delay(delay);
      }
    }

    tracker.complete({ processedItems: results.length });
    return results;
  }

  static async processWithMemoryCheck<T>(
    operation: () => Promise<T>,
    estimatedMemoryUsage: number,
    operationName: string
  ): Promise<T> {
    const memoryManager = MemoryManager.getInstance();
    
    // Check memory before operation
    memoryManager.throwIfInsufficientMemory(estimatedMemoryUsage, operationName);

    const tracker = createPerformanceTracker(operationName, {
      estimatedMemoryUsage: Math.round(estimatedMemoryUsage / 1024 / 1024)
    });

    try {
      const result = await operation();
      tracker.complete();
      return result;
    } catch (error) {
      tracker.error(error as Error);
      throw error;
    }
  }

  static yieldToMainThread(): Promise<void> {
    return new Promise(resolve => {
      if ((window as any).requestIdleCallback) {
        (window as any).requestIdleCallback(resolve);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static createAbortableOperation<T>(
    operation: (signal: AbortSignal) => Promise<T>
  ): { promise: Promise<T>; abort: () => void } {
    const abortController = new AbortController();
    
    const promise = operation(abortController.signal).catch(error => {
      if (abortController.signal.aborted) {
        throw new ProcessingError(
          'Operation was aborted',
          'OPERATION_ABORTED',
          'The operation was cancelled.'
        );
      }
      throw error;
    });

    return {
      promise,
      abort: () => abortController.abort()
    };
  }
}

// ============= Performance Monitoring =============

export class PerformanceMetrics {
  private static metrics = new Map<string, number[]>();
  private static maxSamples = 100;

  static recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const samples = this.metrics.get(name)!;
    samples.push(value);

    // Keep only recent samples
    if (samples.length > this.maxSamples) {
      samples.shift();
    }

    logger.debug(LogCategory.PERFORMANCE, `Metric recorded: ${name}`, {
      value,
      sampleCount: samples.length
    });
  }

  static getMetricStats(name: string): {
    min: number;
    max: number;
    avg: number;
    median: number;
    count: number;
  } | null {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) return null;

    const sorted = [...samples].sort((a, b) => a - b);
    const sum = samples.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / samples.length,
      median: sorted[Math.floor(sorted.length / 2)],
      count: samples.length
    };
  }

  static getAllMetrics(): Record<string, ReturnType<typeof this.getMetricStats>> {
    const result: Record<string, ReturnType<typeof this.getMetricStats>> = {};
    
    for (const [name] of this.metrics) {
      result[name] = this.getMetricStats(name);
    }

    return result;
  }

  static clearMetrics(): void {
    this.metrics.clear();
    logger.info(LogCategory.PERFORMANCE, 'Performance metrics cleared');
  }
}

// ============= Cache Management =============

export class LRUCache<T> {
  private capacity: number;
  private cache = new Map<string, { value: T; timestamp: number }>();

  constructor(capacity: number = 50) {
    this.capacity = capacity;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, { ...entry, timestamp: Date.now() });
    
    return entry.value;
  }

  set(key: string, value: T): void {
    // Remove if already exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Remove oldest if at capacity
    else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; capacity: number; hitRate?: number } {
    return {
      size: this.cache.size,
      capacity: this.capacity
    };
  }
}

// ============= File Size Estimation =============

export class FileSizeEstimator {
  static estimateJSONSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return this.roughEstimateSize(data);
    }
  }

  static estimateExcelSize(rows: any[], columns: string[]): number {
    // Excel files are typically 2-3x larger than JSON due to formatting
    const dataSize = this.estimateJSONSize(rows);
    return dataSize * 2.5;
  }

  static estimateCSVSize(rows: any[], columns: string[]): number {
    // CSV is typically smaller than JSON
    const avgRowSize = this.estimateJSONSize(rows[0] || {});
    return (avgRowSize * rows.length * 0.7) + (columns.join(',').length * 2);
  }

  private static roughEstimateSize(data: any): number {
    if (data === null || data === undefined) return 4;
    if (typeof data === 'boolean') return 4;
    if (typeof data === 'number') return 8;
    if (typeof data === 'string') return data.length * 2;
    if (Array.isArray(data)) {
      return data.reduce((size, item) => size + this.roughEstimateSize(item), 16);
    }
    if (typeof data === 'object') {
      return Object.entries(data).reduce((size, [key, value]) => {
        return size + this.roughEstimateSize(key) + this.roughEstimateSize(value);
      }, 16);
    }
    return 16; // Default size
  }
}

// ============= Resource Pool =============

export class ResourcePool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private factory: () => T;
  private cleanup: (resource: T) => void;
  private maxSize: number;

  constructor(
    factory: () => T,
    cleanup: (resource: T) => void = () => {},
    maxSize: number = 10
  ) {
    this.factory = factory;
    this.cleanup = cleanup;
    this.maxSize = maxSize;
  }

  acquire(): T {
    let resource: T;

    if (this.available.length > 0) {
      resource = this.available.pop()!;
    } else {
      resource = this.factory();
    }

    this.inUse.add(resource);
    return resource;
  }

  release(resource: T): void {
    if (!this.inUse.has(resource)) return;

    this.inUse.delete(resource);

    if (this.available.length < this.maxSize) {
      this.available.push(resource);
    } else {
      this.cleanup(resource);
    }
  }

  size(): { available: number; inUse: number; total: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }

  clear(): void {
    this.available.forEach(resource => this.cleanup(resource));
    this.inUse.forEach(resource => this.cleanup(resource));
    this.available = [];
    this.inUse.clear();
  }
}

// ============= Export Utilities =============

export const memoryManager = MemoryManager.getInstance();