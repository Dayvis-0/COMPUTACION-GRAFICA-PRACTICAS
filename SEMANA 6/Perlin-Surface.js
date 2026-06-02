// ============================================================
// SUPERFICIE DE PERLIN NOISE — Terreno procedural 3D
// ============================================================
// Algoritmo: Ruido de Perlin 2D + fBm (Fractal Brownian Motion)
// Render: Triángulos coloreados por altura + wireframe opcional
// ============================================================

// --- Setup WebGL 3D ---
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");
gl.enable(gl.DEPTH_TEST);

// --- Shaders con color por vértice ---
const VERTEX_SRC = `
    attribute vec3 a_position;
    attribute vec3 a_color;
    varying vec3 v_color;
    uniform mat4 u_mvp;
    void main() {
        gl_Position = u_mvp * vec4(a_position, 1.0);
        gl_PointSize = 4.0;
        v_color = a_color;
    }
`;

const FRAGMENT_SRC = `
    precision mediump float;
    varying vec3 v_color;
    void main() {
        gl_FragColor = vec4(v_color, 1.0);
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

const posLoc   = gl.getAttribLocation(program, "a_position");
const colLoc   = gl.getAttribLocation(program, "a_color");
const mvpLoc   = gl.getUniformLocation(program, "u_mvp");
const colUniLoc = gl.getUniformLocation(program, "u_color"); // No usado, pero por compatibilidad

// ============================================================
// MAT4 — Mini librería de matrices 4×4
// ============================================================
const mat4 = {
    identity() {
        return new Float32Array([
            1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1
        ]);
    },
    multiply(a, b) {
        const out = new Float32Array(16);
        for (let row = 0; row < 4; row++)
            for (let col = 0; col < 4; col++) {
                let sum = 0;
                for (let k = 0; k < 4; k++)
                    sum += a[k*4 + row] * b[col*4 + k];
                out[col*4 + row] = sum;
            }
        return out;
    },
    perspective(fovY, aspect, near, far) {
        const f = 1 / Math.tan(fovY / 2);
        const out = new Float32Array(16);
        out[0]  = f / aspect;
        out[5]  = f;
        out[10] = (far + near) / (near - far);
        out[11] = -1;
        out[14] = (2 * far * near) / (near - far);
        return out;
    },
    translate(out, v) {
        out[12] += out[0]*v[0] + out[4]*v[1] + out[8]*v[2];
        out[13] += out[1]*v[0] + out[5]*v[1] + out[9]*v[2];
        out[14] += out[2]*v[0] + out[6]*v[1] + out[10]*v[2];
        out[15] += out[3]*v[0] + out[7]*v[1] + out[11]*v[2];
    },
    rotateX(out, angle) {
        const s=Math.sin(angle), c=Math.cos(angle);
        const a10=out[4],a11=out[5],a12=out[6],a13=out[7];
        const a20=out[8],a21=out[9],a22=out[10],a23=out[11];
        out[4]=a10*c+a20*s; out[5]=a11*c+a21*s;
        out[6]=a12*c+a22*s; out[7]=a13*c+a23*s;
        out[8]=a20*c-a10*s; out[9]=a21*c-a11*s;
        out[10]=a22*c-a12*s; out[11]=a23*c-a13*s;
    },
    rotateY(out, angle) {
        const s=Math.sin(angle), c=Math.cos(angle);
        const a00=out[0],a01=out[1],a02=out[2],a03=out[3];
        const a20=out[8],a21=out[9],a22=out[10],a23=out[11];
        out[0]=a00*c-a20*s; out[1]=a01*c-a21*s;
        out[2]=a02*c-a22*s; out[3]=a03*c-a23*s;
        out[8]=a00*s+a20*c; out[9]=a01*s+a21*c;
        out[10]=a02*s+a22*c; out[11]=a03*s+a23*c;
    },
};

// ============================================================
// CÁMARA
// ============================================================
let rotX = -0.6, rotY = 0.5;
let distancia = 5.5;

function buildMVP() {
    const aspect = canvas.width / canvas.height;
    const proj = mat4.perspective(40 * Math.PI / 180, aspect, 0.1, 20);
    const mv = mat4.identity();
    mat4.translate(mv, [0, 0, -distancia]);
    mat4.rotateX(mv, rotX);
    mat4.rotateY(mv, rotY);
    return mat4.multiply(proj, mv);
}

// ============================================================
// RUIDO DE PERLIN 2D
// ============================================================
class PerlinNoise {
    constructor(seed = 42) {
        this.perm = new Uint8Array(512);
        const p = [];
        for (let i = 0; i < 256; i++) p[i] = i;
        // Shuffle con seed
        let s = seed;
        for (let i = 255; i > 0; i--) {
            s = (s * 1664525 + 1013904223) | 0;
            const j = ((s >>> 0) % (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }
        for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    }

    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(a, b, t) { return a + t * (b - a); }

    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const u = this.fade(xf);
        const v = this.fade(yf);
        const aa = this.perm[this.perm[X] + Y];
        const ab = this.perm[this.perm[X] + Y + 1];
        const ba = this.perm[this.perm[X + 1] + Y];
        const bb = this.perm[this.perm[X + 1] + Y + 1];
        return this.lerp(
            this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf-1, yf), u),
            this.lerp(this.grad(ab, xf, yf-1), this.grad(bb, xf-1, yf-1), u),
            v
        );
    }

    // fBm: Fractal Brownian Motion — superposición de octavas
    fbm(x, y, octaves = 5, lacunarity = 2, persistence = 0.5) {
        let value = 0, amplitude = 1, frequency = 1, maxVal = 0;
        for (let i = 0; i < octaves; i++) {
            value += amplitude * this.noise(x * frequency, y * frequency);
            maxVal += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        return value / maxVal; // Normalizado a ~[-1, 1]
    }
}

// ============================================================
// GENERACIÓN DEL TERRENO
// ============================================================
const TERRAIN_SIZE = 2.8; // mitad del tamaño en X e Y

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Mapa de altura → color (paleta de terreno)
function terrainColor(h) {
    // h normalizado a [0, 1]
    let r, g, b;

    if (h < 0.25) {
        // Agua profunda → somero: azul oscuro → azul claro
        const t = h / 0.25;
        r = 0; g = lerp(0.05, 0.3, t); b = lerp(0.15, 0.6, t);
    } else if (h < 0.35) {
        // Costa: arena
        const t = (h - 0.25) / 0.1;
        r = lerp(0.76, 0.55, t); g = lerp(0.70, 0.50, t); b = lerp(0.40, 0.20, t);
    } else if (h < 0.55) {
        // Pastizal → bosque: verde claro → verde oscuro
        const t = (h - 0.35) / 0.2;
        r = lerp(0.30, 0.15, t); g = lerp(0.70, 0.55, t); b = lerp(0.15, 0.08, t);
    } else if (h < 0.75) {
        // Bosque → roca
        const t = (h - 0.55) / 0.2;
        r = lerp(0.35, 0.55, t); g = lerp(0.45, 0.45, t); b = lerp(0.20, 0.35, t);
    } else {
        // Roca → nieve
        const t = (h - 0.75) / 0.25;
        r = lerp(0.65, 1.0, t); g = lerp(0.55, 1.0, t); b = lerp(0.45, 1.0, t);
    }

    return [clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1)];
}

// Datos del terreno generados
let terrainData = null; // { vertices, colors, triangles, triWireframe, ... }
let terrainBuffer = null; // WebGL buffer con vertices + colors interleaved

// Parámetros actuales
let params = {
    seed: 42,
    scale: 2.0,
    heightScale: 1.5,
    resolution: 80,
    octaves: 5,
    persistence: 0.5,
    lacunarity: 2.0,
};

function generateTerrain() {
    const { seed, scale, heightScale, resolution, octaves, persistence, lacunarity } = params;

    const perlin = new PerlinNoise(seed);
    const N = resolution;
    const step = TERRAIN_SIZE * 2 / N;

    // Generar grid de alturas + colores
    const grid = [];
    let hMin = Infinity, hMax = -Infinity;

    for (let i = 0; i <= N; i++) {
        const row = [];
        for (let j = 0; j <= N; j++) {
            const wx = -TERRAIN_SIZE + j * step;  // x en el mundo
            const wy = -TERRAIN_SIZE + i * step;  // y en el mundo (reemplaza z)
            const h = perlin.fbm(wx * scale, wy * scale, octaves, lacunarity, persistence);
            const wz = h * heightScale;           // altura (z en el mundo)
            if (wz < hMin) hMin = wz;
            if (wz > hMax) hMax = wz;
            row.push({ wx, wy, wz });
        }
        grid.push(row);
    }

    // Normalizar alturas a [0, 1] para colorear
    const hRange = hMax - hMin || 1;
    const colors = [];
    const vertices = []; // flat array: [x, y, z, r, g, b, x, y, z, r, g, b, ...]

    for (let i = 0; i <= N; i++) {
        for (let j = 0; j <= N; j++) {
            const { wx, wy, wz } = grid[i][j];
            const hNorm = clamp((wz - hMin) / hRange, 0, 1);
            const col = terrainColor(hNorm);
            vertices.push(wx, wy, wz, col[0], col[1], col[2]);
        }
    }

    // Generar índices de triángulos (2 triángulos por celda)
    // Usamos TRIANGLES con índices
    const indices = [];
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            const a = i * (N + 1) + j;
            const b = i * (N + 1) + j + 1;
            const c = (i + 1) * (N + 1) + j;
            const d = (i + 1) * (N + 1) + j + 1;
            // Triángulo 1: a-b-c
            indices.push(a, b, c);
            // Triángulo 2: b-d-c
            indices.push(b, d, c);
        }
    }

    // Generar vértices para wireframe con color blanco fijo
    const wireRows = [];
    const wireCols = [];
    // Líneas en dirección U (filas)
    for (let i = 0; i <= N; i++) {
        const row = [];
        for (let j = 0; j <= N; j++) {
            const { wx, wy, wz } = grid[i][j];
            // [x, y, z, r, g, b]
            row.push(wx, wy, wz, 1, 1, 1);
        }
        wireRows.push(row);
    }
    // Líneas en dirección V (columnas)
    for (let j = 0; j <= N; j++) {
        const col = [];
        for (let i = 0; i <= N; i++) {
            const { wx, wy, wz } = grid[i][j];
            col.push(wx, wy, wz, 1, 1, 1);
        }
        wireCols.push(col);
    }

    terrainData = {
        vertices,     // flat [x,y,z,r,g,b,...]
        indices,      // flat [i0,i1,i2, i0,i1,i2, ...]
        wireRows,
        wireCols,
        grid,
        hMin, hMax, N,
    };

    // Crear/Actualizar buffer WebGL
    createTerrainBuffer();

    // Actualizar info
    document.getElementById("vertInfo").textContent = (N + 1) * (N + 1);
    document.getElementById("triInfo").textContent = 2 * N * N;
    document.getElementById("hMinInfo").textContent = hMin.toFixed(3);
    document.getElementById("hMaxInfo").textContent = hMax.toFixed(3);
}

// ============================================================
// BUFFER WEBGL
// ============================================================
function createTerrainBuffer() {
    if (!terrainData) return;
    const { vertices } = terrainData;

    const F32 = new Float32Array(vertices);
    // vertices tiene estructura: [x,y,z,r,g,b, x,y,z,r,g,b, ...]

    if (!terrainBuffer) {
        terrainBuffer = gl.createBuffer();
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, terrainBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, F32, gl.STATIC_DRAW);

    // Configurar atributos (se hace cada vez que se dibuja también)
}

// ============================================================
// RENDER
// ============================================================
let showWireframe = true;

function draw() {
    gl.clearColor(0.07, 0.07, 0.07, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (!terrainData || !terrainBuffer) return;

    const mvp = buildMVP();
    gl.uniformMatrix4fv(mvpLoc, false, mvp);

    const { indices, N, wireRows } = terrainData;

    // --- 1) Terreno coloreado (triángulos) ---
    gl.bindBuffer(gl.ARRAY_BUFFER, terrainBuffer);

    const FLOAT_SIZE = 4;
    const STRIDE = 6 * FLOAT_SIZE; // 24 bytes

    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, STRIDE, 3 * FLOAT_SIZE);
    gl.enableVertexAttribArray(colLoc);

    // Index buffer para triángulos
    const idxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    // --- 2) Wireframe opcional (blanco semi-transparente) ---
    if (showWireframe) {
        const W_STRIDE = 6 * FLOAT_SIZE;

        // Líneas en U (filas)
        for (let i = 0; i <= N; i++) {
            const row = wireRows[i];
            if (row.length < 6) continue;
            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(row), gl.STATIC_DRAW);
            gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, W_STRIDE, 0);
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, W_STRIDE, 3 * FLOAT_SIZE);
            gl.enableVertexAttribArray(colLoc);
            gl.drawArrays(gl.LINE_STRIP, 0, row.length / 6);
        }

        // Líneas en V (columnas)
        for (let j = 0; j <= N; j++) {
            const col = wireCols[j];
            if (col.length < 6) continue;
            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(col), gl.STATIC_DRAW);
            gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, W_STRIDE, 0);
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, W_STRIDE, 3 * FLOAT_SIZE);
            gl.enableVertexAttribArray(colLoc);
            gl.drawArrays(gl.LINE_STRIP, 0, col.length / 6);
        }
    }
}

// ============================================================
// MOUSE — órbita
// ============================================================
let isDragging = false;
let lastMX = 0, lastMY = 0;

canvas.addEventListener("mousedown", e => {
    isDragging = true;
    lastMX = e.clientX;
    lastMY = e.clientY;
});

window.addEventListener("mousemove", e => {
    if (!isDragging) return;
    const dx = e.clientX - lastMX;
    const dy = e.clientY - lastMY;
    rotY += dx * 0.01;
    rotX += dy * 0.01;
    rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
    lastMX = e.clientX;
    lastMY = e.clientY;
});

window.addEventListener("mouseup", () => { isDragging = false; });

canvas.addEventListener("wheel", e => {
    e.preventDefault();
    distancia += e.deltaY * 0.005;
    distancia = Math.max(2.5, Math.min(12, distancia));
}, { passive: false });

// ============================================================
// UI — controles
// ============================================================
function readParams() {
    params.seed = parseInt(document.getElementById("seedInput").value) || 0;
    params.scale = parseFloat(document.getElementById("scaleSlider").value);
    params.heightScale = parseFloat(document.getElementById("heightSlider").value);
    params.resolution = parseInt(document.getElementById("resSlider").value);
    params.octaves = parseInt(document.getElementById("octavesSlider").value);
    params.persistence = parseFloat(document.getElementById("persistenceSlider").value);
    params.lacunarity = parseFloat(document.getElementById("lacunaritySlider").value);
    showWireframe = document.getElementById("wireframeCheck").checked;
}

function updateLabels() {
    document.getElementById("scaleVal").textContent = params.scale.toFixed(1);
    document.getElementById("heightVal").textContent = params.heightScale.toFixed(1);
    document.getElementById("resVal").textContent = params.resolution;
    document.getElementById("octavesVal").textContent = params.octaves;
    document.getElementById("persistenceVal").textContent = params.persistence.toFixed(2);
    document.getElementById("lacunarityVal").textContent = params.lacunarity.toFixed(1);
}

function regenerate() {
    readParams();
    updateLabels();
    generateTerrain();
}

// Bindear sliders a regeneración automática
document.getElementById("scaleSlider").addEventListener("input", regenerate);
document.getElementById("heightSlider").addEventListener("input", regenerate);
document.getElementById("resSlider").addEventListener("input", regenerate);
document.getElementById("octavesSlider").addEventListener("input", regenerate);
document.getElementById("persistenceSlider").addEventListener("input", regenerate);
document.getElementById("lacunaritySlider").addEventListener("input", regenerate);
document.getElementById("seedInput").addEventListener("change", regenerate);
document.getElementById("wireframeCheck").addEventListener("change", () => {
    showWireframe = document.getElementById("wireframeCheck").checked;
});

document.getElementById("btnRegen").addEventListener("click", regenerate);
document.getElementById("btnResetView").addEventListener("click", () => {
    rotX = -0.6; rotY = 0.5; distancia = 5.5;
});

// ============================================================
// ARRANQUE
// ============================================================
regenerate();

function animate() {
    draw();
    requestAnimationFrame(animate);
}
animate();
