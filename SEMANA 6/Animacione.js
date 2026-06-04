// Configuracion inicial
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");


if(!gl) {
    alert('WebGL no es soportado por este navegador.');
}

// Ajustar tamaño de canvas al tamaño de visualización(evita distorsiones)
function resizeCanvas() {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if(canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

window.addEventListener('resize', resizeCanvas);

resizeCanvas();

// Creacion de shader, Vertex shader
const vsSource = `
    attribute vec2 a_position; // Posición del vértice(coordenadas locales)
    uniform mat3 u_transform; // Matriz de transformación(modelo 2D)

    void main() {
        // Aplicar transformación: coordenadas locales -> clip space(2D)
        vec3 pos = u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(pos.xy, 0.0, 1.0);
    }
`


// Fragment Shader(fsSource):
const fsSource = `
    precision mediump float; // Precisión de coma flotante
    uniform vec4 u_color; // color del objeto(RGBA)

    void main() {
        gl_FragColor = u_color;// Asignar color sólido al fragmento
    }
`;

//

function compileShader(gl, source, type) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);

        return null;
    }

    return shader;
}

// 
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = compileShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fsSource, gl. FRAGMENT_SHADER);
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));

        return null;
    }

    return program;
}

// Definición de vértices(6 vértices para 2 triángulos)
// Triángulo 1: vértices 0-1-2; Triángulo 2: vértices 2-3-0
const vertices = new Float32Array([
    // x,y
    -0.25, -0.25, // 0: inferior izquierdo
    0.25, -0.25, // 1: inferior derecho
    0.25, 0.25, // 2: superior derecho
    -0.25, 0.25 // 3: superior izquierdo
]);

const indices = new Uint16Array([
    0, 1, 2, // primer triángulo
    2,3, 0 // segundo triángulo
]);

// Buffer de posición
const positionBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// Buffer de índices(element array buffer)
const indexBuffer = gl.createBuffer();

gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// Configurar el atributo "a_position" dentro del programa de shaders
const program = initShaderProgram(gl, vsSource, fsSource);

gl.useProgram(program);

const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.enableVertexAttribArray(positionAttributeLocation);
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

// Obtener ubicaciones de uniformes
const transformLocation = gl.getUniformLocation(program, 'u_transform');
const colorLocation = gl.getUniformLocation(program, 'u_color');

// Variables de control
let animationId = null;
let isAnimating = true;
let speed = 1.0; // factor de velocidad(modificable por teclado)
let startTime = performance.now() / 1000; // referencia temporal
let frozenT = 0; // valor de t cuando se pausa (para que no avance el tiempo)

// Funciones para matrices 3x3
function identity3() {
    return new Float32Array([
        1, 0, 0, 
        0, 1, 0, 
        0, 0, 1
    ]);
}

function translationMatrix(tx, ty) {
    return new Float32Array([
        1, 0, 0, 
        0, 1, 0, 
        tx, ty, 1
    ]);
}

function rotationMatrix(angleRad) {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    return new Float32Array([
        c, s, 0, 
        -s, c, 0, 
        0,0,1
    ]);
}

function scalingMatrix(sx, sy) {
    return new Float32Array([
        sx, 0, 0, 
        0, sy, 0, 
        0, 0, 1
    ]);
}

// Multiplicación de dos matrices 3x3(C = A * B)
function multiplyMat3(A, B) {
    const a00 = A[0], a01 = A[1] , a02 = A[2];
    const a10 = A[3], a11 = A[4] , a12 = A[5];
    const a20 = A[6], a21 = A[7] , a22 = A[8];
    const b00 = B[0], b01 = B[1] , b02 = B[2];
    const b10 = B[3], b11 = B[4] , b12 = B[5];
    const b20 = B[6], b21 = B[7] , b22 = B[8];

    return new Float32Array([
        a00*b00 + a01*b10 + a02*b20,
        a00*b01 + a01*b11 + a02*b21,
        a00*b02 + a01*b12 + a02*b22,

        a10*b00 + a11*b10 + a12*b20,
        a10*b01 + a11*b11 + a12*b21,
        a10*b02 + a11*b12 + a12*b22,
        
        a20*b00 + a21*b10 + a22*b20,
        a20*b01 + a21*b11 + a22*b21,
        a20*b02 + a21*b12 + a22*b22
    ]);
}

// Función de animación(drawFrame):
function drawFrame(nowMs) {
    // Si está pausado, t se congela en frozenT; si no, avanza con el tiempo
    let t = isAnimating
        ? (performance.now() / 1000 - startTime) * speed
        : frozenT;

    // Parámetros animados
    // Traslación: movimiento senoidal entre -0.6 y 0.6 en X
    const tx = Math.sin(t* 0.8) * 0.6;
    const ty = 0.0; // sin movimiento vertical

    // Rotación: ángulo constante que varía linealmente con t
    const angle = t * 1.5; // radianes

    // Escalamiento: factor que oscila entre 0.5 y 1.5 con frecuencia 1.2 Hz
    const scaleFactor = 0.75 + 0.5* Math.sin(t * 2.5);
    const sx = scaleFactor;
    const sy = scaleFactor;

    // Construir matriz de transformación: MTRS(aplicar primero escala, luego rotación, luego traslación)
    const T = translationMatrix(tx, ty);
    const R = rotationMatrix(angle);
    const S = scalingMatrix(sx, sy);
    
    // Multiplicar en orden inverso al deseado: primero S, luego R, luego T
    let M = multiplyMat3(R, S);
    M = multiplyMat3(T, M);
    
    // Enviar matriz al shader
    gl.uniformMatrix3fv(transformLocation, false, M);
    
    // color dinámico: varía con el tiempo(opcional)
    const r = 0.6 + 0.4 * Math.sin(t* 1.8);
    const g = 0.2 + 0.6 * Math.sin(t* 2.3);
    const b = 0.8 + 0.2 * Math.sin(t* 1.2);
    
    gl.uniform4f(colorLocation, r, g, b, 1.0);
    
    // Limpiar y dibujar
    gl.clearColor(0.12, 0.12, 0.18, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    // Solicitar siguiente frame
    animationId = requestAnimationFrame(drawFrame);
}

// Iniciar la animación 
startTime = performance.now() / 1000;
animationId = requestAnimationFrame(drawFrame);

// Interactividad 
window.addEventListener('keydown',(e) => {
    switch(e.key) {
        case ' ':// barra espaciadora
        case 'Space':
            e.preventDefault();
            isAnimating = !isAnimating; // toggle real
            if (!isAnimating) {
                // Al pausar, guardo el t actual para que el tiempo no avance al reanudar
                frozenT = (performance.now() / 1000 - startTime) * speed;
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            speed = Math.min(speed + 0.2, 3.0);
            break;
        case 'ArrowDown':
            e.preventDefault();
            speed = Math.max(speed - 0.2, 0.2);
            break;
    }
});