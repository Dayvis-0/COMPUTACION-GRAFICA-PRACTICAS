// =====================================================================
// Múltiples objetos animados con buffers y matrices independientes.
// Mismo programa de shader, pero dos pares de buffers (uno por figura).
// =====================================================================

// ── 1) Configuración inicial del contexto WebGL ───────────────────────
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

if(!gl) {
    alert('WebGL no es soportado por este navegador.');
}

// Ajustar tamaño de canvas al tamaño de visualización(evita distorsiones)
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

// ── 2) Shaders (UN SOLO programa compartido por ambos objetos) ────────
const vsSource = `
    attribute vec2 a_position;
    uniform mat3 u_transform;

    void main() {
        vec3 pos = u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(pos.xy, 0.0, 1.0);
    }
`;

const fsSource = `
    precision mediump float;
    uniform vec4 u_color;

    void main() {
        gl_FragColor = u_color;
    }
`;

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
    const vertexShader = compileShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
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

const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
const transformLocation = gl.getUniformLocation(program, 'u_transform');
const colorLocation     = gl.getUniformLocation(program, 'u_color');

// Habilitamos el atributo UNA sola vez; luego solo cambiaremos a qué
// buffer apunta con vertexAttribPointer antes de cada drawElements.
gl.enableVertexAttribArray(positionAttributeLocation);

// =====================================================================
// 3) Objeto A: CUADRADO  (centrado en el origen, lado 0.5)
// =====================================================================
const squareVertices = new Float32Array([
    -0.25, -0.25, // 0
     0.25, -0.25, // 1
     0.25,  0.25, // 2
    -0.25,  0.25  // 3
]);
const squareIndices = new Uint16Array([
    0, 1, 2,
    2, 3, 0
]);

const squarePositionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, squarePositionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, squareVertices, gl.STATIC_DRAW);

const squareIndexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareIndexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, squareIndices, gl.STATIC_DRAW);

// =====================================================================
// 4) Objeto B: TRIÁNGULO  (centrado en el origen, base 0.6, alto 0.5)
// =====================================================================
const triangleVertices = new Float32Array([
     0.0,   0.3,  // 0: vértice superior
     0.3,  -0.2,  // 1: esquina inferior derecha
    -0.3,  -0.2   // 2: esquina inferior izquierda
]);
const triangleIndices = new Uint16Array([
    0, 1, 2
]);

const trianglePositionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, trianglePositionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);

const triangleIndexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);

// =====================================================================
// 5) Funciones de matrices 3x3 (idénticas al original)
// =====================================================================
function identity3() {
    return new Float32Array([1,0,0, 0,1,0, 0,0,1]);
}

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

// =====================================================================
// 6) Variables de control de animación
// =====================================================================
let animationId = null;
let isAnimating = true;
let speed = 1.0;
let startTime = performance.now() / 1000;
let frozenT = 0;

// =====================================================================
// 7) drawObject: helper que bindea buffers + actualiza uniformes
//    y dibuja UN objeto. Se llama una vez por objeto dentro del frame.
// =====================================================================
function drawObject(positionBuffer, indexBuffer, indexCount, M, r, g, b) {
    // 1) Atributo: re-apuntar al buffer de posición de ESTE objeto.
    //    (vertexAttribPointer recuerda el buffer bindeado en el momento
    //    de la llamada; por eso hay que repetirla antes de cada draw.)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // 2) Índices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // 3) Uniformes propios de este objeto
    gl.uniformMatrix3fv(transformLocation, false, M);
    gl.uniform4f(colorLocation, r, g, b, 1.0);

    // 4) Dibujar
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
}

// =====================================================================
// 8) Frame de animación: limpia, luego dibuja cuadrado, luego triángulo
// =====================================================================
function drawFrame(nowMs) {
    const t = isAnimating
        ? (performance.now() / 1000 - startTime) * speed
        : frozenT;

    // ── Traslación y rotación del CUADRADO ────────────────────────────
    const sqTx = Math.cos(t)         * 0.5;   // elíptica
    const sqTy = Math.sin(t)         * 0.4;
    const sqSpin = t * 2.0;
    const sqScale = 0.75 + 0.5 * Math.sin(t * 2.5);

    const sqT = translationMatrix(sqTx, sqTy);
    const sqR = rotationMatrix(sqSpin);
    const sqS = scalingMatrix(sqScale, sqScale);
    let sqM = multiplyMat3(sqR, sqS);
    sqM     = multiplyMat3(sqT, sqM);

    // color dinámico del cuadrado
    const sqR_col = 0.6 + 0.4 * Math.sin(t * 1.8);
    const sqG_col = 0.2 + 0.6 * Math.sin(t * 2.3);
    const sqB_col = 0.8 + 0.2 * Math.sin(t * 1.2);

    // ── Traslación y rotación del TRIÁNGULO ───────────────────────────
    // Movimiento independiente: lissajous (senoidal cruzada), distinto
    // del cuadrado. Rotación en sentido contrario y con otra velocidad.
    const trTx = Math.sin(t * 0.6) * 0.6;
    const trTy = Math.cos(t * 0.4) * 0.3;
    const trSpin = -t * 2.5;                  // sentido contrario
    const trScale = 0.9 + 0.2 * Math.sin(t * 1.3);

    const trT = translationMatrix(trTx, trTy);
    const trR = rotationMatrix(trSpin);
    const trS = scalingMatrix(trScale, trScale);
    let trM = multiplyMat3(trR, trS);
    trM     = multiplyMat3(trT, trM);

    // color del triángulo: gradiente verde-amarillo
    const trR_col = 0.4 + 0.4 * Math.sin(t * 1.5);
    const trG_col = 0.8 + 0.2 * Math.cos(t * 1.7);
    const trB_col = 0.3;

    // ── Dibujar ambos ─────────────────────────────────────────────────
    gl.clearColor(0.12, 0.12, 0.18, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    drawObject(squarePositionBuffer,   squareIndexBuffer,
               squareIndices.length,   sqM, sqR_col, sqG_col, sqB_col);

    drawObject(trianglePositionBuffer, triangleIndexBuffer,
               triangleIndices.length, trM, trR_col, trG_col, trB_col);

    animationId = requestAnimationFrame(drawFrame);
}

// Iniciar la animación
startTime = performance.now() / 1000;
animationId = requestAnimationFrame(drawFrame);

// =====================================================================
// 9) Interactividad (idéntica al original)
// =====================================================================
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
