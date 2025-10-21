/**
 * Comprehensive Error Handling System
 * Professional error management with user-friendly messages and recovery options
 */

import { logger, LogCategory, logError, logCritical } from './logger';

export enum ErrorType {
  VALIDATION = 'validation',
  PROCESSING = 'processing',
  FILE_OPERATION = 'file_operation',
  MEMORY = 'memory',
  NETWORK = 'network',
  PERMISSION = 'permission',
  FORMAT = 'format',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AppError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  userMessage: string;
  technicalMessage: string;
  metadata?: Record<string, any>;
  recoveryOptions?: RecoveryOption[];
  timestamp: string;
  context?: string;
}

export interface RecoveryOption {
  label: string;
  action: () => void | Promise<void>;
  description: string;
}

export interface ErrorHandlerConfig {
  enableUserNotification: boolean;
  enableAutoRecovery: boolean;
  enableErrorReporting: boolean;
  maxRetryAttempts: number;
  retryDelay: number;
}

// Custom Error Classes
export class ValidationError extends Error implements AppError {
  type = ErrorType.VALIDATION as const;
  severity = ErrorSeverity.MEDIUM as const;
  code: string;
  userMessage: string;
  technicalMessage: string;
  metadata?: Record<string, any>;
  recoveryOptions?: RecoveryOption[];
  timestamp: string;
  context?: string;

  constructor(
    message: string,
    code: string,
    userMessage: string,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.userMessage = userMessage;
    this.technicalMessage = message;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

export class ProcessingError extends Error implements AppError {
  type = ErrorType.PROCESSING as const;
  severity = ErrorSeverity.HIGH as const;
  code: string;
  userMessage: string;
  technicalMessage: string;
  metadata?: Record<string, any>;
  recoveryOptions?: RecoveryOption[];
  timestamp: string;
  context?: string;

  constructor(
    message: string,
    code: string,
    userMessage: string,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'ProcessingError';
    this.code = code;
    this.userMessage = userMessage;
    this.technicalMessage = message;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

export class FileOperationError extends Error implements AppError {
  type = ErrorType.FILE_OPERATION as const;
  severity = ErrorSeverity.MEDIUM as const;
  code: string;
  userMessage: string;
  technicalMessage: string;
  metadata?: Record<string, any>;
  recoveryOptions?: RecoveryOption[];
  timestamp: string;
  context?: string;

  constructor(
    message: string,
    code: string,
    userMessage: string,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'FileOperationError';
    this.code = code;
    this.userMessage = userMessage;
    this.technicalMessage = message;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

export class MemoryError extends Error implements AppError {
  type = ErrorType.MEMORY as const;
  severity = ErrorSeverity.CRITICAL as const;
  code: string;
  userMessage: string;
  technicalMessage: string;
  metadata?: Record<string, any>;
  recoveryOptions?: RecoveryOption[];
  timestamp: string;
  context?: string;

  constructor(
    message: string,
    code: string,
    userMessage: string,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'MemoryError';
    this.code = code;
    this.userMessage = userMessage;
    this.technicalMessage = message;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

// Error Handler Class
export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorCallbacks: ((error: AppError) => void)[] = [];
  private retryCache = new Map<string, number>();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableUserNotification: true,
      enableAutoRecovery: true,
      enableErrorReporting: true,
      maxRetryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  // Register error callback
  onError(callback: (error: AppError) => void): void {
    this.errorCallbacks.push(callback);
  }

  // Handle any error
  handle(error: Error | AppError, context?: string): AppError {
    const appError = this.normalizeError(error, context);
    
    // Log the error
    this.logError(appError);
    
    // Notify callbacks
    this.notifyCallbacks(appError);
    
    // Attempt auto-recovery if enabled
    if (this.config.enableAutoRecovery && appError.recoveryOptions) {
      this.attemptAutoRecovery(appError);
    }

    return appError;
  }

  // Safe async operation wrapper
  async wrapAsync<T>(
    operation: () => Promise<T>,
    context: string,
    retryKey?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const appError = this.handle(error as Error, context);
      
      // Retry logic
      if (retryKey && this.shouldRetry(retryKey)) {
        logger.info(LogCategory.SYSTEM, `Retrying operation: ${context}`, {
          retryKey,
          attempt: this.getRetryCount(retryKey) + 1
        });
        
        await this.delay(this.config.retryDelay);
        return this.wrapAsync(operation, context, retryKey);
      }
      
      throw appError;
    }
  }

  // Safe sync operation wrapper
  wrapSync<T>(
    operation: () => T,
    context: string,
    retryKey?: string
  ): T {
    try {
      return operation();
    } catch (error) {
      const appError = this.handle(error as Error, context);
      
      // Retry logic for sync operations
      if (retryKey && this.shouldRetry(retryKey)) {
        logger.info(LogCategory.SYSTEM, `Retrying sync operation: ${context}`, {
          retryKey,
          attempt: this.getRetryCount(retryKey) + 1
        });
        
        return this.wrapSync(operation, context, retryKey);
      }
      
      throw appError;
    }
  }

  private normalizeError(error: Error | AppError, context?: string): AppError {
    if (this.isAppError(error)) {
      if (context) error.context = context;
      return error;
    }

    // Convert regular Error to AppError
    const errorType = this.detectErrorType(error);
    const severity = this.detectSeverity(error, errorType);
    const code = this.generateErrorCode(errorType, error);
    const userMessage = this.generateUserMessage(error, errorType);

    const appError: AppError = {
      ...error,
      type: errorType,
      severity,
      code,
      userMessage,
      technicalMessage: error.message,
      timestamp: new Date().toISOString(),
      context,
      recoveryOptions: this.generateRecoveryOptions(errorType, error)
    };

    return appError;
  }

  private isAppError(error: any): error is AppError {
    return error && 
           typeof error.type === 'string' && 
           typeof error.severity === 'string' &&
           typeof error.code === 'string' &&
           typeof error.userMessage === 'string';
  }

  private detectErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('json') || message.includes('parse')) {
      return ErrorType.FORMAT;
    }
    if (message.includes('file') || message.includes('read') || message.includes('write')) {
      return ErrorType.FILE_OPERATION;
    }
    if (message.includes('memory') || message.includes('heap')) {
      return ErrorType.MEMORY;
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('permission') || message.includes('access')) {
      return ErrorType.PERMISSION;
    }
    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    
    return ErrorType.UNKNOWN;
  }

  private detectSeverity(error: Error, type: ErrorType): ErrorSeverity {
    if (type === ErrorType.MEMORY || type === ErrorType.PERMISSION) {
      return ErrorSeverity.CRITICAL;
    }
    if (type === ErrorType.PROCESSING || type === ErrorType.FILE_OPERATION) {
      return ErrorSeverity.HIGH;
    }
    if (type === ErrorType.VALIDATION || type === ErrorType.FORMAT) {
      return ErrorSeverity.MEDIUM;
    }
    return ErrorSeverity.LOW;
  }

  private generateErrorCode(type: ErrorType, error: Error): string {
    const timestamp = Date.now().toString(36);
    const typeCode = type.toUpperCase().substring(0, 3);
    const hash = error.message.length.toString(36);
    return `${typeCode}_${timestamp}_${hash}`;
  }

  private generateUserMessage(error: Error, type: ErrorType): string {
    const userMessages: Record<ErrorType, string> = {
      [ErrorType.VALIDATION]: 'The data provided is not valid. Please check your input and try again.',
      [ErrorType.PROCESSING]: 'An error occurred while processing your data. Please try again or contact support.',
      [ErrorType.FILE_OPERATION]: 'There was a problem with the file operation. Please check the file and try again.',
      [ErrorType.MEMORY]: 'The operation requires too much memory. Try processing smaller files or refresh the page.',
      [ErrorType.NETWORK]: 'Network connection error. Please check your internet connection and try again.',
      [ErrorType.PERMISSION]: 'Permission denied. Please check your browser settings or file permissions.',
      [ErrorType.FORMAT]: 'The file format is not supported or corrupted. Please use a valid JSON file.',
      [ErrorType.TIMEOUT]: 'The operation timed out. Please try again with a smaller dataset.',
      [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again or contact support.'
    };

    return userMessages[type] || userMessages[ErrorType.UNKNOWN];
  }

  private generateRecoveryOptions(type: ErrorType, error: Error): RecoveryOption[] {
    const options: RecoveryOption[] = [];

    switch (type) {
      case ErrorType.MEMORY:
        options.push({
          label: 'Refresh Page',
          action: () => window.location.reload(),
          description: 'Refresh the page to free up memory'
        });
        break;
        
      case ErrorType.FILE_OPERATION:
        options.push({
          label: 'Try Different File',
          action: () => logger.info(LogCategory.USER_ACTION, 'User chose to try different file'),
          description: 'Select a different file to process'
        });
        break;
        
      case ErrorType.FORMAT:
        options.push({
          label: 'Validate JSON',
          action: () => { window.open('https://jsonlint.com/', '_blank'); },
          description: 'Validate your JSON format online'
        });
        break;
        
      case ErrorType.NETWORK:
        options.push({
          label: 'Retry',
          action: () => logger.info(LogCategory.USER_ACTION, 'User chose to retry network operation'),
          description: 'Retry the operation'
        });
        break;
    }

    // Always add a generic retry option
    options.push({
      label: 'Try Again',
      action: () => logger.info(LogCategory.USER_ACTION, 'User chose to try again'),
      description: 'Retry the last operation'
    });

    return options;
  }

  private logError(error: AppError): void {
    const metadata = {
      type: error.type,
      severity: error.severity,
      code: error.code,
      context: error.context,
      ...error.metadata
    };

    if (error.severity === ErrorSeverity.CRITICAL) {
      logCritical(error.technicalMessage, metadata);
    } else {
      logError(error.technicalMessage, metadata);
    }
  }

  private notifyCallbacks(error: AppError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        logger.error(LogCategory.SYSTEM, 'Error in error callback', {
          originalError: error.code,
          callbackError: (callbackError as Error).message
        });
      }
    });
  }

  private async attemptAutoRecovery(error: AppError): Promise<void> {
    if (!error.recoveryOptions || error.recoveryOptions.length === 0) return;

    // For now, just log the auto-recovery attempt
    logger.info(LogCategory.SYSTEM, 'Auto-recovery options available', {
      errorCode: error.code,
      optionsCount: error.recoveryOptions.length
    });
  }

  private shouldRetry(retryKey: string): boolean {
    const currentAttempts = this.getRetryCount(retryKey);
    return currentAttempts < this.config.maxRetryAttempts;
  }

  private getRetryCount(retryKey: string): number {
    const count = this.retryCache.get(retryKey) || 0;
    this.retryCache.set(retryKey, count + 1);
    return count;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Utility functions for common error scenarios
export const createValidationError = (
  field: string,
  value: any,
  expectedType: string
): ValidationError => {
  return new ValidationError(
    `Invalid ${field}: expected ${expectedType}, got ${typeof value}`,
    `VALIDATION_${field.toUpperCase()}_INVALID`,
    `Please provide a valid ${field}. Expected: ${expectedType}`,
    { field, value, expectedType }
  );
};

export const createFileError = (
  operation: string,
  filename: string,
  reason: string
): FileOperationError => {
  return new FileOperationError(
    `File ${operation} failed for ${filename}: ${reason}`,
    `FILE_${operation.toUpperCase()}_FAILED`,
    `Failed to ${operation} file "${filename}". ${reason}`,
    { operation, filename, reason }
  );
};

export const createProcessingError = (
  operation: string,
  details: string
): ProcessingError => {
  return new ProcessingError(
    `Processing failed during ${operation}: ${details}`,
    `PROCESSING_${operation.toUpperCase()}_FAILED`,
    `Processing failed. Please try again or use smaller files.`,
    { operation, details }
  );
};

export const createMemoryError = (
  operation: string,
  memoryUsage?: string
): MemoryError => {
  return new MemoryError(
    `Memory limit exceeded during ${operation}`,
    `MEMORY_LIMIT_EXCEEDED`,
    `Not enough memory to complete this operation. Try refreshing the page or using smaller files.`,
    { operation, memoryUsage }
  );
};

// Global error handler instance
export const errorHandler = new ErrorHandler();

// Setup global error handling
errorHandler.onError((error) => {
  // Additional global error handling can be added here
  logger.error(LogCategory.ERROR, 'Global error handler triggered', {
    errorCode: error.code,
    errorType: error.type,
    severity: error.severity
  });
});