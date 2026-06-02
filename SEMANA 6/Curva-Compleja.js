// CURVA BÉZIER MULTI-SEGMENTO CON CONTINUIDAD C1

// --- Setup WebGL ---
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

// --- Shaders inline ---
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

function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        console.error(gl.getShaderInfoLog(s));
    return s;
}

const program = (() => {
    const vs = compileShader(VERTEX_SRC, gl.VERTEX_SHADER);
    const fs = compileShader(FRAGMENT_SRC, gl.FRAGMENT_SHADER);
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.useProgram(p);
    return p;
})();

const posLoc  = gl.getAttribLocation(program, "a_position");
const colLoc  = gl.getUniformLocation(program, "u_color");

// DATOS: segmentos de curva cúbica (4 pts c/u)
// Cada segmento = [p0, p1, p2, p3] donde cada p = [x, y]
// Segmento N comparte p0 con segmento N-1.p3 (continuidad C0)

let segments = [
    [[-0.85, -0.4], [-0.60, 0.70], [-0.25, 0.50], [ 0.15, 0.65]], // seg 0
    [[ 0.15, 0.65], [ 0.55, 0.80], [ 0.60, 0.10], [ 0.85, 0.20]], // seg 1
];

let c1Enabled = true;

// Colores para cada segmento (se cicla)
const SEG_COLORS = [
    [1, 1, 0],       // amarillo
    [0, 1, 1],       // cian
    [1, 0, 1],       // magenta
    [0.2, 1, 0.2],   // verde lima
    [1, 0.6, 0],     // naranja
    [0.5, 0.3, 1],   // violeta
    [1, 0.3, 0.3],   // rojo claro
    [0.3, 0.8, 1],   // celeste
];

const SEG_RES = 60; // pts por segmento

// ALGORITMO DE CASTELJAU (cúbico, 4 pts)
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

function generateSegmentCurve(points, res) {
    const curve = [];
    for (let i = 0; i <= res; i++) {
        curve.push(deCasteljau(points, i / res));
    }
    return curve;
}

// CONTINUIDAD C1
function applyC1() {
    if (!c1Enabled) return;
    for (let s = 1; s < segments.length; s++) {
        const prev = segments[s - 1];
        const curr = segments[s];
        // curr[0] ya debería ser igual a prev[3] por C0
        // C1: curr[1] = 2 * curr[0] - prev[2]
        curr[1][0] = 2 * curr[0][0] - prev[2][0];
        curr[1][1] = 2 * curr[0][1] - prev[2][1];
    }
}

/** Determina si un punto de control está restringido por C1 */
function isConstrained(segIdx, ptIdx) {
    return c1Enabled && segIdx > 0 && ptIdx === 1;
}

/** Determina si un punto es de unión (C0) — compartido entre segmentos */
function isJoinPoint(segIdx, ptIdx) {
    // ptIdx === 0 de cualquier segmento excepto el 0
    // ptIdx === 3 de cualquier segmento excepto el último
    // Pero en la práctica, ptIdx === 0 para seg > 0 es el join
    // y está representado por el ptIdx === 3 del segmento anterior
    return segIdx > 0 && ptIdx === 0;
}

// HELPERS: buffers
function setColor(r, g, b, a = 1) {
    gl.uniform4f(colLoc, r, g, b, a);
}

function createBuffer(data) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.flat()), gl.STATIC_DRAW);
    return buf;
}

function bindAndDraw(data, mode) {
    const buf = createBuffer(data);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posLoc);
    gl.drawArrays(mode, 0, data.length);
}

function drawLineStrip(data, r, g, b) {
    setColor(r, g, b);
    bindAndDraw(data, gl.LINE_STRIP);
}

function drawPoints(data) {
    bindAndDraw(data, gl.POINTS);
}

// DIBUJADO
function draw() {
    gl.clearColor(0.07, 0.07, 0.07, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (segments.length === 0) return;

    // ---- Polígono de control (gris, punteado visual) ----
    // Dibujar el polígono completo que une TODOS los puntos de control
    let allCtrlPts = [];
    for (let s = 0; s < segments.length; s++) {
        if (s === 0) {
            allCtrlPts.push(...segments[s]);
        } else {
            allCtrlPts.push(segments[s][1], segments[s][2], segments[s][3]);
        }
    }
    drawLineStrip(allCtrlPts, 0.5, 0.5, 0.5);

    // ---- Curvas por segmento (cada uno su color) ----
    for (let s = 0; s < segments.length; s++) {
        const curve = generateSegmentCurve(segments[s], SEG_RES);
        const col = SEG_COLORS[s % SEG_COLORS.length];
        drawLineStrip(curve, col[0], col[1], col[2]);
    }

    // ---- Línea de tangente reflejada para C1 (blanca tenue) ----
    if (c1Enabled) {
        setColor(1, 1, 1, 0.3);
        for (let s = 1; s < segments.length; s++) {
            const prev = segments[s - 1];
            const curr = segments[s];
            // Dibujar línea: prev[2] -> join -> curr[1]
            const line = [prev[2], curr[0], curr[1]];
            bindAndDraw(line, gl.LINE_STRIP);
        }
    }

    // ---- Puntos de control con códigos de colores ----
    for (let s = 0; s < segments.length; s++) {
        for (let pi = 0; pi < 4; pi++) {
            const pt = segments[s][pi];
            if (isConstrained(s, pi)) {
                // Punto restringido por C1 (magenta): se dibuja más pequeño
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(posLoc);
                setColor(1, 0.4, 1, 0.7);
                const buf = createBuffer([pt]);
                gl.bindBuffer(gl.ARRAY_BUFFER, buf);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(posLoc);
                // Guardar tamaño original, dibujar más chico
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.POINTS, 0, 1);
                // Dibujar un cuadrado chico (con LINE_LOOP) alrededor
                const s2 = 0.015;
                const sq = [
                    [pt[0] - s2, pt[1] - s2],
                    [pt[0] + s2, pt[1] - s2],
                    [pt[0] + s2, pt[1] + s2],
                    [pt[0] - s2, pt[1] + s2],
                ];
                setColor(1, 0.4, 1, 0.5);
                bindAndDraw(sq, gl.LINE_LOOP);
            } else if (isJoinPoint(s, pi)) {
                // Punto de unión (amarillo)
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(posLoc);
                setColor(1, 1, 0, 1);
                const buf = createBuffer([pt]);
                gl.bindBuffer(gl.ARRAY_BUFFER, buf);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(posLoc);
                gl.drawArrays(gl.POINTS, 0, 1);
                // Círculo más grande alrededor
                const r2 = 0.018;
                const circ = [];
                for (let a = 0; a <= 20; a++) {
                    const ang = (a / 20) * Math.PI * 2;
                    circ.push([pt[0] + Math.cos(ang) * r2, pt[1] + Math.sin(ang) * r2]);
                }
                setColor(1, 1, 0, 0.5);
                bindAndDraw(circ, gl.LINE_LOOP);
            } else {
                // Punto libre (rojo)
                setColor(1, 0, 0, 1);
                const buf = createBuffer([pt]);
                gl.bindBuffer(gl.ARRAY_BUFFER, buf);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(posLoc);
                gl.drawArrays(gl.POINTS, 0, 1);
            }
        }
    }

    // ---- Mostrar join points como puntos grandes ----
    // Ya se dibujaron arriba
}

// ANIMACIÓN (punto verde recorriendo la curva COMPLETA)
function getCurvePoint(t) {
    // t va de 0 a 1 sobre TODOS los segmentos
    const total = segments.length;
    if (total === 0) return [0, 0];
    const segF = t * total;          // ej: 1.7
    const segIdx = Math.min(Math.floor(segF), total - 1);
    const localT = segF - segIdx;    // ej: 0.7
    return deCasteljau(segments[segIdx], localT);
}

function animate(time) {
    draw();
    if (segments.length > 0) {
        const t = (Math.sin(time * 0.0008) + 1) / 2;
        const pt = getCurvePoint(t);
        setColor(0, 1, 0, 1);
        const buf = createBuffer([pt]);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);
        gl.drawArrays(gl.POINTS, 0, 1);
    }
    requestAnimationFrame(animate);
}

// MOUSE: arrastrar puntos
let draggingData = null; // { segIdx, ptIdx }

function getNDC(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: ((e.clientX - rect.left) / canvas.width) * 2 - 1,
        y: -(((e.clientY - rect.top) / canvas.height) * 2 - 1),
    };
}

canvas.addEventListener("mousedown", e => {
    const { x, y } = getNDC(e);
    draggingData = null;

    // Buscar en todos los puntos (excluyendo los restringidos)
    for (let s = 0; s < segments.length; s++) {
        for (let pi = 0; pi < 4; pi++) {
            if (isConstrained(s, pi)) continue;
            const pt = segments[s][pi];
            if (Math.hypot(pt[0] - x, pt[1] - y) < 0.055) {
                draggingData = { segIdx: s, ptIdx: pi };
                return;
            }
        }
    }
});

canvas.addEventListener("mousemove", e => {
    if (!draggingData) return;
    const { x, y } = getNDC(e);
    const { segIdx, ptIdx } = draggingData;

    // Mover el punto
    segments[segIdx][ptIdx] = [x, y];

    // Si es un join point (ptIdx === 3 de cualquier segmento,
    // o ptIdx === 0 de un segmento que no sea el primero)
    if (ptIdx === 3 && segIdx < segments.length - 1) {
        // Actualizar el pt[0] del siguiente segmento (C0)
        segments[segIdx + 1][0] = [x, y];
    }
    if (ptIdx === 0 && segIdx > 0) {
        // Actualizar el pt[3] del segmento anterior (C0)
        segments[segIdx - 1][3] = [x, y];
    }

    // Re-aplicar C1
    applyC1();
});

canvas.addEventListener("mouseup", () => { draggingData = null; });
canvas.addEventListener("mouseleave", () => { draggingData = null; });

// MANEJO DE SEGMENTOS
function addSegment() {
    const last = segments[segments.length - 1];
    const p3 = last[3];
    // Calcular dirección aproximada para el nuevo segmento
    const dx = p3[0] - last[2][0];
    const dy = p3[1] - last[2][1];
    // Nuevo segmento se extiende en la misma dirección
    const newSeg = [
        [p3[0], p3[1]],                                     // p0 = join
        [p3[0] + dx * 0.3 + 0.1, p3[1] + dy * 0.3],        // p1
        [p3[0] + dx * 0.6 + 0.1, p3[1] + dy * 0.6],        // p2
        [p3[0] + dx * 0.9 + 0.2, p3[1] + dy * 0.9],        // p3
    ];
    segments.push(newSeg);
    applyC1();
    updateInfo();
    updateLegend();
}

function removeSegment() {
    if (segments.length <= 1) return;
    segments.pop();
    updateInfo();
    updateLegend();
}

function resetSegments() {
    segments = [
        [[-0.85, -0.4], [-0.60, 0.70], [-0.25, 0.50], [ 0.15, 0.65]],
        [[ 0.15, 0.65], [ 0.55, 0.80], [ 0.60, 0.10], [ 0.85, 0.20]],
    ];
    applyC1();
    updateInfo();
    updateLegend();
}

function toggleC1() {
    c1Enabled = !c1Enabled;
    const btn = document.getElementById("btnToggleC1");
    btn.textContent = c1Enabled ? "C1: ON" : "C1: OFF";
    btn.className = "toggle-btn " + (c1Enabled ? "on" : "off");
    if (c1Enabled) applyC1();
    updateInfo();
}

// UI: info y leyenda
function updateInfo() {
    document.getElementById("segCount").textContent = segments.length;
    const totalPts = segments.length * 4; // total incluyendo duplicados C0
    document.getElementById("ptCount").textContent = totalPts;
}

function updateLegend() {
    const container = document.getElementById("segLegend");
    container.innerHTML = segments.map((_, i) => {
        const col = SEG_COLORS[i % SEG_COLORS.length];
        const hex = `rgb(${col[0]*255|0}, ${col[1]*255|0}, ${col[2]*255|0})`;
        return `<div class="legend-item">
            <div class="color-dot" style="background: ${hex};"></div>
            <span>Segmento ${i}</span>
        </div>`;
    }).join(" | ");
}

// BINDING: botones
document.getElementById("btnAddSeg").addEventListener("click", addSegment);
document.getElementById("btnRemoveSeg").addEventListener("click", removeSegment);
document.getElementById("btnReset").addEventListener("click", resetSegments);
document.getElementById("btnToggleC1").addEventListener("click", toggleC1);

// ARRANQUE
applyC1();
updateInfo();
updateLegend();
animate(0);
