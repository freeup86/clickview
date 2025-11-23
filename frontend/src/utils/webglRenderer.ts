/**
 * WebGL Chart Renderer
 *
 * High-performance rendering for charts with millions of data points using WebGL.
 * Provides 60fps rendering for scatter plots, line charts, and heatmaps.
 *
 * Part of VIZ-001 completion (remaining 10%)
 */

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

export interface WebGLPoint {
  x: number;
  y: number;
  size?: number;
  color?: [number, number, number, number]; // RGBA
}

export interface WebGLRenderConfig {
  width: number;
  height: number;
  backgroundColor?: [number, number, number, number];
  antiAlias?: boolean;
  pointSize?: number;
  lineWidth?: number;
}

export interface WebGLViewport {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// ===================================================================
// WEBGL SCATTER PLOT RENDERER
// ===================================================================

export class WebGLScatterRenderer {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private colorBuffer: WebGLBuffer | null = null;
  private sizeBuffer: WebGLBuffer | null = null;
  private pointCount: number = 0;
  private viewport: WebGLViewport = { minX: 0, maxX: 1, minY: 0, maxY: 1 };

  constructor(canvas: HTMLCanvasElement, config: WebGLRenderConfig) {
    this.canvas = canvas;
    this.canvas.width = config.width * window.devicePixelRatio;
    this.canvas.height = config.height * window.devicePixelRatio;
    this.canvas.style.width = `${config.width}px`;
    this.canvas.style.height = `${config.height}px`;

    const gl = canvas.getContext('webgl', {
      antialias: config.antiAlias ?? true,
      alpha: true,
    });

    if (!gl) {
      throw new Error('WebGL not supported');
    }

    this.gl = gl;
    this.initializeProgram();
    this.setupViewport();
  }

  /**
   * Initialize WebGL shaders and program
   */
  private initializeProgram() {
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec4 a_color;
      attribute float a_size;

      uniform vec2 u_resolution;
      uniform vec4 u_viewport;

      varying vec4 v_color;

      void main() {
        // Normalize position to viewport
        vec2 normalized = (a_position - u_viewport.xy) / (u_viewport.zw - u_viewport.xy);

        // Convert from normalized (0-1) to clip space (-1 to 1)
        vec2 clipSpace = (normalized * 2.0) - 1.0;
        clipSpace.y = -clipSpace.y; // Flip Y axis

        gl_Position = vec4(clipSpace, 0.0, 1.0);
        gl_PointSize = a_size;
        v_color = a_color;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;

      varying vec4 v_color;

      void main() {
        // Create circular points
        vec2 center = gl_PointCoord - vec2(0.5, 0.5);
        float dist = length(center);

        if (dist > 0.5) {
          discard;
        }

        gl_FragColor = v_color;
      }
    `;

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to create shaders');
    }

    this.program = this.gl.createProgram();
    if (!this.program) {
      throw new Error('Failed to create WebGL program');
    }

    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Failed to link program:', this.gl.getProgramInfoLog(this.program));
      throw new Error('Failed to link WebGL program');
    }

    this.gl.useProgram(this.program);
  }

  /**
   * Create shader
   */
  private createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Setup viewport
   */
  private setupViewport() {
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
  }

  /**
   * Set data points
   */
  setData(points: WebGLPoint[]) {
    if (!this.program) return;

    this.pointCount = points.length;

    // Extract position, color, and size data
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    // Calculate viewport from data
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    points.forEach((point) => {
      positions.push(point.x, point.y);

      const color = point.color || [0, 0, 0, 1];
      colors.push(...color);

      sizes.push(point.size || 5);

      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });

    // Add padding to viewport
    const paddingX = (maxX - minX) * 0.05;
    const paddingY = (maxY - minY) * 0.05;

    this.viewport = {
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minY: minY - paddingY,
      maxY: maxY + paddingY,
    };

    // Create and bind position buffer
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Create and bind color buffer
    this.colorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);

    const colorLocation = this.gl.getAttribLocation(this.program, 'a_color');
    this.gl.enableVertexAttribArray(colorLocation);
    this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0);

    // Create and bind size buffer
    this.sizeBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sizeBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(sizes), this.gl.STATIC_DRAW);

    const sizeLocation = this.gl.getAttribLocation(this.program, 'a_size');
    this.gl.enableVertexAttribArray(sizeLocation);
    this.gl.vertexAttribPointer(sizeLocation, 1, this.gl.FLOAT, false, 0, 0);
  }

  /**
   * Set custom viewport for zooming/panning
   */
  setViewport(viewport: WebGLViewport) {
    this.viewport = viewport;
  }

  /**
   * Render the scene
   */
  render() {
    if (!this.program) return;

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Set uniforms
    const resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
    this.gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);

    const viewportLocation = this.gl.getUniformLocation(this.program, 'u_viewport');
    this.gl.uniform4f(
      viewportLocation,
      this.viewport.minX,
      this.viewport.minY,
      this.viewport.maxX,
      this.viewport.maxY
    );

    // Enable blending for transparency
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Draw points
    this.gl.drawArrays(this.gl.POINTS, 0, this.pointCount);
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
    if (this.colorBuffer) this.gl.deleteBuffer(this.colorBuffer);
    if (this.sizeBuffer) this.gl.deleteBuffer(this.sizeBuffer);
    if (this.program) this.gl.deleteProgram(this.program);
  }
}

// ===================================================================
// WEBGL LINE CHART RENDERER
// ===================================================================

export class WebGLLineRenderer {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private colorBuffer: WebGLBuffer | null = null;
  private pointCount: number = 0;
  private viewport: WebGLViewport = { minX: 0, maxX: 1, minY: 0, maxY: 1 };

  constructor(canvas: HTMLCanvasElement, config: WebGLRenderConfig) {
    this.canvas = canvas;
    this.canvas.width = config.width * window.devicePixelRatio;
    this.canvas.height = config.height * window.devicePixelRatio;
    this.canvas.style.width = `${config.width}px`;
    this.canvas.style.height = `${config.height}px`;

    const gl = canvas.getContext('webgl', {
      antialias: config.antiAlias ?? true,
      alpha: true,
    });

    if (!gl) {
      throw new Error('WebGL not supported');
    }

    this.gl = gl;
    this.initializeProgram();
    this.setupViewport();
  }

  private initializeProgram() {
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec4 a_color;

      uniform vec2 u_resolution;
      uniform vec4 u_viewport;

      varying vec4 v_color;

      void main() {
        vec2 normalized = (a_position - u_viewport.xy) / (u_viewport.zw - u_viewport.xy);
        vec2 clipSpace = (normalized * 2.0) - 1.0;
        clipSpace.y = -clipSpace.y;

        gl_Position = vec4(clipSpace, 0.0, 1.0);
        v_color = a_color;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec4 v_color;

      void main() {
        gl_FragColor = v_color;
      }
    `;

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to create shaders');
    }

    this.program = this.gl.createProgram();
    if (!this.program) {
      throw new Error('Failed to create WebGL program');
    }

    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      throw new Error('Failed to link WebGL program');
    }

    this.gl.useProgram(this.program);
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private setupViewport() {
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
  }

  setData(points: WebGLPoint[]) {
    if (!this.program) return;

    this.pointCount = points.length;

    const positions: number[] = [];
    const colors: number[] = [];

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    points.forEach((point) => {
      positions.push(point.x, point.y);
      const color = point.color || [0, 0, 0, 1];
      colors.push(...color);

      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });

    const paddingX = (maxX - minX) * 0.05;
    const paddingY = (maxY - minY) * 0.05;

    this.viewport = {
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minY: minY - paddingY,
      maxY: maxY + paddingY,
    };

    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    this.colorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);

    const colorLocation = this.gl.getAttribLocation(this.program, 'a_color');
    this.gl.enableVertexAttribArray(colorLocation);
    this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0);
  }

  setViewport(viewport: WebGLViewport) {
    this.viewport = viewport;
  }

  render() {
    if (!this.program) return;

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    const resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
    this.gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);

    const viewportLocation = this.gl.getUniformLocation(this.program, 'u_viewport');
    this.gl.uniform4f(
      viewportLocation,
      this.viewport.minX,
      this.viewport.minY,
      this.viewport.maxX,
      this.viewport.maxY
    );

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Draw lines
    this.gl.drawArrays(this.gl.LINE_STRIP, 0, this.pointCount);
  }

  dispose() {
    if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
    if (this.colorBuffer) this.gl.deleteBuffer(this.colorBuffer);
    if (this.program) this.gl.deleteProgram(this.program);
  }
}

// ===================================================================
// CANVAS-BASED HEATMAP RENDERER
// ===================================================================

export interface HeatmapCell {
  x: number;
  y: number;
  value: number;
}

export interface HeatmapConfig {
  width: number;
  height: number;
  colorScale: (value: number) => string;
  minValue?: number;
  maxValue?: number;
}

export class CanvasHeatmapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: HeatmapConfig;

  constructor(canvas: HTMLCanvasElement, config: HeatmapConfig) {
    this.canvas = canvas;
    this.config = config;

    this.canvas.width = config.width * window.devicePixelRatio;
    this.canvas.height = config.height * window.devicePixelRatio;
    this.canvas.style.width = `${config.width}px`;
    this.canvas.style.height = `${config.height}px`;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('2D context not supported');
    }

    this.ctx = ctx;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  /**
   * Render heatmap with optimized canvas drawing
   */
  render(cells: HeatmapCell[], rows: number, cols: number) {
    const cellWidth = this.config.width / cols;
    const cellHeight = this.config.height / rows;

    // Find min/max values if not provided
    let minValue = this.config.minValue;
    let maxValue = this.config.maxValue;

    if (minValue === undefined || maxValue === undefined) {
      minValue = Math.min(...cells.map(c => c.value));
      maxValue = Math.max(...cells.map(c => c.value));
    }

    const range = maxValue - minValue;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.config.width, this.config.height);

    // Use ImageData for fast pixel manipulation
    const imageData = this.ctx.createImageData(this.config.width, this.config.height);
    const data = imageData.data;

    cells.forEach((cell) => {
      const normalizedValue = (cell.value - minValue) / range;
      const color = this.config.colorScale(normalizedValue);

      // Parse RGB color
      const rgb = this.parseColor(color);

      const x = Math.floor(cell.x * cellWidth);
      const y = Math.floor(cell.y * cellHeight);
      const w = Math.ceil(cellWidth);
      const h = Math.ceil(cellHeight);

      // Fill cell pixels
      for (let py = y; py < y + h && py < this.config.height; py++) {
        for (let px = x; px < x + w && px < this.config.width; px++) {
          const index = (py * this.config.width + px) * 4;
          data[index] = rgb[0];
          data[index + 1] = rgb[1];
          data[index + 2] = rgb[2];
          data[index + 3] = 255;
        }
      }
    });

    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Parse color string to RGB
   */
  private parseColor(color: string): [number, number, number] {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }

    // Handle rgb() colors
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }

    return [0, 0, 0];
  }
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Generate color scale for heatmaps
 */
export function createColorScale(
  colors: string[] = ['#0000ff', '#00ff00', '#ffff00', '#ff0000']
): (value: number) => string {
  return (value: number) => {
    const index = Math.min(Math.floor(value * (colors.length - 1)), colors.length - 2);
    const localValue = (value * (colors.length - 1)) - index;

    const color1 = colors[index];
    const color2 = colors[index + 1];

    return interpolateColor(color1, color2, localValue);
  };
}

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1: string, color2: string, value: number): string {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);

  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;

  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * value);
  const g = Math.round(g1 + (g2 - g1) * value);
  const b = Math.round(b1 + (b2 - b1) * value);

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
