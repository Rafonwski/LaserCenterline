
import { ProcessingParams, ProcessingStats, PathType, ProcessingResult } from '../types';

type Point = [number, number];

interface OptimizedPath {
  points: Point[];
  isClosed: boolean;
  area: number;
  pathType: PathType;
}

interface Region {
  pixels: Point[];
  avgWidth: number;
  area: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export class ImageProcessor {
  private static defaultParams: ProcessingParams = {
    detailLevel: 50,
    centerlineSensitivity: 50,
    smoothingLevel: 3,
  };

  static async preview(
    imageElement: HTMLImageElement,
    params: ProcessingParams
  ): Promise<ProcessingResult> {
    return this.processWithParams(imageElement, params);
  }

  static async process(imageElement: HTMLImageElement): Promise<ProcessingResult> {
    return this.processWithParams(imageElement, this.defaultParams);
  }

  static async suggestParams(imageElement: HTMLImageElement): Promise<ProcessingParams> {
    return this.defaultParams;
  }

  private static async processWithParams(
    imageElement: HTMLImageElement,
    params: ProcessingParams
  ): Promise<ProcessingResult> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get canvas context');

    const width = imageElement.naturalWidth;
    const height = imageElement.naturalHeight;

    // PRE-PROCESSING: Add a white border
    const padding = 10;
    canvas.width = width + padding * 2;
    canvas.height = height + padding * 2;
    const w = canvas.width;
    const h = canvas.height;

    // Fill white
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);
    // Draw image centered
    ctx.drawImage(imageElement, padding, padding);

    const imageData = ctx.getImageData(0, 0, w, h);
    const binaryData = this.toBinary(imageData.data, w, h, 180);

    // --- STEP 1: SILHOUETTE ---
    const dilateAmount = 4;
    const dilatedMask = this.dilateMask(binaryData, w, h, dilateAmount);
    const bgMask = this.floodFillBackground(dilatedMask, w, h);
    const silhouetteMask = this.invertMask(bgMask);
    const silhouetteRegion = this.maskToRegion(silhouetteMask, w, h);
    const silhouettePaths: OptimizedPath[] = [];

    if (silhouetteRegion.pixels.length > 0) {
      const raw = this.traceContour(silhouetteRegion, silhouetteMask, w, h);
      let maxArea = 0;
      let bestPath: Point[] | null = null;
      for (const p of raw) {
        const area = this.calcPolyArea(p);
        if (area > maxArea) { maxArea = area; bestPath = p; }
      }
      if (bestPath) {
        const opt = this.optimizePath(bestPath, params, PathType.OUTLINE);
        if (opt) { opt.isClosed = true; silhouettePaths.push(opt); }
      }
    }

    // --- STEP 2: DETAILS ---
    let innerPaths: OptimizedPath[] = [];
    if (params.detailLevel > 0) {
      const allRegions = this.identifyRegions(binaryData, w, h);
      const noiseThreshold = 15;
      let validRegions = allRegions.filter(r => r.area > noiseThreshold);
      validRegions.sort((a, b) => b.area - a.area);

      const normalizedDetail = Math.min(100, Math.max(1, params.detailLevel));
      const factor = Math.pow((100 - normalizedDetail) / 100, 3);

      let maxArea = validRegions.length > 0 ? validRegions[0].area : 0;
      const areaCutoff = maxArea * factor * 0.02;
      const filteredRegions = validRegions.filter(r => r.area >= areaCutoff);

      const sens = params.centerlineSensitivity;
      const fillTh = 2 + (sens / 100) * 300;

      for (const r of filteredRegions) {
        const useOutline = r.avgWidth > fillTh;
        if (useOutline) {
          const paths = this.traceContour(r, binaryData, w, h);
          paths.forEach(p => {
            const opt = this.optimizePath(p, params, PathType.OUTLINE);
            if (opt) innerPaths.push(opt);
          });
        } else {
          const rb = this.extractRegionBinary(r, binaryData, w, h);
          const skel = this.zhangSuen(rb, w, h);
          const paths = this.traceSkeleton(skel, w, h);
          paths.forEach(p => {
            const opt = this.optimizePath(p, params, PathType.CENTERLINE);
            if (opt) innerPaths.push(opt);
          });
        }
      }
    }

    // --- STEP 3: LAYERS ---
    const cutPaths = [...silhouettePaths, ...innerPaths.filter(p => p.pathType === PathType.OUTLINE)];
    const engravePaths = innerPaths.filter(p => p.pathType === PathType.CENTERLINE);
    const allPaths = [...silhouettePaths, ...innerPaths];

    const stats: ProcessingStats = {
      centerlineCount: engravePaths.length,
      outlineCount: silhouettePaths.length + innerPaths.filter(p => p.pathType === PathType.OUTLINE).length,
      gapsDetected: 0,
      totalPaths: allPaths.length
    };

    return {
      svgContent: this.generateSVG(allPaths, w, h, padding),
      svgCut: this.generateSVG(cutPaths, w, h, padding),
      svgEngrave: this.generateSVG(engravePaths, w, h, padding),
      stats,
      pathCount: allPaths.length,
      originalSize: imageData.data.length,
      outputSize: 0 // Will be calculated by caller if needed
    };
  }

  // --- Helper Methods ---

  private static toBinary(data: Uint8ClampedArray, w: number, h: number, threshold: number): Uint8Array {
    const b = new Uint8Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 50) b[i / 4] = 0;
      else {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        b[i / 4] = lum < threshold ? 1 : 0;
      }
    }
    return b;
  }

  private static dilateMask(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
    if (r === 0) return mask;
    let curr = new Uint8Array(mask);
    for (let k = 0; k < r; k++) {
      const next = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          if (curr[idx] === 1) {
            next[idx] = 1;
            if (x > 0) next[idx - 1] = 1;
            if (x < w - 1) next[idx + 1] = 1;
            if (y > 0) next[idx - w] = 1;
            if (y < h - 1) next[idx + w] = 1;
          }
        }
      }
      curr = next;
    }
    return curr;
  }

  private static floodFillBackground(binary: Uint8Array, w: number, h: number): Uint8Array {
    const mask = new Uint8Array(w * h);
    const stack: Point[] = [[0, 0]];
    const visited = new Uint8Array(w * h);
    visited[0] = 1;
    mask[0] = 1;

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nidx = ny * w + nx;
          if (visited[nidx] === 0 && binary[nidx] === 0) {
            visited[nidx] = 1;
            mask[nidx] = 1;
            stack.push([nx, ny]);
          }
        }
      }
    }
    return mask;
  }

  private static invertMask(m: Uint8Array): Uint8Array {
    const res = new Uint8Array(m.length);
    for (let i = 0; i < m.length; i++) res[i] = m[i] === 1 ? 0 : 1;
    return res;
  }

  private static maskToRegion(mask: Uint8Array, w: number, h: number): Region {
    const pixels: Point[] = [];
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 1) pixels.push([i % w, Math.floor(i / w)]);
    }
    return { pixels, avgWidth: 0, area: pixels.length, bounds: { minX: 0, maxX: w, minY: 0, maxY: h } };
  }

  private static identifyRegions(binary: Uint8Array, w: number, h: number): Region[] {
    const regions: Region[] = [];
    const visited = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (binary[idx] === 1 && visited[idx] === 0) {
          const r = this.floodFill(binary, visited, x, y, w, h);
          if (r.pixels.length > 0) regions.push(r);
        }
      }
    }
    return regions;
  }

  private static floodFill(bin: Uint8Array, vis: Uint8Array, sx: number, sy: number, w: number, h: number): Region {
    const pixels: Point[] = [];
    const stack: Point[] = [[sx, sy]];
    vis[sy * w + sx] = 1;
    let minX = sx, maxX = sx, minY = sy, maxY = sy;

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      pixels.push([x, y]);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);

      const ns = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const [nx, ny] of ns) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const idx = ny * w + nx;
          if (bin[idx] === 1 && vis[idx] === 0) {
            vis[idx] = 1;
            stack.push([nx, ny]);
          }
        }
      }
    }
    const area = pixels.length;
    const avgW = area / Math.max(maxX - minX + 1, maxY - minY + 1) * 2;
    return { pixels, area, avgWidth: avgW, bounds: { minX, maxX, minY, maxY } };
  }

  private static traceContour(region: Region, bin: Uint8Array, w: number, h: number): Point[][] {
    const paths: Point[][] = [];
    const localVis = new Uint8Array(w * h);
    for (const [px, py] of region.pixels) {
      if (localVis[py * w + px] === 1) continue;
      let isBorder = false;
      if (px === 0 || px === w - 1 || py === 0 || py === h - 1) isBorder = true;
      else {
        if (bin[py * w + px - 1] === 0 || bin[py * w + px + 1] === 0 || bin[(py - 1) * w + px] === 0 || bin[(py + 1) * w + px] === 0) isBorder = true;
      }
      if (isBorder) {
        const startX = px, startY = py;
        let cxc = startX, cyc = startY;
        const dirs = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
        let cdir = 7;
        let steps = 0;
        const maxSteps = 20000;
        const contour: Point[] = [];
        do {
          contour.push([cxc, cyc]);
          localVis[cyc * w + cxc] = 1;
          let found = false;
          const off = (cdir + 5) % 8;
          for (let i = 0; i < 8; i++) {
            const d = (off + i) % 8;
            const nx = cxc + dirs[d][0];
            const ny = cyc + dirs[d][1];
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && bin[ny * w + nx] === 1) {
              cxc = nx; cyc = ny;
              cdir = d;
              found = true;
              break;
            }
          }
          if (!found) break;
          steps++;
        } while ((cxc !== startX || cyc !== startY) && steps < maxSteps);
        if (contour.length > 2) paths.push(contour);
      }
    }
    return paths;
  }

  private static extractRegionBinary(r: Region, fullBin: Uint8Array, w: number, h: number): Uint8Array {
    const b = new Uint8Array(w * h);
    for (const [x, y] of r.pixels) b[y * w + x] = 1;
    return b;
  }

  private static zhangSuen(bin: Uint8Array, w: number, h: number): Uint8Array {
    const skel = new Uint8Array(bin);
    let changed = true;
    const g = (arr: Uint8Array, x: number, y: number) => arr[y * w + x] || 0;
    while (changed) {
      changed = false;
      for (let s = 1; s <= 2; s++) {
        const del: number[] = [];
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            if (skel[i] === 0) continue;
            const p2 = g(skel, x, y - 1), p3 = g(skel, x + 1, y - 1), p4 = g(skel, x + 1, y), p5 = g(skel, x + 1, y + 1);
            const p6 = g(skel, x, y + 1), p7 = g(skel, x - 1, y + 1), p8 = g(skel, x - 1, y), p9 = g(skel, x - 1, y - 1);
            const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
            const A = (p2 === 0 && p3 === 1 ? 1 : 0) + (p3 === 0 && p4 === 1 ? 1 : 0) + (p4 === 0 && p5 === 1 ? 1 : 0) + (p5 === 0 && p6 === 1 ? 1 : 0) +
              (p6 === 0 && p7 === 1 ? 1 : 0) + (p7 === 0 && p8 === 1 ? 1 : 0) + (p8 === 0 && p9 === 1 ? 1 : 0) + (p9 === 0 && p2 === 1 ? 1 : 0);
            if (B >= 2 && B <= 6 && A === 1) {
              const m1 = s === 1 ? p2 * p4 * p6 : p2 * p4 * p8;
              const m2 = s === 1 ? p4 * p6 * p8 : p2 * p6 * p8;
              if (m1 === 0 && m2 === 0) del.push(i);
            }
          }
        }
        if (del.length > 0) { changed = true; for (const d of del) skel[d] = 0; }
      }
    }
    return skel;
  }

  private static traceSkeleton(skel: Uint8Array, w: number, h: number): Point[][] {
    const paths: Point[][] = [];
    const vis = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (skel[y * w + x] === 1 && vis[y * w + x] === 0) {
          const path: Point[] = [];
          const stack: Point[] = [[x, y]];
          while (stack.length > 0) {
            const [cx, cy] = stack.pop()!;
            path.push([cx, cy]);
            vis[cy * w + cx] = 1;
            const ns = [[cx, cy - 1], [cx + 1, cy - 1], [cx + 1, cy], [cx + 1, cy + 1], [cx, cy + 1], [cx - 1, cy + 1], [cx - 1, cy], [cx - 1, cy - 1]];
            for (const [nx, ny] of ns) {
              if (nx >= 0 && nx < w && ny >= 0 && ny < h && skel[ny * w + nx] === 1 && vis[ny * w + nx] === 0) {
                stack.push([nx, ny]);
                break;
              }
            }
          }
          if (path.length > 2) paths.push(path);
        }
      }
    }
    return paths;
  }

  private static optimizePath(path: Point[], params: ProcessingParams, type: PathType): OptimizedPath | null {
    if (path.length < 2) return null;
    let p = path;
    const wSize = 3;
    if (p.length > wSize) {
      const sm: Point[] = [];
      for (let i = 0; i < p.length; i++) {
        let sx = 0, sy = 0, c = 0;
        for (let j = i - 1; j <= i + 1; j++) {
          if (j >= 0 && j < p.length) { sx += p[j][0]; sy += p[j][1]; c++; }
        }
        sm.push([sx / c, sy / c]);
      }
      p = sm;
    }
    const st = p[0], en = p[p.length - 1];
    const d = Math.sqrt((st[0] - en[0]) ** 2 + (st[1] - en[1]) ** 2);
    let closed = false;
    if (type === PathType.OUTLINE && d < 20) closed = true;
    if (type === PathType.CENTERLINE && d < 5) closed = true;
    if (closed) p[p.length - 1] = [st[0], st[1]];
    return { points: p, isClosed: closed, area: 0, pathType: type };
  }

  private static calcPolyArea(pts: Point[]): number {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      a += pts[i][0] * pts[j][1];
      a -= pts[i][1] * pts[j][0];
    }
    return Math.abs(a / 2);
  }

  private static generateSVG(paths: OptimizedPath[], w: number, h: number, pad: number): string {
    const widthMm = (w / 3.7795).toFixed(2);
    const heightMm = (h / 3.7795).toFixed(2);
    const pathStr = paths.map(p => {
      const d = p.points.map((pt, i) => {
        const x = (pt[0] - pad).toFixed(2);
        const y = (pt[1] - pad).toFixed(2);
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
      }).join(' ');
      const col = p.pathType === PathType.OUTLINE ? '#00ff00' : '#0000ff';
      return `<path d="${d}${p.isClosed ? ' Z' : ''}" stroke="${col}" />`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${w - pad * 2} ${h - pad * 2}">
  <style>path { stroke-width: 2px; fill: none; }</style>
  <g>${pathStr}</g>
</svg>`;
  }
}
