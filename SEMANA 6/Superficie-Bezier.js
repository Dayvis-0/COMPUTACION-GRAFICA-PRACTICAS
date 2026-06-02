// SUPERFICIE DE BÉZIER — Producto Tensorial con De Casteljau
// S(u,v) = Σᵢ Σⱼ P_{i,j} · B_{i,n}(v) · B_{j,m}(u)
//
// Se evalúa en dos pasos:
//   1) Para cada fila i, De Casteljau en u → Q_i
//   2) De Casteljau en v sobre el vector Q → punto final

// --- Setup WebGL 3D ---
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");
gl.enable(gl.DEPTH_TEST);

// --- Shaders 3D ---
const VERTEX_SRC = `
    attribute vec3 a_position;
    uniform mat4 u_mvp;
    void main() {
        gl_Position = u_mvp * vec4(a_position, 1.0);
        gl_PointSize = 7.0;
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

const posLoc = gl.getAttribLocation(program, "a_position");
const mvpLoc = gl.getUniformLocation(program, "u_mvp");
const colLoc = gl.getUniformLocation(program, "u_color");

// MAT4 — Mini librería de matrices 4×4
const mat4 = {
    identity() {
        return new Float32Array([
            1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1
        ]);
    },

    multiply(a, b) {
        // C = A * B  (column-major: C[col*4+row] = sum_k A[k*4+row] * B[col*4+k])
        const out = new Float32Array(16);
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                let sum = 0;
                for (let k = 0; k < 4; k++)
                    sum += a[k*4 + row] * b[col*4 + k];
                out[col*4 + row] = sum;
            }
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
        const s = Math.sin(angle), c = Math.cos(angle);
        const a10 = out[4], a11 = out[5], a12 = out[6], a13 = out[7];
        const a20 = out[8], a21 = out[9], a22 = out[10], a23 = out[11];
        out[4]  = a10*c + a20*s;  out[5]  = a11*c + a21*s;
        out[6]  = a12*c + a22*s;  out[7]  = a13*c + a23*s;
        out[8]  = a20*c - a10*s;  out[9]  = a21*c - a11*s;
        out[10] = a22*c - a12*s;  out[11] = a23*c - a13*s;
    },

    rotateY(out, angle) {
        const s = Math.sin(angle), c = Math.cos(angle);
        const a00 = out[0], a01 = out[1], a02 = out[2], a03 = out[3];
        const a20 = out[8], a21 = out[9], a22 = out[10], a23 = out[11];
        out[0] = a00*c - a20*s;  out[1] = a01*c - a21*s;
        out[2] = a02*c - a22*s;  out[3] = a03*c - a23*s;
        out[8] = a00*s + a20*c;  out[9] = a01*s + a21*c;
        out[10]= a02*s + a22*c;  out[11]= a03*s + a23*c;
    },
};

// ALGORITMO DE CASTELJAU (3D)
function deCasteljau(points, t) {
    let temp = points.map(p => [...p]);
    for (let r = 1; r < points.length; r++) {
        for (let i = 0; i < points.length - r; i++) {
            for (let d = 0; d < 3; d++) {
                temp[i][d] = (1 - t) * temp[i][d] + t * temp[i + 1][d];
            }
        }
    }
    return temp[0];
}

// EVALUACIÓN DE SUPERFICIE (Producto Tensorial)
// grid[i][j] = [x, y, z]  → i = fila (v), j = columna (u)
function evaluarSuperficie(grid, u, v) {
    const rows = grid.length;          // n+1
    const cols = grid[0].length;       // m+1

    // Paso 1: para cada fila, interpolar en u
    const filasInterpoladas = [];
    for (let i = 0; i < rows; i++) {
        filasInterpoladas.push(deCasteljau(grid[i], u));
    }

    // Paso 2: interpolar el vector de filas en v
    return deCasteljau(filasInterpoladas, v);
}

// Generar una malla regular de puntos de la superficie
function generarMallaSuperficie(grid, uRes, vRes) {
    const malla = [];
    for (let i = 0; i <= vRes; i++) {
        const v = i / vRes;
        const fila = [];
        for (let j = 0; j <= uRes; j++) {
            const u = j / uRes;
            fila.push(evaluarSuperficie(grid, u, v));
        }
        malla.push(fila);
    }
    return malla;
}

// RED DE CONTROL POR DEFECTO (bicúbica 4×4)
const GRID_DEFAULT = [
    [[-1.5, -1.5, 0.0], [-0.5, -1.5, 0.6], [ 0.5, -1.5, 0.6], [ 1.5, -1.5, 0.0]],
    [[-1.5, -0.5, 0.6], [-0.5, -0.5, 1.8], [ 0.5, -0.5, 1.8], [ 1.5, -0.5, 0.6]],
    [[-1.5,  0.5, 0.6], [-0.5,  0.5, 1.8], [ 0.5,  0.5, 1.8], [ 1.5,  0.5, 0.6]],
    [[-1.5,  1.5, 0.0], [-0.5,  1.5, 0.6], [ 0.5,  1.5, 0.6], [ 1.5,  1.5, 0.0]],
];

let controlGrid = GRID_DEFAULT.map(row => row.map(p => [...p]));

// CÁMARA — órbita con mouse
let rotX = -0.5, rotY = 0.5;
let distancia = 5.5;
let isDragging = false;
let lastMX = 0, lastMY = 0;

function buildMVP() {
    const aspect = canvas.width / canvas.height;
    const proj = mat4.perspective(40 * Math.PI / 180, aspect, 0.1, 20);
    const mv = mat4.identity();
    mat4.translate(mv, [0, 0, -distancia]);
    mat4.rotateX(mv, rotX);
    mat4.rotateY(mv, rotY);
    return mat4.multiply(proj, mv);
}

// RENDER — helpers
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
    if (data.length === 0) return;
    const buf = createBuffer(data);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posLoc);
    gl.drawArrays(mode, 0, data.length);
}

function drawLineStrip(data, r, g, b, alpha = 1) {
    setColor(r, g, b, alpha);
    bindAndDraw(data, gl.LINE_STRIP);
}

function drawPoints(data) {
    bindAndDraw(data, gl.POINTS);
}

// DIBUJADO DE LA SUPERFICIE
let uRes = 25, vRes = 25;

function draw() {
    gl.clearColor(0.07, 0.07, 0.07, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const mvp = buildMVP();
    gl.uniformMatrix4fv(mvpLoc, false, mvp);

    const rows = controlGrid.length;
    const cols = controlGrid[0].length;

    // ---- 1) Malla de control (gris) ----
    // Líneas en dirección U (filas)
    setColor(0.4, 0.4, 0.4, 1);
    for (let i = 0; i < rows; i++) {
        bindAndDraw(controlGrid[i], gl.LINE_STRIP);
    }
    // Líneas en dirección V (columnas)
    for (let j = 0; j < cols; j++) {
        const col = [];
        for (let i = 0; i < rows; i++) col.push(controlGrid[i][j]);
        bindAndDraw(col, gl.LINE_STRIP);
    }

    // ---- 2) Puntos de control (rojo) ----
    const allPts = controlGrid.flat();
    setColor(1, 0.2, 0.2, 1);
    bindAndDraw(allPts, gl.POINTS);

    // ---- 3) Superficie evaluada (wireframe) ----
    const malla = generarMallaSuperficie(controlGrid, uRes, vRes);
    const vResActual = malla.length - 1;
    const uResActual = malla[0].length - 1;

    // Líneas en U (cyan) — para cada fila v
    for (let i = 0; i <= vResActual; i++) {
        drawLineStrip(malla[i], 0, 1, 1, 0.85);
    }
    // Líneas en V (amarillo) — para cada columna u
    for (let j = 0; j <= uResActual; j++) {
        const col = [];
        for (let i = 0; i <= vResActual; i++) col.push(malla[i][j]);
        drawLineStrip(col, 1, 1, 0, 0.85);
    }
}

// MOUSE — órbita 3D
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
    // Limitar rotX para no dar vueltas completas
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

// UI — controles
document.getElementById("resSlider").addEventListener("input", e => {
    uRes = vRes = parseInt(e.target.value);
    document.getElementById("resValue").textContent = uRes;
});

document.getElementById("btnResetView").addEventListener("click", () => {
    rotX = -0.5; rotY = 0.5; distancia = 5.5;
});

document.getElementById("btnResetGrid").addEventListener("click", () => {
    controlGrid = GRID_DEFAULT.map(row => row.map(p => [...p]));
});

// INFO
function updateInfo() {
    const rows = controlGrid.length;
    const cols = controlGrid[0].length;
    document.getElementById("degInfo").textContent = `${cols-1} × ${rows-1}`;
    document.getElementById("ptInfo").textContent = rows * cols;
    document.getElementById("patchInfo").textContent = 1;
}
updateInfo();

// ANIMACIÓN
function animate() {
    draw();
    requestAnimationFrame(animate);
}
animate();
