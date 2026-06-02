// ============================================================
// SUPERFICIE DE BÉZIER EDITABLE — arrastrá los puntos de control
// ============================================================
// S(u,v) = Σᵢ Σⱼ P_{i,j} · B_{i,n}(v) · B_{j,m}(u)
//
// Evaluación en dos pasos con De Casteljau:
//   1) Para cada fila i, De Casteljau en u → Q_i
//   2) De Casteljau en v sobre el vector Q → punto final
//
// INTERACCIÓN:
//   - Click en punto de control → arrastrar para moverlo (plano XY a su Z)
//   - Click en espacio vacío → orbitar la cámara
//   - Scroll → zoom
// ============================================================

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

const posLoc = gl.getAttribLocation(program, "a_position");
const mvpLoc = gl.getUniformLocation(program, "u_mvp");
const colLoc = gl.getUniformLocation(program, "u_color");

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

    // Inversa de matriz 4×4 (método de cofactores)
    invert(m) {
        const out = new Float32Array(16);
        const a00=m[0],a01=m[1],a02=m[2],a03=m[3];
        const a10=m[4],a11=m[5],a12=m[6],a13=m[7];
        const a20=m[8],a21=m[9],a22=m[10],a23=m[11];
        const a30=m[12],a31=m[13],a32=m[14],a33=m[15];

        const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10;
        const b02=a00*a13-a03*a10, b03=a01*a12-a02*a11;
        const b04=a01*a13-a03*a11, b05=a02*a13-a03*a12;
        const b06=a20*a31-a21*a30, b07=a20*a32-a22*a30;
        const b08=a20*a33-a23*a30, b09=a21*a32-a22*a31;
        const b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;

        const det = b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06;
        if (Math.abs(det) < 1e-15) return null;

        const inv = 1 / det;
        out[0]  = (a11*b11-a12*b10+a13*b09)*inv;
        out[1]  = (-a01*b11+a02*b10-a03*b09)*inv;
        out[2]  = (a31*b05-a32*b04+a33*b03)*inv;
        out[3]  = (-a21*b05+a22*b04-a23*b03)*inv;
        out[4]  = (-a10*b11+a12*b08-a13*b07)*inv;
        out[5]  = (a00*b11-a02*b08+a03*b07)*inv;
        out[6]  = (-a30*b05+a32*b02-a33*b01)*inv;
        out[7]  = (a20*b05-a22*b02+a23*b01)*inv;
        out[8]  = (a10*b10-a11*b08+a13*b06)*inv;
        out[9]  = (-a00*b10+a01*b08-a03*b06)*inv;
        out[10] = (a30*b04-a31*b02+a33*b00)*inv;
        out[11] = (-a20*b04+a21*b02-a23*b00)*inv;
        out[12] = (-a10*b09+a11*b07-a12*b06)*inv;
        out[13] = (a00*b09-a01*b07+a02*b06)*inv;
        out[14] = (-a30*b03+a31*b01-a32*b00)*inv;
        out[15] = (a20*b03-a21*b01+a22*b00)*inv;

        return out;
    },

    // Multiplicar matriz 4×4 × vector4
    transformVec4(m, v) {
        return [
            m[0]*v[0] + m[4]*v[1] + m[8]*v[2]  + m[12]*v[3],
            m[1]*v[0] + m[5]*v[1] + m[9]*v[2]  + m[13]*v[3],
            m[2]*v[0] + m[6]*v[1] + m[10]*v[2] + m[14]*v[3],
            m[3]*v[0] + m[7]*v[1] + m[11]*v[2] + m[15]*v[3],
        ];
    },
};

// ============================================================
// ALGORITMO DE CASTELJAU (3D)
// ============================================================
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

// ============================================================
// EVALUACIÓN DE SUPERFICIE (Producto Tensorial)
// ============================================================
function evaluarSuperficie(grid, u, v) {
    const rows = grid.length;
    const cols = grid[0].length;

    const filasInterpoladas = [];
    for (let i = 0; i < rows; i++) {
        filasInterpoladas.push(deCasteljau(grid[i], u));
    }
    return deCasteljau(filasInterpoladas, v);
}

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

// ============================================================
// RED DE CONTROL POR DEFECTO (bicúbica 4×4)
// ============================================================
const GRID_DEFAULT = [
    [[-1.5, -1.5, 0.0], [-0.5, -1.5, 0.6], [ 0.5, -1.5, 0.6], [ 1.5, -1.5, 0.0]],
    [[-1.5, -0.5, 0.6], [-0.5, -0.5, 1.8], [ 0.5, -0.5, 1.8], [ 1.5, -0.5, 0.6]],
    [[-1.5,  0.5, 0.6], [-0.5,  0.5, 1.8], [ 0.5,  0.5, 1.8], [ 1.5,  0.5, 0.6]],
    [[-1.5,  1.5, 0.0], [-0.5,  1.5, 0.6], [ 0.5,  1.5, 0.6], [ 1.5,  1.5, 0.0]],
];

let controlGrid = GRID_DEFAULT.map(row => row.map(p => [...p]));

// ============================================================
// CÁMARA
// ============================================================
let rotX = -0.5, rotY = 0.5;
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
// RENDER — helpers
// ============================================================
let selectedPoint = null; // { row, col }

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

// ============================================================
// PROYECCIÓN 3D ↔ 2D (para picking)
// ============================================================

// Proyecta un punto 3D a coordenadas de pantalla
function projectPoint(p, mvp, w, h) {
    const clip = mat4.transformVec4(mvp, [p[0], p[1], p[2], 1]);
    if (Math.abs(clip[3]) < 1e-10) return null;
    const ndcX = clip[0] / clip[3];
    const ndcY = clip[1] / clip[3];
    return {
        x: (ndcX + 1) / 2 * w,
        y: (1 - ndcY) / 2 * h,
    };
}

// Convierte pantalla → rayo 3D (necesita la inversa de MVP)
function screenToRay(sx, sy, invMVP, w, h) {
    const ndcX = (sx / w) * 2 - 1;
    const ndcY = -((sy / h) * 2 - 1);

    const near = mat4.transformVec4(invMVP, [ndcX, ndcY, -1, 1]);
    const far  = mat4.transformVec4(invMVP, [ndcX, ndcY,  1, 1]);

    const nw = near[3], fw = far[3];
    if (Math.abs(nw) < 1e-10 || Math.abs(fw) < 1e-10) return null;

    const origin = [near[0]/nw, near[1]/nw, near[2]/nw];
    const farPt  = [ far[0]/fw,  far[1]/fw,  far[2]/fw];
    const dir = [
        farPt[0] - origin[0],
        farPt[1] - origin[1],
        farPt[2] - origin[2],
    ];

    const len = Math.hypot(dir[0], dir[1], dir[2]);
    if (len < 1e-10) return null;
    dir[0] /= len; dir[1] /= len; dir[2] /= len;

    return { origin, dir };
}

// Intersección rayo-plano (plano horizontal a z = planeZ)
function rayPlaneIntersection(origin, dir, planeZ) {
    if (Math.abs(dir[2]) < 1e-10) return null;
    const t = (planeZ - origin[2]) / dir[2];
    return [
        origin[0] + t * dir[0],
        origin[1] + t * dir[1],
        origin[2] + t * dir[2],
    ];
}

// Busca el punto de control más cercano al click (en pantalla)
function pickControlPoint(sx, sy, mvp) {
    let closest = null;
    let minDist = 15; // píxeles de tolerancia

    for (let i = 0; i < controlGrid.length; i++) {
        for (let j = 0; j < controlGrid[i].length; j++) {
            const proj = projectPoint(controlGrid[i][j], mvp, canvas.width, canvas.height);
            if (!proj) continue;
            const d = Math.hypot(proj.x - sx, proj.y - sy);
            if (d < minDist) {
                minDist = d;
                closest = { row: i, col: j };
            }
        }
    }
    return closest;
}

// ============================================================
// DIBUJADO
// ============================================================
let uRes = 25, vRes = 25;

function draw() {
    gl.clearColor(0.07, 0.07, 0.07, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const mvp = buildMVP();
    gl.uniformMatrix4fv(mvpLoc, false, mvp);

    const rows = controlGrid.length;
    const cols = controlGrid[0].length;

    // ---- Malla de control (gris) ----
    setColor(0.4, 0.4, 0.4, 1);
    for (let i = 0; i < rows; i++) {
        bindAndDraw(controlGrid[i], gl.LINE_STRIP);
    }
    for (let j = 0; j < cols; j++) {
        const col = [];
        for (let i = 0; i < rows; i++) col.push(controlGrid[i][j]);
        bindAndDraw(col, gl.LINE_STRIP);
    }

    // ---- Superficie evaluada (wireframe) ----
    const malla = generarMallaSuperficie(controlGrid, uRes, vRes);
    const vResActual = malla.length - 1;
    const uResActual = malla[0].length - 1;

    for (let i = 0; i <= vResActual; i++)
        drawLineStrip(malla[i], 0, 1, 1, 0.85);
    for (let j = 0; j <= uResActual; j++) {
        const col = [];
        for (let i = 0; i <= vResActual; i++) col.push(malla[i][j]);
        drawLineStrip(col, 1, 1, 0, 0.85);
    }

    // ---- Puntos de control ----
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const pt = controlGrid[i][j];
            const isSelected = selectedPoint &&
                selectedPoint.row === i && selectedPoint.col === j;

            if (isSelected) {
                // Punto seleccionado: verde + aro blanco
                setColor(0, 1, 0, 1);
                bindAndDraw([pt], gl.POINTS);
                // Aro de selección
                const r = 0.08;
                const circ = [];
                for (let a = 0; a <= 24; a++) {
                    const ang = (a / 24) * Math.PI * 2;
                    circ.push([pt[0] + Math.cos(ang) * r, pt[1] + Math.sin(ang) * r, pt[2]]);
                }
                setColor(1, 1, 1, 0.6);
                bindAndDraw(circ, gl.LINE_LOOP);
            } else {
                // Punto normal: rojo
                setColor(1, 0.2, 0.2, 1);
                bindAndDraw([pt], gl.POINTS);
            }
        }
    }

    return mvp;
}

// ============================================================
// MOUSE — interacción combinada: arrastrar punto u orbitar
// ============================================================
let dragState = null; // { mode: 'point', row, col, planeZ } | { mode: 'orbit' }
let lastMX = 0, lastMY = 0;

canvas.addEventListener("mousedown", e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    lastMX = sx;
    lastMY = sy;

    const mvp = buildMVP();

    // 1) Intentar agarrar un punto de control
    const picked = pickControlPoint(sx, sy, mvp);
    if (picked) {
        const pt = controlGrid[picked.row][picked.col];
        selectedPoint = picked;
        dragState = { mode: 'point', row: picked.row, col: picked.col, planeZ: pt[2] };
        canvas.classList.add("dragging-point");
        // Actualizar info
        document.getElementById("pointInfo").textContent =
            `🟢 Punto [${picked.row}][${picked.col}] → (${pt[0].toFixed(2)}, ${pt[1].toFixed(2)}, ${pt[2].toFixed(2)})`;
        return;
    }

    // 2) Si no, orbitar
    selectedPoint = null;
    document.getElementById("pointInfo").textContent = "⚪ Ningún punto seleccionado";
    dragState = { mode: 'orbit' };
});

window.addEventListener("mousemove", e => {
    if (!dragState) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (dragState.mode === 'point') {
        // Mover punto de control usando rayo-plano
        const mvp = buildMVP();
        const invMVP = mat4.invert(mvp);
        if (!invMVP) return;

        const ray = screenToRay(sx, sy, invMVP, canvas.width, canvas.height);
        if (!ray) return;

        const hit = rayPlaneIntersection(ray.origin, ray.dir, dragState.planeZ);
        if (!hit) return;

        const { row, col } = dragState;
        controlGrid[row][col] = hit;

        // Actualizar info
        document.getElementById("pointInfo").textContent =
            `🟢 Punto [${row}][${col}] → (${hit[0].toFixed(2)}, ${hit[1].toFixed(2)}, ${hit[2].toFixed(2)})`;
    } else {
        // Orbitar
        const dx = sx - lastMX;
        const dy = sy - lastMY;
        rotY += dx * 0.01;
        rotX += dy * 0.01;
        rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
    }

    lastMX = sx;
    lastMY = sy;
});

window.addEventListener("mouseup", () => {
    dragState = null;
    canvas.classList.remove("dragging-point");
});

window.addEventListener("mouseleave", () => {
    dragState = null;
    canvas.classList.remove("dragging-point");
});

canvas.addEventListener("wheel", e => {
    e.preventDefault();
    distancia += e.deltaY * 0.005;
    distancia = Math.max(2.5, Math.min(12, distancia));
}, { passive: false });

// ============================================================
// UI — controles
// ============================================================
document.getElementById("resSlider").addEventListener("input", e => {
    uRes = vRes = parseInt(e.target.value);
    document.getElementById("resValue").textContent = uRes;
});

document.getElementById("btnResetView").addEventListener("click", () => {
    rotX = -0.5; rotY = 0.5; distancia = 5.5;
    selectedPoint = null;
    document.getElementById("pointInfo").textContent = "⚪ Ningún punto seleccionado";
});

document.getElementById("btnResetGrid").addEventListener("click", () => {
    controlGrid = GRID_DEFAULT.map(row => row.map(p => [...p]));
    selectedPoint = null;
    document.getElementById("pointInfo").textContent = "⚪ Ningún punto seleccionado";
});

// ============================================================
// INFO
// ============================================================
function updateInfo() {
    const rows = controlGrid.length;
    const cols = controlGrid[0].length;
    document.getElementById("degInfo").textContent = `${cols-1} × ${rows-1}`;
    document.getElementById("ptInfo").textContent = rows * cols;
}
updateInfo();

// ============================================================
// ANIMACIÓN
// ============================================================
function animate() {
    draw();
    requestAnimationFrame(animate);
}
animate();
