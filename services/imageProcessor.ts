
/**
 * Professional Image to Single-Path SVG Service
 * Implements Zhang-Suen Thinning Algorithm for Centerline Extraction
 */

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
    
    // Vectorize Skeleton
    const { paths, count } = this.traceSkeleton(skeleton, width, height);
    
    // Generate SVG
    const svg = this.generateSVG(paths, width, height);
    
    return { svg, pathCount: count };
  }

  /**
   * Converts image data to a binary (1/0) array with adaptive-like thresholding
   */
  private static toBinary(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
    const binary = new Uint8Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Grayscale conversion
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      // Invert if light background, assume line art (dark on light)
      // Threshold at 128
      binary[i / 4] = gray < 128 ? 1 : 0;
    }
    return binary;
  }

  /**
   * Zhang-Suen Thinning Algorithm
   */
  private static zhangSuen(binary: Uint8Array, w: number, h: number): Uint8Array {
    let skeleton = new Uint8Array(binary);
    let changed = true;
    const getPixel = (arr: Uint8Array, x: number, y: number) => (x < 0 || x >= w || y < 0 || y >= h) ? 0 : arr[y * w + x];

    while (changed) {
      changed = false;
      const toRemove: number[] = [];

      // Step 1
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

          if (b >= 2 && b <= 6 && a === 1 && (p2 * p4 * p6 === 0) && (p4 * p6 * p8 === 0)) {
            toRemove.push(idx);
          }
        }
      }
      if (toRemove.length > 0) {
        changed = true;
        for (const idx of toRemove) skeleton[idx] = 0;
      }
      
      toRemove.length = 0;

      // Step 2
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

          if (b >= 2 && b <= 6 && a === 1 && (p2 * p4 * p8 === 0) && (p2 * p6 * p8 === 0)) {
            toRemove.push(idx);
          }
        }
      }
      if (toRemove.length > 0) {
        changed = true;
        for (const idx of toRemove) skeleton[idx] = 0;
      }
    }
    return skeleton;
  }

  /**
   * Traces skeleton pixels to extract continuous paths
   */
  private static traceSkeleton(skeleton: Uint8Array, w: number, h: number): { paths: string[]; count: number } {
    const visited = new Uint8Array(w * h);
    const paths: string[] = [];
    let pathCount = 0;

    const findNext = (x: number, y: number) => {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const idx = ny * w + nx;
            if (skeleton[idx] === 1 && visited[idx] === 0) return { x: nx, y: ny, idx };
          }
        }
      }
      return null;
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (skeleton[idx] === 1 && visited[idx] === 0) {
          // Start a new path
          let currentX = x;
          let currentY = y;
          const pathPoints: [number, number][] = [[currentX, currentY]];
          visited[idx] = 1;

          let next;
          while ((next = findNext(currentX, currentY))) {
            visited[next.idx] = 1;
            currentX = next.x;
            currentY = next.y;
            pathPoints.push([currentX, currentY]);
          }

          if (pathPoints.length > 2) { // Filter out tiny noise dots
            const dStr = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
            paths.push(dStr);
            pathCount++;
          }
        }
      }
    }

    return { paths, count: pathCount };
  }

  /**
   * Wraps paths into a production-ready SVG string for LightBurn (96 DPI, mm units)
   */
  private static generateSVG(paths: string[], w: number, h: number): string {
    // 96 DPI conversion: 1mm = 3.7795275591 px
    const widthMm = (w / 3.7795).toFixed(2);
    const heightMm = (h / 3.7795).toFixed(2);

    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${w} ${h}">
  <title>LaserCenterline Export</title>
  <g fill="none" stroke="black" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round">
    ${paths.map(d => `<path d="${d}" />`).join('\n    ')}
  </g>
</svg>`;
  }
}
