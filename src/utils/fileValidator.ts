/*
 * Professional File Validation System
 * Copyright (C) 2024 Xtra01
 * Licensed under AGPL v3 - see LICENSE file
 */

import { errorHandler, createValidationError, createFileError, ErrorType } from './errorHandler';
import { logger, LogCategory } from './logger';

export interface FileValidationResult {
  isValid: boolean;
  errors: FileValidationError[];
  warnings: FileValidationWarning[];
  metadata: FileMetadata;
}

export interface FileValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  field?: string;
  line?: number;
  column?: number;
}

export interface FileValidationWarning {
  code: string;
  message: string;
  suggestion: string;
}

export interface FileMetadata {
  filename: string;
  size: number;
  type: string;
  encoding?: string;
  structure?: 'array' | 'object' | 'primitive' | 'mixed';
  depth?: number;
  recordCount?: number;
  fields?: string[];
}

export class FileValidator {
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly MIN_FILE_SIZE = 1; // 1 byte
  private static readonly MAX_JSON_DEPTH = 50;
  private static readonly MAX_ARRAY_LENGTH = 100000;
  private static readonly SUPPORTED_MIME_TYPES = [
    'application/json',
    'text/plain',
    'text/json',
    'application/x-json'
  ];

  static async validateFile(file: File): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        filename: file.name,
        size: file.size,
        type: file.type || this.detectFileType(file.name)
      }
    };

    try {
      // Basic file validation
      this.validateBasicFileProperties(file, result);
      
      if (result.errors.length > 0) {
        result.isValid = false;
        return result;
      }

      // Read and validate content
      const content = await this.readFileContent(file);
      this.validateFileContent(content, result);
      
      // JSON-specific validation
      if (this.isJsonFile(file)) {
        await this.validateJsonContent(content, result);
      }

      result.isValid = result.errors.length === 0;
      
      logger.info(LogCategory.SYSTEM, 'File validation completed', {
        filename: file.name,
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      });

    } catch (error) {
      const fileError = createFileError('validation', file.name, (error as Error).message);
      result.errors.push({
        code: fileError.code,
        message: fileError.userMessage,
        severity: 'error'
      });
      result.isValid = false;
      
      errorHandler.handle(fileError, 'FileValidator.validateFile');
    }

    return result;
  }

  private static validateBasicFileProperties(file: File, result: FileValidationResult): void {
    // File size validation
    if (file.size === 0) {
      result.errors.push({
        code: 'FILE_EMPTY',
        message: 'File is empty (0 bytes). Please select a file with content.',
        severity: 'error'
      });
      return;
    }

    if (file.size < this.MIN_FILE_SIZE) {
      result.errors.push({
        code: 'FILE_TOO_SMALL',
        message: `File is too small (${file.size} bytes). Minimum size is ${this.MIN_FILE_SIZE} byte.`,
        severity: 'error'
      });
    }

    if (file.size > this.MAX_FILE_SIZE) {
      result.errors.push({
        code: 'FILE_TOO_LARGE',
        message: `File is too large (${this.formatFileSize(file.size)}). Maximum allowed size is ${this.formatFileSize(this.MAX_FILE_SIZE)}.`,
        severity: 'error'
      });
      return;
    }

    // File size warnings
    if (file.size > 10 * 1024 * 1024) { // 10MB
      result.warnings.push({
        code: 'FILE_LARGE',
        message: `Large file detected (${this.formatFileSize(file.size)})`,
        suggestion: 'Consider splitting large files for better performance'
      });
    }

    // File type validation
    const detectedType = this.detectFileType(file.name);
    if (!this.isSupportedFileType(detectedType)) {
      result.errors.push({
        code: 'FILE_TYPE_UNSUPPORTED',
        message: `Unsupported file type: ${detectedType}. Supported types: JSON, TXT`,
        severity: 'error'
      });
    }

    // Filename validation
    if (!this.isValidFilename(file.name)) {
      result.warnings.push({
        code: 'FILENAME_INVALID_CHARS',
        message: 'Filename contains special characters',
        suggestion: 'Consider using alphanumeric characters and underscores only'
      });
    }
  }

  private static async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        resolve(content);
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`));
      };
      
      reader.readAsText(file, 'utf-8');
    });
  }

  private static validateFileContent(content: string, result: FileValidationResult): void {
    // Empty content validation
    if (!content || content.trim().length === 0) {
      result.errors.push({
        code: 'CONTENT_EMPTY',
        message: 'File content is empty or contains only whitespace.',
        severity: 'error'
      });
      return;
    }

    // Encoding validation
    if (this.hasInvalidCharacters(content)) {
      result.warnings.push({
        code: 'ENCODING_ISSUES',
        message: 'File may contain invalid characters or encoding issues',
        suggestion: 'Ensure file is saved in UTF-8 encoding'
      });
    }

    // Update metadata
    result.metadata.encoding = this.detectEncoding(content);
  }

  private static async validateJsonContent(content: string, result: FileValidationResult): Promise<void> {
    try {
      // Try to parse JSON
      const parsed = JSON.parse(content);
      
      // Validate JSON structure
      this.validateJsonStructure(parsed, result);
      
      // Update metadata with JSON-specific info
      result.metadata.structure = this.detectJsonStructure(parsed);
      result.metadata.depth = this.calculateJsonDepth(parsed);
      result.metadata.recordCount = this.countJsonRecords(parsed);
      result.metadata.fields = this.extractJsonFields(parsed);
      
    } catch (parseError) {
      const error = parseError as Error;
      const lineInfo = this.extractLineInfo(error.message);
      
      result.errors.push({
        code: 'JSON_PARSE_ERROR',
        message: 'Invalid JSON format: ' + this.makeErrorUserFriendly(error.message),
        severity: 'error',
        line: lineInfo.line,
        column: lineInfo.column
      });
    }
  }

  private static validateJsonStructure(parsed: any, result: FileValidationResult): void {
    // Check depth
    const depth = this.calculateJsonDepth(parsed);
    if (depth > this.MAX_JSON_DEPTH) {
      result.warnings.push({
        code: 'JSON_TOO_DEEP',
        message: `JSON structure is very deep (${depth} levels)`,
        suggestion: 'Consider flattening the structure for better performance'
      });
    }

    // Check array size
    if (Array.isArray(parsed) && parsed.length > this.MAX_ARRAY_LENGTH) {
      result.warnings.push({
        code: 'ARRAY_TOO_LARGE',
        message: `Large array detected (${parsed.length} items)`,
        suggestion: 'Consider processing in smaller batches'
      });
    }

    // Check for circular references
    if (this.hasCircularReferences(parsed)) {
      result.errors.push({
        code: 'CIRCULAR_REFERENCE',
        message: 'JSON contains circular references',
        severity: 'error'
      });
    }

    // Validate data types
    this.validateDataTypes(parsed, result);
  }

  private static validateDataTypes(obj: any, result: FileValidationResult, path: string = ''): void {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          this.validateDataTypes(item, result, `${path}[${index}]`);
        });
      } else {
        Object.entries(obj).forEach(([key, value]) => {
          this.validateDataTypes(value, result, path ? `${path}.${key}` : key);
        });
      }
    }

    // Check for problematic values
    if (typeof obj === 'number') {
      if (!isFinite(obj)) {
        result.warnings.push({
          code: 'INVALID_NUMBER',
          message: `Invalid number value at ${path || 'root'}`,
          suggestion: 'Replace infinite or NaN values with null or valid numbers'
        });
      }
    }

    if (typeof obj === 'string' && obj.length > 10000) {
      result.warnings.push({
        code: 'LONG_STRING',
        message: `Very long string detected at ${path || 'root'} (${obj.length} characters)`,
        suggestion: 'Consider shortening long text fields'
      });
    }
  }

  // Utility methods
  private static detectFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'json': return 'application/json';
      case 'txt': return 'text/plain';
      default: return 'application/octet-stream';
    }
  }

  private static isSupportedFileType(type: string): boolean {
    return this.SUPPORTED_MIME_TYPES.includes(type) || 
           type === 'application/octet-stream'; // Allow unknown types but warn
  }

  private static isJsonFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.json') || 
           file.type === 'application/json';
  }

  private static isValidFilename(filename: string): boolean {
    // Allow alphanumeric, underscore, dash, dot
    const validPattern = /^[a-zA-Z0-9._-]+$/;
    return validPattern.test(filename);
  }

  private static hasInvalidCharacters(content: string): boolean {
    // Check for null bytes or other control characters
    return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(content);
  }

  private static detectEncoding(content: string): string {
    // Simple encoding detection
    if (/[\u0080-\uFFFF]/.test(content)) {
      return 'UTF-8';
    }
    return 'ASCII';
  }

  private static detectJsonStructure(obj: any): 'array' | 'object' | 'primitive' | 'mixed' {
    if (Array.isArray(obj)) {
      return 'array';
    } else if (obj && typeof obj === 'object') {
      return 'object';
    } else {
      return 'primitive';
    }
  }

  private static calculateJsonDepth(obj: any, currentDepth: number = 0): number {
    if (obj === null || typeof obj !== 'object') {
      return currentDepth;
    }

    let maxDepth = currentDepth;
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const depth = this.calculateJsonDepth(item, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    } else {
      for (const value of Object.values(obj)) {
        const depth = this.calculateJsonDepth(value, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth;
  }

  private static countJsonRecords(obj: any): number {
    if (Array.isArray(obj)) {
      return obj.length;
    } else if (obj && typeof obj === 'object') {
      return Object.keys(obj).length;
    }
    return 1;
  }

  private static extractJsonFields(obj: any): string[] {
    const fields = new Set<string>();
    
    const extractFieldsRecursive = (current: any, prefix: string = '') => {
      if (current && typeof current === 'object') {
        if (Array.isArray(current)) {
          current.forEach((item, index) => {
            if (item && typeof item === 'object') {
              extractFieldsRecursive(item, prefix);
            }
          });
        } else {
          Object.keys(current).forEach(key => {
            const fieldName = prefix ? `${prefix}.${key}` : key;
            fields.add(fieldName);
            extractFieldsRecursive(current[key], fieldName);
          });
        }
      }
    };

    extractFieldsRecursive(obj);
    return Array.from(fields).slice(0, 100); // Limit to first 100 fields
  }

  private static hasCircularReferences(obj: any, seen = new WeakSet()): boolean {
    if (obj === null || typeof obj !== 'object') {
      return false;
    }

    if (seen.has(obj)) {
      return true;
    }

    seen.add(obj);

    try {
      if (Array.isArray(obj)) {
        return obj.some(item => this.hasCircularReferences(item, seen));
      } else {
        return Object.values(obj).some(value => this.hasCircularReferences(value, seen));
      }
    } finally {
      seen.delete(obj);
    }
  }

  private static extractLineInfo(errorMessage: string): { line?: number; column?: number } {
    const lineMatch = errorMessage.match(/line (\d+)/i);
    const columnMatch = errorMessage.match(/column (\d+)/i);
    
    return {
      line: lineMatch ? parseInt(lineMatch[1]) : undefined,
      column: columnMatch ? parseInt(columnMatch[1]) : undefined
    };
  }

  private static makeErrorUserFriendly(message: string): string {
    const friendlyMessages: Record<string, string> = {
      'Unexpected token': 'Invalid character found',
      'Unexpected end of JSON input': 'Incomplete JSON - missing closing brackets or quotes',
      'Expected property name': 'Missing property name or quotes',
      'Unexpected string': 'Unexpected text found',
    };

    for (const [technical, friendly] of Object.entries(friendlyMessages)) {
      if (message.includes(technical)) {
        return friendly;
      }
    }

    return message;
  }

  private static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// Export utility functions
export const validateFile = FileValidator.validateFile.bind(FileValidator);
export default FileValidator;