// Simple async utilities to fix UI blocking
export const yieldToMainThread = (): Promise<void> => {
  return new Promise(resolve => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
};

export const createWorksheetAsync = (data: any[], options?: any): Promise<any> => {
  return new Promise((resolve) => {
    const callback = () => {
      try {
        const XLSX = require('xlsx');
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
};

export const writeWorkbookAsync = (workbook: any, filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const callback = () => {
      try {
        const XLSX = require('xlsx');
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
};