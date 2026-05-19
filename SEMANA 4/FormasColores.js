// Obtener el canvas y el contexto WebGL
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

// Verificar que WebGL esté disponible
if (!gl) {
    alert("WebGL no esta disponible en este navegador");
}

// Variables globales para manejar el estado
let shaderProgram;
let positionAttributeLocation;
let transformLocation;
let colorLocation;
let currentShape = 'cuadrado';
let currentBuffers = null;
let currentColor = [0.8, 0.2, 0.2];

// Vertex Shader: Transforma las posiciones de los vértices
// - a_position: posición del vértice (entrada)
// - u_transform: matriz de transformación 3x3 (entrada)
const vsSource = `
    attribute vec2 a_position;
    uniform mat3 u_transform;
    
    void main(void) {
        vec3 pos = u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);
    }
`;

// Fragment Shader: Define el color de cada pixel
// - u_color: color RGB que viene de JavaScript (entrada)
const fsSource = `
    precision mediump float;
    uniform vec3 u_color;
    
    void main() {
        gl_FragColor = vec4(u_color, 1.0);
    }
`;

// Función que compila un shader (vertex o fragment)
function createShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Función que crea el programa de shaders (compila y linking)
function initShaderProgram() {
    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

// Crear buffers para un CUADRADO
function createSquareBuffers() {
    const vertices = new Float32Array([
        -0.5, -0.5,
        0.5, -0.5,
        0.5, 0.5,
        -0.5, 0.5
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return { vertexBuffer, indexBuffer, vertexCount: 6 };
}

// Crear buffers para un TRIÁNGULO EQUILÁTERO
// height = sqrt(3)/2 ≈ 0.866
function createTriangleBuffers() {
    const vertices = new Float32Array([
        0, 0.577,       // Vértice superior (2/3 de 0.866)
        -0.5, -0.289,   // Vértice inferior izquierdo (-1/3 de 0.866)
        0.5, -0.289     // Vértice inferior derecho
    ]);

    const indices = new Uint16Array([0, 1, 2]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return { vertexBuffer, indexBuffer, vertexCount: 3 };
}

// Crear buffers para un CÍRCULO (usa TRIANGLE_FAN)
function createCircleBuffers(segments = 32) {
    const vertices = [];
    const indices = [];

    vertices.push(0, 0); // Centro del círculo

    // Vértices alrededor del círculo
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        vertices.push(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5);
    }

    // Índices para TRIANGLE_FAN
    for (let i = 1; i <= segments; i++) {
        indices.push(0, i, i + 1);
    }

    const verticesArray = new Float32Array(vertices);
    const indicesArray = new Uint16Array(indices);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesArray, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesArray, gl.STATIC_DRAW);

    return { vertexBuffer, indexBuffer, vertexCount: indices.length };
}

// Cambiar forma geometrica
function setShape(shape) {
    currentShape = shape;
    
    document.querySelectorAll('.shape-buttons button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('btn-' + shape).classList.add('active');
    
    switch (shape) {
        case 'cuadrado':
            currentBuffers = createSquareBuffers();
            break;
        case 'triangulo':
            currentBuffers = createTriangleBuffers();
            break;
        case 'circulo':
            currentBuffers = createCircleBuffers();
            break;
    }
}

// Cambiar color de la figura
function setColor(r, g, b, btn) {
    currentColor = [r, g, b];
    
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    btn.classList.add('active');
}

// Crear matriz de traslación 3x3
function createTranslationMatrix(tx, ty) {
    return new Float32Array([1, 0, 0, 0, 1, 0, tx, ty, 1]);
}

// Crear matriz de rotación 3x3
function createRotationMatrix(angleRad) {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    return new Float32Array([c, s, 0, -s, c, 0, 0, 0, 1]);
}

// Crear matriz de escala 3x3
function createScaleMatrix(sx, sy) {
    return new Float32Array([sx, 0, 0, 0, sy, 0, 0, 0, 1]);
}

// Multiplicar dos matrices 3x3
function multiplyMat3(a, b) {
    const a00 = a[0], a01 = a[3], a02 = a[6];
    const a10 = a[1], a11 = a[4], a12 = a[7];
    const a20 = a[2], a21 = a[5], a22 = a[8];
    const b00 = b[0], b01 = b[3], b02 = b[6];
    const b10 = b[1], b11 = b[4], b12 = b[7];
    const b20 = b[2], b21 = b[5], b22 = b[8];

    return new Float32Array([
        a00*b00 + a01*b10 + a02*b20,
        a10*b00 + a11*b10 + a12*b20,
        a20*b00 + a21*b10 + a22*b20,
        a00*b01 + a01*b11 + a02*b21,
        a10*b01 + a11*b11 + a12*b21,
        a20*b01 + a21*b11 + a22*b21,
        a00*b02 + a01*b12 + a02*b22,
        a10*b02 + a11*b12 + a12*b22,
        a20*b02 + a21*b12 + a22*b22
    ]);
}

// Función principal de dibujo
function draw() {
    const r = currentColor[0];
    const g = currentColor[1];
    const b = currentColor[2];

    const tx = parseFloat(document.getElementById('tx').value);
    const ty = parseFloat(document.getElementById('ty').value);
    const angle = parseFloat(document.getElementById('angle').value);
    const sx = parseFloat(document.getElementById('sx').value);
    const sy = parseFloat(document.getElementById('sy').value);

    document.getElementById('txValue').innerText = tx.toFixed(2);
    document.getElementById('tyValue').innerText = ty.toFixed(2);
    document.getElementById('angleValue').innerText = angle.toFixed(2);
    document.getElementById('sxValue').innerText = sx.toFixed(2);
    document.getElementById('syValue').innerText = sy.toFixed(2);

    const T = createTranslationMatrix(tx, ty);
    const R = createRotationMatrix(angle);
    const S = createScaleMatrix(sx, sy);

    let M = multiplyMat3(T, R);
    M = multiplyMat3(M, S);

    gl.uniformMatrix3fv(transformLocation, false, M);
    gl.uniform3fv(colorLocation, [r, g, b]);

    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, currentBuffers.vertexBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, currentBuffers.indexBuffer);
    gl.drawElements(gl.TRIANGLES, currentBuffers.vertexCount, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(draw);
}

['tx', 'ty', 'angle', 'sx', 'sy'].forEach(id => {
    document.getElementById(id).addEventListener('input', draw);
});

shaderProgram = initShaderProgram();
gl.useProgram(shaderProgram);

positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');
gl.enableVertexAttribArray(positionAttributeLocation);

transformLocation = gl.getUniformLocation(shaderProgram, 'u_transform');
colorLocation = gl.getUniformLocation(shaderProgram, 'u_color');

setShape('cuadrado');
draw();