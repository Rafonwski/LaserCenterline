
export interface ImageState {
  file: File | null;
  previewUrl: string | null;
  width: number;
  height: number;
}

export interface ProcessingResult {
  svgContent: string;
  svgCut: string;       // Solo Outline/Verde
  svgEngrave: string;   // Solo Centerline/Blu
  stats: ProcessingStats;
  pathCount: number;
  originalSize: number;
  outputSize: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ProcessingParams {
  detailLevel: number;           // 0-100: 0=Solo Silhouette, 100=Tutti i dettagli
  centerlineSensitivity: number; // 0-100: Propensione a usare Centerline per linee doppie
  smoothingLevel: number;        // 0-10: Smoothing (mantenuto ma default fisso se non esposto)
}

export interface ProcessingStats {
  centerlineCount: number;    // numero di path centerline
  outlineCount: number;       // numero di path outline
  gapsDetected: number;       // gap rilevati e chiusi
  totalPaths: number;         // totale path generati
}

export enum PathType {
  CENTERLINE = 'centerline',
  OUTLINE = 'outline'
}

