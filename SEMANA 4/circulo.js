const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL no está disponible en este navegador");
}

// Shaders con nombres estandarizados y sin errores de tipografía
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    varying lowp vec4 vColor;
    void main(void) {
        gl_Position = aVertexPosition;
        gl_PointSize = 50.0;
        vColor = aVertexColor;
    }
`;

const fsSource = `
    varying lowp vec4 vColor;
    void main(void) {
        gl_FragColor = vColor;
    }
`;

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Error en Shaders: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
const shaderProgram = gl.createProgram();

gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);

if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error("Error al enlazar el programa: " + gl.getProgramInfoLog(shaderProgram));
}
gl.useProgram(shaderProgram);

const Cx = 0.8;
const Cy = 0.8;
const radio = 0.2;
const segmentos = 40;

const posicionesC = [];
const coloresC = [];

// guardar los posicion del circulo
posicionesC.push(Cx,Cy);
// gudardar los color
coloresC.push(1.0,0.5,0.0,1.0);
// realizamos la for
for (let i=0;i<=segmentos;i++){
    const angulo = (i*2*Math.PI)/segmentos;
    const x = Cx + radio * Math.cos(angulo);
    const y = Cy + radio * Math.sin(angulo);
    posicionesC.push(x,y);
    coloresC.push(1.0,1.0,0.0,1.0);
}   
// Buffers de datos unificados
const positions = new Float32Array([                                      // Punto (0)
    -1.0,  0.0,  1.0,  0.0,                       // Línea (1, 2)
    0.0, 0.5, 0.5, 0.0, -0.5, 0.0,                  // Triángulo (3, 4, 5)
    -0.4,0.0,-0.4,-0.6,0.4,-0.6,0.4,0.0,
    -0.2, -0.2,
    0.2, -0.2,
    -0.015,-0.6,0.015,-0.6,0.2,-0.5,-0.2,-0.5,
    ...posicionesC 
                                  // Círculo (Inicia en índice 10)
]);

const colors = new Float32Array([                                                             // Punto rojo
    0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0,                                         // Línea verde
    0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,                     // Triángulo azul
    1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, // Cuadrado amarillo
    ...coloresC                                                                    // Círculo rojo
]);

// 1. Crear y cargar Buffer de Posiciones
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

// 2. Crear y cargar Buffer de Colores
const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

// Obtener ubicaciones de los atributos de los shaders
const positionLocation = gl.getAttribLocation(shaderProgram, "aVertexPosition");
const colorLocation = gl.getAttribLocation(shaderProgram, "aVertexColor");

// Limpiar el lienzo (Fondo)
gl.clearColor(0.9, 0.9, 0.9, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// =========================================================================
// CORRECCIÓN: Enlazar DEFINITIVAMENTE los atributos antes de dibujar
// =========================================================================

// Configurar Atributo de Posición
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLocation);

// Configurar Atributo de Color
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(colorLocation);

// =========================================================================
// Renderizado/Dibujo Secuencial
// =========================================================================        // 1. Punto
gl.drawArrays(gl.LINES, 0, 2);         // 2. Línea
gl.drawArrays(gl.TRIANGLES, 2, 3);     // 3. Triángulo
gl.drawArrays(gl.TRIANGLE_FAN, 5, 4);
gl.drawArrays(gl.POINTS,9,1); 
gl.drawArrays(gl.POINTS,10,1);
gl.drawArrays(gl.TRIANGLE_FAN,11,4);
// 5. Círculo: inicia en el índice 10 y toma (segmentos + 2) vértices.
gl.drawArrays(gl.TRIANGLE_FAN, 15, segmentos + 2); 