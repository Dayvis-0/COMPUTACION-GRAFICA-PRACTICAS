// Ejercicio 6: Movimiento con Teleport Aleatorio
// Al llegar al borde, la figura se teletransporta a una posición aleatoria dentro del canvas

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL no esta disponible en este navegador");
}

let shaderProgram;
let positionAttributeLocation;
let transformLocation;
let colorLocation;
let currentBuffers = null;
let currentShape = 'circulo';
let collisionRadius = 0.3;

// Estado de movimiento
let posX = 0, posY = 0;
let velX = 0.001, velY = 0.001;
let angle = 0;
const LIMITE = 1.0;

// Vertex shader: transforma cada vértice con la matriz 3x3
const vsSource = `
    attribute vec2 a_position;
    uniform mat3 u_transform;
    
    void main(void) {
        vec3 pos = u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);
    }
`;

// Fragment shader: color sólido uniforme
const fsSource = `
    precision mediump float;
    uniform vec3 u_color;
    
    void main() {
        gl_FragColor = vec4(u_color, 1.0);
    }
`;

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

// Círculo como triángulo-fan (centro + 32 vértices en el borde)
function createCircleBuffers(segments = 32) {
    const vertices = [0, 0];           // centro
    const indices = [];

    for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        vertices.push(Math.cos(a) * 0.3, Math.sin(a) * 0.3);
    }

    for (let i = 1; i <= segments; i++) {
        indices.push(0, i, i + 1);     // triángulos: centro → borde i → borde i+1
    }

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return { vertexBuffer, indexBuffer, vertexCount: indices.length };
}

// Crear buffers para un cuadrado
function createSquareBuffers() {
    const vertices = new Float32Array([-0.3, -0.3, 0.3, -0.3, 0.3, 0.3, -0.3, 0.3]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return { vertexBuffer, indexBuffer, vertexCount: 6 };
}

// Crear buffers para un triángulo
function createTriangleBuffers() {
    const vertices = new Float32Array([
        0, 0.3,
        -0.26, -0.15,
        0.26, -0.15
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

// Cambiar forma
function setShape(shape) {
    currentShape = shape;
    
    document.querySelectorAll('.menu button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('btn-' + shape).classList.add('active');
    
    switch (shape) {
        case 'circulo':
            currentBuffers = createCircleBuffers();
            collisionRadius = 0.3;
            break;
        case 'cuadrado':
            currentBuffers = createSquareBuffers();
            collisionRadius = Math.sqrt(0.3 * 0.3 + 0.3 * 0.3);  // ≈ 0.424
            break;
        case 'triangulo':
            currentBuffers = createTriangleBuffers();
            collisionRadius = 0.3;
            break;
    }
}

// Matriz de traslación 3x3 (column-major)
function createTranslationMatrix(tx, ty) {
    return new Float32Array([1, 0, 0, 0, 1, 0, tx, ty, 1]);
}

// Matriz de rotación 3x3 (column-major)
function createRotationMatrix(angleRad) {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    return new Float32Array([c, s, 0, -s, c, 0, 0, 0, 1]);
}

// Matriz de escala 3x3 (column-major)
function createScaleMatrix(sx, sy) {
    return new Float32Array([sx, 0, 0, 0, sy, 0, 0, 0, 1]);
}

// Multiplicación de matrices 3x3 (column-major, como espera WebGL)
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

// Loop principal: update → teleport → transform → render
function draw() {
    // Avanzar posición y rotación
    posX += velX;
    posY += velY;
    angle += 0.02;

    // Teleport: al tocar un borde, salta a una posición aleatoria dentro del canvas
    if (posX + collisionRadius >= LIMITE || posX - collisionRadius <= -LIMITE ||
        posY + collisionRadius >= LIMITE || posY - collisionRadius <= -LIMITE) {
        const margen = LIMITE - collisionRadius;
        posX = (Math.random() * 2 - 1) * margen;
        posY = (Math.random() * 2 - 1) * margen;
    }

    // Componer transformación: M = T × R × S  (se aplica S → R → T)
    const T = createTranslationMatrix(posX, posY);
    const R = createRotationMatrix(angle);
    const S = createScaleMatrix(1, 1);

    let M = multiplyMat3(T, R);
    M = multiplyMat3(M, S);

    gl.uniformMatrix3fv(transformLocation, false, M);
    gl.uniform3fv(colorLocation, [0.2, 0.6, 0.9]);

    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Dibujar la forma actual con los buffers activos
    gl.bindBuffer(gl.ARRAY_BUFFER, currentBuffers.vertexBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, currentBuffers.indexBuffer);
    gl.drawElements(gl.TRIANGLES, currentBuffers.vertexCount, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(draw);     // Siguiente frame
}

// Inicialización
shaderProgram = initShaderProgram();
gl.useProgram(shaderProgram);

positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');
gl.enableVertexAttribArray(positionAttributeLocation);

transformLocation = gl.getUniformLocation(shaderProgram, 'u_transform');
colorLocation = gl.getUniformLocation(shaderProgram, 'u_color');

setShape('circulo');
draw();
