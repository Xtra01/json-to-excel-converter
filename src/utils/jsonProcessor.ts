/**
 * Enhanced JSON Processing Utilities
 * Comprehensive JSON data processing with validation and optimization
 */

import { 
  Row, 
  ProcessingConfig, 
  ProcessingOptions, 
  FileData, 
  ValidationResult,
  ArrayHandlingMode 
} from '../types';
import { logger, LogCategory, createPerformanceTracker } from './logger';
import { errorHandler, ValidationError, ProcessingError } from './errorHandler';
import { AsyncProcessor, memoryManager, FileSizeEstimator } from './performance';

export interface ProcessingResult {
  success: boolean;
  data: Row[];
  metadata: {
    originalSize: number;
    processedSize: number;
    processingTime: number;
    warnings: string[];
    errors: string[];
  };
  validation?: ValidationResult;
}

export class JSONProcessor {
  private config: ProcessingOptions;

  constructor(config: ProcessingOptions) {
    this.config = config;
  }

  async processData(
    data: any,
    sourceInfo?: { fileName: string; folderPath: string },
    onProgress?: (progress: number) => void
  ): Promise<ProcessingResult> {
    const tracker = createPerformanceTracker('json_processing', {
      hasSourceInfo: !!sourceInfo,
      config: this.config
    });

    try {
      // Validate input
      if (this.config.enableValidation) {
        const validation = this.validateInput(data);
        if (!validation.isValid) {
          throw new ValidationError(
            'Input data validation failed',
            'INVALID_INPUT_DATA',
            'The provided data is not valid for processing.',
            { validation }
          );
        }
      }

      // Estimate memory usage
      const estimatedSize = FileSizeEstimator.estimateJSONSize(data);
      memoryManager.throwIfInsufficientMemory(estimatedSize * 2, 'JSON Processing');

      tracker.checkpoint('Input validated and memory checked');

      // Process the data
      const processedData = await this.flattenData(data, onProgress);
      
      // Add source tracking if enabled
      if (this.config.enableSourceTracking && sourceInfo) {
        this.addSourceTracking(processedData, sourceInfo);
      }

      tracker.checkpoint('Data flattened and source tracking added');

      const result: ProcessingResult = {
        success: true,
        data: processedData,
        metadata: {
          originalSize: estimatedSize,
          processedSize: FileSizeEstimator.estimateJSONSize(processedData),
          processingTime: tracker.complete(),
          warnings: [],
          errors: []
        }
      };

      logger.info(LogCategory.DATA_PROCESSING, 'JSON processing completed', {
        originalSize: Math.round(result.metadata.originalSize / 1024) + 'KB',
        processedSize: Math.round(result.metadata.processedSize / 1024) + 'KB',
        rowCount: processedData.length
      });

      return result;

    } catch (error) {
      tracker.error(error as Error);
      const appError = errorHandler.handle(error as Error, 'JSON Processing');
      
      return {
        success: false,
        data: [],
        metadata: {
          originalSize: 0,
          processedSize: 0,
          processingTime: 0,
          warnings: [],
          errors: [appError.userMessage]
        }
      };
    }
  }

  private validateInput(data: any): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];
    const info: any[] = [];

    // Basic validation
    if (data === null || data === undefined) {
      errors.push({
        rule: 'not_null',
        message: 'Data cannot be null or undefined',
        severity: 'error'
      });
    }

    if (typeof data !== 'object') {
      errors.push({
        rule: 'object_type',
        message: 'Data must be an object or array',
        severity: 'error'
      });
    }

    // Array validation
    if (Array.isArray(data)) {
      if (data.length === 0) {
        warnings.push({
          rule: 'empty_array',
          message: 'Data array is empty',
          severity: 'warning'
        });
      }

      if (data.length > 50000) {
        warnings.push({
          rule: 'large_array',
          message: 'Large array detected, processing may be slow',
          severity: 'warning'
        });
      }
    }

    // Object validation
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const keys = Object.keys(data);
      if (keys.length === 0) {
        warnings.push({
          rule: 'empty_object',
          message: 'Data object is empty',
          severity: 'warning'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      metadata: {
        validatedAt: new Date().toISOString(),
        validationTime: 0,
        rulesApplied: ['not_null', 'object_type', 'empty_array', 'large_array', 'empty_object']
      }
    };
  }

  private async flattenData(data: any, onProgress?: (progress: number) => void): Promise<Row[]> {
    if (Array.isArray(data)) {
      return this.processArray(data, onProgress);
    } else {
      return [this.flattenObject(data)];
    }
  }

  private async processArray(data: any[], onProgress?: (progress: number) => void): Promise<Row[]> {
    const results: Row[] = [];

    await AsyncProcessor.processInBatches(
      data,
      (item, index) => this.flattenObject(item, '', 0),
      {
        batchSize: this.config.batchSize,
        onProgress: (processed, total) => {
          onProgress?.(Math.round((processed / total) * 100));
        },
        onBatchComplete: (batchIndex, batchResults) => {
          results.push(...batchResults);
        }
      }
    );

    return results;
  }

  private flattenObject(obj: any, prefix = '', depth = 0): Row {
    const result: Row = {};
    
    if (depth >= this.config.maxDepth || obj === null || typeof obj !== 'object') {
      const key = prefix || 'value';
      result[key] = this.formatValue(obj);
      return result;
    }
    
    if (Array.isArray(obj)) {
      return this.handleArray(obj, prefix, depth);
    } else {
      return this.handleObject(obj, prefix, depth);
    }
  }

  private handleArray(arr: any[], prefix: string, depth: number): Row {
    const result: Row = {};

    switch (this.config.arrayMode) {
      case 'explode':
        // Create multiple rows (handled at higher level)
        arr.forEach((item, index) => {
          const key = prefix ? `${prefix}${this.config.delimiter}${index}` : String(index);
          Object.assign(result, this.flattenObject(item, key, depth + 1));
        });
        break;

      case 'join':
        const joinedValue = arr.map(item => 
          typeof item === 'object' ? JSON.stringify(item) : String(item)
        ).join('; ');
        result[prefix || 'value'] = joinedValue;
        break;

      case 'first':
        if (arr.length > 0) {
          Object.assign(result, this.flattenObject(arr[0], prefix, depth));
        } else {
          result[prefix || 'value'] = '';
        }
        break;

      default:
        result[prefix || 'value'] = JSON.stringify(arr);
    }

    return result;
  }

  private handleObject(obj: Record<string, any>, prefix: string, depth: number): Row {
    const result: Row = {};

    Object.entries(obj).forEach(([key, value]) => {
      // Apply custom field names if configured
      const actualKey = this.config.customFieldNames[key] || key;
      const newKey = prefix ? `${prefix}${this.config.delimiter}${actualKey}` : actualKey;
      
      Object.assign(result, this.flattenObject(value, newKey, depth + 1));
    });

    return result;
  }

  private formatValue(value: any): any {
    if (value === null || value === undefined) {
      return this.config.skipEmptyValues ? '' : value;
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number') {
      return isNaN(value) || !isFinite(value) ? '' : value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private addSourceTracking(data: Row[], sourceInfo: { fileName: string; folderPath: string }): void {
    data.forEach((row, index) => {
      row['_source_file'] = sourceInfo.fileName;
      row['_source_folder'] = sourceInfo.folderPath || 'Root';
      row['_row_index'] = index + 1;
      row['_processed_date'] = new Date().toISOString();
    });
  }

  updateConfig(newConfig: Partial<ProcessingOptions>): void {
    this.config = { ...this.config, ...newConfig };
    
    logger.info(LogCategory.SYSTEM, 'JSON processor config updated', {
      updatedFields: Object.keys(newConfig)
    });
  }

  getConfig(): ProcessingOptions {
    return { ...this.config };
  }
}

// ============= Utility Functions =============

export function createProcessor(config: ProcessingOptions): JSONProcessor {
  return new JSONProcessor(config);
}

export async function processFileData(
  files: FileData[],
  config: ProcessingOptions,
  onProgress?: (current: number, total: number) => void
): Promise<FileData[]> {
  const tracker = createPerformanceTracker('batch_file_processing', {
    fileCount: files.length
  });

  try {
    const processor = new JSONProcessor(config);
    const results: FileData[] = [];

    await AsyncProcessor.processInBatches(
      files,
      async (file, index) => {
        onProgress?.(index + 1, files.length);

        if (file.error) {
          return file; // Skip files with existing errors
        }

        try {
          const rawData = JSON.parse(JSON.stringify(file.rows)); // Deep clone
          const sourceInfo = {
            fileName: file.name,
            folderPath: file.folderPath || 'Root'
          };

          const result = await processor.processData(rawData, sourceInfo);
          
          return {
            ...file,
            rows: result.data,
            processingTime: result.metadata.processingTime,
            validationResult: result.validation
          };

        } catch (error) {
          logger.error(LogCategory.FILE_OPERATIONS, `Failed to process file: ${file.name}`, {
            error: (error as Error).message
          });

          return {
            ...file,
            rows: [],
            error: `Processing failed: ${(error as Error).message}`
          };
        }
      },
      {
        batchSize: 5, // Process 5 files at a time
        onBatchComplete: (batchIndex, batchResults) => {
          results.push(...batchResults);
          tracker.checkpoint(`Batch ${batchIndex + 1} completed`);
        }
      }
    );

    tracker.complete({ processedFiles: results.length });
    return results;

  } catch (error) {
    tracker.error(error as Error);
    throw errorHandler.handle(error as Error, 'Batch File Processing');
  }
}

export function detectOptimalConfig(sampleData: any): Partial<ProcessingConfig> {
  const config: Partial<ProcessingConfig> = {};

  // Analyze data structure
  if (Array.isArray(sampleData) && sampleData.length > 0) {
    const firstItem = sampleData[0];
    
    // Detect optimal delimiter
    if (typeof firstItem === 'object') {
      const hasNestedObjects = Object.values(firstItem).some(
        value => typeof value === 'object' && value !== null
      );
      
      if (hasNestedObjects) {
        config.delimiter = '_'; // Underscore for nested structures
      } else {
        config.delimiter = '.'; // Dot for simple structures
      }
    }

    // Detect array handling mode
    const hasArrays = Object.values(firstItem || {}).some(Array.isArray);
    if (hasArrays) {
      const arrayLengths = Object.values(firstItem || {})
        .filter(Array.isArray)
        .map((arr: any) => arr.length);
      
      const avgArrayLength = arrayLengths.reduce((a, b) => a + b, 0) / arrayLengths.length;
      
      if (avgArrayLength > 10) {
        config.arrayMode = 'join'; // Join for large arrays
      } else {
        config.arrayMode = 'explode'; // Explode for small arrays
      }
    }

    // Detect optimal depth
    const maxDepth = calculateMaxDepth(firstItem);
    config.maxDepth = Math.min(Math.max(maxDepth + 2, 5), 15);
  }

  return config;
}

function calculateMaxDepth(obj: any, currentDepth = 0): number {
  if (obj === null || typeof obj !== 'object' || currentDepth > 20) {
    return currentDepth;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return currentDepth;
    return Math.max(...obj.map(item => calculateMaxDepth(item, currentDepth + 1)));
  }

  const depths = Object.values(obj).map(value => 
    calculateMaxDepth(value, currentDepth + 1)
  );

  return depths.length > 0 ? Math.max(...depths) : currentDepth;
}

export function validateJSONString(jsonString: string): { isValid: boolean; error?: string; data?: any } {
  try {
    const data = JSON.parse(jsonString);
    return { isValid: true, data };
  } catch (error) {
    return {
      isValid: false,
      error: (error as Error).message
    };
  }
}