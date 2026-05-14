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

// Generar puntos aleatorios en el rango [-1, 1]
function generarPuntosAleatorios(cantidad) {
    const puntos = [];
    for (let i = 0; i < cantidad; i++) {
        const x = (Math.random() * 2 - 1) * 0.8;
        const y = (Math.random() * 2 - 1) * 0.8;
        puntos.push(x, y);
    }
    return puntos;
}

// Colores fijos para cada primitiva
const coloresPrimitivas = {
    punto: [1.0, 0.0, 0.0, 1.0],      // Rojo
    linea: [0.0, 1.0, 0.0, 1.0],      // Verde
    triangulo: [0.0, 0.0, 1.0, 1.0],  // Azul
    cuadrado: [1.0, 1.0, 0.0, 1.0]    // Amarillo
};

// Función para dibujar la primitiva seleccionada
function dibujarPrimitiva(tipo) {
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const color = coloresPrimitivas[tipo];
    let positions, colors, modo, count;

    switch (tipo) {
        case 'punto':
            positions = generarPuntosAleatorios(1);
            colors = color;
            modo = gl.POINTS;
            count = 1;
            break;

        case 'linea':
            positions = generarPuntosAleatorios(2);
            colors = [...color, ...color]; // Mismo color para ambos puntos
            modo = gl.LINES;
            count = 2;
            break;

        case 'triangulo':
            positions = generarPuntosAleatorios(3);
            colors = [...color, ...color, ...color];
            modo = gl.TRIANGLES;
            count = 3;
            break;

        case 'cuadrado':
            positions = [
                -0.2, 0.2,
                0.2, 0.2,
                0.2, -0.2,
                -0.2, -0.2
            ];
            colors = [...color, ...color, ...color, ...color];
            modo = gl.TRIANGLE_FAN;
            count = 4;
            break;
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
    gl.drawArrays(modo, 0, count);
}

// Evento del botón
document.getElementById('btnDibujar').addEventListener('click', () => {
    const tipo = document.getElementById('primitiva').value;
    dibujarPrimitiva(tipo);
});

// Dibujar por defecto al cargar
dibujarPrimitiva('punto');