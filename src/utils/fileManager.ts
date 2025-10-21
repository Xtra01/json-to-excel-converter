/**
 * File Management Utilities
 * Comprehensive file handling with validation and optimization
 */

import { 
  FileData, 
  FolderData, 
  ProcessingMode, 
  ValidationResult 
} from '../types';
// import { logger, LogCategory, createPerformanceTracker } from './logger';
import { errorHandler, FileOperationError, ValidationError } from './errorHandler';
import { AsyncProcessor, FileSizeEstimator } from './performance';
import { validateJSONString } from './jsonProcessor';

// Temporary logger stubs for SSR compatibility
const logger = {
  info: (...args: any[]) => console.log('[FILE_MANAGER_INFO]', ...args),
  error: (...args: any[]) => console.error('[FILE_MANAGER_ERROR]', ...args),
  debug: (...args: any[]) => console.log('[FILE_MANAGER_DEBUG]', ...args),
  warn: (...args: any[]) => console.warn('[FILE_MANAGER_WARN]', ...args)
};

const LogCategory = {
  DATA_PROCESSING: 'data_processing',
  FILE_OPERATIONS: 'file_operations',
  ERROR: 'error',
  SYSTEM: 'system'
};

const createPerformanceTracker = (name: string, data?: any) => ({
  checkpoint: (step: string) => console.log('[PERF_CHECKPOINT]', name, step),
  complete: (result?: any) => {
    console.log('[PERF_COMPLETE]', name, result);
    return Date.now(); // Return timestamp for processingTime
  },
  error: (error?: any) => console.error('[PERF_ERROR]', name, error)
});

export interface FileUploadOptions {
  maxFileSize: number; // in bytes
  maxTotalSize: number; // in bytes
  allowedTypes: string[];
  enableValidation: boolean;
  preserveFolderStructure: boolean;
}

export const DEFAULT_UPLOAD_OPTIONS: FileUploadOptions = {
  maxFileSize: 100 * 1024 * 1024, // 100MB per file
  maxTotalSize: 500 * 1024 * 1024, // 500MB total
  allowedTypes: ['.json', '.txt'],
  enableValidation: true,
  preserveFolderStructure: true
};

export class FileManager {
  private options: FileUploadOptions;

  constructor(options: Partial<FileUploadOptions> = {}) {
    this.options = { ...DEFAULT_UPLOAD_OPTIONS, ...options };
  }

  async processFiles(
    files: File[],
    onProgress?: (current: number, total: number, currentFile?: string) => void
  ): Promise<FileData[]> {
    const tracker = createPerformanceTracker('file_processing', {
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0)
    });

    try {
      // Filter only supported files instead of throwing error
      const supportedFiles = files.filter(f => 
        this.options.allowedTypes.some(type => f.name.toLowerCase().endsWith(type))
      );

      if (supportedFiles.length === 0) {
        throw new ValidationError(
          'No supported files found',
          'NO_SUPPORTED_FILES',
          `Please select files with supported extensions: ${this.options.allowedTypes.join(', ')}.`
        );
      }

      // Log filtered files
      const filteredCount = files.length - supportedFiles.length;
      if (filteredCount > 0) {
        logger.info(LogCategory.DATA_PROCESSING, `Filtered out ${filteredCount} unsupported files`, {
          totalFiles: files.length,
          supportedFiles: supportedFiles.length,
          supportedTypes: this.options.allowedTypes
        });
      }

      // Validate remaining supported files
      this.validateFileList(supportedFiles);
      
      tracker.checkpoint('File list validated');

      const results: FileData[] = [];

      await AsyncProcessor.processInBatches(
        supportedFiles,
        async (file, index) => {
          onProgress?.(index + 1, supportedFiles.length, file.name);
          return this.processFile(file);
        },
        {
          batchSize: 5,
          onBatchComplete: (batchIndex, batchResults) => {
            results.push(...batchResults);
            tracker.checkpoint(`Batch ${batchIndex + 1} processed`);
          }
        }
      );

      tracker.complete({ processedFiles: results.length });

      logger.info(LogCategory.FILE_OPERATIONS, 'File processing completed', {
        totalFiles: supportedFiles.length,
        successfulFiles: results.filter(f => !f.error).length,
        errorFiles: results.filter(f => f.error).length
      });

      return results;

    } catch (error) {
      tracker.error(error as Error);
      throw errorHandler.handle(error as Error, 'File Processing');
    }
  }

  private validateFileList(files: File[]): void {
    if (!files || files.length === 0) {
      throw new ValidationError(
        'No files provided',
        'NO_FILES',
        'Please select at least one file to process.'
      );
    }

    // Check individual file sizes
    const oversizedFiles = files.filter(f => f.size > this.options.maxFileSize);
    if (oversizedFiles.length > 0) {
      throw new ValidationError(
        `Files too large: ${oversizedFiles.map(f => f.name).join(', ')}`,
        'FILE_TOO_LARGE',
        `Some files exceed the maximum size limit of ${Math.round(this.options.maxFileSize / 1024 / 1024)}MB.`
      );
    }

    // Check total size
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > this.options.maxTotalSize) {
      throw new ValidationError(
        `Total size too large: ${Math.round(totalSize / 1024 / 1024)}MB`,
        'TOTAL_SIZE_TOO_LARGE',
        `Total file size exceeds the limit of ${Math.round(this.options.maxTotalSize / 1024 / 1024)}MB.`
      );
    }

    // File type validation removed - handled in processFiles filtering
  }

  private async processFile(file: File): Promise<FileData> {
    const tracker = createPerformanceTracker('single_file_processing', {
      fileName: file.name,
      fileSize: file.size
    });

    try {
      // Check for empty files first
      if (file.size === 0) {
        console.warn('[FILE_MANAGER] Empty file detected:', file.name);
        return {
          name: file.name,
          rows: [],
          selected: false,
          error: '⚠️ Empty file (0 KB) - Check if file is corrupted or incomplete',
          folderPath: this.extractFolderPath(file),
          originalPath: this.getOriginalPath(file),
          processingTime: Date.now(),
          metadata: {
            fileSize: file.size,
            type: file.type || 'text/plain',
            lastModified: file.lastModified,
            createdDate: new Date(file.lastModified).toISOString()
          }
        };
      }

      // Read file content with enhanced error handling
      const content = await this.readFileContent(file);
      tracker.checkpoint('File content read');

      // Check if content is actually empty or just whitespace
      if (!content || content.trim().length === 0) {
        console.warn('[FILE_MANAGER] File has no readable content:', file.name);
        return {
          name: file.name,
          rows: [],
          selected: false,
          error: '⚠️ File contains no readable text content',
          folderPath: this.extractFolderPath(file),
          originalPath: this.getOriginalPath(file),
          processingTime: Date.now(),
          metadata: {
            fileSize: file.size,
            type: file.type || 'text/plain',
            lastModified: file.lastModified,
            createdDate: new Date(file.lastModified).toISOString()
          }
        };
      }

      // Validate and parse JSON
      let rows: any[] = [];
      let validationResult: ValidationResult | undefined;

      if (this.options.enableValidation) {
        const validation = validateJSONString(content);
        if (!validation.isValid) {
          throw new FileOperationError(
            `Invalid JSON in file ${file.name}: ${validation.error}`,
            'INVALID_JSON',
            `File "${file.name}" contains invalid JSON format.`,
            { originalError: validation.error }
          );
        }

        const data = validation.data;
        rows = Array.isArray(data) ? data : [data];
        
        validationResult = this.validateFileData(data);
        tracker.checkpoint('File data validated');
      } else {
        try {
          const data = JSON.parse(content);
          rows = Array.isArray(data) ? data : [data];
        } catch (parseError) {
          throw new FileOperationError(
            `JSON parse error in file ${file.name}`,
            'JSON_PARSE_ERROR',
            `File "${file.name}" could not be parsed as JSON.`,
            { originalError: (parseError as Error).message }
          );
        }
      }

      // Extract folder path if available
      const folderPath = this.extractFolderPath(file);

      const fileData: FileData = {
        name: file.name,
        rows,
        selected: true,
        folderPath,
        originalPath: (file as any).webkitRelativePath || file.name,
        processingTime: tracker.complete(),
        validationResult,
        metadata: {
          fileSize: file.size,
          createdDate: new Date(file.lastModified).toISOString(),
          lastModified: file.lastModified,
          type: file.type || 'application/json'
        }
      };

      logger.debug(LogCategory.FILE_OPERATIONS, `File processed successfully: ${file.name}`, {
        rowCount: rows.length,
        fileSize: file.size,
        folderPath
      });

      return fileData;

    } catch (error) {
      tracker.error(error as Error);
      
      const fileData: FileData = {
        name: file.name,
        rows: [],
        selected: false,
        error: (error as Error).message,
        folderPath: this.extractFolderPath(file),
        originalPath: (file as any).webkitRelativePath || file.name,
        metadata: {
          fileSize: file.size,
          createdDate: new Date(file.lastModified).toISOString(),
          lastModified: file.lastModified,
          type: file.type || 'application/json'
        }
      };

      logger.error(LogCategory.FILE_OPERATIONS, `File processing failed: ${file.name}`, {
        error: (error as Error).message
      });

      return fileData;
    }
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          resolve(content);
        } else {
          reject(new Error('Failed to read file content'));
        }
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };

      reader.readAsText(file);
    });
  }

  private extractFolderPath(file: File): string {
    if (this.options.preserveFolderStructure && (file as any).webkitRelativePath) {
      const pathParts = (file as any).webkitRelativePath.split('/');
      if (pathParts.length > 1) {
        return pathParts.slice(0, -1).join('/');
      }
    }
    return 'Upload';
  }

  private getOriginalPath(file: File): string {
    return (file as any).webkitRelativePath || file.name;
  }

  private validateFileData(data: any): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];
    const info: any[] = [];

    // Basic data validation
    if (data === null || data === undefined) {
      errors.push({
        rule: 'not_null',
        message: 'File data cannot be null or undefined',
        severity: 'error'
      });
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        warnings.push({
          rule: 'empty_array',
          message: 'File contains empty array',
          severity: 'warning'
        });
      }

      if (data.length > 10000) {
        warnings.push({
          rule: 'large_dataset',
          message: 'File contains large dataset, processing may be slow',
          severity: 'warning'
        });
      }

      // Check for consistent structure
      if (data.length > 1) {
        const firstKeys = Object.keys(data[0] || {});
        const inconsistentRows = data.slice(1, 10).findIndex(item => {
          const currentKeys = Object.keys(item || {});
          return firstKeys.length !== currentKeys.length ||
                 !firstKeys.every(key => currentKeys.includes(key));
        });

        if (inconsistentRows !== -1) {
          warnings.push({
            rule: 'inconsistent_structure',
            message: 'Data rows have inconsistent structure',
            severity: 'warning',
            suggestion: 'Some rows may have different fields than others'
          });
        }
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
        rulesApplied: ['not_null', 'empty_array', 'large_dataset', 'inconsistent_structure']
      }
    };
  }

  updateOptions(newOptions: Partial<FileUploadOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    logger.info(LogCategory.SYSTEM, 'File manager options updated', {
      updatedFields: Object.keys(newOptions)
    });
  }

  getOptions(): FileUploadOptions {
    return { ...this.options };
  }
}

// ============= Folder Organization =============

export function organizeFolders(files: FileData[]): FolderData[] {
  const folderMap = new Map<string, FolderData>();
  
  files.forEach(file => {
    const folderPath = file.folderPath || 'Root';
    const folderName = folderPath === 'Root' ? 'Root' : folderPath.split('/').pop() || folderPath;
    
    if (!folderMap.has(folderPath)) {
      folderMap.set(folderPath, {
        path: folderPath,
        name: folderName,
        files: [],
        statistics: {
          validFileCount: 0,
          totalRows: 0,
          errorCount: 0,
          totalSize: 0
        },
        selected: true,
        metadata: {
          depth: folderPath.split('/').length - 1,
          lastScanned: new Date().toISOString()
        }
      });
    }
    
    const folder = folderMap.get(folderPath)!;
    folder.files.push(file);
    
    // Update statistics
    if (file.error) {
      folder.statistics.errorCount++;
    } else if (file.rows.length > 0) {
      folder.statistics.validFileCount++;
      folder.statistics.totalRows += file.rows.length;
    }
    
    folder.statistics.totalSize += file.metadata.fileSize || 0;
  });
  
  return Array.from(folderMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ============= File Utilities =============

export function getFileStatistics(files: FileData[]): {
  total: number;
  valid: number;
  errors: number;
  totalSize: number;
  totalRows: number;
  largestFile: { name: string; size: number; rows: number };
  smallestFile: { name: string; size: number; rows: number };
  averageFileSize: number;
  fileTypes: Record<string, number>;
} {
  const validFiles = files.filter(f => !f.error);
  const errorFiles = files.filter(f => f.error);
  
  const totalSize = files.reduce((sum, f) => sum + (f.metadata.fileSize || 0), 0);
  const totalRows = validFiles.reduce((sum, f) => sum + f.rows.length, 0);
  
  let largestFile = { name: '', size: 0, rows: 0 };
  let smallestFile = { name: '', size: Infinity, rows: Infinity };
  
  validFiles.forEach(file => {
    const size = file.metadata.fileSize || 0;
    const rows = file.rows.length;
    
    if (size > largestFile.size) {
      largestFile = { name: file.name, size, rows };
    }
    
    if (size < smallestFile.size) {
      smallestFile = { name: file.name, size, rows };
    }
  });
  
  // Fix infinite values
  if (smallestFile.size === Infinity) {
    smallestFile = { name: '', size: 0, rows: 0 };
  }
  
  const fileTypes: Record<string, number> = {};
  files.forEach(file => {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
    fileTypes[extension] = (fileTypes[extension] || 0) + 1;
  });
  
  return {
    total: files.length,
    valid: validFiles.length,
    errors: errorFiles.length,
    totalSize,
    totalRows,
    largestFile,
    smallestFile,
    averageFileSize: files.length > 0 ? totalSize / files.length : 0,
    fileTypes
  };
}

export function filterFiles(
  files: FileData[],
  filters: {
    hasError?: boolean;
    minRows?: number;
    maxRows?: number;
    folderPath?: string;
    namePattern?: string;
  }
): FileData[] {
  return files.filter(file => {
    if (filters.hasError !== undefined && !!file.error !== filters.hasError) {
      return false;
    }
    
    if (filters.minRows !== undefined && file.rows.length < filters.minRows) {
      return false;
    }
    
    if (filters.maxRows !== undefined && file.rows.length > filters.maxRows) {
      return false;
    }
    
    if (filters.folderPath && file.folderPath !== filters.folderPath) {
      return false;
    }
    
    if (filters.namePattern) {
      const regex = new RegExp(filters.namePattern, 'i');
      if (!regex.test(file.name)) {
        return false;
      }
    }
    
    return true;
  });
}

export function sortFiles(
  files: FileData[],
  sortBy: 'name' | 'size' | 'rows' | 'folder' | 'date',
  order: 'asc' | 'desc' = 'asc'
): FileData[] {
  const sorted = [...files].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = (a.metadata.fileSize || 0) - (b.metadata.fileSize || 0);
        break;
      case 'rows':
        comparison = a.rows.length - b.rows.length;
        break;
      case 'folder':
        comparison = (a.folderPath || '').localeCompare(b.folderPath || '');
        break;
      case 'date':
        comparison = (a.metadata.lastModified || 0) - (b.metadata.lastModified || 0);
        break;
    }
    
    return order === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
}

// ============= Export Utilities =============

export const fileManager = new FileManager();