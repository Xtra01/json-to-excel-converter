// Web Worker for background processing to prevent UI blocking
import * as XLSX from 'xlsx';

interface WorkerMessage {
  type: 'PROCESS_BATCH' | 'PROCESS_FOLDERS' | 'GENERATE_REPORT';
  payload: any;
}

interface WorkerResponse {
  type: 'PROGRESS' | 'COMPLETE' | 'ERROR';
  payload: any;
}

// Helper function to flatten objects
function flattenObject(obj: any, delimiter = '.', maxDepth = 5, prefix = '', depth = 0): any {
  if (depth >= maxDepth || obj === null || typeof obj !== 'object') {
    return { [prefix.slice(0, -1) || 'value']: obj };
  }

  const flattened: any = {};
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const newKey = `${prefix}${index}${delimiter}`;
      Object.assign(flattened, flattenObject(item, delimiter, maxDepth, newKey, depth + 1));
    });
  } else {
    Object.keys(obj).forEach(key => {
      const newKey = `${prefix}${key}${delimiter}`;
      Object.assign(flattened, flattenObject(obj[key], delimiter, maxDepth, newKey, depth + 1));
    });
  }
  
  return flattened;
}

// Process files in batches
function processBatch(files: any[], batchSize = 5) {
  const results: any[] = [];
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    batch.forEach((file, index) => {
      try {
        const data = JSON.parse(file.content);
        const flattened = Array.isArray(data) 
          ? data.map(item => flattenObject(item))
          : [flattenObject(data)];
        
        // Add source tracking
        flattened.forEach(row => {
          row['__source_file'] = file.name;
          row['__source_folder'] = file.folder || 'root';
        });
        
        results.push(...flattened);
        
        // Send progress update
        const progress = Math.round(((i + index + 1) / files.length) * 100);
        self.postMessage({
          type: 'PROGRESS',
          payload: {
            current: i + index + 1,
            total: files.length,
            progress,
            message: `Processing ${file.name}...`
          }
        } as WorkerResponse);
        
      } catch (error) {
        self.postMessage({
          type: 'PROGRESS',
          payload: {
            current: i + index + 1,
            total: files.length,
            message: `Error processing ${file.name}: ${error}`,
            errors: [`Failed to process ${file.name}: ${error}`]
          }
        } as WorkerResponse);
      }
    });
    
    // Small delay to prevent blocking
    if (i + batchSize < files.length) {
      // Use setTimeout equivalent in worker
      new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  return results;
}

// Process files by folders
function processByFolders(files: any[]) {
  const folderGroups = new Map<string, any[]>();
  
  // Group files by folder
  files.forEach(file => {
    const folder = file.folder || 'root';
    if (!folderGroups.has(folder)) {
      folderGroups.set(folder, []);
    }
    folderGroups.get(folder)!.push(file);
  });
  
  const results = new Map<string, any[]>();
  let processedFiles = 0;
  
  // Process each folder
  folderGroups.forEach((folderFiles, folderName) => {
    const folderData: any[] = [];
    
    folderFiles.forEach(file => {
      try {
        const data = JSON.parse(file.content);
        const flattened = Array.isArray(data) 
          ? data.map(item => flattenObject(item))
          : [flattenObject(data)];
        
        // Add source tracking
        flattened.forEach(row => {
          row['__source_file'] = file.name;
          row['__source_folder'] = folderName;
        });
        
        folderData.push(...flattened);
        
        processedFiles++;
        const progress = Math.round((processedFiles / files.length) * 100);
        
        self.postMessage({
          type: 'PROGRESS',
          payload: {
            current: processedFiles,
            total: files.length,
            progress,
            message: `Processing ${folderName}/${file.name}...`
          }
        } as WorkerResponse);
        
      } catch (error) {
        processedFiles++;
        self.postMessage({
          type: 'PROGRESS',
          payload: {
            current: processedFiles,
            total: files.length,
            message: `Error in ${folderName}/${file.name}: ${error}`,
            errors: [`Failed to process ${folderName}/${file.name}: ${error}`]
          }
        } as WorkerResponse);
      }
    });
    
    results.set(folderName, folderData);
  });
  
  return results;
}

// Main worker message handler
self.onmessage = function(e: MessageEvent<WorkerMessage>) {
  const { type, payload } = e.data;
  
  try {
    switch (type) {
      case 'PROCESS_BATCH':
        self.postMessage({
          type: 'PROGRESS',
          payload: {
            current: 0,
            total: payload.files.length,
            message: 'Starting batch processing...'
          }
        } as WorkerResponse);
        
        const batchResults = processBatch(payload.files, payload.batchSize || 5);
        
        self.postMessage({
          type: 'COMPLETE',
          payload: {
            data: batchResults,
            message: `Successfully processed ${payload.files.length} files`
          }
        } as WorkerResponse);
        break;
        
      case 'PROCESS_FOLDERS':
        self.postMessage({
          type: 'PROGRESS',
          payload: {
            current: 0,
            total: payload.files.length,
            message: 'Starting folder-based processing...'
          }
        } as WorkerResponse);
        
        const folderResults = processByFolders(payload.files);
        
        self.postMessage({
          type: 'COMPLETE',
          payload: {
            data: Object.fromEntries(folderResults),
            message: `Successfully processed ${folderResults.size} folders`
          }
        } as WorkerResponse);
        break;
        
      case 'GENERATE_REPORT':
        self.postMessage({
          type: 'PROGRESS',
          payload: {
            current: 0,
            total: 100,
            message: 'Generating comprehensive report...'
          }
        } as WorkerResponse);
        
        // Generate unified report data
        const allData = processBatch(payload.files);
        const folderData = processByFolders(payload.files);
        
        self.postMessage({
          type: 'COMPLETE',
          payload: {
            allData,
            folderData: Object.fromEntries(folderData),
            summary: {
              totalFiles: payload.files.length,
              totalRecords: allData.length,
              folders: Object.keys(Object.fromEntries(folderData)),
              processedAt: new Date().toISOString()
            },
            message: 'Report generated successfully'
          }
        } as WorkerResponse);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    self.postMessage({
      type: 'ERROR',
      payload: {
        error: errorMessage,
        message: `Worker error: ${errorMessage}`
      }
    } as WorkerResponse);
  }
};

// Export types for TypeScript
export type { WorkerMessage, WorkerResponse };