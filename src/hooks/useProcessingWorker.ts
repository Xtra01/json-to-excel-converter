// Hook for using Web Worker for background processing
import { useCallback, useRef, useState, useEffect } from 'react';
import { WorkerMessage, WorkerResponse } from '../workers/processing.worker';

interface UseWorkerResult {
  isWorkerReady: boolean;
  processInBackground: (message: WorkerMessage) => Promise<any>;
  terminateWorker: () => void;
}

interface WorkerProgress {
  current: number;
  total: number;
  progress?: number;
  message: string;
  errors?: string[];
}

export function useProcessingWorker(
  onProgress?: (progress: WorkerProgress) => void,
  onError?: (error: string) => void
): UseWorkerResult {
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const resolveRef = useRef<((value: any) => void) | null>(null);
  const rejectRef = useRef<((reason?: any) => void) | null>(null);

  // Initialize worker
  const initializeWorker = useCallback(() => {
    if (workerRef.current) return;

    try {
      // Create worker from the worker file
      workerRef.current = new Worker(
        new URL('../workers/processing.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { type, payload } = e.data;

        switch (type) {
          case 'PROGRESS':
            onProgress?.(payload);
            break;

          case 'COMPLETE':
            if (resolveRef.current) {
              resolveRef.current(payload);
              resolveRef.current = null;
              rejectRef.current = null;
            }
            break;

          case 'ERROR':
            const errorMsg = payload.error || 'Unknown worker error';
            onError?.(errorMsg);
            if (rejectRef.current) {
              rejectRef.current(new Error(errorMsg));
              resolveRef.current = null;
              rejectRef.current = null;
            }
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        const errorMsg = `Worker error: ${error.message || error}`;
        onError?.(errorMsg);
        if (rejectRef.current) {
          rejectRef.current(new Error(errorMsg));
          resolveRef.current = null;
          rejectRef.current = null;
        }
      };

      setIsWorkerReady(true);
    } catch (error) {
      const errorMsg = `Failed to initialize worker: ${error}`;
      onError?.(errorMsg);
      setIsWorkerReady(false);
    }
  }, [onProgress, onError]);

  // Process data in background
  const processInBackground = useCallback((message: WorkerMessage): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !isWorkerReady) {
        initializeWorker();
        if (!workerRef.current) {
          reject(new Error('Failed to initialize worker'));
          return;
        }
      }

      resolveRef.current = resolve;
      rejectRef.current = reject;
      
      workerRef.current.postMessage(message);
    });
  }, [isWorkerReady, initializeWorker]);

  // Terminate worker
  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsWorkerReady(false);
    }
    
    // Clean up pending promises
    if (rejectRef.current) {
      rejectRef.current(new Error('Worker terminated'));
      resolveRef.current = null;
      rejectRef.current = null;
    }
  }, []);

  // Initialize worker on mount
  useEffect(() => {
    initializeWorker();
    
    return () => {
      terminateWorker();
    };
  }, [initializeWorker, terminateWorker]);

  return {
    isWorkerReady,
    processInBackground,
    terminateWorker
  };
}