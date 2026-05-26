// Shader de vertices: recibe coordenadas y pasa color
const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec3 a_color;
    varying vec3 v_color;

    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_color = a_color;
    }
`;

// Shader de fragmentos: recibe color y lo aplica al fragmento 
const fragmentShaderSource = `
    precision mediump float;
    varying vec3 v_color;

    void main() {
        gl_FragColor = vec4(v_color, 1.0);
    }
`;

// 1. Obtener contexto WebGL 
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL no es compatible con este navegador.");
}

// 2. Compilar shader y crear programa
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmetShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

function createProgram(gl, vShader, fShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    return program;
}

const program = createProgram(gl, vertexShader, fragmetShader);
gl.useProgram(program);

// 3. Obtener ubicaciones de atributos y crear buffers
const positionLocation = gl.getAttribLocation(program, "a_position");
const colorLocation = gl.getAttribLocation(program, "a_color");

const positionBuffer = gl.createBuffer();
const colorBuffer = gl.createBuffer();


// 4. ALGORITMO MIDPOINT SUBDIVISION (PURO y OPTIMIZADO)

// Códigos de región binarios (Top, Bottom, Right, Left)
const INSIDE = 0; // 0000
const LEFT   = 1; // 0001
const RIGHT  = 2; // 0010
const BOTTOM = 4; // 0100
const TOP    = 8; // 1000

// Calcula el código de región para un punto dado
function calcularOutCode(x, y, clip) {
    let code = INSIDE;
    if (x < clip.xmin)      code |= LEFT;
    else if (x > clip.xmax) code |= RIGHT;
    if (y < clip.ymin)      code |= BOTTOM;
    else if (y > clip.ymax) code |= TOP;
    return code;
}

// Recorte por subdivisión de punto medio original
function midPointClip(x1, y1, x2, y2, clip) {
    const code1 = calcularOutCode(x1, y1, clip);
    const code2 = calcularOutCode(x2, y2, clip);

    // CASO 1: Aceptación Trivial (Ambos puntos dentro de la región)
    if ((code1 | code2) === 0) {
        return [x1, y1, x2, y2];
    }

    // CASO 2: Rechazo Trivial (Ambos puntos comparten una región externa exterior)
    if ((code1 & code2) !== 0) {
        return null;
    }

    // Límite de precisión: Detener si los puntos están extremadamente cerca
    if (Math.abs(x1 - x2) < 1e-5 && Math.abs(y1 - y2) < 1e-5) {
        return null;
    }

    // CASO 3: Indeterminado -> Subdividir en el punto medio
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;

    const izquierda = midPointClip(x1, y1, mx, my, clip);
    const derecha   = midPointClip(mx, my, x2, y2, clip);

    // Combinar los segmentos válidos encontrados
    if (izquierda && derecha) {
        return [izquierda[0], izquierda[1], derecha[2], derecha[3]];
    }
    return izquierda || derecha;
}


// Líneas originales (pares de puntos)
const lines = [
    [-0.8, -0.6, 0.6, 0.9],
    [-0.9, 0.5, 0.8, -0.4],
    [-0.2, -0.2, 0.2, 0.2]
];

// Región de recorte
const clipRect = {
    xmin: -0.5,
    xmax: 0.5,
    ymin: -0.5,
    ymax: 0.5
};

// Dibujar todo
function drawScene() {
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    const positions = [];
    const colors = [];

    // 1. Dibujar rectángulo de recorte (Azul)
    const box = [
        clipRect.xmin, clipRect.ymin, 
        clipRect.xmax, clipRect.ymin, 
        clipRect.xmax, clipRect.ymax, 
        clipRect.xmin, clipRect.ymax,
        clipRect.xmin, clipRect.ymin
    ];

    for (let i = 0; i < box.length; i += 2) {
        positions.push(box[i], box[i + 1]);
        colors.push(0, 0, 1); 
    }

    // 2. Dibujar líneas originales (Gris)
    for (const [x0, y0, x1, y1] of lines) {
        positions.push(x0, y0, x1, y1);
        colors.push(0.7, 0.7, 0.7, 0.7, 0.7, 0.7);
    }

    // 3. Dibujar líneas recortadas (Rojo) de forma dinámica
    let clippedVertices = 0;
    for (const [x0, y0, x1, y1] of lines) {
        const clipped = midPointClip(x0, y0, x1, y1, clipRect);
        if (clipped) {
            positions.push(clipped[0], clipped[1], clipped[2], clipped[3]);
            colors.push(1, 0, 0, 1, 0, 0);
            clippedVertices += 2;
        }
    }

    // Enviar datos a WebGL
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

    // Renderizado por offsets correctos
    gl.drawArrays(gl.LINE_STRIP, 0, 5); // Rectángulo
    gl.drawArrays(gl.LINES, 5, lines.length * 2); // Líneas originales
    gl.drawArrays(gl.LINES, 5 + (lines.length * 2), clippedVertices); // Líneas recortadas reales
}

drawScene();