
/**
 * Professional Image to Single-Path SVG Service
 * Implements Zhang-Suen Thinning Algorithm with advanced Path Smoothing
 * and Ramer-Douglas-Peucker simplification for high-quality laser paths.
 */

type Point = [number, number];

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

    ctx.drawImage(imageElement, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    const binaryData = this.toBinary(imageData.data, width, height);
    
    // Perform Thinning (Skeletonization)
    const skeleton = this.zhangSuen(binaryData, width, height);
    
    // Vectorize Skeleton and apply advanced smoothing/simplification
    const { rawPaths } = this.traceSkeleton(skeleton, width, height);
    
    // Connect, Simplify, and Smooth
    const optimizedPaths = this.optimizePaths(rawPaths);
    
    // Generate SVG
    const svg = this.generateSVG(optimizedPaths, width, height);
    
    return { svg, pathCount: optimizedPaths.length };
  }

  private static toBinary(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
    const binary = new Uint8Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      binary[i / 4] = gray < 128 ? 1 : 0;
    }
    return binary;
  }

  private static zhangSuen(binary: Uint8Array, w: number, h: number): Uint8Array {
    let skeleton = new Uint8Array(binary);
    let changed = true;
    const getPixel = (arr: Uint8Array, x: number, y: number) => (x < 0 || x >= w || y < 0 || y >= h) ? 0 : arr[y * w + x];

    while (changed) {
      changed = false;
      const toRemove: number[] = [];

      for (let step = 1; step <= 2; step++) {
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
            const a = (p2 === 0 && p3 === 1 ? 1 : 0) +
                      (p3 === 0 && p4 === 1 ? 1 : 0) +
                      (p4 === 0 && p5 === 1 ? 1 : 0) +
                      (p5 === 0 && p6 === 1 ? 1 : 0) +
                      (p6 === 0 && p7 === 1 ? 1 : 0) +
                      (p7 === 0 && p8 === 1 ? 1 : 0) +
                      (p8 === 0 && p9 === 1 ? 1 : 0) +
                      (p9 === 0 && p2 === 1 ? 1 : 0);

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
          toRemove.length = 0;
        }
      }
    }
    return skeleton;
  }

  private static traceSkeleton(skeleton: Uint8Array, w: number, h: number): { rawPaths: Point[][] } {
    const visited = new Uint8Array(w * h);
    const rawPaths: Point[][] = [];

    const findNext = (x: number, y: number) => {
      // Prioritize 4-neighbors over 8-neighbors for cleaner extraction
      const neighbors = [
        [0, -1], [1, 0], [0, 1], [-1, 0], // Cross
        [1, -1], [1, 1], [-1, 1], [-1, -1] // Diagonal
      ];
      for (const [dx, dy] of neighbors) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const idx = ny * w + nx;
          if (skeleton[idx] === 1 && visited[idx] === 0) return { x: nx, y: ny, idx };
        }
      }
      return null;
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (skeleton[idx] === 1 && visited[idx] === 0) {
          let currentX = x;
          let currentY = y;
          const pathPoints: Point[] = [[currentX, currentY]];
          visited[idx] = 1;

          let next;
          while ((next = findNext(currentX, currentY))) {
            visited[next.idx] = 1;
            currentX = next.x;
            currentY = next.y;
            pathPoints.push([currentX, currentY]);
          }

          if (pathPoints.length > 1) rawPaths.push(pathPoints);
        }
      }
    }
    return { rawPaths };
  }

  private static optimizePaths(rawPaths: Point[][]): Point[][] {
    if (rawPaths.length === 0) return [];

    // 1. Connect close segments to fix "broken lines"
    let connected = [...rawPaths];
    let merged = true;
    const connectThreshold = 4.0; // Distance threshold to join broken paths

    while (merged) {
      merged = false;
      outer: for (let i = 0; i < connected.length; i++) {
        for (let j = i + 1; j < connected.length; j++) {
          const p1Start = connected[i][0];
          const p1End = connected[i][connected[i].length - 1];
          const p2Start = connected[j][0];
          const p2End = connected[j][connected[j].length - 1];

          // Check End-to-Start
          if (this.dist(p1End, p2Start) < connectThreshold) {
            connected[i] = [...connected[i], ...connected[j]];
            connected.splice(j, 1);
            merged = true; break outer;
          }
          // Check End-to-End
          if (this.dist(p1End, p2End) < connectThreshold) {
            connected[i] = [...connected[i], ...[...connected[j]].reverse()];
            connected.splice(j, 1);
            merged = true; break outer;
          }
          // Check Start-to-Start
          if (this.dist(p1Start, p2Start) < connectThreshold) {
            connected[i] = [...[...connected[i]].reverse(), ...connected[j]];
            connected.splice(j, 1);
            merged = true; break outer;
          }
        }
      }
    }

    // 2. Filter noise and apply Smoothing + Simplification
    return connected
      .filter(path => path.length > 3)
      .map(path => {
        // First smoothing: Moving average to reduce pixel jitter (zigzag)
        const smoothed = this.movingAverage(path, 3);
        // Second: Simplify with Ramer-Douglas-Peucker to get cleaner geometry
        const simplified = this.ramerDouglasPeucker(smoothed, 0.8);
        return simplified;
      });
  }

  private static dist(p1: Point, p2: Point): number {
    return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
  }

  private static movingAverage(path: Point[], windowSize: number): Point[] {
    const smoothed: Point[] = [];
    const half = Math.floor(windowSize / 2);
    for (let i = 0; i < path.length; i++) {
      let sumX = 0, sumY = 0, count = 0;
      for (let j = i - half; j <= i + half; j++) {
        if (j >= 0 && j < path.length) {
          sumX += path[j][0];
          sumY += path[j][1];
          count++;
        }
      }
      smoothed.push([sumX / count, sumY / count]);
    }
    return smoothed;
  }

  private static ramerDouglasPeucker(points: Point[], epsilon: number): Point[] {
    if (points.length <= 2) return points;

    let dmax = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
      const d = this.perpendicularDistance(points[i], points[0], points[end]);
      if (d > dmax) {
        index = i;
        dmax = d;
      }
    }

    if (dmax > epsilon) {
      const recResults1 = this.ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
      const recResults2 = this.ramerDouglasPeucker(points.slice(index), epsilon);
      return [...recResults1.slice(0, recResults1.length - 1), ...recResults2];
    } else {
      return [points[0], points[end]];
    }
  }

  private static perpendicularDistance(p: Point, p1: Point, p2: Point): number {
    const [x, y] = p;
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    const numerator = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
    const denominator = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
    return denominator === 0 ? this.dist(p, p1) : numerator / denominator;
  }

  private static generateSVG(paths: Point[][], w: number, h: number): string {
    const widthMm = (w / 3.7795).toFixed(2);
    const heightMm = (h / 3.7795).toFixed(2);

    const pathStrings = paths.map(points => {
      const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
      return `<path d="${d}" />`;
    });

    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${w} ${h}">
  <title>LaserCenterline Optimized Export</title>
  <g fill="none" stroke="black" stroke-width="0.3" stroke-linecap="round" stroke-linejoin="round">
    ${pathStrings.join('\n    ')}
  </g>
</svg>`;
  }
}
