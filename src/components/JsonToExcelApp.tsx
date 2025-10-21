/**
 * Enhanced JSON to Excel App - Main Component
 * Modular, maintainable, and professional implementation
 */

/*
 * JSON to Excel Converter - Main Application Component
 * Copyright (C) 2024 Xtra01
 * Licensed under AGPL v3 - see LICENSE file
 * For commercial licensing: https://github.com/Xtra01/json-to-excel-converter
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';

// Enhanced type imports
import { 
  Row, 
  FileData, 
  FolderData, 
  ProcessingMode, 
  ProcessingStatus,
  ProgressState,
  ExportFormat,
  ExportMode,
  DEFAULT_PROCESSING_CONFIG,
  ProcessingConfig,
  ProcessingOptions
} from '../types';

// Enhanced utility imports - Lazy load to avoid SSR issues
// import { logger, LogCategory, logUserAction, createPerformanceTracker } from '../utils/logger';
import { errorHandler } from '../utils/errorHandler';
import { memoryManager, AsyncProcessor, PerformanceMetrics } from '../utils/performance';
import { downloadCSV, copyToClipboard, CSVGenerator } from '../utils/csvExport';
import { createProcessor, processFileData, detectOptimalConfig } from '../utils/jsonProcessor';
import { fileManager, organizeFolders, getFileStatistics } from '../utils/fileManager';
import { validateFile, FileValidationResult } from '../utils/fileValidator';

// Legacy compatibility
import { useProcessingWorker } from '../hooks/useProcessingWorker';

// Temporary logger stubs to avoid SSR issues
const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  debug: (...args: any[]) => console.log('[DEBUG]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  exportLogs: () => console.log('[EXPORT_LOGS]', 'Logs exported')
};

const LogCategory = {
  MEMORY: 'memory',
  ERROR: 'error',
  DATA_PROCESSING: 'data_processing',
  SYSTEM: 'system'
};

const logUserAction = (action: string, data?: any) => {
  console.log('[USER_ACTION]', action, data);
};

const createPerformanceTracker = (name: string, data?: any) => ({
  complete: (result?: any) => console.log('[PERF_COMPLETE]', name, result),
  error: (error?: any) => console.error('[PERF_ERROR]', name, error)
});

// Utility function for file size formatting
const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export default function JsonToExcelApp() {
  // ============= State Management =============
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<any>(null);
  const [config, setConfig] = useState<ProcessingConfig>(DEFAULT_PROCESSING_CONFIG);
  const [sheet, setSheet] = useState('data');
  const [columns, setColumns] = useState<string[]>([]);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('bulk');
  const [files, setFiles] = useState<FileData[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [showFolders, setShowFolders] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Enhanced progress state
  const [progress, setProgress] = useState<ProgressState>({
    status: ProcessingStatus.IDLE,
    current: 0,
    total: 0,
    percentage: 0,
    message: ''
  });

  // References
  const folderInputRef = useRef<HTMLInputElement>(null);

  // ============= Computed Values =============
  const processor = createProcessor({
    ...config,
    enableSourceTracking: processingMode === 'bulk',
    enableValidation: true,
    batchSize: 100,
    memoryLimit: 50 * 1024 * 1024 // 50MB
  });

  const rows = parsed ? [] : []; // Will be processed by the new system
  const selectedFiles = files.filter(f => f.selected);
  const orderedRows = selectedFiles.flatMap(f => f.rows);

  // ============= Effects =============
  useEffect(() => {
    logUserAction('Application initialized');
    
    // Setup memory management
    memoryManager.registerCleanupCallback(() => {
      logger.info(LogCategory.MEMORY, 'Cleanup callback triggered');
      // Clear any large data structures if needed
    });

    // Enhanced emergency recovery
    errorHandler.onError((error) => {
      logger.error(LogCategory.ERROR, 'Global error caught', {
        errorCode: error.code,
        errorType: error.type
      });
    });

    return () => {
      memoryManager.registerCleanupCallback(() => {});
    };
  }, []);

  useEffect(() => {
    const allKeys = new Set<string>();
    orderedRows.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    setColumns(Array.from(allKeys));
  }, [orderedRows]);

  useEffect(() => {
    const newFolders = organizeFolders(files);
    setFolders(newFolders);
    setShowFolders(files.some(f => f.folderPath && f.folderPath !== 'Root'));
  }, [files]);

  // ============= Processing Functions =============
  const processFilesBatch = useCallback(async (
    files: FileData[], 
    filename: string, 
    order?: string[]
  ) => {
    const tracker = createPerformanceTracker('batch_excel_export', {
      fileCount: files.length,
      filename
    });

    try {
      setProgress({
        status: ProcessingStatus.PROCESSING,
        current: 0,
        total: files.length,
        percentage: 0,
        message: 'Starting batch processing...',
        timeStarted: Date.now(),
        canCancel: true
      });

      const selectedFiles = files.filter(f => f.selected && f.rows.length > 0);
      const BATCH_SIZE = 15;
      const batches = [];
      
      for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
        batches.push(selectedFiles.slice(i, i + BATCH_SIZE));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        setProgress(prev => ({
          ...prev,
          current: batchIndex + 1,
          total: batches.length,
          percentage: Math.round(((batchIndex + 1) / batches.length) * 100),
          message: `Creating batch ${batchIndex + 1}/${batches.length} (${batch.length} files)...`,
          lastActivity: Date.now()
        }));

        const wb = XLSX.utils.book_new();
        const usedSheetNames = new Set<string>();

        for (const file of batch) {
          let sheetName = file.name.replace(/\.[^/.]+$/, "").substring(0, 31);
          
          // Make sheet name unique
          let counter = 1;
          let originalSheetName = sheetName;
          while (usedSheetNames.has(sheetName)) {
            sheetName = `${originalSheetName}_${counter}`.substring(0, 31);
            counter++;
          }
          usedSheetNames.add(sheetName);

          if (file.rows.length > 0) {
            const ws = XLSX.utils.json_to_sheet(file.rows, { header: order });
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
          }
        }

        // Save batch file
        const batchFilename = `${filename}_BATCH_${String(batchIndex + 1).padStart(2, '0')}.xlsx`;
        XLSX.writeFile(wb, batchFilename);

        // Small delay between batches
        await AsyncProcessor.delay(100);
      }

      setProgress({
        status: ProcessingStatus.COMPLETED,
        current: batches.length,
        total: batches.length,
        percentage: 100,
        message: `✅ Export completed! ${batches.length} batch files created.`,
        timeStarted: Date.now(),
        timeCompleted: Date.now()
      });

      tracker.complete({ batchCount: batches.length });
      logUserAction('Batch processing completed', { 
        fileCount: selectedFiles.length,
        batchCount: batches.length 
      });

    } catch (error) {
      tracker.error(error as Error);
      const appError = errorHandler.handle(error as Error, 'Batch Processing');
      
      setProgress({
        status: ProcessingStatus.ERROR,
        current: 0,
        total: 0,
        percentage: 0,
        message: `❌ Processing failed: ${appError.userMessage}`,
        errors: [appError.userMessage],
        timeCompleted: Date.now()
      });
    }
  }, []);

  // ============= Event Handlers =============
  const handleMultipleFileUpload = useCallback(async (fileList: FileList | File[]) => {
    const tracker = createPerformanceTracker('multiple_file_upload', {
      fileCount: fileList.length
    });

    try {
      console.log('[MULTI_UPLOAD]', 'Starting upload of', fileList.length, 'files');
      
      setProgress({
        status: ProcessingStatus.PROCESSING,
        current: 0,
        total: fileList.length,
        percentage: 0,
        message: 'Validating uploaded files...',
        timeStarted: Date.now()
      });

      // Enhanced File Validation Phase
      const validatedFiles: File[] = [];
      const validationErrors: string[] = [];
      let validationCurrent = 0;

      for (const file of Array.from(fileList)) {
        validationCurrent++;
        setProgress(prev => ({
          ...prev,
          current: validationCurrent,
          total: fileList.length,
          percentage: Math.round((validationCurrent / fileList.length) * 30), // 30% for validation
          message: `Validating: ${file.name}`,
          lastActivity: Date.now()
        }));

        const validationResult = await validateFile(file);
        
        if (validationResult.isValid) {
          validatedFiles.push(file);
          console.log('[VALIDATION_SUCCESS]', file.name, validationResult.metadata);
        } else {
          const errorMsg = `❌ ${file.name}: ${validationResult.errors.map(e => e.message).join(', ')}`;
          validationErrors.push(errorMsg);
          console.error('[VALIDATION_ERROR]', file.name, validationResult.errors);
        }

        // Log warnings if any
        if (validationResult.warnings.length > 0) {
          console.warn('[VALIDATION_WARNING]', file.name, validationResult.warnings);
        }
      }

      // Show validation summary if there are errors
      if (validationErrors.length > 0) {
        const validCount = validatedFiles.length;
        const totalCount = fileList.length;
        const errorSummary = `Validation completed: ${validCount}/${totalCount} files are valid.\n\nErrors:\n${validationErrors.join('\n')}`;
        
        if (validCount === 0) {
          // All files failed validation
          setProgress({
            status: ProcessingStatus.ERROR,
            current: 0,
            total: 0,
            percentage: 0,
            message: 'All files failed validation',
            timeStarted: Date.now()
          });
          alert(errorSummary);
          return;
        } else {
          // Some files are valid, ask user if they want to continue
          const shouldContinue = confirm(`${errorSummary}\n\nContinue with ${validCount} valid files?`);
          if (!shouldContinue) {
            setProgress({
              status: ProcessingStatus.IDLE,
              current: 0,
              total: 0,
              percentage: 0,
              message: 'Processing cancelled',
              timeStarted: Date.now()
            });
            return;
          }
        }
      }

      // Process only validated files
      setProgress(prev => ({
        ...prev,
        current: 0,
        total: validatedFiles.length,
        percentage: 30, // Validation complete, start processing
        message: 'Processing validated files...',
        lastActivity: Date.now()
      }));

      const processedFiles = await fileManager.processFiles(
        validatedFiles,
        (current, total, currentFile) => {
          console.log('[MULTI_UPLOAD_PROGRESS]', current, '/', total, currentFile);
          setProgress(prev => ({
            ...prev,
            current,
            total,
            percentage: 30 + Math.round(((current / total) * 70)), // 30% + 70% for processing
            message: `Processing: ${currentFile}`,
            lastActivity: Date.now()
          }));
        }
      );

      console.log('[MULTI_UPLOAD]', 'FileManager processed', processedFiles.length, 'files');

      // Process with enhanced JSON processor
      const finalFiles = await processFileData(
        processedFiles,
        {
          ...config,
          enableSourceTracking: true,
          enableValidation: true,
          batchSize: 50,
          memoryLimit: 100 * 1024 * 1024
        },
        (current, total) => {
          setProgress(prev => ({
            ...prev,
            current,
            total,
            percentage: Math.round((current / total) * 100),
            message: `Processing data: ${current}/${total}`,
            lastActivity: Date.now()
          }));
        }
      );

      setFiles(prev => [...prev, ...finalFiles]);
      
      setProgress({
        status: ProcessingStatus.COMPLETED,
        current: finalFiles.length,
        total: finalFiles.length,
        percentage: 100,
        message: `✅ ${finalFiles.length} files processed successfully`,
        timeCompleted: Date.now()
      });

      tracker.complete({ processedFiles: finalFiles.length });
      logUserAction('Multiple files uploaded and processed', {
        fileCount: finalFiles.length,
        successCount: finalFiles.filter(f => !f.error).length
      });

    } catch (error) {
      tracker.error(error as Error);
      const appError = errorHandler.handle(error as Error, 'Multiple File Upload');
      
      setProgress({
        status: ProcessingStatus.ERROR,
        current: 0,
        total: 0,
        percentage: 0,
        message: `❌ Upload failed: ${appError.userMessage}`,
        errors: [appError.userMessage],
        timeCompleted: Date.now()
      });
    }
  }, [config]);

  const handleFolderUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    try {
      logUserAction('Folder upload started', { fileCount: fileList.length });
      console.log('[FOLDER_UPLOAD]', 'Processing', fileList.length, 'files');
      
      // Organize files by folder structure
      const filesByFolder = new Map<string, File[]>();
      
      Array.from(fileList).forEach(file => {
        // Get folder path from webkitRelativePath
        const relativePath = (file as any).webkitRelativePath || file.name;
        const folderPath = relativePath.includes('/') 
          ? relativePath.substring(0, relativePath.lastIndexOf('/'))
          : 'Root';
        
        console.log('[FOLDER_UPLOAD]', 'File:', file.name, 'Path:', relativePath, 'Folder:', folderPath);
        
        if (!filesByFolder.has(folderPath)) {
          filesByFolder.set(folderPath, []);
        }
        filesByFolder.get(folderPath)!.push(file);
      });

      logger.info(LogCategory.DATA_PROCESSING, 'Folders organized', {
        folderCount: filesByFolder.size,
        totalFiles: fileList.length
      });

      console.log('[FOLDER_UPLOAD]', 'Organized into', filesByFolder.size, 'folders');

      // Process all files with folder information
      await handleMultipleFileUpload(fileList);
      
    } catch (err) {
      const appError = errorHandler.handle(err as Error, 'Folder Upload');
      console.error('[FOLDER_UPLOAD_ERROR]', appError);
      alert(appError.userMessage);
    }
  }, [handleMultipleFileUpload]);

  // ============= Export Functions =============
  const onDownloadXLSX = useCallback(async () => {
    const tracker = createPerformanceTracker('excel_export');
    
    try {
      logUserAction('Excel export started', { mode: processingMode });

      if (processingMode === "bulk") {
        const selectedFilesCount = selectedFiles.length;
        
        if (selectedFilesCount > 10) {
          await processFilesBatch(files, "bulk_converted", columns);
        } else {
          // Use regular processing for small datasets
          const allRows: Row[] = [];
          selectedFiles.forEach(file => {
            if (file.rows.length > 0) {
              const cleanRows = file.rows.map(row => {
                const cleanRow = { ...row };
                cleanRow._source_file = file.name;
                cleanRow._source_folder = file.folderPath || 'Root';
                return cleanRow;
              });
              allRows.push(...cleanRows);
            }
          });
          
          if (allRows.length > 0) {
            const ws = XLSX.utils.json_to_sheet(allRows, { header: columns });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Combined_Data");
            XLSX.writeFile(wb, "bulk_converted.xlsx");
          }
        }
      } else {
        // Single file processing
        if (orderedRows.length > 0) {
          const ws = XLSX.utils.json_to_sheet(orderedRows, { header: columns });
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, sheet);
          XLSX.writeFile(wb, "converted.xlsx");
        }
      }
      
      tracker.complete();
      logUserAction('Excel export completed successfully');
      
    } catch (error) {
      tracker.error(error as Error);
      const appError = errorHandler.handle(error as Error, 'Excel Export');
      alert(appError.userMessage);
    }
  }, [processingMode, selectedFiles, files, columns, orderedRows, sheet, processFilesBatch]);

  // New: Export by folder structure
  const exportByFolderStructure = useCallback(async () => {
    const tracker = createPerformanceTracker('folder_based_export');
    
    try {
      logUserAction('Folder-based export started');
      
      setProgress({
        status: ProcessingStatus.PROCESSING,
        current: 0,
        total: folders.length,
        percentage: 0,
        message: 'Organizing files by folders...',
        timeStarted: Date.now(),
        canCancel: true
      });

      const folderGroups = organizeFolders(selectedFiles);
      
      for (let i = 0; i < folderGroups.length; i++) {
        const folder = folderGroups[i];
        const folderFiles = folder.files.filter(f => f.selected && f.rows.length > 0);
        
        if (folderFiles.length === 0) continue;

        setProgress(prev => ({
          ...prev,
          current: i + 1,
          total: folderGroups.length,
          percentage: Math.round(((i + 1) / folderGroups.length) * 100),
          message: `Exporting folder: ${folder.name} (${folderFiles.length} files)`,
          lastActivity: Date.now()
        }));

        const wb = XLSX.utils.book_new();
        const usedSheetNames = new Set<string>();

        // Add combined sheet for folder
        const allFolderRows: Row[] = [];
        folderFiles.forEach(file => {
          file.rows.forEach(row => {
            allFolderRows.push({
              ...row,
              __source_file: file.name,
              __folder: folder.path
            });
          });
        });

        if (allFolderRows.length > 0) {
          // Add tracking columns to the column list for proper export
          const enhancedColumns = [...new Set([...columns, '__source_file', '__folder'])];
          const combinedWs = XLSX.utils.json_to_sheet(allFolderRows, { header: enhancedColumns });
          XLSX.utils.book_append_sheet(wb, combinedWs, "Combined");
          usedSheetNames.add("Combined");
        }

        // Add individual file sheets (optional, for small folders)
        if (folderFiles.length <= 20) {
          for (const file of folderFiles) {
            let sheetName = file.name.replace(/\.[^/.]+$/, "").substring(0, 31);
            
            let counter = 1;
            let originalSheetName = sheetName;
            while (usedSheetNames.has(sheetName)) {
              sheetName = `${originalSheetName}_${counter}`.substring(0, 31);
              counter++;
            }
            usedSheetNames.add(sheetName);

            if (file.rows.length > 0) {
              const ws = XLSX.utils.json_to_sheet(file.rows, { header: columns });
              XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }
          }
        }

        // Save folder file
        const safeFolderName = folder.name.replace(/[^a-z0-9]/gi, '_');
        const filename = `folder_${safeFolderName}.xlsx`;
        XLSX.writeFile(wb, filename);

        // Small delay between folders
        await AsyncProcessor.delay(100);
      }

      setProgress({
        status: ProcessingStatus.COMPLETED,
        current: folderGroups.length,
        total: folderGroups.length,
        percentage: 100,
        message: `✅ Exported ${folderGroups.length} folders successfully!`,
        timeStarted: Date.now(),
        timeCompleted: Date.now()
      });

      tracker.complete({ folderCount: folderGroups.length });
      
    } catch (err) {
      const appError = errorHandler.handle(err as Error, 'Folder Export');
      setProgress({
        status: ProcessingStatus.ERROR,
        current: 0,
        total: 0,
        percentage: 0,
        message: appError.userMessage,
        errors: [appError.message]
      });
      tracker.error(appError);
    }
  }, [folders, selectedFiles, columns]);

  // New: Export all to single sheet (optimized for large datasets)
  const exportToSingleSheet = useCallback(async () => {
    const tracker = createPerformanceTracker('single_sheet_export');
    
    try {
      logUserAction('Single sheet export started', { fileCount: selectedFiles.length });
      
      setProgress({
        status: ProcessingStatus.PROCESSING,
        current: 0,
        total: selectedFiles.length,
        percentage: 0,
        message: 'Collecting all data...',
        timeStarted: Date.now()
      });

      // Optimized: Process in batches to avoid memory issues
      const BATCH_SIZE = 100;
      const allRows: Row[] = [];
      
      for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
        const batch = selectedFiles.slice(i, i + BATCH_SIZE);
        
        setProgress(prev => ({
          ...prev,
          current: i + batch.length,
          total: selectedFiles.length,
          percentage: Math.round(((i + batch.length) / selectedFiles.length) * 100),
          message: `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`,
          lastActivity: Date.now()
        }));

        batch.forEach(file => {
          if (file.rows.length > 0) {
            file.rows.forEach(row => {
              allRows.push({
                ...row,
                __source_file: file.name,
                __source_folder: file.folderPath || 'Root',
                __original_path: file.originalPath || file.name
              });
            });
          }
        });

        // Check memory after each batch
        if (i % (BATCH_SIZE * 5) === 0) {
          await memoryManager.checkMemoryForOperation(allRows.length * 1024);
          await AsyncProcessor.delay(50);
        }
      }

      setProgress(prev => ({
        ...prev,
        message: 'Creating Excel file...'
      }));

      if (allRows.length > 0) {
        // Add tracking columns to the column list for proper export
        const enhancedColumns = [...new Set([...columns, '__source_file', '__source_folder', '__original_path'])];
        const ws = XLSX.utils.json_to_sheet(allRows, { header: enhancedColumns });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "All_Data");
        XLSX.writeFile(wb, "combined_all_data.xlsx");
      }

      setProgress({
        status: ProcessingStatus.COMPLETED,
        current: selectedFiles.length,
        total: selectedFiles.length,
        percentage: 100,
        message: `✅ Exported ${allRows.length} rows from ${selectedFiles.length} files!`,
        timeCompleted: Date.now()
      });

      tracker.complete({ rowCount: allRows.length, fileCount: selectedFiles.length });
      
    } catch (err) {
      const appError = errorHandler.handle(err as Error, 'Single Sheet Export');
      setProgress({
        status: ProcessingStatus.ERROR,
        current: 0,
        total: 0,
        percentage: 0,
        message: appError.userMessage,
        errors: [appError.message]
      });
      tracker.error(appError);
    }
  }, [selectedFiles, columns]);

  const onDownloadCSV = useCallback(async () => {
    const tracker = createPerformanceTracker('csv_export');
    
    try {
      logUserAction('CSV export started', { mode: processingMode });

      if (processingMode === "bulk" && selectedFiles.length > 0) {
        const allRows: Row[] = [];
        selectedFiles.forEach(file => {
          if (file.rows.length > 0) {
            allRows.push(...file.rows.map(row => ({
              ...row,
              _source_file: file.name,
              _source_folder: file.folderPath || 'Root'
            })));
          }
        });
        
        await downloadCSV(allRows, "bulk_export.csv", columns);
      } else if (orderedRows.length > 0) {
        await downloadCSV(orderedRows, "export.csv", columns);
      }
      
      tracker.complete();
      logUserAction('CSV export completed successfully');
      
    } catch (error) {
      tracker.error(error as Error);
      const appError = errorHandler.handle(error as Error, 'CSV Export');
      alert(appError.userMessage);
    }
  }, [processingMode, selectedFiles, orderedRows, columns]);

  const onCopyToClipboard = useCallback(async () => {
    const tracker = createPerformanceTracker('clipboard_copy');
    
    try {
      logUserAction('Clipboard copy started', { mode: processingMode });

      let dataToExport: Row[] = [];
      
      if (processingMode === "bulk" && selectedFiles.length > 0) {
        selectedFiles.forEach(file => {
          if (file.rows.length > 0) {
            dataToExport.push(...file.rows);
          }
        });
      } else {
        dataToExport = orderedRows;
      }
      
      const success = await copyToClipboard(dataToExport, columns);
      
      if (success) {
        alert('Data copied to clipboard successfully!');
        logUserAction('Clipboard copy completed successfully');
      } else {
        throw new Error('Failed to copy to clipboard');
      }
      
      tracker.complete();
      
    } catch (error) {
      tracker.error(error as Error);
      const appError = errorHandler.handle(error as Error, 'Clipboard Copy');
      alert(appError.userMessage);
    }
  }, [processingMode, selectedFiles, orderedRows, columns]);

  const resetProcessing = useCallback(() => {
    setProgress({
      status: ProcessingStatus.IDLE,
      current: 0,
      total: 0,
      percentage: 0,
      message: ''
    });
    logUserAction('Processing reset');
  }, []);

  // ============= Render =============
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">📊</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">JSON to Excel Converter</h1>
              <p className="text-gray-600">Professional data conversion with advanced features</p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-medium">📁 Bulk Processing Mode</span>
              <span className="text-blue-600 text-sm">- Optimized for high-volume data conversion</span>
            </div>
          </div>
        </div>

        {/* Debug Panel Toggle */}
        <div className="mb-4 flex justify-between items-center">
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className={`px-3 py-1 text-xs rounded border ${
              showDebugPanel 
                ? 'bg-blue-100 text-blue-700 border-blue-300' 
                : 'bg-gray-100 text-gray-600 border-gray-300'
            }`}
          >
            {showDebugPanel ? 'Hide Debug' : 'Show Debug'}
          </button>
          
          <div className="text-xs text-gray-500">
            Enhanced with enterprise-level logging and error handling
          </div>
        </div>

        {/* Debug Panel */}
        {showDebugPanel && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">System Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-white p-2 rounded border">
                <div className="text-gray-600">Memory</div>
                <div className="font-medium">
                  {memoryManager.getMemoryInfo()?.percentage.toFixed(1) || 'N/A'}%
                </div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="text-gray-600">Files</div>
                <div className="font-medium">{files.length}</div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="text-gray-600">Status</div>
                <div className="font-medium">{progress.status}</div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="text-gray-600">Mode</div>
                <div className="font-medium">{processingMode}</div>
              </div>
            </div>
            
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => logger.exportLogs()}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Export Logs
              </button>
              <button
                onClick={() => PerformanceMetrics.clearMetrics()}
                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
              >
                Clear Metrics
              </button>
            </div>
          </div>
        )}

        {/* File Upload - Optimized for Bulk Processing */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📁 Upload Files & Folders</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  ref={folderInputRef}
                  type="file"
                  accept=".json,.txt"
                  multiple
                  onChange={(e) => e.target.files && handleMultipleFileUpload(e.target.files)}
                  className="hidden"
                />
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
                >
                  <div className="text-center">
                    <span className="text-xl mb-2 block">📁</span>
                    <span className="text-sm text-gray-600">Multiple Files</span>
                    <span className="text-xs text-gray-400 block mt-1">Select multiple JSON/TXT files</span>
                  </div>
                </button>
              </div>
              <div>
                <input
                  type="file"
                  accept=".json,.txt"
                  multiple
                  // @ts-ignore - webkitdirectory is not in React types but works in browsers
                  webkitdirectory=""
                  directory=""
                  onChange={handleFolderUpload}
                  className="hidden"
                  id="folder-upload-input"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('folder-upload-input') as HTMLInputElement;
                    if (input) {
                      input.value = ''; // Reset to allow re-selection
                      input.click();
                    }
                  }}
                  className="w-full p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 transition-colors"
                >
                  <div className="text-center">
                    <span className="text-xl mb-2 block">🗂️</span>
                    <span className="text-sm text-gray-600">Upload Folders</span>
                    <span className="text-xs text-gray-400 block mt-1">Select entire directories</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* File Management */}
        {files.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Files ({selectedFiles.length}/{files.length} selected)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const allSelected = selectedFiles.length === files.filter(f => !f.error).length;
                    setFiles(files.map(f => ({ ...f, selected: f.error ? false : !allSelected })));
                  }}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                >
                  {selectedFiles.length === files.filter(f => !f.error).length ? 'Deselect All' : 'Select All Valid'}
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={file.selected}
                      onChange={(e) => {
                        const newFiles = [...files];
                        newFiles[index].selected = e.target.checked;
                        setFiles(newFiles);
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                      disabled={!!file.error}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{file.name}</div>
                      <div className="text-xs text-gray-500">📁 {file.folderPath}</div>
                      
                      {/* Enhanced File Information */}
                      {file.metadata && (
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                          <span>📏 {formatFileSize(file.metadata.fileSize || 0)}</span>
                          {file.metadata.structure && (
                            <span>🔗 {file.metadata.structure}</span>
                          )}
                          {file.metadata.depth && (
                            <span>📊 depth: {file.metadata.depth}</span>
                          )}
                        </div>
                      )}
                      
                      {/* Validation Warnings */}
                      {file.warnings && file.warnings.length > 0 && (
                        <div className="text-xs text-yellow-600 mt-1">
                          ⚠️ {file.warnings.length} warning(s)
                          <div className="ml-4">
                            {file.warnings.slice(0, 2).map((warning, idx) => (
                              <div key={idx}>• {warning.message}</div>
                            ))}
                            {file.warnings.length > 2 && (
                              <div className="text-yellow-500">+ {file.warnings.length - 2} more...</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {file.error ? (
                      <div className="text-red-500 text-right">
                        <div className="font-medium">❌ Invalid</div>
                        <div className="text-xs">{file.error}</div>
                      </div>
                    ) : (
                      <div className="text-green-600 text-right">
                        <div className="font-medium">✅ Valid</div>
                        <div className="text-xs">{file.rows.length} rows</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delimiter</label>
              <input
                type="text"
                value={config.delimiter}
                onChange={(e) => setConfig(prev => ({ ...prev, delimiter: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Depth</label>
              <input
                type="number"
                value={config.maxDepth}
                onChange={(e) => setConfig(prev => ({ ...prev, maxDepth: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Array Mode</label>
              <select
                value={config.arrayMode}
                onChange={(e) => setConfig(prev => ({ ...prev, arrayMode: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="explode">Explode</option>
                <option value="join">Join</option>
                <option value="first">First</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sheet Name</label>
              <input
                type="text"
                value={sheet}
                onChange={(e) => setSheet(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        {progress.status !== ProcessingStatus.IDLE && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">
                {progress.status === ProcessingStatus.PROCESSING ? 'Processing...' : 
                 progress.status === ProcessingStatus.COMPLETED ? 'Completed' : 
                 progress.status === ProcessingStatus.ERROR ? 'Error' : 'Processing'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600">{progress.current}/{progress.total}</span>
                {progress.canCancel && (
                  <button
                    onClick={resetProcessing}
                    className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
            
            <p className="text-xs text-blue-600">{progress.message}</p>
            
            {progress.errors && progress.errors.length > 0 && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <div className="text-xs font-medium text-red-800">Errors:</div>
                {progress.errors.map((error, index) => (
                  <p key={index} className="text-xs text-red-700">{error}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Export Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h2>
          
          {processingMode === 'bulk' && selectedFiles.length > 0 ? (
            <div className="space-y-4">
              {/* Primary Export Options */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">📦 Bulk Export</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={exportToSingleSheet}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">📄</span>
                        <span className="font-semibold">Single Sheet Export</span>
                      </div>
                      <div className="text-xs opacity-90">
                        All data in one sheet • Optimized for large datasets
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={exportByFolderStructure}
                    disabled={folders.length === 0}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-lg font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">�️</span>
                        <span className="font-semibold">Folder-Based Export</span>
                      </div>
                      <div className="text-xs opacity-90">
                        Separate Excel per folder • Organized by structure
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Standard Export Options */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">📊 Additional Export</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={onDownloadCSV}
                    className="bg-green-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
                  >
                    📊 Export CSV
                  </button>

                  <button
                    onClick={onCopyToClipboard}
                    className="bg-purple-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-600 transition-colors"
                  >
                    📋 Copy Data
                  </button>
                </div>
              </div>

              {/* Export Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-blue-800">
                  <strong>💡 Tip:</strong> For {selectedFiles.length} files:
                  {selectedFiles.length > 50 ? (
                    <span className="ml-2">Use &quot;Single Sheet Export&quot; for best performance with large datasets.</span>
                  ) : folders.length > 1 ? (
                    <span className="ml-2">Use &quot;Folder-Based Export&quot; to maintain your directory structure.</span>
                  ) : (
                    <span className="ml-2">All export options are optimized and ready to use.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-2 block">📭</span>
              <p>No data to export. Upload files first.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}