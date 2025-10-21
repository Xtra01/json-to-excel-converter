/**
 * Enhanced CSV Export Utilities
 * Professional CSV generation with advanced options
 */

import { Row, ExportResult, ExportConfig } from '../types';
import { logger, LogCategory, createPerformanceTracker } from './logger';
import { errorHandler, FileOperationError } from './errorHandler';
import { AsyncProcessor, FileSizeEstimator } from './performance';

export interface CSVConfig {
  delimiter: string;
  quote: string;
  escape: string;
  newline: string;
  header: boolean;
  encoding: 'utf-8' | 'utf-8-bom' | 'ascii' | 'latin1';
  dateFormat?: string;
  numberFormat?: Intl.NumberFormatOptions;
  booleanFormat: { true: string; false: string };
  nullFormat: string;
  customFormatters?: Record<string, (value: any) => string>;
}

export const DEFAULT_CSV_CONFIG: CSVConfig = {
  delimiter: ',',
  quote: '"',
  escape: '"',
  newline: '\r\n',
  header: true,
  encoding: 'utf-8-bom',
  booleanFormat: { true: 'true', false: 'false' },
  nullFormat: '',
  numberFormat: { maximumFractionDigits: 10 }
};

export class CSVGenerator {
  private config: CSVConfig;

  constructor(config: Partial<CSVConfig> = {}) {
    this.config = { ...DEFAULT_CSV_CONFIG, ...config };
  }

  async generateCSV(
    data: Row[],
    columns?: string[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<string> {
    if (!data || data.length === 0) {
      throw new FileOperationError(
        'No data provided for CSV generation',
        'CSV_NO_DATA',
        'Cannot generate CSV: No data provided.'
      );
    }

    const tracker = createPerformanceTracker('csv_generation', {
      rowCount: data.length,
      columnCount: columns?.length || 0
    });

    try {
      // Determine columns if not provided
      const csvColumns = columns || this.extractColumns(data);
      
      tracker.checkpoint('Columns extracted', { columnCount: csvColumns.length });

      // Generate header
      let csvContent = '';
      if (this.config.header) {
        csvContent += this.generateHeaderRow(csvColumns);
      }

      // Process data in batches for large datasets
      const batchSize = this.calculateOptimalBatchSize(data.length);
      let processedRows = 0;

      await AsyncProcessor.processInBatches(
        data,
        (row, index) => this.formatDataRow(row, csvColumns),
        {
          batchSize,
          onProgress: (processed) => {
            processedRows = processed;
            onProgress?.(processed, data.length);
          },
          onBatchComplete: (batchIndex, batchResults) => {
            csvContent += batchResults.join('');
            tracker.checkpoint(`Batch ${batchIndex + 1} completed`, {
              processedRows: processedRows
            });
          }
        }
      );

      tracker.complete({ 
        totalRows: processedRows,
        outputSize: csvContent.length 
      });

      logger.info(LogCategory.EXPORT, 'CSV generation completed', {
        rowCount: data.length,
        columnCount: csvColumns.length,
        outputSize: Math.round(csvContent.length / 1024) + 'KB'
      });

      return csvContent;

    } catch (error) {
      tracker.error(error as Error);
      throw errorHandler.handle(error as Error, 'CSV Generation');
    }
  }

  private extractColumns(data: Row[]): string[] {
    const columnSet = new Set<string>();
    
    // Sample first 100 rows to determine all possible columns
    const sampleSize = Math.min(100, data.length);
    for (let i = 0; i < sampleSize; i++) {
      Object.keys(data[i] || {}).forEach(key => columnSet.add(key));
    }

    return Array.from(columnSet).sort();
  }

  private calculateOptimalBatchSize(totalRows: number): number {
    // Adjust batch size based on total rows
    if (totalRows < 1000) return totalRows;
    if (totalRows < 10000) return 500;
    if (totalRows < 50000) return 1000;
    return 2000;
  }

  private generateHeaderRow(columns: string[]): string {
    const formattedHeaders = columns.map(col => this.formatValue(col, 'string'));
    return formattedHeaders.join(this.config.delimiter) + this.config.newline;
  }

  private formatDataRow(row: Row, columns: string[]): string {
    const values = columns.map(col => {
      const value = row[col];
      return this.formatValue(value, this.detectValueType(value));
    });

    return values.join(this.config.delimiter) + this.config.newline;
  }

  private formatValue(value: any, type: string): string {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return this.config.nullFormat;
    }

    // Apply custom formatters first
    if (this.config.customFormatters) {
      for (const [pattern, formatter] of Object.entries(this.config.customFormatters)) {
        if (type === pattern) {
          return this.escapeValue(formatter(value));
        }
      }
    }

    let formatted: string;

    switch (type) {
      case 'boolean':
        formatted = value ? this.config.booleanFormat.true : this.config.booleanFormat.false;
        break;
        
      case 'number':
        if (this.config.numberFormat) {
          formatted = new Intl.NumberFormat('en-US', this.config.numberFormat).format(value);
        } else {
          formatted = String(value);
        }
        break;
        
      case 'date':
        if (this.config.dateFormat) {
          formatted = this.formatDate(value, this.config.dateFormat);
        } else {
          formatted = value instanceof Date ? value.toISOString() : String(value);
        }
        break;
        
      case 'array':
        formatted = Array.isArray(value) ? value.join('; ') : String(value);
        break;
        
      case 'object':
        formatted = typeof value === 'object' ? JSON.stringify(value) : String(value);
        break;
        
      default:
        formatted = String(value);
    }

    return this.escapeValue(formatted);
  }

  private detectValueType(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  private formatDate(value: any, format: string): string {
    const date = value instanceof Date ? value : new Date(value);
    
    if (isNaN(date.getTime())) {
      return String(value);
    }

    // Simple date formatting - can be extended
    switch (format) {
      case 'ISO':
        return date.toISOString();
      case 'ISO_DATE':
        return date.toISOString().split('T')[0];
      case 'US':
        return date.toLocaleDateString('en-US');
      case 'EU':
        return date.toLocaleDateString('en-GB');
      default:
        return date.toISOString();
    }
  }

  private escapeValue(value: string): string {
    // Check if value needs quoting
    const needsQuoting = 
      value.includes(this.config.delimiter) ||
      value.includes(this.config.quote) ||
      value.includes(this.config.newline) ||
      value.includes('\n') ||
      value.includes('\r');

    if (!needsQuoting) {
      return value;
    }

    // Escape quotes within the value
    const escaped = value.replace(
      new RegExp(this.config.quote, 'g'), 
      this.config.escape + this.config.quote
    );

    return this.config.quote + escaped + this.config.quote;
  }

  updateConfig(newConfig: Partial<CSVConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    logger.info(LogCategory.SYSTEM, 'CSV config updated', {
      newConfig: Object.keys(newConfig)
    });
  }
}

// ============= Export Functions =============

export async function downloadCSV(
  data: Row[],
  filename: string = 'export.csv',
  columns?: string[],
  config?: Partial<CSVConfig>,
  onProgress?: (processed: number, total: number) => void
): Promise<ExportResult> {
  const tracker = createPerformanceTracker('csv_download', {
    rowCount: data.length,
    filename
  });

  try {
    const generator = new CSVGenerator(config);
    const csvContent = await generator.generateCSV(data, columns, onProgress);
    
    // Estimate file size
    const estimatedSize = FileSizeEstimator.estimateCSVSize(data, columns || []);
    
    tracker.checkpoint('CSV content generated', {
      contentLength: csvContent.length,
      estimatedSize
    });

    // Create and download file
    const encoding = config?.encoding || 'utf-8-bom';
    const blob = createCSVBlob(csvContent, encoding);
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const result: ExportResult = {
      success: true,
      filename: link.download,
      size: blob.size,
      rowsExported: data.length,
      timeElapsed: tracker.complete()
    };

    logger.info(LogCategory.EXPORT, 'CSV download completed', result);
    return result;

  } catch (error) {
    tracker.error(error as Error);
    const appError = errorHandler.handle(error as Error, 'CSV Download');
    
    return {
      success: false,
      errors: [appError.userMessage],
      timeElapsed: Date.now() - (tracker as any).startTime
    };
  }
}

export async function generateMultipleCSVs(
  datasets: { name: string; data: Row[]; columns?: string[] }[],
  baseFilename: string = 'export',
  config?: Partial<CSVConfig>,
  onProgress?: (current: number, total: number) => void
): Promise<ExportResult> {
  const tracker = createPerformanceTracker('multiple_csv_generation', {
    datasetCount: datasets.length,
    baseFilename
  });

  try {
    const results: ExportResult[] = [];
    const filesCreated: string[] = [];

    for (let i = 0; i < datasets.length; i++) {
      const dataset = datasets[i];
      onProgress?.(i + 1, datasets.length);

      tracker.checkpoint(`Processing dataset: ${dataset.name}`, {
        datasetIndex: i,
        rowCount: dataset.data.length
      });

      const filename = `${baseFilename}_${dataset.name}.csv`;
      const result = await downloadCSV(
        dataset.data,
        filename,
        dataset.columns,
        config
      );

      results.push(result);
      if (result.success && result.filename) {
        filesCreated.push(result.filename);
      }
    }

    const totalRows = results.reduce((sum, r) => sum + (r.rowsExported || 0), 0);
    const successCount = results.filter(r => r.success).length;

    const finalResult: ExportResult = {
      success: successCount === datasets.length,
      filesCreated,
      rowsExported: totalRows,
      timeElapsed: tracker.complete(),
      warnings: successCount < datasets.length ? 
        [`${datasets.length - successCount} files failed to export`] : undefined
    };

    logger.info(LogCategory.EXPORT, 'Multiple CSV generation completed', {
      ...finalResult,
      successRate: `${successCount}/${datasets.length}`
    });

    return finalResult;

  } catch (error) {
    tracker.error(error as Error);
    throw errorHandler.handle(error as Error, 'Multiple CSV Generation');
  }
}

function createCSVBlob(content: string, encoding: string): Blob {
  const options: BlobPropertyBag = { type: 'text/csv;charset=utf-8' };
  
  switch (encoding) {
    case 'utf-8-bom':
      // Add UTF-8 BOM for better Excel compatibility
      const bom = '\uFEFF';
      return new Blob([bom + content], options);
      
    case 'utf-8':
      return new Blob([content], options);
      
    case 'ascii':
    case 'latin1':
      // Note: Modern browsers may not fully support these encodings
      // This is a best-effort attempt
      const encoder = new TextEncoder();
      const encoded = encoder.encode(content);
      return new Blob([encoded], options);
      
    default:
      return new Blob([content], options);
  }
}

// ============= Utility Functions =============

export function copyToClipboard(
  data: Row[],
  columns?: string[],
  config?: Partial<CSVConfig>
): Promise<boolean> {
  const tracker = createPerformanceTracker('clipboard_copy', {
    rowCount: data.length
  });

  return new Promise(async (resolve) => {
    try {
      const generator = new CSVGenerator({
        ...config,
        delimiter: '\t', // Use tab for clipboard (Excel-friendly)
        newline: '\n'
      });

      const content = await generator.generateCSV(data, columns);
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      tracker.complete();
      logger.info(LogCategory.USER_ACTION, 'Data copied to clipboard', {
        rowCount: data.length,
        columnCount: columns?.length || 0
      });

      resolve(true);

    } catch (error) {
      tracker.error(error as Error);
      logger.error(LogCategory.ERROR, 'Failed to copy to clipboard', { error });
      resolve(false);
    }
  });
}

export function detectDelimiter(sampleText: string): string {
  const delimiters = [',', ';', '\t', '|'];
  const counts = delimiters.map(delim => 
    (sampleText.match(new RegExp(`\\${delim}`, 'g')) || []).length
  );
  
  const maxIndex = counts.indexOf(Math.max(...counts));
  return delimiters[maxIndex] || ',';
}

export function validateCSVData(data: Row[]): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!Array.isArray(data)) {
    issues.push('Data must be an array');
    return { isValid: false, issues };
  }

  if (data.length === 0) {
    issues.push('Data array is empty');
    return { isValid: false, issues };
  }

  // Check for consistent column structure
  const firstRowKeys = Object.keys(data[0] || {});
  if (firstRowKeys.length === 0) {
    issues.push('First row has no columns');
  }

  // Sample check for consistency (first 10 rows)
  const sampleSize = Math.min(10, data.length);
  for (let i = 1; i < sampleSize; i++) {
    const currentKeys = Object.keys(data[i] || {});
    const missingKeys = firstRowKeys.filter(key => !currentKeys.includes(key));
    const extraKeys = currentKeys.filter(key => !firstRowKeys.includes(key));
    
    if (missingKeys.length > 0 || extraKeys.length > 0) {
      issues.push(`Row ${i + 1} has inconsistent structure`);
      break; // Only report first inconsistency
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}