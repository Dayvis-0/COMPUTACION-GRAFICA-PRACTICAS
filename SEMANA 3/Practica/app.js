// Obtener el canvas
var canvas = document.getElementById("webgl-canvas");

// Obtener el contexto WebGL
var gl = canvas.getContext("webgl");

// Verificar si WebGl oestá disponible 
if (!gl) {
    console.log("WebGL no esta soportado, intenta en otro navegador")
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
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
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
    console.error("Error vinculando el programa ", gl.getProgramInfolog(program));
} else {
    console.error("Vinculado el programa");
}

gl.useProgram(program);

// Vertices del triangulo 
var vertices = new Float32Array([
    0.0, 0.5, 
    -0.5, -0.5,
    0.5, -0.5
]);

// Crear buffer
var vertexBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// Enlazar el atributo 'a_Position' con los datos del buffer
var a_Position = gl.getAttribLocation(program, "a_Position");

gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(a_Position);

// Limpiar el canvas con un color de fondo
gl.clearColor(0.0, 0.0, 0.0, 1.0);

// Dibujar el triangulo
gl.drawArrays(gl.TRIANGLES, 0, 3);
