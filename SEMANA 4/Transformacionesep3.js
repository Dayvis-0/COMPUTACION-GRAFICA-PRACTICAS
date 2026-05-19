const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL no esta disponible en este navegador");
} else {
    console.log("WebGL esta disponible en este navegador");
}

// Vertex shader
const vsSource = `
    attribute vec2 a_position;
    uniform mat3 u_transform;
    
    void main(void) {
        vec3 pos = u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);
    }
`

// Fragment shader
const fsSource = `
    precision mediump float;

    void main() {
        gl_FragColor = vec4(0.8, 0.2, 0.2, 1.0);
    }
`

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

function initShaderProgram(gl, vsSource, fsSource) {
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

const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
gl.useProgram(shaderProgram);

// Cuadrado original
function initBuffer(gl) {
    const vertices = new Float32Array([
        -0.5, -0.5,
        0.5, -0.5,
        0.5, 0.5,
        -0.5, 0.5
    ]);

    const indices = new Uint16Array([
        0, 1, 2,
        0, 2, 3
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return { vertexBuffer, indexBuffer, vertexCount: indices.length };
}

const buffers = initBuffer(gl);

const positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');
gl.enableVertexAttribArray(positionAttributeLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexBuffer);
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

const transformLocation = gl.getUniformLocation(shaderProgram, 'u_transform');

function createTranslationMatrix(tx, ty) {
    return new Float32Array([
        1, 0, 0,
        0, 1, 0,
        tx, ty, 1
    ]);
}

function createRotationMatrix(angleRad) {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);

    return new Float32Array([
        c, s, 0,
        -s, c, 0,
        0, 0, 1
    ]);
}

function createScaleMatrix(sx, sy) {
    return new Float32Array([
        sx, 0, 0,
        0, sy, 0,
        0, 0, 1
    ]);
}

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

// Animation loop con requestAnimationFrame
function draw(time) {
    // Convertir tiempo a segundos
    const t = time * 0.001;
    
    // Rotación continua
    const angle = t * 1.5;
    
    // Traslación sinusoidal
    const tx = Math.sin(t * 2) * 0.5;
    const ty = Math.cos(t * 1.5) * 0.3;
    
    // Escala fija
    const sx = 0.5;
    const sy = 0.5;
    
    // Matrices de transformación
    const T = createTranslationMatrix(tx, ty);
    const R = createRotationMatrix(angle);
    const S = createScaleMatrix(sx, sy);
    
    // Composición: M = T * R * S
    let M = multiplyMat3(T, R);
    M = multiplyMat3(M, S);
    
    gl.uniformMatrix3fv(transformLocation, false, M);
    
    // Limpiar canvas
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
    gl.drawElements(gl.TRIANGLES, buffers.vertexCount, gl.UNSIGNED_SHORT, 0);
    
    // Continuar animación
    requestAnimationFrame(draw);
}

// Iniciar animación
requestAnimationFrame(draw);