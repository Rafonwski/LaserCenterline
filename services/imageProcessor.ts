
/**
 * Professional Image to Single-Path SVG Service
 * Advanced Version: Zhang-Suen Thinning + Aggressive Merging + Forced Outer Boundary Closing
 */

type Point = [number, number];

interface OptimizedPath {
  points: Point[];
  isClosed: boolean;
  area: number;
}

export class ImageProcessor {
  /**
   * Main entry point for processing an image to SVG
   */
  static async process(imageElement: HTMLImageElement): Promise<{ svg: string; pathCount: number }> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get canvas context');

    const width = imageElement.naturalWidth;
    const height = imageElement.naturalHeight;
    canvas.width = width;
    canvas.height = height;

    // Pre-processing: Blur slightly to normalize noise
    ctx.filter = 'blur(0.4px)';
    ctx.drawImage(imageElement, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    
    const binaryData = this.toBinary(imageData.data, width, height);
    
    // 1. Skeletonization (Zhang-Suen Thinning)
    const skeleton = this.zhangSuen(binaryData, width, height);
    
    // 2. Vectorization (Tracing pixel chains)
    const rawPaths = this.traceSkeleton(skeleton, width, height);
    
    // 3. Optimization (Merging gaps, smoothing, and forced closing)
    const optimizedPaths = this.optimizePaths(rawPaths, width, height);
    
    // 4. SVG Generation
    const svg = this.generateSVG(optimizedPaths, width, height);
    
    return { svg, pathCount: optimizedPaths.length };
  }

  private static toBinary(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
    const binary = new Uint8Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // Adaptive threshold for line detection
      binary[i / 4] = gray < 145 ? 1 : 0; 
    }
    return binary;
  }

  private static zhangSuen(binary: Uint8Array, w: number, h: number): Uint8Array {
    let skeleton = new Uint8Array(binary);
    let changed = true;
    const getPixel = (arr: Uint8Array, x: number, y: number) => (x < 0 || x >= w || y < 0 || y >= h) ? 0 : arr[y * w + x];

    while (changed) {
      changed = false;
      for (let step = 1; step <= 2; step++) {
        const toRemove: number[] = [];
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            if (skeleton[idx] === 0) continue;

            const p2 = getPixel(skeleton, x, y - 1);
            const p3 = getPixel(skeleton, x + 1, y - 1);
            const p4 = getPixel(skeleton, x + 1, y);
            const p5 = getPixel(skeleton, x + 1, y + 1);
            const p6 = getPixel(skeleton, x, y + 1);
            const p7 = getPixel(skeleton, x - 1, y + 1);
            const p8 = getPixel(skeleton, x - 1, y);
            const p9 = getPixel(skeleton, x - 1, y - 1);

            const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
            const a = (p2 === 0 && p3 === 1 ? 1 : 0) + (p3 === 0 && p4 === 1 ? 1 : 0) +
                      (p4 === 0 && p5 === 1 ? 1 : 0) + (p5 === 0 && p6 === 1 ? 1 : 0) +
                      (p6 === 0 && p7 === 1 ? 1 : 0) + (p7 === 0 && p8 === 1 ? 1 : 0) +
                      (p8 === 0 && p9 === 1 ? 1 : 0) + (p9 === 0 && p2 === 1 ? 1 : 0);

            if (b >= 2 && b <= 6 && a === 1) {
              const cond1 = step === 1 ? (p2 * p4 * p6 === 0) : (p2 * p4 * p8 === 0);
              const cond2 = step === 1 ? (p4 * p6 * p8 === 0) : (p2 * p6 * p8 === 0);
              if (cond1 && cond2) toRemove.push(idx);
            }
          }
        }
        if (toRemove.length > 0) {
          changed = true;
          for (const idx of toRemove) skeleton[idx] = 0;
        }
      }
    }
    return skeleton;
  }

  private static traceSkeleton(skeleton: Uint8Array, w: number, h: number): Point[][] {
    const visited = new Uint8Array(w * h);
    const paths: Point[][] = [];
    const neighbors = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (skeleton[idx] === 1 && visited[idx] === 0) {
          let current: Point = [x, y];
          const path: Point[] = [current];
          visited[idx] = 1;

          let found = true;
          while (found) {
            found = false;
            for (const [dx, dy] of neighbors) {
              const nx = current[0] + dx, ny = current[1] + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nIdx = ny * w + nx;
                if (skeleton[nIdx] === 1 && visited[nIdx] === 0) {
                  visited[nIdx] = 1;
                  current = [nx, ny];
                  path.push(current);
                  found = true;
                  break;
                }
              }
            }
          }
          if (path.length > 2) paths.push(path);
        }
      }
    }
    return paths;
  }

  private static optimizePaths(rawPaths: Point[][], imgW: number, imgH: number): OptimizedPath[] {
    if (rawPaths.length === 0) return [];

    // 1. Iterative merging of paths to bridge digital gaps
    let paths = [...rawPaths];
    let merged = true;
    const mergeThreshold = 14.0; // Distance to join disconnected line segments

    while (merged) {
      merged = false;
      outer: for (let i = 0; i < paths.length; i++) {
        for (let j = i + 1; j < paths.length; j++) {
          const p1S = paths[i][0], p1E = paths[i][paths[i].length - 1];
          const p2S = paths[j][0], p2E = paths[j][paths[j].length - 1];

          if (this.dist(p1E, p2S) < mergeThreshold) {
            paths[i] = [...paths[i], ...paths[j]];
            paths.splice(j, 1); merged = true; break outer;
          }
          if (this.dist(p1E, p2E) < mergeThreshold) {
            paths[i] = [...paths[i], ...[...paths[j]].reverse()];
            paths.splice(j, 1); merged = true; break outer;
          }
          if (this.dist(p1S, p2S) < mergeThreshold) {
            paths[i] = [...[...paths[i]].reverse(), ...paths[j]];
            paths.splice(j, 1); merged = true; break outer;
          }
          if (this.dist(p1S, p2E) < mergeThreshold) {
            paths[i] = [...paths[j], ...paths[i]];
            paths.splice(j, 1); merged = true; break outer;
          }
        }
      }
    }

    // 2. Multi-pass smoothing and simplification
    let result: OptimizedPath[] = paths
      .filter(p => p.length > 3)
      .map(p => {
        // Double pass moving average for fluidity
        let pts = this.movingAverage(this.movingAverage(p, 3), 3);
        pts = this.ramerDouglasPeucker(pts, 0.7);

        // Identify bounding box area to find outer contour
        let minX = pts[0][0], maxX = pts[0][0], minY = pts[0][1], maxY = pts[0][1];
        for (const pt of pts) {
          minX = Math.min(minX, pt[0]); maxX = Math.max(maxX, pt[0]);
          minY = Math.min(minY, pt[1]); maxY = Math.max(maxY, pt[1]);
        }
        return { points: pts, isClosed: false, area: (maxX - minX) * (maxY - minY) };
      });

    if (result.length === 0) return [];

    // 3. MANDATORY OUTER CONTOUR CLOSING
    // Find the largest shape by area - this is almost certainly the cutting line
    let outerIndex = 0;
    let maxArea = -1;
    for (let i = 0; i < result.length; i++) {
      if (result[i].area > maxArea) {
        maxArea = result[i].area;
        outerIndex = i;
      }
    }

    const outerContourCloseThreshold = Math.max(imgW, imgH) * 0.3; // Very high tolerance to force main line closure

    return result.map((path, idx) => {
      const isOuter = idx === outerIndex;
      const start = path.points[0];
      const end = path.points[path.points.length - 1];
      const distance = this.dist(start, end);

      const threshold = isOuter ? outerContourCloseThreshold : 15.0;

      if (distance < threshold) {
        // Close path with Z command by ensuring the endpoint matches the start point
        path.points[path.points.length - 1] = [start[0], start[1]];
        return { ...path, isClosed: true };
      }
      return path;
    });
  }

  private static dist(p1: Point, p2: Point) {
    return Math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2);
  }

  private static movingAverage(path: Point[], window: number): Point[] {
    const res: Point[] = [];
    const half = Math.floor(window / 2);
    for (let i = 0; i < path.length; i++) {
      let sx = 0, sy = 0, count = 0;
      for (let j = i - half; j <= i + half; j++) {
        if (j >= 0 && j < path.length) {
          sx += path[j][0]; sy += path[j][1]; count++;
        }
      }
      res.push([sx / count, sy / count]);
    }
    return res;
  }

  private static ramerDouglasPeucker(points: Point[], epsilon: number): Point[] {
    if (points.length <= 2) return points;
    let dmax = 0, index = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const d = this.perpDist(points[i], points[0], points[points.length - 1]);
      if (d > dmax) { index = i; dmax = d; }
    }
    if (dmax > epsilon) {
      const r1 = this.ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
      const r2 = this.ramerDouglasPeucker(points.slice(index), epsilon);
      return [...r1.slice(0, -1), ...r2];
    }
    return [points[0], points[points.length - 1]];
  }

  private static perpDist(p: Point, p1: Point, p2: Point): number {
    const [x, y] = p, [x1, y1] = p1, [x2, y2] = p2;
    const num = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
    const den = Math.sqrt((y2 - y1)**2 + (x2 - x1)**2);
    return den === 0 ? this.dist(p, p1) : num / den;
  }

  private static generateSVG(optimized: OptimizedPath[], w: number, h: number): string {
    const widthMm = (w / 3.7795).toFixed(2);
    const heightMm = (h / 3.7795).toFixed(2);

    const paths = optimized.map(p => {
      const d = p.points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0].toFixed(2)},${pt[1].toFixed(2)}`).join(' ');
      // LightBurn and other laser software treat paths with 'Z' as closed polygons for better cutting logic
      return `<path d="${d}${p.isClosed ? ' Z' : ''}" />`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${w} ${h}">
  <title>LaserCenterline Strictly Closed Output</title>
  <g fill="none" stroke="black" stroke-width="0.3" stroke-linecap="round" stroke-linejoin="round">
    ${paths.join('\n    ')}
  </g>
</svg>`;
  }
}
