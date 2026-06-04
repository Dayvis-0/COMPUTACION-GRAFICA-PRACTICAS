// =====================================================================
// Colores DINÁMICOS por vértice con interpolación en el fragment shader.
// El vertex shader recibe a_color por vértice y lo pasa al fragment vía
// un varying; WebGL interpola ese varying linealmente sobre el triángulo,
// generando un gradiente suave entre las esquinas.
// =====================================================================

// ── 1) Contexto WebGL ────────────────────────────────────────────────
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

if(!gl) {
    alert('WebGL no es soportado por este navegador.');
}

function resizeCanvas() {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if(canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── 2) Shaders ───────────────────────────────────────────────────────
//   • Vertex: lee a_color y lo reenvía como varying.
//   • Fragment: usa el varying (ya interpolado por el rasterizador).
const vsSource = `
    attribute vec2 a_position;
    attribute vec3 a_color;     // NUEVO: color por vértice
    uniform   mat3 u_transform;

    varying   vec3 v_color;     // sale del vertex, entra al fragment interpolado

    void main() {
        vec3 pos = u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(pos.xy, 0.0, 1.0);
        v_color = a_color;      // se pasa tal cual; GPU interpola entre los
                                // 3 vértices de cada triángulo automáticamente.
    }
`;

const fsSource = `
    precision mediump float;
    varying vec3 v_color;       // llega INTERPOLADO por el rasterizador

    void main() {
        gl_FragColor = vec4(v_color, 1.0);
    }
`;

// ── 3) Compilación / link ────────────────────────────────────────────
function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader   = compileShader(gl, vsSource,   gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fsSource,   gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

const program = initShaderProgram(gl, vsSource, fsSource);
gl.useProgram(program);

// ── 4) Localizaciones de atributos y uniformes ───────────────────────
const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
const colorAttributeLocation    = gl.getAttribLocation(program, 'a_color');
const transformLocation         = gl.getUniformLocation(program, 'u_transform');
// NOTA: ya NO existe u_color. El color vive en los vértices.

gl.enableVertexAttribArray(positionAttributeLocation);
gl.enableVertexAttribArray(colorAttributeLocation);

// ── 5) Vértices del cuadrado + COLORES por vértice ──────────────────
//    Mismo orden para posición y color:
//        v0: inf-izq → ROJO
//        v1: inf-der → VERDE
//        v2: sup-der → AZUL
//        v3: sup-izq → AMARILLO
const vertices = new Float32Array([
    -0.25, -0.25,  // 0
     0.25, -0.25,  // 1
     0.25,  0.25,  // 2
    -0.25,  0.25   // 3
]);

const colors = new Float32Array([
    1.0, 0.0, 0.0,   // v0 rojo
    0.0, 1.0, 0.0,   // v1 verde
    0.0, 0.0, 1.0,   // v2 azul
    1.0, 1.0, 0.0    // v3 amarillo
]);

const indices = new Uint16Array([
    0, 1, 2,
    2, 3, 0
]);

// ── 6) Buffers ───────────────────────────────────────────────────────
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// Antes de dibujar, hay que apuntar CADA atributo al buffer correcto.
// Como NO usamos VAOs (WebGL 1 sin extensión), lo hacemos manualmente
// en cada frame. Cada atributo guarda el buffer que esté bindeado al
// ARRAY_BUFFER en el momento del vertexAttribPointer.
function bindAttribute(buffer, attributeLocation, components) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(attributeLocation, components, gl.FLOAT, false, 0, 0);
}

// ── 7) Matrices 3x3 ──────────────────────────────────────────────────
function translationMatrix(tx, ty) {
    return new Float32Array([1,0,0, 0,1,0, tx,ty,1]);
}
function rotationMatrix(angleRad) {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    return new Float32Array([c,s,0, -s,c,0, 0,0,1]);
}
function scalingMatrix(sx, sy) {
    return new Float32Array([sx,0,0, 0,sy,0, 0,0,1]);
}
function multiplyMat3(A, B) {
    const a00=A[0],a01=A[1],a02=A[2],a10=A[3],a11=A[4],a12=A[5],a20=A[6],a21=A[7],a22=A[8];
    const b00=B[0],b01=B[1],b02=B[2],b10=B[3],b11=B[4],b12=B[5],b20=B[6],b21=B[7],b22=B[8];
    return new Float32Array([
        a00*b00+a01*b10+a02*b20, a00*b01+a01*b11+a02*b21, a00*b02+a01*b12+a02*b22,
        a10*b00+a11*b10+a12*b20, a10*b01+a11*b11+a12*b21, a10*b02+a11*b12+a12*b22,
        a20*b00+a21*b10+a22*b20, a20*b01+a21*b11+a22*b21, a20*b02+a21*b12+a22*b22
    ]);
}

// ── 8) Control de animación ──────────────────────────────────────────
let animationId = null;
let isAnimating = true;
let speed = 1.0;
let startTime = performance.now() / 1000;
let frozenT = 0;

// ── 9) Frame ─────────────────────────────────────────────────────────
function drawFrame(nowMs) {
    const t = isAnimating
        ? (performance.now() / 1000 - startTime) * speed
        : frozenT;

    // Traslación elíptica + rotación propia + escala
    const tx      = Math.cos(t) * 0.5;
    const ty      = Math.sin(t) * 0.4;
    const angle   = t * 2.0;
    const sFactor = 0.75 + 0.5 * Math.sin(t * 2.5);

    const T = translationMatrix(tx, ty);
    const R = rotationMatrix(angle);
    const S = scalingMatrix(sFactor, sFactor);
    let M = multiplyMat3(R, S);
    M     = multiplyMat3(T, M);

    gl.uniformMatrix3fv(transformLocation, false, M);

    // Apuntar cada atributo a su buffer correspondiente
    bindAttribute(positionBuffer, positionAttributeLocation, 2);
    bindAttribute(colorBuffer,    colorAttributeLocation,    3);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    gl.clearColor(0.12, 0.12, 0.18, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    animationId = requestAnimationFrame(drawFrame);
}

startTime = performance.now() / 1000;
animationId = requestAnimationFrame(drawFrame);

// ── 10) Interactividad ───────────────────────────────────────────────
window.addEventListener('keydown',(e) => {
    switch(e.key) {
        case ' ':
        case 'Space':
            e.preventDefault();
            isAnimating = !isAnimating;
            if (!isAnimating) {
                frozenT = (performance.now() / 1000 - startTime) * speed;
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            speed = Math.min(speed + 0.2, 3.0);
            break;
        case 'ArrowDown':
            e.preventDefault();
            speed = Math.max(speed - 0.2, 0.2);
            break;
    }
});
