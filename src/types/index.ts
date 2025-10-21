/**
 * Enhanced Type Definitions
 * Comprehensive type safety for the entire application
 */

// ============= Core Data Types =============

export interface Row {
  [key: string]: any;
}

export interface ParsedData {
  data: any;
  metadata: {
    parseTime: number;
    size: number;
    type: 'array' | 'object';
    depth: number;
  };
}

// ============= File System Types =============

export interface BaseFileData {
  name: string;
  selected: boolean;
  error?: string;
  metadata: {
    fileSize?: number;
    createdDate?: string;
    lastModified?: number;
    type: string;
  };
}

export interface FileData extends BaseFileData {
  rows: Row[];
  folderPath?: string;
  originalPath?: string;
  processingTime?: number;
  validationResult?: ValidationResult;
}

export interface FolderData {
  path: string;
  name: string;
  files: FileData[];
  statistics: {
    validFileCount: number;
    totalRows: number;
    errorCount: number;
    totalSize: number;
  };
  selected: boolean;
  metadata: {
    depth: number;
    lastScanned: string;
  };
}

// ============= Processing Types =============

export type ProcessingMode = 'single' | 'bulk';

export type ArrayHandlingMode = 'explode' | 'join' | 'first';

export interface ProcessingConfig {
  delimiter: string;
  maxDepth: number;
  arrayMode: ArrayHandlingMode;
  skipEmptyValues: boolean;
  preserveArrayIndices: boolean;
  customFieldNames: Record<string, string>;
}

export interface ProcessingOptions extends ProcessingConfig {
  enableSourceTracking: boolean;
  enableValidation: boolean;
  batchSize: number;
  memoryLimit: number;
}

// ============= Progress & Status Types =============

export enum ProcessingStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

export interface ProgressDetails {
  memoryUsage?: string;
  currentFile?: string;
  totalRows?: number;
  batchProgress?: number;
  estimatedTimeRemaining?: number;
  currentOperation?: string;
  throughput?: string; // rows/second
}

export interface ProgressState {
  status: ProcessingStatus;
  current: number;
  total: number;
  percentage: number;
  message: string;
  details?: ProgressDetails;
  warnings?: string[];
  errors?: string[];
  debug?: string[];
  timeStarted?: number;
  timeCompleted?: number;
  lastActivity?: number;
  canCancel?: boolean;
}

// ============= Export Types =============

export enum ExportFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
  JSON = 'json'
}

export enum ExportMode {
  STANDARD = 'standard',
  BATCH = 'batch',
  FOLDER_WISE = 'folder_wise',
  UNIFIED_REPORT = 'unified_report'
}

export interface ExportConfig {
  format: ExportFormat;
  mode: ExportMode;
  filename: string;
  sheetName?: string;
  includeMetadata: boolean;
  includeSourceTracking: boolean;
  columnOrder?: string[];
  excludeColumns?: string[];
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  filesCreated?: string[];
  size?: number;
  rowsExported?: number;
  timeElapsed?: number;
  warnings?: string[];
  errors?: string[];
}

// ============= Validation Types =============

export interface ValidationRule {
  name: string;
  validate: (data: any) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  metadata: {
    validatedAt: string;
    validationTime: number;
    rulesApplied: string[];
  };
}

export interface ValidationIssue {
  rule: string;
  message: string;
  path?: string;
  value?: any;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

// ============= Report Types =============

export interface ReportStats {
  processing: {
    totalFiles: number;
    totalRows: number;
    totalFolders: number;
    errorFiles: number;
    processingTime: number;
    successRate: number;
  };
  performance: {
    memoryUsed: string;
    peakMemory: string;
    averageProcessingSpeed: string;
    bottlenecks: string[];
  };
  dataQuality: {
    completeness: number;
    consistency: number;
    validity: number;
    issues: ValidationIssue[];
  };
  files: {
    largestFile: { name: string; rows: number; size: number };
    smallestFile: { name: string; rows: number; size: number };
    averageFileSize: number;
    fileTypes: Record<string, number>;
  };
  folders: Record<string, FolderStats>;
}

export interface FolderStats {
  files: number;
  rows: number;
  errors: number;
  size: number;
  successRate: number;
  averageFileSize: number;
}

// ============= Column Management Types =============

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'null';
  visible: boolean;
  order: number;
  statistics: ColumnStatistics;
}

export interface ColumnStatistics {
  totalValues: number;
  nullCount: number;
  uniqueCount: number;
  completeness: number;
  uniqueness: number;
  dataTypes: Record<string, number>;
  sampleValues: any[];
}

// ============= UI State Types =============

export interface UIState {
  currentView: 'files' | 'folders' | 'preview' | 'export';
  showDebugPanel: boolean;
  showProgressDialog: boolean;
  showErrorDialog: boolean;
  selectedColumns: string[];
  columnOrder: string[];
  filters: Record<string, any>;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  autoSave: boolean;
  showTutorial: boolean;
  defaultProcessingConfig: ProcessingConfig;
  recentFiles: string[];
  savedConfigurations: Record<string, ProcessingConfig>;
}

// ============= Worker Types =============

export enum WorkerMessageType {
  PROCESS_BATCH = 'process_batch',
  PROCESS_FOLDERS = 'process_folders',
  GENERATE_REPORT = 'generate_report',
  VALIDATE_DATA = 'validate_data',
  CANCEL_OPERATION = 'cancel_operation'
}

export enum WorkerResponseType {
  PROGRESS = 'progress',
  COMPLETE = 'complete',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

export interface WorkerMessage {
  type: WorkerMessageType;
  id: string;
  payload: any;
  timestamp: number;
}

export interface WorkerResponse {
  type: WorkerResponseType;
  id: string;
  payload: any;
  timestamp: number;
}

export interface WorkerProgress {
  current: number;
  total: number;
  progress?: number;
  message: string;
  details?: ProgressDetails;
  errors?: string[];
  warnings?: string[];
}

// ============= Component Props Types =============

export interface JsonToExcelAppProps {
  initialMode?: ProcessingMode;
  initialConfig?: Partial<ProcessingConfig>;
  onError?: (error: Error) => void;
  onSuccess?: (result: ExportResult) => void;
}

export interface FileUploadProps {
  mode: ProcessingMode;
  accept: string[];
  multiple: boolean;
  onFilesSelected: (files: FileData[]) => void;
  onError: (error: Error) => void;
  disabled?: boolean;
}

export interface ProgressDialogProps {
  progress: ProgressState;
  onCancel?: () => void;
  onClose?: () => void;
  visible: boolean;
}

export interface ErrorDialogProps {
  error: Error | null;
  onClose: () => void;
  onRetry?: () => void;
  visible: boolean;
}

export interface PreviewTableProps {
  data: Row[];
  columns: ColumnInfo[];
  maxRows?: number;
  onColumnToggle: (columnName: string) => void;
  onColumnReorder: (fromIndex: number, toIndex: number) => void;
  editable?: boolean;
  onCellEdit?: (rowIndex: number, columnName: string, value: any) => void;
}

// ============= Utility Types =============

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface AsyncOperation<T = any> {
  promise: Promise<T>;
  cancel: () => void;
  id: string;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiry: number;
  size: number;
}

// ============= Event Types =============

export interface AppEvent {
  type: string;
  timestamp: number;
  source: string;
  data?: any;
}

export interface FileSelectedEvent extends AppEvent {
  type: 'file_selected';
  data: {
    files: FileData[];
    mode: ProcessingMode;
  };
}

export interface ProcessingStartedEvent extends AppEvent {
  type: 'processing_started';
  data: {
    mode: ProcessingMode;
    fileCount: number;
    config: ProcessingConfig;
  };
}

export interface ProcessingCompletedEvent extends AppEvent {
  type: 'processing_completed';
  data: {
    result: ExportResult;
    stats: ReportStats;
  };
}

export interface ErrorOccurredEvent extends AppEvent {
  type: 'error_occurred';
  data: {
    error: Error;
    context: string;
    recoverable: boolean;
  };
}

// ============= API Types =============

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

// ============= Configuration Types =============

export interface AppConfig {
  processing: {
    defaultBatchSize: number;
    maxFileSize: number;
    maxTotalSize: number;
    memoryThreshold: number;
    timeoutDuration: number;
  };
  ui: {
    maxPreviewRows: number;
    autoSaveInterval: number;
    animationDuration: number;
    defaultTheme: string;
  };
  export: {
    defaultFormat: ExportFormat;
    defaultMode: ExportMode;
    compressionLevel: number;
    includeMetadata: boolean;
  };
  logging: {
    level: string;
    maxEntries: number;
    enablePerformanceTracking: boolean;
    enableErrorReporting: boolean;
  };
  features: {
    enableWebWorkers: boolean;
    enableValidation: boolean;
    enableAutoRecovery: boolean;
    enableAnalytics: boolean;
  };
}

// ============= Type Guards =============

export function isFileData(obj: any): obj is FileData {
  return obj && 
         typeof obj.name === 'string' &&
         Array.isArray(obj.rows) &&
         typeof obj.selected === 'boolean';
}

export function isFolderData(obj: any): obj is FolderData {
  return obj &&
         typeof obj.path === 'string' &&
         typeof obj.name === 'string' &&
         Array.isArray(obj.files) &&
         typeof obj.selected === 'boolean';
}

export function isProgressState(obj: any): obj is ProgressState {
  return obj &&
         typeof obj.status === 'string' &&
         typeof obj.current === 'number' &&
         typeof obj.total === 'number' &&
         typeof obj.message === 'string';
}

export function isValidationResult(obj: any): obj is ValidationResult {
  return obj &&
         typeof obj.isValid === 'boolean' &&
         Array.isArray(obj.errors) &&
         Array.isArray(obj.warnings);
}

// ============= Default Values =============

export const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  delimiter: '_',
  maxDepth: 10,
  arrayMode: 'explode',
  skipEmptyValues: false,
  preserveArrayIndices: true,
  customFieldNames: {}
};

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  format: ExportFormat.XLSX,
  mode: ExportMode.STANDARD,
  filename: 'converted',
  sheetName: 'data',
  includeMetadata: false,
  includeSourceTracking: true,
  columnOrder: [],
  excludeColumns: []
};

export const DEFAULT_UI_STATE: UIState = {
  currentView: 'files',
  showDebugPanel: false,
  showProgressDialog: false,
  showErrorDialog: false,
  selectedColumns: [],
  columnOrder: [],
  filters: {},
  preferences: {
    theme: 'light',
    autoSave: true,
    showTutorial: true,
    defaultProcessingConfig: DEFAULT_PROCESSING_CONFIG,
    recentFiles: [],
    savedConfigurations: {}
  }
};