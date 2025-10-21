'use client';

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

export type Row = Record<string, any>;

export type FileData = {
  id: string;
  name: string;
  file: File;
  content: string;
  rows: Row[];
  error?: string;
  selected: boolean;
  isFromFolder: boolean;
  folderPath?: string;
};

export type FolderData = {
  id: string;
  path: string;
  selected: boolean;
  files: FileData[];
  validFileCount: number;
};

export type ProcessingMode = 'single' | 'bulk';

export type ProgressState = {
  isProcessing: boolean;
  current: number;
  total: number;
  message: string;
  errors?: string[];
  warnings?: string[];
  debug?: string[];
  timeStarted?: number;
  lastActivity?: number;
  currentBatch?: number;
  canCancel?: boolean;
  details?: {
    currentFile?: string;
    memoryUsage?: string;
    totalRows?: number;
    batchProgress?: number;
  };
};

function flattenObject(obj: any, parentKey = '', delimiter = '_', depth = 0, maxDepth = 10): Record<string, any> {
  if (depth >= maxDepth) return {[parentKey || 'value']: obj};
  
  let result: Record<string, any> = {};
  
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = parentKey ? `${parentKey}${delimiter}${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(result, flattenObject(obj[key], newKey, delimiter, depth + 1, maxDepth));
      } else if (Array.isArray(obj[key])) {
        result[newKey] = obj[key].map((item: any, index: number) => {
          if (typeof item === 'object' && item !== null) {
            return JSON.stringify(item);
          }
          return item;
        }).join('; ');
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  
  return result;
}

function toRecords(data: any, delimiter: string, maxDepth: number): Row[] {
  if (!data) return [];
  
  try {
    if (Array.isArray(data)) {
      return data.map(item => flattenObject(item, '', delimiter, 0, maxDepth));
    } else if (typeof data === 'object') {
      return [flattenObject(data, '', delimiter, 0, maxDepth)];
    } else {
      return [{ value: data }];
    }
  } catch (e) {
    console.error('Error converting to records:', e);
    return [];
  }
}

function downloadXLSX(rows: Row[], filename = "converted.xlsx", sheetName = "data", order?: string[]) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: order });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

// Debug utilities
function getMemoryInfo(): string {
  if ('memory' in performance) {
    const mem = (performance as any).memory;
    return `${Math.round(mem.usedJSHeapSize / 1024 / 1024)}MB / ${Math.round(mem.totalJSHeapSize / 1024 / 1024)}MB`;
  }
  return 'N/A';
}

function addDebugLog(logs: string[], message: string): string[] {
  const timestamp = new Date().toLocaleTimeString();
  const newLog = `[${timestamp}] ${message}`;
  return [...logs.slice(-10), newLog]; // Keep last 10 logs
}

// Force garbage collection and memory cleanup
async function forceMemoryCleanup(): Promise<void> {
  // Force garbage collection if available
  if ('gc' in window) {
    (window as any).gc();
  }
  
  // Force a longer delay to allow memory cleanup
  await new Promise(resolve => setTimeout(resolve, 200));
}

// Async wrapper for XLSX operations to prevent UI blocking
async function createWorksheetAsync(data: Row[], options?: { header?: string[] }): Promise<any> {
  return new Promise((resolve) => {
    // Use requestIdleCallback or setTimeout to prevent UI blocking
    const callback = () => {
      try {
        const worksheet = XLSX.utils.json_to_sheet(data, options);
        resolve(worksheet);
      } catch (error) {
        resolve(null);
      }
    };
    
    if (window.requestIdleCallback) {
      window.requestIdleCallback(callback);
    } else {
      setTimeout(callback, 0);
    }
  });
}

// Async wrapper for writing Excel files
async function writeWorkbookAsync(workbook: any, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const callback = () => {
      try {
        XLSX.writeFile(workbook, filename);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    
    if (window.requestIdleCallback) {
      window.requestIdleCallback(callback);
    } else {
      setTimeout(callback, 0);
    }
  });
}

// Yield control back to the browser for UI updates
async function yieldToMainThread(): Promise<void> {
  return new Promise(resolve => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

// Ultra-robust batch processing with comprehensive debugging and memory management
async function downloadBulkXLSXSuperRobust(
  files: FileData[], 
  filename = "bulk_converted", 
  order?: string[], 
  onProgress?: (progress: ProgressState) => void,
  onCancel?: () => boolean
) {
  const selectedFiles = files.filter(f => f.selected);
  const validFiles = selectedFiles.filter(f => f.rows.length > 0);
  const errorFiles = selectedFiles.filter(f => f.error || f.rows.length === 0);
  
  let debugLogs: string[] = [];
  let isCancelled = false;
  const startTime = Date.now();
  
  if (selectedFiles.length === 0) {
    onProgress?.({
      isProcessing: false,
      current: 0,
      total: 0,
      message: "No files selected for export",
      timeStarted: startTime,
      lastActivity: Date.now()
    });
    return;
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  
  debugLogs = addDebugLog(debugLogs, `Started processing ${validFiles.length} valid files, ${errorFiles.length} error files`);
  debugLogs = addDebugLog(debugLogs, `Memory at start: ${getMemoryInfo()}`);
  
  if (errorFiles.length > 0) {
    warnings.push(`${errorFiles.length} files have errors or no data and will be reported separately`);
  }

  const BATCH_SIZE = 15; // Reduced for better memory management
  const batches = [];
  
  // Split files into batches
  for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
    batches.push(validFiles.slice(i, i + BATCH_SIZE));
  }

  const totalSteps = batches.length + 2; // +1 for combined, +1 for error report

  debugLogs = addDebugLog(debugLogs, `Created ${batches.length} batches of max ${BATCH_SIZE} files each`);

  onProgress?.({
    isProcessing: true,
    current: 0,
    total: totalSteps,
    message: `Initializing ${batches.length} batches (${BATCH_SIZE} files max each)...`,
    warnings,
    debug: debugLogs,
    timeStarted: startTime,
    lastActivity: Date.now(),
    canCancel: true,
    details: {
      memoryUsage: getMemoryInfo(),
      totalRows: validFiles.reduce((sum, f) => sum + f.rows.length, 0)
    }
  });

  // Check for cancellation function
  const checkCancellation = () => {
    if (onCancel && onCancel()) {
      isCancelled = true;
      return true;
    }
    return false;
  };

  try {
    // Step 1: Create combined data file with memory management
    debugLogs = addDebugLog(debugLogs, "Starting combined data creation");
    
    onProgress?.({
      isProcessing: true,
      current: 0,
      total: totalSteps,
      message: "Creating combined data file...",
      warnings,
      debug: debugLogs,
      timeStarted: startTime,
      lastActivity: Date.now(),
      canCancel: true,
      details: {
        memoryUsage: getMemoryInfo(),
        currentFile: "Combined Data",
        totalRows: 0
      }
    });

    const allRows: Row[] = [];
    let processedRowCount = 0;
    
    // Process in smaller chunks for memory efficiency
    for (let i = 0; i < validFiles.length; i += 3) {
      if (checkCancellation()) {
        debugLogs = addDebugLog(debugLogs, "Export cancelled by user during combined data creation");
        break;
      }

      const chunk = validFiles.slice(i, i + 3);
      
      try {
        chunk.forEach(file => {
          file.rows.forEach(row => {
            allRows.push({
              ...row,
              '_source_file': file.name,
              '_source_folder': file.folderPath || 'Root'
            });
          });
          processedRowCount += file.rows.length;
        });
        
        // Memory management break every 10 files
        if (i % 9 === 0) {
          await forceMemoryCleanup();
          debugLogs = addDebugLog(debugLogs, `Combined data: processed ${i + 3} files, ${processedRowCount} rows, memory: ${getMemoryInfo()}`);
          
          onProgress?.({
            isProcessing: true,
            current: 0,
            total: totalSteps,
            message: `Combining data: ${i + 3}/${validFiles.length} files processed...`,
            warnings,
            debug: debugLogs,
            timeStarted: startTime,
            lastActivity: Date.now(),
            canCancel: true,
            details: {
              memoryUsage: getMemoryInfo(),
              currentFile: chunk.map(f => f.name).join(', '),
              totalRows: processedRowCount
            }
          });
        }
      } catch (chunkError) {
        debugLogs = addDebugLog(debugLogs, `Error in combined chunk ${i}: ${chunkError}`);
        errors.push(`Error processing chunk ${i}: ${chunkError}`);
      }
    }

    if (!isCancelled && allRows.length > 0) {
      try {
        debugLogs = addDebugLog(debugLogs, `Creating combined Excel with ${allRows.length} rows`);
        const wb = XLSX.utils.book_new();
        const combinedWs = XLSX.utils.json_to_sheet(allRows, { header: order });
        XLSX.utils.book_append_sheet(wb, combinedWs, "Combined_Data");
        XLSX.writeFile(wb, `${filename}_COMBINED.xlsx`);
        debugLogs = addDebugLog(debugLogs, "Combined Excel file created successfully");
      } catch (error) {
        debugLogs = addDebugLog(debugLogs, `Failed to create combined file: ${error}`);
        errors.push(`Failed to create combined file: ${error}`);
      }
    }

    // Force cleanup before batch processing
    await forceMemoryCleanup();

    // Step 2: Create batch files with detailed progress
    for (let batchIndex = 0; batchIndex < batches.length && !isCancelled; batchIndex++) {
      const batch = batches[batchIndex];
      
      debugLogs = addDebugLog(debugLogs, `Starting batch ${batchIndex + 1}/${batches.length} with ${batch.length} files`);
      
      onProgress?.({
        isProcessing: true,
        current: batchIndex + 1,
        total: totalSteps,
        message: `Creating batch ${batchIndex + 1}/${batches.length} (${batch.length} files)...`,
        warnings,
        debug: debugLogs,
        timeStarted: startTime,
        lastActivity: Date.now(),
        canCancel: true,
        currentBatch: batchIndex + 1,
        details: {
          memoryUsage: getMemoryInfo(),
          currentFile: `Batch ${batchIndex + 1}`,
          batchProgress: 0
        }
      });

      try {
        const wb = XLSX.utils.book_new();
        const usedSheetNames = new Set<string>();
        let successfulSheets = 0;

        for (let fileIndex = 0; fileIndex < batch.length; fileIndex++) {
          if (checkCancellation()) {
            debugLogs = addDebugLog(debugLogs, `Batch ${batchIndex + 1} cancelled at file ${fileIndex + 1}`);
            break;
          }

          const file = batch[fileIndex];
          
          try {
            let sheetName = file.name.replace(/\.[^/.]+$/, "").substring(0, 31);
            
            // Make sure sheet name is unique
            let counter = 1;
            let originalSheetName = sheetName;
            while (usedSheetNames.has(sheetName)) {
              sheetName = `${originalSheetName}_${counter}`.substring(0, 31);
              counter++;
            }
            usedSheetNames.add(sheetName);

            // Create clean sheet
            const cleanRows = file.rows.map(row => {
              const cleanRow = { ...row };
              delete cleanRow._source_file;
              delete cleanRow._source_folder;
              return cleanRow;
            });

            debugLogs = addDebugLog(debugLogs, `Adding sheet "${sheetName}" with ${cleanRows.length} rows`);
            
            // Use async worksheet creation to prevent UI blocking
            const ws = await createWorksheetAsync(cleanRows, { header: order });
            if (ws) {
              XLSX.utils.book_append_sheet(wb, ws, sheetName);
              successfulSheets++;
            } else {
              throw new Error(`Failed to create worksheet for ${file.name}`);
            }

            // Yield to main thread every file for UI responsiveness
            await yieldToMainThread();

            // Update progress every file within batch
            onProgress?.({
              isProcessing: true,
              current: batchIndex + 1,
              total: totalSteps,
              message: `Batch ${batchIndex + 1}/${batches.length}: processing file ${fileIndex + 1}/${batch.length}...`,
              warnings,
              debug: debugLogs,
              timeStarted: startTime,
              lastActivity: Date.now(),
              canCancel: true,
              currentBatch: batchIndex + 1,
              details: {
                memoryUsage: getMemoryInfo(),
                  currentFile: file.name,
                  batchProgress: Math.round((fileIndex / batch.length) * 100)
                }
              });
              
              // Micro cleanup
              await new Promise(resolve => setTimeout(resolve, 50));
            }

          } catch (sheetError) {
            debugLogs = addDebugLog(debugLogs, `Failed to create sheet for ${file.name}: ${sheetError}`);
            errors.push(`Batch ${batchIndex + 1} - Failed to create sheet for ${file.name}: ${sheetError}`);
          }
        }

        // Save batch file if not cancelled
        if (!isCancelled) {
          const batchFilename = `${filename}_BATCH_${String(batchIndex + 1).padStart(2, '0')}.xlsx`;
          debugLogs = addDebugLog(debugLogs, `Saving batch file: ${batchFilename}`);
          
          // Use async file writing to prevent UI blocking
          await writeWorkbookAsync(wb, batchFilename);
          warnings.push(`Batch ${batchIndex + 1}: ${successfulSheets}/${batch.length} sheets created`);
          debugLogs = addDebugLog(debugLogs, `Batch ${batchIndex + 1} completed successfully`);
        }

      } catch (batchError) {
        debugLogs = addDebugLog(debugLogs, `Critical error in batch ${batchIndex + 1}: ${batchError}`);
        errors.push(`Failed to create batch ${batchIndex + 1}: ${batchError}`);
      }

      // Force cleanup between batches with UI yield
      await forceMemoryCleanup();
      await yieldToMainThread();
    }

    // Step 3: Create error report if needed
    if (!isCancelled && (errorFiles.length > 0 || errors.length > 0)) {
      debugLogs = addDebugLog(debugLogs, "Creating error report");
      
      onProgress?.({
        isProcessing: true,
        current: totalSteps - 1,
        total: totalSteps,
        message: "Creating error report...",
        warnings,
        debug: debugLogs,
        timeStarted: startTime,
        lastActivity: Date.now(),
        canCancel: true,
        details: {
          memoryUsage: getMemoryInfo(),
          currentFile: "Error Report"
        }
      });

      try {
        const errorReport: Row[] = [];
        
        errorFiles.forEach(file => {
          errorReport.push({
            'File Name': file.name,
            'Folder Path': file.folderPath || 'Root',
            'Error Type': 'File Error',
            'Error Message': file.error || 'No data found',
            'Row Count': file.rows.length,
            'Status': file.error ? 'Parse Error' : 'Empty Data'
          });
        });

        errors.forEach((error, index) => {
          errorReport.push({
            'File Name': 'Processing Error',
            'Folder Path': 'N/A',
            'Error Type': 'Processing Error',
            'Error Message': error,
            'Row Count': 0,
            'Status': 'Failed'
          });
        });

        // Add debug information to error report
        debugLogs.forEach((log, index) => {
          errorReport.push({
            'File Name': 'Debug Log',
            'Folder Path': 'N/A',
            'Error Type': 'Debug Info',
            'Error Message': log,
            'Row Count': 0,
            'Status': 'Info'
          });
        });

        if (errorReport.length > 0) {
          const wb = XLSX.utils.book_new();
          const errorWs = XLSX.utils.json_to_sheet(errorReport);
          XLSX.utils.book_append_sheet(wb, errorWs, "Error_Debug_Report");
          XLSX.writeFile(wb, `${filename}_ERROR_DEBUG_REPORT.xlsx`);
          debugLogs = addDebugLog(debugLogs, "Error report created with debug information");
        }
      } catch (reportError) {
        debugLogs = addDebugLog(debugLogs, `Failed to create error report: ${reportError}`);
        errors.push(`Failed to create error report: ${reportError}`);
      }
    }

    // Final summary
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    const summary = [
      isCancelled ? `❌ Export cancelled after ${duration}s` : `✅ Export completed in ${duration}s!`,
      `📊 ${allRows.length} total rows processed`,
      `📁 ${batches.length} batch files created`,
      errorFiles.length > 0 ? `⚠️ ${errorFiles.length} problem files` : '',
      errors.length > 0 ? `❌ ${errors.length} processing errors` : ''
    ].filter(Boolean);

    debugLogs = addDebugLog(debugLogs, `Export finished. Duration: ${duration}s, Final memory: ${getMemoryInfo()}`);

    onProgress?.({
      isProcessing: false,
      current: totalSteps,
      total: totalSteps,
      message: summary.join(' | '),
      warnings,
      errors: errors.length > 0 ? errors : undefined,
      debug: debugLogs,
      timeStarted: startTime,
      lastActivity: Date.now(),
      details: {
        memoryUsage: getMemoryInfo(),
        totalRows: allRows.length
      }
    });

  } catch (globalError) {
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    debugLogs = addDebugLog(debugLogs, `CRITICAL ERROR after ${duration}s: ${globalError}`);
    errors.push(`Critical error: ${globalError}`);
    
    onProgress?.({
      isProcessing: false,
      current: 0,
      total: totalSteps,
      message: `Export failed after ${duration}s with critical error`,
      warnings,
      errors,
      debug: debugLogs,
      timeStarted: startTime,
      lastActivity: Date.now(),
      details: {
        memoryUsage: getMemoryInfo()
      }
    });
  }
}

// Ultra-robust batch processing - creates multiple Excel files to avoid limits
async function downloadBulkXLSXBatched(
  files: FileData[], 
  filename = "bulk_converted", 
  order?: string[], 
  onProgress?: (progress: ProgressState) => void
) {
  const selectedFiles = files.filter(f => f.selected);
  const validFiles = selectedFiles.filter(f => f.rows.length > 0);
  const errorFiles = selectedFiles.filter(f => f.error || f.rows.length === 0);
  
  if (selectedFiles.length === 0) {
    onProgress?.({
      isProcessing: false,
      current: 0,
      total: 0,
      message: "No files selected for export"
    });
    return;
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (errorFiles.length > 0) {
    warnings.push(`${errorFiles.length} files have errors or no data and will be reported separately`);
  }

  const BATCH_SIZE = 20; // Maximum 20 sheets per Excel file
  const batches = [];
  
  // Split files into batches
  for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
    batches.push(validFiles.slice(i, i + BATCH_SIZE));
  }

  const totalSteps = batches.length + 2; // +1 for combined, +1 for error report

  onProgress?.({
    isProcessing: true,
    current: 0,
    total: totalSteps,
    message: `Creating ${batches.length} Excel files (max 20 sheets each)...`,
    warnings
  });

  try {
    // Step 1: Create combined data file
    onProgress?.({
      isProcessing: true,
      current: 0,
      total: totalSteps,
      message: "Creating combined data file...",
      warnings
    });

    const allRows: Row[] = [];
    
    // Process in small chunks to avoid memory issues
    for (let i = 0; i < validFiles.length; i += 5) {
      const chunk = validFiles.slice(i, i + 5);
      
      try {
        chunk.forEach(file => {
          file.rows.forEach(row => {
            allRows.push({
              ...row,
              '_source_file': file.name,
              '_source_folder': file.folderPath || 'Root'
            });
          });
        });
        
        // Small delay to keep UI responsive
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      } catch (chunkError) {
        errors.push(`Error processing chunk ${i}: ${chunkError}`);
      }
    }

    // Create combined Excel file
    if (allRows.length > 0) {
      try {
        const wb = XLSX.utils.book_new();
        const combinedWs = XLSX.utils.json_to_sheet(allRows, { header: order });
        XLSX.utils.book_append_sheet(wb, combinedWs, "Combined_Data");
        XLSX.writeFile(wb, `${filename}_COMBINED.xlsx`);
      } catch (error) {
        errors.push(`Failed to create combined file: ${error}`);
      }
    }

    // Step 2: Create batch files
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      onProgress?.({
        isProcessing: true,
        current: batchIndex + 1,
        total: totalSteps,
        message: `Creating batch ${batchIndex + 1}/${batches.length} (${batch.length} files)...`,
        warnings,
        errors: errors.length > 0 ? errors : undefined
      });

      try {
        const wb = XLSX.utils.book_new();
        const usedSheetNames = new Set<string>();
        let successfulSheets = 0;

        for (let fileIndex = 0; fileIndex < batch.length; fileIndex++) {
          const file = batch[fileIndex];
          
          try {
            let sheetName = file.name.replace(/\.[^/.]+$/, "").substring(0, 31);
            
            // Make sure sheet name is unique
            let counter = 1;
            let originalSheetName = sheetName;
            while (usedSheetNames.has(sheetName)) {
              sheetName = `${originalSheetName}_${counter}`.substring(0, 31);
              counter++;
            }
            usedSheetNames.add(sheetName);

            // Create clean sheet
            const cleanRows = file.rows.map(row => {
              const cleanRow = { ...row };
              delete cleanRow._source_file;
              delete cleanRow._source_folder;
              return cleanRow;
            });

            const ws = XLSX.utils.json_to_sheet(cleanRows, { header: order });
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            successfulSheets++;

            // Micro delay every few sheets
            if (fileIndex % 3 === 0) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }

          } catch (sheetError) {
            errors.push(`Batch ${batchIndex + 1} - Failed to create sheet for ${file.name}: ${sheetError}`);
          }
        }

        // Save batch file
        const batchFilename = `${filename}_BATCH_${String(batchIndex + 1).padStart(2, '0')}.xlsx`;
        XLSX.writeFile(wb, batchFilename);
        
        warnings.push(`Batch ${batchIndex + 1}: ${successfulSheets}/${batch.length} sheets created`);

      } catch (batchError) {
        errors.push(`Failed to create batch ${batchIndex + 1}: ${batchError}`);
      }

      // Longer delay between batches for stability
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 3: Create error report
    if (errorFiles.length > 0 || errors.length > 0) {
      onProgress?.({
        isProcessing: true,
        current: totalSteps - 1,
        total: totalSteps,
        message: "Creating error report...",
        warnings,
        errors: errors.length > 0 ? errors : undefined
      });

      try {
        const errorReport: Row[] = [];
        
        errorFiles.forEach(file => {
          errorReport.push({
            'File Name': file.name,
            'Folder Path': file.folderPath || 'Root',
            'Error Type': 'File Error',
            'Error Message': file.error || 'No data found',
            'Row Count': file.rows.length,
            'Status': file.error ? 'Parse Error' : 'Empty Data'
          });
        });

        errors.forEach((error, index) => {
          errorReport.push({
            'File Name': 'Processing Error',
            'Folder Path': 'N/A',
            'Error Type': 'Processing Error',
            'Error Message': error,
            'Row Count': 0,
            'Status': 'Failed'
          });
        });

        if (errorReport.length > 0) {
          const wb = XLSX.utils.book_new();
          const errorWs = XLSX.utils.json_to_sheet(errorReport);
          XLSX.utils.book_append_sheet(wb, errorWs, "Error_Report");
          XLSX.writeFile(wb, `${filename}_ERROR_REPORT.xlsx`);
        }
      } catch (reportError) {
        errors.push(`Failed to create error report: ${reportError}`);
      }
    }

    // Success summary
    const summary = [
      `✅ Batch export completed!`,
      `📊 Combined file: ${allRows.length} total rows`,
      `📁 ${batches.length} batch files created`,
      `⚠️ ${errorFiles.length} problem files reported`,
      `❌ ${errors.length} processing errors`
    ].filter(Boolean);

    onProgress?.({
      isProcessing: false,
      current: totalSteps,
      total: totalSteps,
      message: summary.join(' | '),
      warnings,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (globalError) {
    errors.push(`Critical error: ${globalError}`);
    onProgress?.({
      isProcessing: false,
      current: 0,
      total: totalSteps,
      message: "Export failed with critical error",
      warnings,
      errors
    });
  }
}

// Legacy function for backward compatibility
function downloadBulkXLSX(files: FileData[], filename = "bulk_converted.xlsx", order?: string[]) {
  const wb = XLSX.utils.book_new();
  
  // Create combined data sheet with source tracking
  const allRows: Row[] = [];
  files.forEach(file => {
    if (file.selected && file.rows.length > 0) {
      file.rows.forEach(row => {
        allRows.push({
          ...row,
          '_source_file': file.name,
          '_source_folder': file.folderPath || 'Root'
        });
      });
    }
  });

  if (allRows.length > 0) {
    const combinedWs = XLSX.utils.json_to_sheet(allRows, { header: order });
    XLSX.utils.book_append_sheet(wb, combinedWs, "Combined_Data");
  }

  // Create individual sheets for each file (clean data without source columns)
  const usedSheetNames = new Set(['Combined_Data']);
  files.forEach(file => {
    if (file.selected && file.rows.length > 0) {
      let sheetName = file.name.replace(/\.[^/.]+$/, "").substring(0, 31);
      
      // Make sure sheet name is unique
      let counter = 1;
      let originalSheetName = sheetName;
      while (usedSheetNames.has(sheetName)) {
        sheetName = `${originalSheetName}_${counter}`.substring(0, 31);
        counter++;
      }
      usedSheetNames.add(sheetName);

      // Create clean sheet without source tracking columns
      const cleanRows = file.rows.map(row => {
        const cleanRow = { ...row };
        delete cleanRow._source_file;
        delete cleanRow._source_folder;
        return cleanRow;
      });

      const ws = XLSX.utils.json_to_sheet(cleanRows, { header: order });
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  });

  XLSX.writeFile(wb, filename);
}

function downloadFolderXLSX(folderPath: string, files: FileData[], order?: string[]) {
  const folderFiles = files.filter(f => f.selected && f.folderPath === folderPath);
  if (folderFiles.length === 0) return;

  const folderName = folderPath.split('/').pop() || 'folder';
  const filename = `${folderName}_export.xlsx`;
  
  downloadBulkXLSX(folderFiles, filename, order);
}

function downloadCSV(rows: Row[], filename = "converted.csv", order?: string[]) {
  const headers = order || Object.keys(rows[0] || {});
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value == null) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function organizeFolders(files: FileData[]): FolderData[] {
  const folderMap = new Map<string, FileData[]>();
  
  files.forEach(file => {
    if (file.isFromFolder && file.folderPath) {
      if (!folderMap.has(file.folderPath)) {
        folderMap.set(file.folderPath, []);
      }
      folderMap.get(file.folderPath)!.push(file);
    }
  });

  const folders: FolderData[] = [];
  folderMap.forEach((folderFiles, path) => {
    folders.push({
      id: `folder-${path}`,
      path,
      selected: folderFiles.every(f => f.selected),
      files: folderFiles,
      validFileCount: folderFiles.filter(f => !f.error).length
    });
  });

  return folders.sort((a, b) => a.path.localeCompare(b.path));
}

export default function JsonToExcelApp() {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<any>(null);
  const [delimiter, setDelimiter] = useState('_');
  const [maxDepth, setMaxDepth] = useState(10);
  const [sheet, setSheet] = useState('data');
  const [columns, setColumns] = useState<string[]>([]);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('single');
  const [files, setFiles] = useState<FileData[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [showFolders, setShowFolders] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    isProcessing: false,
    current: 0,
    total: 0,
    message: ''
  });
  const [shouldCancel, setShouldCancel] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Enhanced memory and debugging utilities for the component
  const getMemoryInfo = (): string => {
    try {
      if ((performance as any).memory) {
        const mem = (performance as any).memory;
        const used = Math.round(mem.usedJSHeapSize / 1024 / 1024);
        const total = Math.round(mem.totalJSHeapSize / 1024 / 1024);
        const limit = Math.round(mem.jsHeapSizeLimit / 1024 / 1024);
        return `${used}MB / ${total}MB (${limit}MB limit)`;
      }
      return 'Memory info not available';
    } catch (error) {
      return 'Memory info error';
    }
  };

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const memInfo = getMemoryInfo();
    const logEntry = `[${timestamp}] ${message} | Memory: ${memInfo}`;
    
    setProgress(prev => ({
      ...prev,
      debug: [...(prev.debug || []), logEntry].slice(-20) // Keep last 20 entries
    }));
  };

  const forceMemoryCleanup = async (): Promise<void> => {
    try {
      // Clear any cached data
      if ((window as any).gc) {
        (window as any).gc();
      }
      
      // Force garbage collection and wait for browser to process
      await new Promise(resolve => {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(resolve);
        } else {
          setTimeout(resolve, 100);
        }
      });
      
      addDebugLog('Forced memory cleanup completed');
    } catch (error) {
      addDebugLog(`Memory cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const rows = parsed ? toRecords(parsed, delimiter, maxDepth) : [];
  
  const selectedFiles = files.filter(f => f.selected);
  const orderedRows = processingMode === 'bulk' 
    ? selectedFiles.flatMap(f => f.rows)
    : rows;

  useEffect(() => {
    const allKeys = new Set<string>();
    orderedRows.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    setColumns(Array.from(allKeys));
  }, [orderedRows]);

  useEffect(() => {
    setFolders(organizeFolders(files));
  }, [files]);

  function handleSingleFileUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        setParsed(data);
        setInput(text);
      } catch (err) {
        console.error('JSON parse error:', err);
        setInput(e.target?.result as string);
        setParsed(null);
      }
    };
    reader.readAsText(file);
  }

  function handleFileUpload(uploadedFiles: FileList) {
    Array.from(uploadedFiles).forEach(file => {
      if (file.type === 'application/json' || file.name.endsWith('.json') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          let rows: Row[] = [];
          let error: string | undefined;
          
          try {
            const data = JSON.parse(text);
            rows = toRecords(data, delimiter, maxDepth);
          } catch (err) {
            error = `JSON parse error: ${err instanceof Error ? err.message : 'Unknown error'}`;
          }

          const fileData: FileData = {
            id: `file-${Date.now()}-${Math.random()}`,
            name: file.name,
            file,
            content: text,
            rows,
            error,
            selected: true,
            isFromFolder: false
          };

          setFiles(prev => [...prev, fileData]);
        };
        reader.readAsText(file);
      }
    });
  }

  function handleFolderUpload(uploadedFiles: FileList) {
    Array.from(uploadedFiles).forEach(file => {
      if (file.type === 'application/json' || file.name.endsWith('.json') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          let rows: Row[] = [];
          let error: string | undefined;
          
          try {
            const data = JSON.parse(text);
            rows = toRecords(data, delimiter, maxDepth);
          } catch (err) {
            error = `JSON parse error: ${err instanceof Error ? err.message : 'Unknown error'}`;
          }

          const relativePath = (file as any).webkitRelativePath || file.name;
          const folderPath = relativePath.substring(0, relativePath.lastIndexOf('/'));

          const fileData: FileData = {
            id: `file-${Date.now()}-${Math.random()}`,
            name: file.name,
            file,
            content: text,
            rows,
            error,
            selected: true,
            isFromFolder: true,
            folderPath
          };

          setFiles(prev => [...prev, fileData]);
        };
        reader.readAsText(file);
      }
    });
  }

  async function onDownloadXLSX() {
    try {
      // Reset cancellation flag and initialize debugging
      setShouldCancel(false);
      addDebugLog('Starting Excel export process');
      
      if (processingMode === "bulk") {
        const selectedFilesCount = selectedFiles.length;
        addDebugLog(`Bulk mode: ${selectedFilesCount} files selected`);
        
        if (selectedFilesCount > 10) {
          // For datasets > 10 files, use super robust processing with cancellation support
          addDebugLog('Using ultra-robust processing for large dataset');
          
          const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error('Export timeout - operation took too long')), 900000); // 15 minute timeout
          });
          
          // Setup progress with cancellation support
          setProgress(prev => ({
            ...prev,
            isProcessing: true,
            canCancel: true,
            timeStarted: Date.now(),
            details: {
              memoryUsage: getMemoryInfo(),
              totalRows: selectedFiles.reduce((sum, f) => sum + f.rows.length, 0)
            }
          }));
          
          const exportPromise = downloadBulkXLSXSuperRobust(
            selectedFiles, 
            "bulk_converted", 
            columns, 
            setProgress,
            () => shouldCancel // Cancellation check function
          );
          
          await Promise.race([exportPromise, timeoutPromise]);
          addDebugLog('Ultra-robust processing completed successfully');
        } else {
          // For smaller datasets, use regular processing with memory monitoring
          addDebugLog('Using standard processing for small dataset');
          setProgress(prev => ({ ...prev, isProcessing: true, timeStarted: Date.now() }));
          
          await forceMemoryCleanup();
          downloadBulkXLSX(selectedFiles, "bulk_converted.xlsx", columns);
          addDebugLog('Standard processing completed');
        }
      } else {
        addDebugLog('Single file mode processing');
        downloadXLSX(orderedRows, "converted.xlsx", sheet, columns);
        addDebugLog('Single file export completed');
      }
      
      // Final cleanup and success state
      await forceMemoryCleanup();
      setProgress(prev => ({
        ...prev,
        isProcessing: false,
        message: 'Export completed successfully!',
        lastActivity: Date.now()
      }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`Export failed: ${errorMessage}`);
      
      setProgress({
        isProcessing: false,
        current: 0,
        total: 0,
        message: `Export failed: ${errorMessage}`,
        errors: [`Critical error: ${errorMessage}`],
        lastActivity: Date.now(),
        debug: progress.debug // Preserve debug logs
      });
    }
  }

  function onDownloadFolderXLSX(folderPath: string) {
    const selectedFiles = files.filter(f => f.selected && f.folderPath === folderPath);
    downloadFolderXLSX(folderPath, selectedFiles, columns);
  }

  function onDownloadAllFoldersXLSX() {
    folders.forEach(folder => {
      if (folder.selected && folder.validFileCount > 0) {
        const files = folder.files.filter(f => f.selected);
        downloadFolderXLSX(folder.path, files, columns);
      }
    });
  }

  function onDownloadCSV() {
    downloadCSV(orderedRows, "converted.csv", columns);
  }

  function onDownloadCombinedOnly() {
    // For very large datasets, only export the combined sheet
    if (processingMode === "bulk" && selectedFiles.length > 0) {
      const allRows: Row[] = [];
      selectedFiles.forEach(file => {
        if (file.selected && file.rows.length > 0) {
          file.rows.forEach(row => {
            allRows.push({
              ...row,
              '_source_file': file.name,
              '_source_folder': file.folderPath || 'Root'
            });
          });
        }
      });
      
      if (allRows.length > 0) {
        downloadXLSX(allRows, "combined_data_only.xlsx", "Combined_Data", columns);
      }
    }
  }

  function onCopy() {
    navigator.clipboard.writeText(JSON.stringify(orderedRows, null, 2));
  }

  function removeFile(fileId: string) {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }

  function toggleFileSelection(fileId: string) {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, selected: !f.selected } : f
    ));
  }

  function toggleFolderSelection(folderId: string) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const newSelected = !folder.selected;
    setFiles(prev => prev.map(f => 
      f.folderPath === folder.path ? { ...f, selected: newSelected } : f
    ));
  }

  function removeFolderFiles(folderPath: string) {
    setFiles(prev => prev.filter(f => f.folderPath !== folderPath));
  }

  function selectAllFiles() {
    setFiles(prev => prev.map(f => ({ ...f, selected: true })));
  }

  function selectAllFolders() {
    setFiles(prev => prev.map(f => f.isFromFolder ? { ...f, selected: true } : f));
  }

  function clearAllFiles() {
    setFiles([]);
  }

  function resetProcessing() {
    addDebugLog('Manual reset triggered by user');
    setShouldCancel(false);
    setProgress({
      isProcessing: false,
      current: 0,
      total: 0,
      message: '',
      debug: [], // Clear debug logs on reset
      errors: [],
      warnings: []
    });
    
    // Force memory cleanup after reset
    forceMemoryCleanup();
  }

  function cancelProcessing() {
    addDebugLog('User requested cancellation');
    setShouldCancel(true);
    setProgress(prev => ({
      ...prev,
      message: 'Cancelling export... Please wait for safe shutdown.',
      lastActivity: Date.now(),
      canCancel: false // Disable cancel button once clicked
    }));
  }

  const draggableProps = {
    onDragStart: (e: React.DragEvent) => {
      const index = (e.target as HTMLElement).getAttribute('data-index');
      e.dataTransfer.setData('text/plain', index || '');
    },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const toElement = (e.target as HTMLElement).closest('[data-index]');
      if (!toElement) return;
      const toIndex = parseInt(toElement.getAttribute('data-index') || '0');
      
      if (fromIndex !== toIndex) {
        const newColumns = [...columns];
        const [movedColumn] = newColumns.splice(fromIndex, 1);
        newColumns.splice(toIndex, 0, movedColumn);
        setColumns(newColumns);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Professional Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <span className="text-white text-xl font-bold">J→E</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                JSON → Excel Converter
              </h1>
            </div>
            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
              Enterprise-grade JSON to Excel conversion tool. Process single files or bulk datasets with advanced formatting options.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>100% Client-Side Processing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Advanced Features</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Processing Mode Toggle */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-1">Processing Mode</h2>
              <p className="text-sm text-slate-600">Choose how you want to process your JSON data</p>
            </div>
            <div className="bg-slate-100 rounded-xl p-1 flex">
              <button
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  processingMode === "single" 
                    ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200" 
                    : "text-slate-600 hover:text-slate-800"
                }`}
                onClick={() => setProcessingMode("single")}
              >
                <span className="text-lg">📄</span>
                <span>Single File</span>
              </button>
              <button
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  processingMode === "bulk" 
                    ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200" 
                    : "text-slate-600 hover:text-slate-800"
                }`}
                onClick={() => setProcessingMode("bulk")}
              >
                <span className="text-lg">📁</span>
                <span>Bulk Processing</span>
                {(files.length > 0 || folders.length > 0) && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                    {files.length} files, {folders.length} folders
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Professional Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="col-span-2">
            {processingMode === "single" ? (
              /* Single File Upload Zone */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Single File Processing</h3>
                <div 
                  className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onDrop={(e) => {
                    e.preventDefault();
                    const files = e.dataTransfer.files;
                    if (files.length > 0) handleSingleFileUpload(files[0]);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-4xl mb-4">📄</div>
                  <p className="text-lg font-medium text-slate-700 mb-2">Drop your JSON file here</p>
                  <p className="text-sm text-slate-500">Or click to browse files</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.txt"
                    onChange={(e) => e.target.files?.[0] && handleSingleFileUpload(e.target.files[0])}
                    className="hidden"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Or paste JSON directly:</label>
                  <textarea 
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      try {
                        setParsed(JSON.parse(e.target.value));
                      } catch {
                        setParsed(null);
                      }
                    }}
                    className="w-full h-32 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder='{"key": "value", "array": [1, 2, 3]}'
                  />
                </div>
              </div>
            ) : (
              /* Bulk Processing Zone */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">Bulk Processing</h3>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📄 Add Files
                    </button>
                    <button
                      className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm"
                      onClick={() => folderInputRef.current?.click()}
                    >
                      📁 Add Folders
                    </button>
                    {folders.length > 0 && (
                      <button
                        className="px-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 text-sm font-medium"
                        onClick={onDownloadAllFoldersXLSX}
                        disabled={folders.filter(f => f.selected && f.validFileCount > 0).length === 0}
                      >
                        📁 Export All Folders
                      </button>
                    )}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".json,.txt"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  {...({webkitdirectory: ""} as any)}
                  onChange={(e) => e.target.files && handleFolderUpload(e.target.files)}
                  className="hidden"
                />

                {files.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm" onClick={selectAllFiles}>All Files</button>
                        <button className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm" onClick={selectAllFolders}>All Folders</button>
                        <button className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm" onClick={() => setShowFolders(!showFolders)}>
                          {showFolders ? 'File View' : 'Folder View'}
                        </button>
                      </div>
                      <button className="px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-sm" onClick={clearAllFiles}>Clear All</button>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3">
                      {!showFolders ? (
                        // File View
                        files.map(file => (
                          <div key={file.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={file.selected}
                              onChange={() => toggleFileSelection(file.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{file.isFromFolder ? '📁' : '📄'}</span>
                                <span className="text-sm font-medium truncate">{file.name}</span>
                                {file.error ? (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Error</span>
                                ) : (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                    {file.rows.length} rows
                                  </span>
                                )}
                              </div>
                              {file.isFromFolder && (
                                <div className="text-xs text-gray-500 mt-1">📂 {file.folderPath}</div>
                              )}
                              {file.error && (
                                <div className="text-xs text-red-600 mt-1">{file.error}</div>
                              )}
                            </div>
                            <button
                              onClick={() => removeFile(file.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                              title="Remove file"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      ) : (
                        // Folder View
                        folders.map(folder => {
                          const depth = folder.path.split('/').length - 1;
                          const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 16)}` : '';
                          return (
                            <div key={folder.id} className={`bg-gray-50 rounded-lg ${indentClass}`}>
                              <div className="flex items-center gap-3 p-3 border-b border-gray-200">
                                <input
                                  type="checkbox"
                                  checked={folder.selected}
                                  onChange={() => toggleFolderSelection(folder.id)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">
                                      {'  '.repeat(depth)}📁
                                    </span>
                                    <span className="font-medium">{folder.path.split('/').pop()}</span>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                      {folder.validFileCount}/{folder.files.length} files
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">{folder.path}</div>
                                </div>
                                <button
                                  onClick={() => removeFolderFiles(folder.path)}
                                  className="text-red-500 hover:text-red-700 text-sm mr-2"
                                  title="Remove folder"
                                >
                                  ✕
                                </button>
                                <button
                                  onClick={() => onDownloadFolderXLSX(folder.path)}
                                  className="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded bg-green-50 hover:bg-green-100 transition-colors"
                                  title="Export this folder to Excel"
                                  disabled={folder.validFileCount === 0}
                                >
                                  📁 Export
                                </button>
                              </div>
                              {folder.files.length > 0 && (
                                <div className="p-2 space-y-1 bg-white rounded-b-lg">
                                  {folder.files.map(file => (
                                    <div key={file.id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded text-xs">
                                      <span>{file.error ? '❌' : '✅'}</span>
                                      <span className="flex-1 truncate">{file.name}</span>
                                      {!file.error && (
                                        <span className="text-green-600">{file.rows.length} rows</span>
                                      )}
                                      {file.error && (
                                        <span className="text-red-600 text-xs truncate max-w-32" title={file.error}>
                                          {file.error}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Settings Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Settings & Export</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="w-24 text-sm font-medium text-slate-700">Delimiter</label>
                <input 
                  value={delimiter} 
                  onChange={(e) => setDelimiter(e.target.value)} 
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24 text-sm font-medium text-slate-700">Max depth</label>
                <input 
                  type="number" 
                  value={maxDepth} 
                  onChange={(e) => setMaxDepth(Number(e.target.value))} 
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24 text-sm font-medium text-slate-700">Sheet</label>
                <input 
                  value={sheet} 
                  onChange={(e) => setSheet(e.target.value)} 
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>
              
              {/* Large Dataset Warning */}
              {processingMode === "bulk" && selectedFiles.length > 15 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 text-lg">⚠️</span>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Large Dataset - Batch Processing</p>
                      <p className="text-xs text-amber-700 mt-1">
                        {selectedFiles.length} files selected. Will create multiple Excel files (max 20 sheets each) 
                        to prevent memory issues and ensure stable processing.
                      </p>
                      <div className="mt-2 text-xs text-amber-600">
                        📁 Files you'll get: COMBINED.xlsx + BATCH_01.xlsx, BATCH_02.xlsx, etc. + ERROR_REPORT.xlsx (if needed)
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-slate-200">
                <div className="space-y-3">
                  {/* Enhanced Progress indicator with detailed debugging and interactive controls */}
                  {progress.isProcessing && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-800">Processing Export</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-blue-600">{progress.current}/{progress.total}</span>
                          {progress.canCancel && (
                            <button
                              onClick={cancelProcessing}
                              className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                              title="Cancel export"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={resetProcessing}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                            title="Reset if stuck"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                        ></div>
                      </div>
                      
                      {/* Main message and timing */}
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-blue-600">{progress.message}</p>
                        {progress.timeStarted && (
                          <span className="text-xs text-blue-500">
                            {Math.round((Date.now() - progress.timeStarted) / 1000)}s elapsed
                          </span>
                        )}
                      </div>
                      
                      {/* Detailed progress info */}
                      {progress.details && (
                        <div className="bg-blue-25 border border-blue-100 rounded p-2 mb-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {progress.details.memoryUsage && (
                              <div className="text-blue-700">Memory: {progress.details.memoryUsage}</div>
                            )}
                            {progress.details.currentFile && (
                              <div className="text-blue-700 truncate">File: {progress.details.currentFile}</div>
                            )}
                            {progress.details.totalRows && (
                              <div className="text-blue-700">Rows: {progress.details.totalRows.toLocaleString()}</div>
                            )}
                            {progress.details.batchProgress !== undefined && (
                              <div className="text-blue-700">Batch: {progress.details.batchProgress}%</div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Warnings */}
                      {progress.warnings && progress.warnings.length > 0 && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-amber-500 text-sm">⚠️</span>
                            <span className="text-xs font-medium text-amber-800">Warnings:</span>
                          </div>
                          {progress.warnings.map((warning, index) => (
                            <p key={index} className="text-xs text-amber-700">{warning}</p>
                          ))}
                        </div>
                      )}
                      
                      {/* Errors */}
                      {progress.errors && progress.errors.length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded max-h-20 overflow-y-auto">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-red-500 text-sm">❌</span>
                            <span className="text-xs font-medium text-red-800">Errors ({progress.errors.length}):</span>
                          </div>
                          {progress.errors.slice(0, 3).map((error, index) => (
                            <p key={index} className="text-xs text-red-700 truncate">{error}</p>
                          ))}
                          {progress.errors.length > 3 && (
                            <p className="text-xs text-red-600">...and {progress.errors.length - 3} more errors</p>
                          )}
                        </div>
                      )}
                      
                      {/* Debug logs */}
                      {progress.debug && progress.debug.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                            🔍 Debug Logs ({progress.debug.length})
                          </summary>
                          <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded max-h-32 overflow-y-auto">
                            {progress.debug.slice(-5).map((log, index) => (
                              <p key={index} className="text-xs text-gray-600 font-mono">{log}</p>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                  
                  {/* Success/Error summary after processing */}
                  {!progress.isProcessing && (progress.warnings?.length || progress.errors?.length) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-slate-800 mb-2">Export Summary</div>
                      {progress.warnings && progress.warnings.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs text-amber-600">⚠️ {progress.warnings.length} warning(s)</span>
                        </div>
                      )}
                      {progress.errors && progress.errors.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs text-red-600">❌ {progress.errors.length} error(s) - Check Error_Report sheet</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-600">{progress.message}</p>
                    </div>
                  )}
                  
                  <button 
                    className="w-full px-4 py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2" 
                    onClick={onDownloadXLSX}
                    disabled={!orderedRows.length || progress.isProcessing}
                  >
                    {progress.isProcessing ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        {processingMode === "bulk" ? "📊 Export Multi-Sheet XLSX" : "📊 Export XLSX"}
                        {processingMode === "bulk" && selectedFiles.length > 15 && (
                          <span className="text-xs bg-blue-400 px-2 py-1 rounded-full">
                            Batch Processing
                          </span>
                        )}
                        {processingMode === "bulk" && selectedFiles.length > 10 && selectedFiles.length <= 15 && (
                          <span className="text-xs bg-green-400 px-2 py-1 rounded-full">
                            Single File
                          </span>
                        )}
                      </>
                    )}
                  </button>
                  
                  {/* Combined Only Export for Large Datasets */}
                  {processingMode === "bulk" && selectedFiles.length > 20 && (
                    <button 
                      className="w-full px-4 py-3 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors" 
                      onClick={onDownloadCombinedOnly}
                      disabled={!orderedRows.length || progress.isProcessing}
                    >
                      🚀 Quick Export (Combined Data Only)
                    </button>
                  )}
                  
                  <button 
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                    onClick={onDownloadCSV}
                    disabled={!orderedRows.length || progress.isProcessing}
                  >
                    📄 Export CSV
                  </button>
                  <button 
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                    onClick={onCopy}
                    disabled={!orderedRows.length || progress.isProcessing}
                  >
                    📋 Copy to Clipboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column Manager */}
        {columns.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="text-lg font-semibold text-slate-800 mb-4">Column Management</div>
            <div className="flex flex-wrap gap-2" {...draggableProps}>
              {columns.map((c, i) => (
                <div
                  key={c}
                  data-index={i}
                  draggable
                  onDoubleClick={() => setColumns(columns.filter((x) => x !== c))}
                  title="Drag to reorder, double-click to hide"
                  className="px-3 py-2 rounded-lg border border-slate-300 cursor-move text-sm bg-slate-50 hover:bg-slate-100 select-none transition-colors"
                >
                  {c}
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm text-slate-500">Drag columns to reorder, double-click to hide. Hidden columns are excluded from export.</div>
          </div>
        )}

        {/* Preview Table */}
        {orderedRows.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-1">Data Preview</h3>
              <div className="text-sm text-slate-600">
                {processingMode === "bulk" ? (
                  <>
                    Previewing {orderedRows.length.toLocaleString()} rows from {files.filter(f => f.selected).length} selected files. 
                    {orderedRows.length > 1000 && " First 1,000 shown in table."}
                  </>
                ) : (
                  <>
                    Previewing {orderedRows.length.toLocaleString()} rows total. 
                    {orderedRows.length > 1000 && " First 1,000 shown in table."}
                  </>
                )}
              </div>
            </div>
            <div className="overflow-auto max-h-96">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                  <tr>
                    {columns.map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-slate-700 border-r border-slate-200 last:border-r-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderedRows.slice(0, 1000).map((r, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      {columns.map((h) => (
                        <td key={h} className="px-4 py-2 border-r border-slate-100 last:border-r-0 align-top">
                          <div className="min-w-0 max-w-xs">
                            <span className="block truncate text-sm text-slate-700">
                              {r[h] == null ? "" : String(r[h])}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {orderedRows.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Data to Preview</h3>
            <p className="text-slate-600">
              {processingMode === "bulk" ? (
                files.length === 0 ? (
                  "Upload JSON files to start bulk processing."
                ) : (
                  "No data to preview. Select files or check JSON structure."
                )
              ) : (
                parsed ? "No data to preview. Check your JSON structure." : "Enter valid JSON data to preview."
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}