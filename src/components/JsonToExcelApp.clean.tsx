'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

// Types
interface Row {
  [key: string]: any;
}

interface FileData {
  name: string;
  rows: Row[];
  error?: string;
  selected: boolean;
  folderPath?: string;
}

interface FolderData {
  path: string;
  files: FileData[];
  validFileCount: number;
  totalRows: number;
  selected: boolean;
}

interface ProgressState {
  isProcessing: boolean;
  current: number;
  total: number;
  message: string;
  warnings?: string[];
  errors?: string[];
  debug?: string[];
  timeStarted?: number;
  lastActivity?: number;
  canCancel?: boolean;
  details?: {
    memoryUsage?: string;
    currentFile?: string;
    totalRows?: number;
    batchProgress?: number;
  };
}

type ProcessingMode = 'single' | 'bulk';

// Processing functions
function toRecords(data: any, delimiter: string, maxDepth: number): Row[] {
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
    if (Array.isArray(data)) {
      return data.map(item => flatten(item));
    } else {
      return [flatten(data)];
    }
  } catch (error) {
    console.error('Error processing data:', error);
    return [];
  }
}

function downloadXLSX(rows: Row[], filename = "converted.xlsx", sheetName = "data", order?: string[]) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: order });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

// Async processing with UI yielding
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
      
      // Update progress
      onProgress?.({
        isProcessing: true,
        current: batchIndex + 1,
        total: batches.length,
        message: `Batch ${batchIndex + 1}: Processing ${file.name}...`,
        timeStarted: startTime,
        lastActivity: Date.now(),
        canCancel: true,
        details: {
          currentFile: file.name,
          batchProgress: Math.round(((fileIndex + 1) / batch.length) * 100)
        }
      });
      
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
        
        // Clean rows
        const cleanRows = file.rows.map(row => {
          const cleanRow = { ...row };
          delete cleanRow._source_file;
          delete cleanRow._source_folder;
          return cleanRow;
        });
        
        if (cleanRows.length > 0) {
          const ws = XLSX.utils.json_to_sheet(cleanRows, { header: order });
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
  const [files, setFiles] = useState<FileData[]>([]);
  const [progress, setProgress] = useState<ProgressState>({
    isProcessing: false,
    current: 0,
    total: 0,
    message: ''
  });
  
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

  async function onDownloadXLSX() {
    try {
      if (processingMode === "bulk") {
        const selectedFilesCount = selectedFiles.length;
        
        if (selectedFilesCount > 10) {
          // Use batch processing for large datasets
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
          downloadBulkXLSX(selectedFiles, "bulk_converted.xlsx", columns);
        }
      } else {
        downloadXLSX(orderedRows, "converted.xlsx", sheet, columns);
      }
    } catch (error) {
      setProgress({
        isProcessing: false,
        current: 0,
        total: 0,
        message: `Export failed: ${error}`,
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

  function handleMultipleFileUpload(fileList: FileList) {
    const newFiles: FileData[] = [];
    let processed = 0;
    
    Array.from(fileList).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);
          const rows = toRecords(data, delimiter, maxDepth);
          
          newFiles.push({
            name: file.name,
            rows,
            selected: true,
            folderPath: 'Upload'
          });
        } catch (err) {
          newFiles.push({
            name: file.name,
            rows: [],
            error: 'Invalid JSON',
            selected: false,
            folderPath: 'Upload'
          });
        }
        
        processed++;
        if (processed === fileList.length) {
          setFiles(prev => [...prev, ...newFiles]);
        }
      };
      reader.readAsText(file);
    });
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
                  <span className="text-2xl mb-2 block">📁</span>
                  <span className="text-gray-600">Click to upload multiple JSON files</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Bulk File List */}
        {processingMode === 'bulk' && files.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Files ({selectedFiles.length}/{files.length} selected)
            </h2>
            <div className="max-h-60 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
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
                    <span className="text-sm font-medium text-gray-900">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {file.error ? (
                      <span className="text-red-500">❌ {file.error}</span>
                    ) : (
                      <span className="text-green-600">✅ {file.rows.length} rows</span>
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
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                {!progress.isProcessing && (
                  <>
                    <button
                      onClick={onDownloadXLSX}
                      disabled={processingMode === 'bulk' ? selectedFiles.length === 0 : orderedRows.length === 0}
                      className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {progress.isProcessing ? '⏳ Processing...' : '📥 Download Excel'}
                    </button>
                  </>
                )}
                
                {progress.isProcessing && (
                  <div className="flex-1 bg-blue-100 text-blue-600 px-6 py-3 rounded-lg font-medium text-center">
                    ⏳ Processing...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}