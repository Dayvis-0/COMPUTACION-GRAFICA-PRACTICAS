// ============================================================
// COMPARACIÓN: Algoritmo de Bernstein vs De Casteljau
// ============================================================

// --- Puntos de control ---
const PUNTOS_INICIALES = [
    [-0.8, -0.5],
    [-0.4,  0.8],
    [ 0.4, -0.8],
    [ 0.8,  0.5]
];

let controlPoints = PUNTOS_INICIALES.map(p => [...p]);
let draggingPoint = null;
let draggingCanvas = null; // referencia al canvas que inició el arrastre

// --- Shaders (inline) ---
const VERTEX_SRC = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        gl_PointSize = 8.0;
    }
`;

const FRAGMENT_SRC = `
    precision mediump float;
    uniform vec4 u_color;
    void main() {
        gl_FragColor = u_color;
    }
`;

// ============================================================
// RENDERIZADOR: encapsula un canvas + WebGL
// ============================================================
class BezierRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.gl = this.canvas.getContext("webgl");

        const gl = this.gl;

        // Compilar shaders
        const vs = this._compileShader(VERTEX_SRC, gl.VERTEX_SHADER);
        const fs = this._compileShader(FRAGMENT_SRC, gl.FRAGMENT_SHADER);
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);
        gl.useProgram(this.program);

        this.positionLoc = gl.getAttribLocation(this.program, "a_position");
        this.colorLoc    = gl.getUniformLocation(this.program, "u_color");
    }

    _compileShader(source, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    _createBuffer(data) {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.flat()), gl.STATIC_DRAW);
        return buffer;
    }

    _bindAndDraw(data, mode) {
        const gl = this.gl;
        const buffer = this._createBuffer(data);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.positionLoc);
        gl.drawArrays(mode, 0, data.length);
    }

    clear() {
        const gl = this.gl;
        gl.clearColor(0.07, 0.07, 0.07, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    setColor(r, g, b, a = 1) {
        const gl = this.gl;
        gl.uniform4f(this.colorLoc, r, g, b, a);
    }

    drawControlPolygon() {
        this.setColor(0.5, 0.5, 0.5, 1);
        this._bindAndDraw(controlPoints, this.gl.LINE_STRIP);

        this.setColor(1, 0, 0, 1);
        this._bindAndDraw(controlPoints, this.gl.POINTS);
    }

    drawCurve(curve, r, g, b) {
        this.setColor(r, g, b, 1);
        this._bindAndDraw(curve, this.gl.LINE_STRIP);
    }

    drawPoint(point, r, g, b) {
        this.setColor(r, g, b, 1);
        this._bindAndDraw([point], this.gl.POINTS);
    }

    // Convierte coordenadas de pixel a NDC para ESTE canvas
    pixelToNDC(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = ((clientX - rect.left) / this.canvas.width) * 2 - 1;
        const y = -(((clientY - rect.top) / this.canvas.height) * 2 - 1);
        return { x, y };
    }
}

// --- Crear los dos renderizadores ---
const rendererC = new BezierRenderer("canvasCasteljau");
const rendererB = new BezierRenderer("canvasBernstein");

// ============================================================
// ALGORITMO 1: DE CASTELJAU
// ============================================================
function deCasteljau(points, t) {
    let temp = points.map(p => [...p]);
    for (let r = 1; r < points.length; r++) {
        for (let i = 0; i < points.length - r; i++) {
            temp[i][0] = (1 - t) * temp[i][0] + t * temp[i + 1][0];
            temp[i][1] = (1 - t) * temp[i][1] + t * temp[i + 1][1];
        }
    }
    return temp[0];
}

function generateCurveCasteljau(points, resolution) {
    const curve = [];
    for (let i = 0; i <= resolution; i++) {
        curve.push(deCasteljau(points, i / resolution));
    }
    return curve;
}

// ============================================================
// ALGORITMO 2: BERNSTEIN
// ============================================================
function binomial(n, k) {
    if (k < 0 || k > n) return 0;
    let coeff = 1;
    for (let i = 1; i <= k; i++) {
        coeff = coeff * (n - k + i) / i;
    }
    return coeff;
}

function bernstein(n, i, t) {
    return binomial(n, i) * Math.pow(t, i) * Math.pow(1 - t, n - i);
}

function puntoBernstein(points, t) {
    const n = points.length - 1;
    let x = 0, y = 0;
    for (let i = 0; i <= n; i++) {
        const B = bernstein(n, i, t);
        x += B * points[i][0];
        y += B * points[i][1];
    }
    return [x, y];
}

function generateCurveBernstein(points, resolution) {
    const curve = [];
    for (let i = 0; i <= resolution; i++) {
        curve.push(puntoBernstein(points, i / resolution));
    }
    return curve;
}

// ============================================================
// COMPARACIÓN: diferencia máxima entre curvas
// ============================================================
function maxDifference(curveA, curveB) {
    let max = 0;
    for (let i = 0; i < curveA.length; i++) {
        const dx = curveA[i][0] - curveB[i][0];
        const dy = curveA[i][1] - curveB[i][1];
        const dist = Math.hypot(dx, dy);
        if (dist > max) max = dist;
    }
    return max;
}

// ============================================================
// BENCHMARK
// ============================================================
function benchmark(resolution, iterations = 100) {
    const startC = performance.now();
    for (let i = 0; i < iterations; i++) {
        generateCurveCasteljau(controlPoints, resolution);
    }
    const timeC = (performance.now() - startC) / iterations;

    const startB = performance.now();
    for (let i = 0; i < iterations; i++) {
        generateCurveBernstein(controlPoints, resolution);
    }
    const timeB = (performance.now() - startB) / iterations;

    return { casteljau: timeC, bernstein: timeB };
}

// ============================================================
// DIBUJADO PRINCIPAL
// ============================================================
let currentResolution = 200;

function draw() {
    const curveC = generateCurveCasteljau(controlPoints, currentResolution);
    const curveB = generateCurveBernstein(controlPoints, currentResolution);

    // ---- Canvas De Casteljau ----
    rendererC.clear();
    rendererC.drawControlPolygon();
    rendererC.drawCurve(curveC, 1, 1, 0); // amarillo

    // ---- Canvas Bernstein ----
    rendererB.clear();
    rendererB.drawControlPolygon();
    rendererB.drawCurve(curveB, 0, 1, 1); // cian

    // ---- Diferencia máxima ----
    const diff = maxDifference(curveC, curveB);
    document.getElementById("diffMax").textContent = diff.toExponential(4);
}

// ============================================================
// ANIMACIÓN: punto verde recorriendo la curva
// ============================================================
function animate() {
    draw();

    const t = (Math.sin(Date.now() * 0.001) + 1) / 2;
    const point = deCasteljau(controlPoints, t);
    const pointB = puntoBernstein(controlPoints, t);

    // Punto verde en ambos canvases
    rendererC.drawPoint(point, 0, 1, 0);
    rendererB.drawPoint(pointB, 0, 1, 0);

    requestAnimationFrame(animate);
}

// ============================================================
// INTERACCIÓN: mouse (funciona en ambos canvases)
// ============================================================
function getCanvasFromEvent(e) {
    // Determinar qué canvas disparó el evento
    return e.target.tagName === "CANVAS" ? e.target : null;
}

function handleMouseDown(e) {
    const canvasEl = getCanvasFromEvent(e);
    if (!canvasEl) return;

    // Encontrar el renderizador correspondiente
    const renderer = canvasEl.id === "canvasCasteljau" ? rendererC : rendererB;
    const { x, y } = renderer.pixelToNDC(e.clientX, e.clientY);

    controlPoints.forEach((p, i) => {
        if (Math.hypot(p[0] - x, p[1] - y) < 0.05) {
            draggingPoint = i;
            draggingCanvas = canvasEl;
        }
    });
}

function handleMouseMove(e) {
    if (draggingPoint === null) return;

    // Usar el canvas que inició el arrastre para la conversión
    const renderer = draggingCanvas.id === "canvasCasteljau" ? rendererC : rendererB;
    const { x, y } = renderer.pixelToNDC(e.clientX, e.clientY);

    controlPoints[draggingPoint] = [x, y];
}

function handleMouseUp() {
    draggingPoint = null;
    draggingCanvas = null;
}

// Registrar eventos en AMBOS canvases
document.getElementById("canvasCasteljau").addEventListener("mousedown", handleMouseDown);
document.getElementById("canvasCasteljau").addEventListener("mousemove", handleMouseMove);
document.getElementById("canvasCasteljau").addEventListener("mouseup", handleMouseUp);
document.getElementById("canvasCasteljau").addEventListener("mouseleave", handleMouseUp);

document.getElementById("canvasBernstein").addEventListener("mousedown", handleMouseDown);
document.getElementById("canvasBernstein").addEventListener("mousemove", handleMouseMove);
document.getElementById("canvasBernstein").addEventListener("mouseup", handleMouseUp);
document.getElementById("canvasBernstein").addEventListener("mouseleave", handleMouseUp);

// ============================================================
// CONTROLES UI
// ============================================================
document.getElementById("resolutionSlider").addEventListener("input", e => {
    currentResolution = parseInt(e.target.value);
    document.getElementById("resValue").textContent = currentResolution;
});

document.getElementById("btnReset").addEventListener("click", () => {
    controlPoints = PUNTOS_INICIALES.map(p => [...p]);
});

document.getElementById("btnBenchmark").addEventListener("click", () => {
    const btn = document.getElementById("btnBenchmark");
    btn.textContent = "⏳ Calculando...";
    btn.disabled = true;

    setTimeout(() => {
        const result = benchmark(currentResolution, 100);
        document.getElementById("tiempoCasteljau").textContent =
            result.casteljau.toFixed(4) + " ms";
        document.getElementById("tiempoBernstein").textContent =
            result.bernstein.toFixed(4) + " ms";
        btn.textContent = "▶ Ejecutar Benchmark (100 iteraciones)";
        btn.disabled = false;
    }, 50);
});

// ============================================================
// ARRANQUE
// ============================================================
animate();
