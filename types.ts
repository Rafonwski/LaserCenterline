
export interface ImageState {
  file: File | null;
  previewUrl: string | null;
  width: number;
  height: number;
}

export interface ProcessingResult {
  svgContent: string;
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
