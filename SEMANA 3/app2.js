// Obtener el canvas
var canvas = document.getElementById("webgl-canvas");

// Obtener el contexto WebGL
var gl = canvas.getContext("webgl");

// Verificar si WebGL está disponible 
if (!gl) {
    console.log("WebGL no esta soportado, intenta en otro navegador");
} else {
    console.log("Este navegador soporta WebGL");
}

// Shader de vértices 
var vertexShaderSource = `
    attribute vec4 a_Position;
    void main() {
        gl_Position = a_Position;
    }
`;

// Shader de fragmentos
var fragmentsShaderSource = `
    precision mediump float;
    void main() {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
`;

// Funcion para crear un shader
function createShader(gl, source, type){
    var shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Error compilando el shader ", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Crear los shaders
var vertexShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
var fragmentShader = createShader(gl, fragmentsShaderSource, gl.FRAGMENT_SHADER);

// Crear el programa
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Error vinculando el programa ", gl.getProgramInfoLog(program));
} else {
    console.log("Vinculado el programa");
}

gl.useProgram(program);

// Vertices de los ejes X e Y
// Eje X: de izquierda a derecha (rojo visual en la mentalidad, pero blanco aquí)
// Eje Y: de abajo hacia arriba
var axisVertices = new Float32Array([
    -1.0, 0.0,  // Extremo izquierdo del eje X
     1.0, 0.0,  // Extremo derecho del eje X
     0.0, -1.0, // Extremo inferior del eje Y
     0.0,  1.0  // Extremo superior del eje Y
]);

// Generar dientes/guiones cada 0.1 en ambos ejes
var tickLength = 0.03;  // Longitud de cada diente
var tickVertices = [];
var tickStep = 0.1;

// Dientes del eje X (líneas verticales)
for (var x = -1.0; x <= 1.0; x += tickStep) {
    tickVertices.push(x, -tickLength);  // inicio del tick
    tickVertices.push(x, tickLength);    // fin del tick
}

// Dientes del eje Y (líneas horizontales)
for (var y = -1.0; y <= 1.0; y += tickStep) {
    tickVertices.push(-tickLength, y);  // inicio del tick
    tickVertices.push(tickLength, y);   // fin del tick
}

// Combinar todos los vértices
var vertices = new Float32Array(axisVertices.length + tickVertices.length);
vertices.set(axisVertices, 0);
vertices.set(tickVertices, axisVertices.length);

// Crear buffer
var vertexBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// Enlazar el atributo 'a_Position' con los datos del buffer
var a_Position = gl.getAttribLocation(program, "a_Position");

gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(a_Position);

// Limpiar el canvas con color de fondo
gl.clearColor(0.0, 0.0, 0.0, 1.0);

// Dibujar los ejes principales (4 vértices = 2 líneas)
gl.drawArrays(gl.LINES, 0, 4);

// Dibujar los dientes (ticks) a partir del vértice 4
gl.drawArrays(gl.LINES, 4, vertices.length / 2 - 4);
