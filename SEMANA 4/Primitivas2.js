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
        gl_PointSize = 10.0;
        vColor = aVertexColor;
    }
`

// Fragment shader
const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
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
const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

const shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);
gl.useProgram(shaderProgram);

// Buffers
const positionBuffer = gl.createBuffer();
const colorBuffer = gl.createBuffer();

// Localizar atributos
const positionLocation = gl.getAttribLocation(shaderProgram, "aVertexPosition");
const colorLocation = gl.getAttribLocation(shaderProgram, "aVertexColor");

// Generar puntos aleatorios
function generarPuntosAleatorios(cantidad) {
    const puntos = [];
    for (let i = 0; i < cantidad; i++) {
        const x = (Math.random() * 2 - 1) * 0.8;
        const y = (Math.random() * 2 - 1) * 0.8;
        puntos.push(x, y);
    }
    
    return puntos;
}

// Colores para cada primitiva
const coloresPrimitivas = {
    POINTS: [1.0, 0.0, 0.0, 1.0],         // Rojo
    LINES: [0.0, 1.0, 0.0, 1.0],          // Verde
    LINE_STRIP: [0.0, 1.0, 1.0, 1.0],     // Cian
    LINE_LOOP: [1.0, 0.5, 0.0, 1.0],      // Naranja
    TRIANGLES: [0.0, 0.0, 1.0, 1.0],       // Azul
    TRIANGLE_STRIP: [0.5, 0.0, 0.5, 1.0], // Morado
    TRIANGLE_FAN: [1.0, 1.0, 0.0, 1.0]   // Amarillo
};

// Función para dibujar la primitiva seleccionada
function dibujarPrimitiva(modo) {
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const color = coloresPrimitivas[modo];
    let positions, count;

    // Configurar posiciones según el modo
    switch (modo) {
        case 'POINTS':
            positions = generarPuntosAleatorios(4);
            count = 4;
            break;

        case 'LINES':
            positions = generarPuntosAleatorios(4); // 3 líneas (4 puntos)
            count = 4;
            break;

        case 'LINE_STRIP':
            positions = generarPuntosAleatorios(4);
            count = 4;
            break;

        case 'LINE_LOOP':
            positions = generarPuntosAleatorios(5); // Pentágono
            count = 5;
            break;

        case 'TRIANGLES':
            positions = generarPuntosAleatorios(6); // 2 triángulos
            count = 6;
            break;

        case 'TRIANGLE_STRIP':
            positions = generarPuntosAleatorios(6);
            count = 6;
            break;

        case 'TRIANGLE_FAN':
            positions = generarPuntosAleatorios(6); // Hexágono
            count = 6;
            break;
    }

    // Crear array de colores para todos los vértices
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(...color);
    }

    // Configurar posiciones
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);

    // Configurar colores
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLocation);

    // Dibujar
    gl.drawArrays(gl[modo], 0, count);
}

// Evento del botón
document.getElementById('btnDibujar').addEventListener('click', () => {
    const modo = document.getElementById('primitiva').value;
    dibujarPrimitiva(modo);
});

// Dibujar por defecto al cargar
dibujarPrimitiva('POINTS');