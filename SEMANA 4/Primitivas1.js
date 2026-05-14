const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL no esta disponible en este navegador");
} else {
    console.log("WebGL esta disponible en este navegador");
}

// Vertex shader
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    varying lowp vec4 vColor;
    
    void main(void) {
        gl_Position = aVertexPosition;

        vColor = aVertexColor;
    }
`

// Fragmet shader
const fsSource = `
    varying lowp vec4 vColor;

    void main() {
        gl_FragColor = vColor;
    }
`

// Compilar shader 
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    return shader;
}

const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmetShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

const shaderProgram = gl.createProgram();

gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmetShader);
gl.linkProgram(shaderProgram);
gl.useProgram(shaderProgram);

// Buffers
const positions = new Float32Array([
    // LINE_STRIP - Zigzag verde
    -0.9, 0.8,
    -0.7, 0.5,
    -0.9, 0.2,
    -0.7, -0.1,
    -0.9, -0.4,

    // LINE_LOOP - Pentagono rojo
    0.0, 0.7,
    0.5, 0.4,
    0.4, -0.1,
    -0.4, -0.1,
    -0.5, 0.4,

    // TRIANGLE_STRIP - Escalera azul
    -0.9, -0.6,
    -0.7, -0.6,
    -0.9, -0.8,
    -0.7, -0.8,
    -0.9, -1.0,
    -0.7, -1.0,

    // TRIANGLE_FAN - Cuadrado amarillo
    0.6, -0.6,
    0.9, -0.6,
    0.9, -0.9,
    0.6, -0.9
])

// Colores para cada vertice
const colors = new Float32Array([
    // LINE_STRIP - Verde
    0.0, 1.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,

    // LINE_LOOP - Rojo
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,

    // TRIANGLE_STRIP - Azul
    0.0, 0.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0,

    // TRIANGLE_FAN - Amarillo
    1.0, 1.0, 0.0, 1.0,
    1.0, 1.0, 0.0, 1.0,
    1.0, 1.0, 0.0, 1.0,
    1.0, 1.0, 0.0, 1.0,
])

// Buffer de vertices
// Crear buffer de posiciones
const positionBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

// Crear buffer de colores
const colorBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

// Enlazar los vertices y sus colores con el shader
// Localizar atributos

const positionLocation = gl.getAttribLocation(shaderProgram, "aVertexPosition");
const colorLocation = gl.getAttribLocation(shaderProgram, "aVertexColor");

// Dibujar las primitivas 2D
gl.clearColor(0.9, 0.9, 0.9, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// Configurar posiciones
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLocation);

// Configurar colores
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(colorLocation);

// Dibujar primitivas
// LINE_STRIP: vertices 0-5 (5 vertices)
gl.drawArrays(gl.LINE_STRIP, 0, 5);

// LINE_LOOP: vertices 5-10 (5 vertices)
gl.drawArrays(gl.LINE_LOOP, 5, 5);

// TRIANGLE_STRIP: vertices 10-16 (6 vertices)
gl.drawArrays(gl.TRIANGLE_STRIP, 10, 6);

// TRIANGLE_FAN: vertices 16-20 (4 vertices)
gl.drawArrays(gl.TRIANGLE_FAN, 16, 4);