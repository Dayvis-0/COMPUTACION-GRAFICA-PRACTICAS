// app_modos.js — Todos los modos de dibujo WebGL en un solo canvas

// --- SETUP DEL CANVAS Y CONTEXTO ---
var canvas = document.getElementById("webgl-canvas");
var gl = canvas.getContext("webgl");

if (!gl) {
    console.log("WebGL no esta soportado");
} else {
    console.log("WebGL soportado");
}

// --- SHADERS ---
// Vertex shader: define posición Y tamaño del punto
var vertexShaderSource = `
    attribute vec4 a_Position;
    void main() {
        gl_Position = a_Position;
        gl_PointSize = 8.0;
    }
`;

// Fragment shader: recibe el color desde JavaScript via uniform
var fragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_Color;
    void main() {
        gl_FragColor = u_Color;
    }
`;

// --- FUNCIÓN PARA CREAR SHADER ---
function createShader(gl, source, type) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Error compilando shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// --- COMPILAR SHADERS ---
var vertexShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
var fragmentShader = createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

// --- CREAR Y LINKEAR PROGRAMA ---
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Error linkeando programa:", gl.getProgramInfoLog(program));
}

gl.useProgram(program);

// --- VÉRTICES DE TODOS LOS MODOS ---
// Cada modo tiene sus propios vértices. Los concatenamos todos en un solo buffer
// y dibujamos usando distintos modos y rangos.

var allVertices = new Float32Array([
    // ========== gl.POINTS (6 vértices) ==========
    -0.75,  0.65,   // punto 0
    -0.55,  0.65,   // punto 1
    -0.65,  0.55,   // punto 2
    -0.75,  0.35,   // punto 3
    -0.55,  0.35,   // punto 4
    -0.65,  0.45,   // punto 5

    // ========== gl.LINES (4 vértices = 2 segmentos) ==========
    -0.15,  0.65,   // segmento 0 — vértice A (diagonal \)
     0.15,  0.35,   // segmento 0 — vértice B
    -0.15,  0.35,   // segmento 1 — vértice A (diagonal /)
     0.15,  0.65,   // segmento 1 — vértice B

    // ========== gl.LINE_STRIP (4 vértices = línea continua) ==========
     0.45,  0.65,   // vértice 0
     0.55,  0.50,   // vértice 1
     0.65,  0.55,   // vértice 2
     0.75,  0.35,   // vértice 3

    // ========== gl.TRIANGLES (6 vértices = 2 triángulos) ==========
    -0.75, -0.30,   // triángulo 0 — vértice A
    -0.55, -0.30,   // triángulo 0 — vértice B
    -0.65, -0.55,   // triángulo 0 — vértice C

    -0.75, -0.70,   // triángulo 1 — vértice A
    -0.55, -0.70,   // triángulo 1 — vértice B
    -0.65, -0.50,   // triángulo 1 — vértice C

    // ========== gl.TRIANGLE_FAN (5 vértices = 3 triángulos) ==========
     0.00, -0.45,   // centro del abanico
    -0.25, -0.65,   // vértice 1
     0.00, -0.75,   // vértice 2
     0.25, -0.65,   // vértice 3
     0.15, -0.45,   // vértice 4

    // ========== gl.TRIANGLE_STRIP (4 vértices = 2 triángulos = cuadrilátero) ==========
     0.50, -0.35,   // vértice 0 (esquina superior izquierda)
     0.70, -0.35,   // vértice 1 (esquina superior derecha)
     0.50, -0.65,   // vértice 2 (esquina inferior izquierda)
     0.70, -0.65    // vértice 3 (esquina inferior derecha)
]);

// --- OFFSETS EN VÉRTICES PARA CADA MODO ---
// (índice del primer vértice, cantidad de vértices)
var modes = {
    points:        { start:  0, count:  6 },
    lines:         { start:  6, count:  4 },
    lineStrip:     { start: 10, count:  4 },
    triangles:     { start: 14, count:  6 },
    triangleFan:   { start: 20, count:  5 },
    triangleStrip: { start: 25, count:  4 }
};

// --- CREAR BUFFER Y SUBIR DATOS ---
var vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, allVertices, gl.STATIC_DRAW);

// --- CONECTAR ATRIBUTO a_Position ---
var a_Position = gl.getAttribLocation(program, "a_Position");
gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(a_Position);

// --- OBTENER UBICACIÓN DEL UNIFORM u_Color ---
var u_Color = gl.getUniformLocation(program, "u_Color");

// --- LIMPIAR FONDO (negro) ---
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// DIBUJAR CADA MODO CON SU PROPIO COLOR

// 1. gl.POINTS — Cada vértice es un punto individual
gl.uniform4f(u_Color, 0.0, 1.0, 1.0, 1.0); // cyan
gl.drawArrays(gl.POINTS, modes.points.start, modes.points.count);

// 2. gl.LINES — Cada par de vértices forma un segmento
gl.uniform4f(u_Color, 1.0, 1.0, 0.0, 1.0); // amarillo
gl.drawArrays(gl.LINES, modes.lines.start, modes.lines.count);

// 3. gl.LINE_STRIP — Todos los vértices conectados en línea continua
gl.uniform4f(u_Color, 0.0, 1.0, 0.0, 1.0); // verde
gl.drawArrays(gl.LINE_STRIP, modes.lineStrip.start, modes.lineStrip.count);

// 4. gl.TRIANGLES — Cada tripleta de vértices forma un triángulo independiente
gl.uniform4f(u_Color, 1.0, 0.0, 0.0, 1.0); // rojo
gl.drawArrays(gl.TRIANGLES, modes.triangles.start, modes.triangles.count);

// 5. gl.TRIANGLE_FAN — Abanico: centro + vértices alrededor
gl.uniform4f(u_Color, 0.0, 0.0, 1.0, 1.0); // azul
gl.drawArrays(gl.TRIANGLE_FAN, modes.triangleFan.start, modes.triangleFan.count);

// 6. gl.TRIANGLE_STRIP — Tira: cada nuevo vértice forma triángulo con los 2 anteriores
gl.uniform4f(u_Color, 1.0, 0.0, 1.0, 1.0); // magenta
gl.drawArrays(gl.TRIANGLE_STRIP, modes.triangleStrip.start, modes.triangleStrip.count);

console.log("Modos de dibujo renderizados exitosamente");
