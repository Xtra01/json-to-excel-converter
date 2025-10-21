'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

// Enhanced imports
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
  ProcessingConfig
} from '../types';
import { logger, LogCategory, logUserAction, createPerformanceTracker } from '../utils/logger';
import { errorHandler } from '../utils/errorHandler';
import { memoryManager, AsyncProcessor } from '../utils/performance';
import { downloadCSV, copyToClipboard } from '../utils/csvExport';
import { createProcessor, processFileData, detectOptimalConfig } from '../utils/jsonProcessor';
import { fileManager, getFileStatistics } from '../utils/fileManager';

// Legacy monitoring imports for compatibility
import { debugLogger, performanceMonitor, emergencyRecovery, PerformanceData } from '../utils/monitoring';
import { useProcessingWorker } from '../hooks/useProcessingWorker';

// Legacy type definitions for backward compatibility
interface LegacyReportStats {
  totalFiles: number;
  totalRows: number;
  totalFolders: number;
  errorFiles: number;
  processingTime: number;
  memoryUsed: string;
  largestFile: { name: string; rows: number };
  folderStats: { [folder: string]: { files: number; rows: number; errors: number } };
}

interface LegacyProgressState {
  current: number;
  total: number;
  message: string;
  isProcessing: boolean;
  errors?: string[];
  canCancel?: boolean;
  timeStarted?: number;
  details?: {
    currentFile?: string;
    batchProgress?: number;
    totalRows?: number;
  };
}

interface LegacyFolderData extends Omit<FolderData, 'files'> {
  validFileCount: number;
  errorCount: number;
  totalRows: number;
  files: LegacyFileData[];
}

interface LegacyFileData extends FileData {
  fileSize?: number;
  createdDate?: string;
}

// Enhanced processing functions with source tracking
function toRecords(data: any, delimiter: string, maxDepth: number, sourceInfo?: { fileName: string; folderPath: string }): Row[] {
  function flatten(obj: any, prefix = '', depth = 0): Row {
    const result: Row = {};
    
    if (depth >= maxDepth || obj === null || typeof obj !== 'object') {
      result[prefix || 'value'] = obj;
      return result;
    }
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const key = prefix ? `${prefix}${delimiter}${index}` : String(index);
        Object.assign(result, flatten(item, key, depth + 1));
      });
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        const newKey = prefix ? `${prefix}${delimiter}${key}` : key;
        Object.assign(result, flatten(value, newKey, depth + 1));
      });
    }
    
    return result;
  }
  
  try {
    let records: Row[] = [];
    if (Array.isArray(data)) {
      records = data.map(item => flatten(item));
    } else {
      records = [flatten(data)];
    }
    
    // Add source tracking information to each record
    if (sourceInfo) {
      records = records.map((record, index) => ({
        '_source_file': sourceInfo.fileName,
        '_source_folder': sourceInfo.folderPath || 'Root',
        '_row_index': index + 1,
        '_processed_date': new Date().toISOString(),
        ...record
      }));
    }
    
    return records;
  } catch (error) {
    console.error('Error processing data:', error);
    return [];
  }
}

// Organize files by folders
function organizeFolders(files: LegacyFileData[]): LegacyFolderData[] {
  const folderMap = new Map<string, LegacyFolderData>();
  
  files.forEach(file => {
    const folderPath = file.folderPath || 'Root';
    const folderName = folderPath === 'Root' ? 'Root' : folderPath.split('/').pop() || folderPath;
    
    if (!folderMap.has(folderPath)) {
      folderMap.set(folderPath, {
        path: folderPath,
        name: folderName,
        files: [],
        validFileCount: 0,
        totalRows: 0,
        selected: true,
        errorCount: 0,
        statistics: {
          validFileCount: 0,
          totalRows: 0,
          errorCount: 0,
          totalSize: 0
        },
        metadata: {
          depth: 0,
          lastScanned: new Date().toISOString()
        }
      });
    }
    
    const folder = folderMap.get(folderPath)!;
    folder.files.push(file);
    
    if (file.error) {
      folder.errorCount++;
    } else if (file.rows.length > 0) {
      folder.validFileCount++;
      folder.totalRows += file.rows.length;
    }
  });
  
  return Array.from(folderMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Generate comprehensive report statistics
function generateReportStats(files: LegacyFileData[], processingTime: number): LegacyReportStats {
  const folders = organizeFolders(files);
  const errorFiles = files.filter(f => f.error).length;
  
  let largestFile = { name: '', rows: 0 };
  files.forEach(file => {
    if (file.rows.length > largestFile.rows) {
      largestFile = { name: file.name, rows: file.rows.length };
    }
  });
  
  const folderStats: { [folder: string]: { files: number; rows: number; errors: number } } = {};
  folders.forEach(folder => {
    folderStats[folder.name] = {
      files: folder.files.length,
      rows: folder.totalRows,
      errors: folder.errorCount
    };
  });
  
  return {
    totalFiles: files.length,
    totalRows: files.reduce((sum, f) => sum + f.rows.length, 0),
    totalFolders: folders.length,
    errorFiles,
    processingTime,
    memoryUsed: getMemoryInfo(),
    largestFile,
    folderStats
  };
}

// Memory monitoring
function getMemoryInfo(): string {
  try {
    if ((performance as any).memory) {
      const mem = (performance as any).memory;
      const used = Math.round(mem.usedJSHeapSize / 1024 / 1024);
      const total = Math.round(mem.totalJSHeapSize / 1024 / 1024);
      return `${used}MB / ${total}MB`;
    }
    return 'N/A';
  } catch {
    return 'N/A';
  }
}

function downloadXLSX(rows: Row[], filename = "converted.xlsx", sheetName = "data", order?: string[]) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: order });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

// Enhanced folder-based processing
async function processByFolders(
  files: FileData[], 
  baseFilename: string, 
  order?: string[], 
  onProgress?: (progress: ProgressState) => void
) {
  const startTime = Date.now();
  const folders = organizeFolders(files.filter(f => f.selected));
  const selectedFolders = folders.filter(f => f.selected && f.validFileCount > 0);
  
  const debugLogs: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  
  debugLogs.push(`Starting folder-based processing: ${selectedFolders.length} folders`);
  
  for (let folderIndex = 0; folderIndex < selectedFolders.length; folderIndex++) {
    const folder = selectedFolders[folderIndex];
    const validFiles = folder.files.filter(f => f.rows.length > 0);
    
    onProgress?.({
      isProcessing: true,
      current: folderIndex + 1,
      total: selectedFolders.length,
      message: `Processing folder: ${folder.name} (${validFiles.length} files)...`,
      timeStarted: startTime,
      lastActivity: Date.now(),
      canCancel: true,
      debug: debugLogs,
      details: {
        currentFile: folder.name,
        totalRows: folder.totalRows
      }
    });
    
    try {
      const wb = XLSX.utils.book_new();
      const usedSheetNames = new Set<string>();
      let sheetsCreated = 0;
      
      // Add folder summary sheet first
      const summaryData = [{
        'Folder Name': folder.name,
        'Folder Path': folder.path,
        'Total Files': folder.files.length,
        'Valid Files': folder.validFileCount,
        'Error Files': folder.errorCount,
        'Total Rows': folder.totalRows,
        'Processing Date': new Date().toISOString(),
        'Memory Usage': getMemoryInfo()
      }];
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, "📊_FOLDER_SUMMARY");
      sheetsCreated++;
      
      for (let fileIndex = 0; fileIndex < validFiles.length; fileIndex++) {
        const file = validFiles[fileIndex];
        
        // Yield to main thread
        if (fileIndex % 2 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Update file progress
        onProgress?.({
          isProcessing: true,
          current: folderIndex + 1,
          total: selectedFolders.length,
          message: `Folder ${folder.name}: Processing ${file.name}...`,
          timeStarted: startTime,
          lastActivity: Date.now(),
          canCancel: true,
          debug: debugLogs,
          details: {
            currentFile: file.name,
            batchProgress: Math.round(((fileIndex + 1) / validFiles.length) * 100)
          }
        });
        
        try {
          let sheetName = file.name.replace(/\.[^/.]+$/, "").substring(0, 25);
          
          // Make sheet name unique and add file indicator
          let counter = 1;
          let originalSheetName = sheetName;
          while (usedSheetNames.has(sheetName)) {
            sheetName = `${originalSheetName}_${counter}`.substring(0, 25);
            counter++;
          }
          usedSheetNames.add(sheetName);
          
          if (file.rows.length > 0) {
            const ws = XLSX.utils.json_to_sheet(file.rows, { header: order });
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            sheetsCreated++;
            debugLogs.push(`Sheet created: ${sheetName} (${file.rows.length} rows)`);
          }
        } catch (fileError) {
          const errorMsg = `Error in file ${file.name}: ${fileError}`;
          errors.push(errorMsg);
          debugLogs.push(errorMsg);
        }
      }
      
      // Save folder file
      const sanitizedFolderName = folder.name.replace(/[<>:"/\\|?*]/g, '_');
      const folderFilename = `${baseFilename}_FOLDER_${sanitizedFolderName}.xlsx`;
      XLSX.writeFile(wb, folderFilename);
      
      warnings.push(`Folder "${folder.name}": ${sheetsCreated} sheets created`);
      debugLogs.push(`Folder file saved: ${folderFilename}`);
      
    } catch (folderError) {
      const errorMsg = `Critical error in folder ${folder.name}: ${folderError}`;
      errors.push(errorMsg);
      debugLogs.push(errorMsg);
    }
    
    // Small delay between folders
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  
  const processingTime = Date.now() - startTime;
  debugLogs.push(`Folder processing completed in ${Math.round(processingTime / 1000)}s`);
  
  onProgress?.({
    isProcessing: false,
    current: selectedFolders.length,
    total: selectedFolders.length,
    message: `✅ Folder processing completed! ${selectedFolders.length} folder files created.`,
    timeStarted: startTime,
    lastActivity: Date.now(),
    warnings,
    errors,
    debug: debugLogs
  });
}

// Create comprehensive unified report
async function createUnifiedReport(
  files: FileData[], 
  baseFilename: string, 
  order?: string[], 
  onProgress?: (progress: ProgressState) => void
) {
  const startTime = Date.now();
  const selectedFiles = files.filter(f => f.selected);
  const validFiles = selectedFiles.filter(f => f.rows.length > 0);
  
  onProgress?.({
    isProcessing: true,
    current: 0,
    total: 100,
    message: 'Creating comprehensive unified report...',
    timeStarted: startTime,
    lastActivity: Date.now(),
    canCancel: true
  });
  
  try {
    const wb = XLSX.utils.book_new();
    const processingTime = Date.now() - startTime;
    const stats = generateReportStats(selectedFiles, processingTime);
    
    // 1. Executive Summary Sheet
    const execSummary = [
      { 'Metric': 'Total Files Processed', 'Value': stats.totalFiles, 'Details': 'Including error files' },
      { 'Metric': 'Total Data Rows', 'Value': stats.totalRows, 'Details': 'Across all valid files' },
      { 'Metric': 'Total Folders', 'Value': stats.totalFolders, 'Details': 'Unique folder paths' },
      { 'Metric': 'Error Files', 'Value': stats.errorFiles, 'Details': 'Files with parsing errors' },
      { 'Metric': 'Success Rate', 'Value': `${Math.round(((stats.totalFiles - stats.errorFiles) / stats.totalFiles) * 100)}%`, 'Details': 'Files processed successfully' },
      { 'Metric': 'Largest File', 'Value': stats.largestFile.name, 'Details': `${stats.largestFile.rows} rows` },
      { 'Metric': 'Memory Usage', 'Value': stats.memoryUsed, 'Details': 'Peak memory during processing' },
      { 'Metric': 'Processing Time', 'Value': `${Math.round(stats.processingTime / 1000)}s`, 'Details': 'Total elapsed time' },
      { 'Metric': 'Report Generated', 'Value': new Date().toLocaleString(), 'Details': 'Current timestamp' }
    ];
    
    const execWs = XLSX.utils.json_to_sheet(execSummary);
    XLSX.utils.book_append_sheet(wb, execWs, "📈 Executive Summary");
    
    // 2. Folder Statistics Sheet
    const folderStats = Object.entries(stats.folderStats).map(([folder, data]) => ({
      'Folder Name': folder,
      'Total Files': data.files,
      'Total Rows': data.rows,
      'Error Files': data.errors,
      'Success Rate': `${Math.round(((data.files - data.errors) / data.files) * 100)}%`,
      'Avg Rows per File': data.files > 0 ? Math.round(data.rows / (data.files - data.errors)) : 0
    }));
    
    const folderWs = XLSX.utils.json_to_sheet(folderStats);
    XLSX.utils.book_append_sheet(wb, folderWs, "📁 Folder Statistics");
    
    // 3. File Details Sheet
    onProgress?.({
      isProcessing: true,
      current: 25,
      total: 100,
      message: 'Generating file details report...',
      timeStarted: startTime,
      lastActivity: Date.now()
    });
    
    const fileDetails = selectedFiles.map(file => ({
      'File Name': file.name,
      'Folder Path': file.folderPath || 'Root',
      'Row Count': file.rows.length,
      'Status': file.error ? 'Error' : (file.rows.length > 0 ? 'Success' : 'Empty'),
      'Error Message': file.error || '',
      'File Size': file.fileSize ? `${Math.round(file.fileSize / 1024)} KB` : 'N/A',
      'Created Date': file.createdDate || 'N/A'
    }));
    
    const fileWs = XLSX.utils.json_to_sheet(fileDetails);
    XLSX.utils.book_append_sheet(wb, fileWs, "📄 File Details");
    
    // 4. Combined Data Sheet (Limited for performance)
    onProgress?.({
      isProcessing: true,
      current: 50,
      total: 100,
      message: 'Combining data from all files...',
      timeStarted: startTime,
      lastActivity: Date.now()
    });
    
    const MAX_COMBINED_ROWS = 50000; // Limit for Excel performance
    let allRows: Row[] = [];
    let includedFiles = 0;
    
    for (const file of validFiles) {
      if (allRows.length + file.rows.length > MAX_COMBINED_ROWS) {
        break;
      }
      allRows.push(...file.rows);
      includedFiles++;
    }
    
    if (allRows.length > 0) {
      // Add a note if data was truncated
      if (includedFiles < validFiles.length) {
        allRows.unshift({
          '_NOTE': `Data limited to first ${includedFiles}/${validFiles.length} files (${MAX_COMBINED_ROWS} rows max)`,
          '_source_file': 'SYSTEM_NOTE',
          '_source_folder': 'SYSTEM',
          '_row_index': 0,
          '_processed_date': new Date().toISOString()
        } as Row);
      }
      
      const combinedWs = XLSX.utils.json_to_sheet(allRows, { header: order });
      XLSX.utils.book_append_sheet(wb, combinedWs, "📊 Combined Data");
    }
    
    // 5. Data Quality Analysis
    onProgress?.({
      isProcessing: true,
      current: 75,
      total: 100,
      message: 'Analyzing data quality...',
      timeStarted: startTime,
      lastActivity: Date.now()
    });
    
    const columnStats = new Map<string, { count: number; nullCount: number; uniqueValues: Set<any> }>();
    validFiles.forEach(file => {
      file.rows.forEach(row => {
        Object.entries(row).forEach(([key, value]) => {
          if (!columnStats.has(key)) {
            columnStats.set(key, { count: 0, nullCount: 0, uniqueValues: new Set() });
          }
          const stat = columnStats.get(key)!;
          stat.count++;
          if (value === null || value === undefined || value === '') {
            stat.nullCount++;
          }
          stat.uniqueValues.add(value);
        });
      });
    });
    
    const qualityAnalysis = Array.from(columnStats.entries()).map(([column, stat]) => ({
      'Column Name': column,
      'Total Values': stat.count,
      'Null/Empty Values': stat.nullCount,
      'Completeness': `${Math.round(((stat.count - stat.nullCount) / stat.count) * 100)}%`,
      'Unique Values': stat.uniqueValues.size,
      'Uniqueness': `${Math.round((stat.uniqueValues.size / stat.count) * 100)}%`
    }));
    
    const qualityWs = XLSX.utils.json_to_sheet(qualityAnalysis);
    XLSX.utils.book_append_sheet(wb, qualityWs, "🔍 Data Quality");
    
    // Save unified report
    const reportFilename = `${baseFilename}_UNIFIED_REPORT.xlsx`;
    XLSX.writeFile(wb, reportFilename);
    
    onProgress?.({
      isProcessing: false,
      current: 100,
      total: 100,
      message: `✅ Unified report created: ${reportFilename}`,
      timeStarted: startTime,
      lastActivity: Date.now()
    });
    
  } catch (error) {
    onProgress?.({
      isProcessing: false,
      current: 0,
      total: 100,
      message: `❌ Report generation failed: ${error}`,
      errors: [`Report generation error: ${error}`],
      timeStarted: startTime,
      lastActivity: Date.now()
    });
  }
}

// Legacy batch processing (kept for compatibility)
async function processFilesBatch(
  files: FileData[], 
  filename: string, 
  order?: string[], 
  onProgress?: (progress: ProgressState) => void
) {
  const selectedFiles = files.filter(f => f.selected && f.rows.length > 0);
  const BATCH_SIZE = 15;
  const batches = [];
  
  for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
    batches.push(selectedFiles.slice(i, i + BATCH_SIZE));
  }
  
  const startTime = Date.now();
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    onProgress?.({
      isProcessing: true,
      current: batchIndex + 1,
      total: batches.length,
      message: `Creating batch ${batchIndex + 1}/${batches.length} (${batch.length} files)...`,
      timeStarted: startTime,
      lastActivity: Date.now(),
      canCancel: true
    });
    
    const wb = XLSX.utils.book_new();
    const usedSheetNames = new Set<string>();
    
    for (let fileIndex = 0; fileIndex < batch.length; fileIndex++) {
      const file = batch[fileIndex];
      
      // Yield to main thread every 2 files
      if (fileIndex % 2 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      try {
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
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }
    
    // Save batch file
    const batchFilename = `${filename}_BATCH_${String(batchIndex + 1).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(wb, batchFilename);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  onProgress?.({
    isProcessing: false,
    current: batches.length,
    total: batches.length,
    message: `✅ Export completed! ${batches.length} batch files created.`,
    timeStarted: startTime,
    lastActivity: Date.now()
  });
}

function downloadBulkXLSX(files: FileData[], filename = "bulk_converted.xlsx", order?: string[]) {
  const selectedFiles = files.filter(f => f.selected);
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
    downloadXLSX(allRows, filename, "Combined_Data", order);
  }
}

export default function JsonToExcelApp() {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<any>(null);
  const [delimiter, setDelimiter] = useState('_');
  const [maxDepth, setMaxDepth] = useState(10);
  const [sheet, setSheet] = useState('data');
  const [columns, setColumns] = useState<string[]>([]);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('single');
  const [files, setFiles] = useState<LegacyFileData[]>([]);
  const [folders, setFolders] = useState<LegacyFolderData[]>([]);
  const [showFolders, setShowFolders] = useState(false);
  const [progress, setProgress] = useState<LegacyProgressState>({
    isProcessing: false,
    current: 0,
    total: 0,
    message: ''
  });
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Web Worker for background processing
  const {
    isWorkerReady,
    processInBackground,
    terminateWorker
  } = useProcessingWorker(
    (workerProgress) => {
      debugLogger.log(`Worker progress: ${workerProgress.message}`, 'info');
      setProgress({
        isProcessing: true,
        current: workerProgress.current,
        total: workerProgress.total,
        message: workerProgress.message,
        errors: workerProgress.errors || [],
        lastActivity: Date.now()
      });
    },
    (error) => {
      debugLogger.log(`Worker error: ${error}`, 'error');
      setProgress({
        isProcessing: false,
        current: 0,
        total: 0,
        message: `Background processing failed: ${error}`,
        errors: [error],
        lastActivity: Date.now()
      });
    }
  );
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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
    setShowFolders(files.some(f => f.folderPath && f.folderPath !== 'Root'));
  }, [files]);

  // Initialize monitoring system
  useEffect(() => {
    debugLogger.log('Application initialized', 'info');
    
    // Setup emergency recovery
    emergencyRecovery.addRecoveryCallback(() => {
      setProgress({
        isProcessing: false,
        current: 0,
        total: 0,
        message: 'Emergency recovery activated'
      });
    });

    // Load existing debug logs
    setDebugLogs(debugLogger.getLogs());
    
    // Update debug logs every 3 seconds
    const logInterval = setInterval(() => {
      setDebugLogs(debugLogger.getLogs());
    }, 3000);

    return () => {
      clearInterval(logInterval);
      performanceMonitor.stop();
    };
  }, []);

  // Start/stop performance monitoring based on processing state
  useEffect(() => {
    if (progress.isProcessing && !isMonitoring) {
      setIsMonitoring(true);
      performanceMonitor.start((data) => {
        setPerformanceData(data);
      });
      debugLogger.log('Performance monitoring started for processing', 'info');
    } else if (!progress.isProcessing && isMonitoring) {
      setIsMonitoring(false);
      performanceMonitor.stop();
      debugLogger.log('Performance monitoring stopped', 'info');
    }
  }, [progress.isProcessing, isMonitoring]);

  async function onDownloadXLSX() {
    debugLogger.log('Standard export started', 'info');
    try {
      if (processingMode === "bulk") {
        const selectedFilesCount = selectedFiles.length;
        debugLogger.log(`Bulk processing: ${selectedFilesCount} files selected`, 'info');
        
        if (selectedFilesCount > 10) {
          // Use batch processing for large datasets
          debugLogger.log('Using batch processing for large dataset', 'info');
          setProgress({
            isProcessing: true,
            current: 0,
            total: 0,
            message: 'Starting batch processing...',
            canCancel: true,
            timeStarted: Date.now()
          });
          
          await processFilesBatch(files, "bulk_converted", columns, setProgress);
        } else {
          // Use regular processing for small datasets
          debugLogger.log('Using regular processing for small dataset', 'info');
          downloadBulkXLSX(selectedFiles, "bulk_converted.xlsx", columns);
        }
      } else {
        debugLogger.log('Single file processing', 'info');
        downloadXLSX(orderedRows, "converted.xlsx", sheet, columns);
      }
      debugLogger.log('Standard export completed successfully', 'info');
    } catch (error) {
      const errorMsg = `Standard export failed: ${error}`;
      debugLogger.log(errorMsg, 'error');
      setProgress({
        isProcessing: false,
        current: 0,
        total: 0,
        message: errorMsg,
        errors: [`Critical error: ${error}`],
        lastActivity: Date.now()
      });
    }
  }

  async function onDownloadByFolders() {
    debugLogger.log('Folder-based export started', 'info');
    try {
      setProgress({
        isProcessing: true,
        current: 0,
        total: 0,
        message: 'Starting folder-based processing...',
        canCancel: true,
        timeStarted: Date.now()
      });
      
      await processByFolders(files, "folder_export", columns, setProgress);
      debugLogger.log('Folder-based export completed successfully', 'info');
    } catch (error) {
      const errorMsg = `Folder export failed: ${error}`;
      debugLogger.log(errorMsg, 'error');
      setProgress({
        isProcessing: false,
        current: 0,
        total: 0,
        message: errorMsg,
        errors: [`Critical error: ${error}`],
        lastActivity: Date.now()
      });
    }
  }

  async function onDownloadUnifiedReport() {
    debugLogger.log('Unified report generation started', 'info');
    try {
      setProgress({
        isProcessing: true,
        current: 0,
        total: 100,
        message: 'Generating comprehensive unified report...',
        canCancel: true,
        timeStarted: Date.now()
      });
      
      await createUnifiedReport(files, "comprehensive_report", columns, setProgress);
      debugLogger.log('Unified report generated successfully', 'info');
    } catch (error) {
      const errorMsg = `Report generation failed: ${error}`;
      debugLogger.log(errorMsg, 'error');
      setProgress({
        isProcessing: false,
        current: 0,
        total: 100,
        message: errorMsg,
        errors: [`Critical error: ${error}`],
        lastActivity: Date.now()
      });
    }
  }

  function resetProcessing() {
    setProgress({
      isProcessing: false,
      current: 0,
      total: 0,
      message: ''
    });
  }

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
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }

  function handleMultipleFileUpload(fileList: FileList | File[]) {
    const newFiles: FileData[] = [];
    let processed = 0;
    const filesArray = Array.from(fileList);
    
    filesArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);
          
          // Extract folder path from webkitRelativePath or use file name structure
          let folderPath = 'Upload';
          if ((file as any).webkitRelativePath) {
            const pathParts = (file as any).webkitRelativePath.split('/');
            if (pathParts.length > 1) {
              folderPath = pathParts.slice(0, -1).join('/');
            }
          }
          
          const sourceInfo = {
            fileName: file.name,
            folderPath: folderPath
          };
          
          const rows = toRecords(data, delimiter, maxDepth, sourceInfo);
          
          newFiles.push({
            name: file.name,
            rows,
            selected: true,
            folderPath: folderPath,
            originalPath: (file as any).webkitRelativePath || file.name,
            fileSize: file.size,
            createdDate: new Date(file.lastModified).toISOString()
          });
        } catch (err) {
          newFiles.push({
            name: file.name,
            rows: [],
            error: 'Invalid JSON',
            selected: false,
            folderPath: 'Error_Files',
            originalPath: (file as any).webkitRelativePath || file.name,
            fileSize: file.size,
            createdDate: new Date(file.lastModified).toISOString()
          });
        }
        
        processed++;
        if (processed === filesArray.length) {
          setFiles(prev => [...prev, ...newFiles]);
        }
      };
      reader.readAsText(file);
    });
  }

  function handleFolderUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files) {
      handleMultipleFileUpload(files);
    }
  }

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
              <p className="text-gray-600">Convert JSON files to Excel with advanced options</p>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => setProcessingMode('single')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                processingMode === 'single'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Single File
            </button>
            <button
              onClick={() => setProcessingMode('bulk')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                processingMode === 'bulk'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bulk Processing
            </button>
          </div>
        </div>

        {/* Debug Panel */}
        {showDebugPanel && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">Debug Monitor</h3>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded ${isMonitoring ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {isMonitoring ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => {
                      debugLogger.exportLogs();
                      debugLogger.log('Debug logs exported manually', 'info');
                    }}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    Export Logs
                  </button>
                  <button
                    onClick={() => setShowDebugPanel(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              {/* Performance Metrics */}
              {performanceData && (
                <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-white p-2 rounded border">
                    <div className="text-gray-600">Memory</div>
                    <div className="font-medium">
                      {performanceData.memory 
                        ? `${performanceData.memory.used}MB` 
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <div className="text-gray-600">Connection</div>
                    <div className={`font-medium ${performanceData.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {performanceData.isOnline ? 'Online' : 'Offline'}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <div className="text-gray-600">Performance</div>
                    <div className={`font-medium ${performanceData.hasPerformanceIssues ? 'text-orange-600' : 'text-green-600'}`}>
                      {performanceData.hasPerformanceIssues ? 'Issues' : 'Good'}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <div className="text-gray-600">Last Check</div>
                    <div className="font-medium text-xs">
                      {new Date(performanceData.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Debug Logs */}
              <div className="bg-white border rounded max-h-40 overflow-y-auto">
                <div className="p-2 bg-gray-50 border-b text-xs font-medium text-gray-600">
                  Recent Logs ({debugLogs.length}/200)
                </div>
                <div className="p-2 space-y-1">
                  {debugLogs.slice(-10).map((log) => (
                    <div key={log.id} className="text-xs flex">
                      <span className="text-gray-500 w-16 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`w-12 flex-shrink-0 ${
                        log.level === 'error' ? 'text-red-600' : 
                        log.level === 'warn' ? 'text-orange-600' : 
                        'text-blue-600'
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-gray-800">{log.message}</span>
                    </div>
                  ))}
                  {debugLogs.length === 0 && (
                    <div className="text-xs text-gray-500">No logs available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Debug Toggle */}
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
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
            {isMonitoring && (
              <span className="text-xs text-green-600 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                Monitoring Active
              </span>
            )}
          </div>
          
          <div className="text-xs text-gray-500">
            Press Ctrl+Shift+D for emergency debug export
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Files</h2>
          
          {processingMode === 'single' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt"
                onChange={(e) => e.target.files?.[0] && handleSingleFileUpload(e.target.files[0])}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
              >
                <div className="text-center">
                  <span className="text-2xl mb-2 block">📄</span>
                  <span className="text-gray-600">Click to upload single JSON file</span>
                </div>
              </button>
            </div>
          ) : (
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
                    </div>
                  </button>
                </div>
                <div>
                  <input
                    type="file"
                    accept=".json,.txt"
                    multiple
                    {...{ webkitdirectory: "" }}
                    onChange={handleFolderUpload}
                    className="hidden"
                    id="folder-upload"
                  />
                  <button
                    onClick={() => document.getElementById('folder-upload')?.click()}
                    className="w-full p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 transition-colors"
                  >
                    <div className="text-center">
                      <span className="text-xl mb-2 block">🗂️</span>
                      <span className="text-sm text-gray-600">Upload Folders</span>
                    </div>
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                💡 Use "Upload Folders" to maintain folder structure and enable folder-based grouping
              </div>
            </div>
          )}
        </div>

        {/* Enhanced File/Folder Management */}
        {processingMode === 'bulk' && files.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Files ({selectedFiles.length}/{files.length} selected)
              </h2>
              <div className="flex gap-2">
                {showFolders && (
                  <button
                    onClick={() => setShowFolders(!showFolders)}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                  >
                    {showFolders ? '📄 File View' : '📁 Folder View'}
                  </button>
                )}
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
              {showFolders ? (
                // Folder View
                folders.map((folder, folderIndex) => (
                  <div key={folderIndex} className="mb-4 border border-gray-200 rounded-lg">
                    <div className="bg-gray-50 p-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={folder.selected}
                            onChange={(e) => {
                              const newFolders = [...folders];
                              newFolders[folderIndex].selected = e.target.checked;
                              setFolders(newFolders);
                              
                              // Update individual files
                              setFiles(files.map(f => 
                                f.folderPath === folder.path ? { ...f, selected: e.target.checked && !f.error } : f
                              ));
                            }}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm font-medium text-gray-900">📁 {folder.name}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {folder.validFileCount} valid, {folder.errorCount} errors, {folder.totalRows.toLocaleString()} rows
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      {folder.files.map((file, fileIndex) => (
                        <div key={fileIndex} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={file.selected}
                              onChange={(e) => {
                                const globalIndex = files.findIndex(f => f === file);
                                const newFiles = [...files];
                                newFiles[globalIndex].selected = e.target.checked;
                                setFiles(newFiles);
                              }}
                              className="w-3 h-3 text-blue-600 rounded"
                            />
                            <span className="text-xs text-gray-700">{file.name}</span>
                          </div>
                          <div className="text-xs">
                            {file.error ? (
                              <span className="text-red-500">❌ {file.error}</span>
                            ) : (
                              <span className="text-green-600">✅ {file.rows.length}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // File View
                files.map((file, index) => (
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
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{file.name}</div>
                        <div className="text-xs text-gray-500">📁 {file.folderPath}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {file.error ? (
                        <span className="text-red-500">❌ {file.error}</span>
                      ) : (
                        <span className="text-green-600">✅ {file.rows.length} rows</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delimiter</label>
              <input
                type="text"
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Depth</label>
              <input
                type="number"
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
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

        {/* Export Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Export</h2>
          
          {/* Large Dataset Warning */}
          {processingMode === 'bulk' && selectedFiles.length > 10 && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-amber-500 text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-amber-800">Large Dataset - Batch Processing</p>
                  <p className="text-xs text-amber-700 mt-1">
                    {selectedFiles.length} files selected. Will create multiple Excel files (max 15 sheets each) 
                    to prevent memory issues and ensure stable processing.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="pt-4 border-t border-slate-200">
            <div className="space-y-3">
              {/* Progress indicator */}
              {progress.isProcessing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Processing Export</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue-600">{progress.current}/{progress.total}</span>
                      <button
                        onClick={resetProcessing}
                        className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                        title="Reset if stuck"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-blue-600">{progress.message}</p>
                    {progress.timeStarted && (
                      <span className="text-xs text-blue-500">
                        {Math.round((Date.now() - progress.timeStarted) / 1000)}s elapsed
                      </span>
                    )}
                  </div>
                  
                  {progress.details && (
                    <div className="bg-blue-25 border border-blue-100 rounded p-2 mb-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {progress.details.currentFile && (
                          <div className="text-blue-700 truncate">File: {progress.details.currentFile}</div>
                        )}
                        {progress.details.batchProgress !== undefined && (
                          <div className="text-blue-700">Batch: {progress.details.batchProgress}%</div>
                        )}
                        {progress.details.totalRows && (
                          <div className="text-blue-700">Rows: {progress.details.totalRows.toLocaleString()}</div>
                        )}
                        <div className="text-blue-700">Memory: {getMemoryInfo()}</div>
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {progress.warnings && progress.warnings.length > 0 && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-amber-500 text-sm">⚠️</span>
                        <span className="text-xs font-medium text-amber-800">Warnings ({progress.warnings.length}):</span>
                      </div>
                      {progress.warnings.slice(-3).map((warning, index) => (
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
                      {progress.errors.slice(-3).map((error, index) => (
                        <p key={index} className="text-xs text-red-700 truncate">{error}</p>
                      ))}
                    </div>
                  )}

                  {/* Debug Logs */}
                  {progress.debug && progress.debug.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                        🔍 Debug Logs ({progress.debug.length}) - Click to expand
                      </summary>
                      <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded max-h-40 overflow-y-auto">
                        {progress.debug.slice(-10).map((log, index) => (
                          <p key={index} className="text-xs text-gray-600 font-mono mb-1">{log}</p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {!progress.isProcessing && (
                <div className="space-y-3">
                  {/* Primary Export Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={onDownloadXLSX}
                      disabled={processingMode === 'bulk' ? selectedFiles.length === 0 : orderedRows.length === 0}
                      className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      📥 Standard Export
                      <div className="text-xs opacity-75 mt-1">
                        {processingMode === 'bulk' ? 'Batch processing' : 'Single file'}
                      </div>
                    </button>

                    {processingMode === 'bulk' && showFolders && folders.length > 1 && (
                      <button
                        onClick={onDownloadByFolders}
                        disabled={selectedFiles.length === 0}
                        className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        📁 Export by Folders
                        <div className="text-xs opacity-75 mt-1">
                          One file per folder
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Advanced Report Option */}
                  {processingMode === 'bulk' && selectedFiles.length > 0 && (
                    <div className="border-t pt-3">
                      <button
                        onClick={onDownloadUnifiedReport}
                        disabled={selectedFiles.length === 0}
                        className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-4 rounded-lg font-medium hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        📊 Generate Comprehensive Report
                        <div className="text-xs opacity-90 mt-1">
                          Executive summary, statistics, data quality analysis & combined data
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {progress.isProcessing && (
                <div className="bg-blue-100 text-blue-600 px-6 py-3 rounded-lg font-medium text-center">
                  ⏳ Processing...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}