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

// 3. Obtener ubicaciones de atributos 
const positionLocation = gl.getAttribLocation(program, "a_position");
const colorLocation = gl.getAttribLocation(program, "a_color");

const positionBuffer = gl.createBuffer();
const colorBuffer = gl.createBuffer();

// 4. Algoritmo de Cohen-Sutherlandoi
// Funcion  para calcular el codigo de region de un punto 
function getRegionCode(x, y, clip) {
    let code = 0;

    if (x < clip.xmin) code |= 1; // Izquierda
    if (x > clip.xmax) code |= 2; // Derecha 
    if (y < clip.ymin) code |= 4; // Abajo
    if (y > clip.ymax) code |= 8; // Arribe

    return code;
}

// Funcion para recortar la linea usando Cohen-Sutherland
function cohenSutherlandClip(x1, y1, x2, y2, clip) {
    // Generar los codigos de region code1 y code2 para los puntos inicial y final de la linea
    let code1 = getRegionCode(x1, y1, clip);
    let code2 = getRegionCode(x2, y2, clip);

    let accept = false;

    // Si la línea cruza la región de recorte, se deben encontrar los puntos de intersección con los bordes del rectángulo.
    while (true) {
        if ((code1 | code2) === 0) {
            accept = true;
            break; // La línea está completamente dentro
        } else if ((code1 & code2) !== 0) {
            break; // La línea está completamente fuera
        } else {
            let codeOut  = code1 ? code1 : code2;
            let x, y;
            // Determinar el punto de intersección con el borde de recorte
            if (codeOut & 8) { // Arriba
                x = x1 + (x2 - x1) * (clip.ymax - y1) / (y2 - y1);
                y = clip.ymax;
            } else if (codeOut & 4) { // Abajo
                x = x1 + (x2 - x1) * (clip.ymin - y1) / (y2 - y1);
                y = clip.ymin;
            } else if (codeOut & 2) { // Derecha
                y = y1 + (y2 - y1) * (clip.xmax - x1) / (x2 - x1);
                x = clip.xmax;
            }else if (codeOut & 1) { // Izquierda
                y = y1+ (y2 - y1)* (clip.xmin - x1) / (x2 - x1);
                x = clip.xmin;
            }
            // Actualizacion de los puntos
            // Si el extremo de la linea estaba fuera, su nuevo punto recortado reemplaza el original y region
            if (codeOut === code1) {
                x1 = x;
                y1 = y;
                code1 = getRegionCode(x1, y1, clip);
            } else {
                x2 = x;
                y2 = y;
                code2 = getRegionCode(x2, y2, clip);
            }
        }
    }
    // Si la linea fue aceptada despues del recorte, se retorna la nueva linea recortada; si no, retorna visible
    if (accept) {
        return [x1, y1, x2, y2];
    } else {
        return null;
    }
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

    // 1. Dibujar rectángulo de recorte
    const box = [
        clipRect.xmin, clipRect.ymin, 
        clipRect.xmax, clipRect.ymin, 
        clipRect.xmax, clipRect.ymax, 
        clipRect.xmin, clipRect.ymax,
        clipRect.xmin, clipRect.ymin
    ];

    for (let i = 0; i < box.length; i += 2) {
        positions.push(box[i], box[i + 1]);
        colors.push(0, 0, 1); // Azul
    }

    // 2. Dibujar líneas originales (gris)
    for (const [x0, y0, x1, y1] of lines) {
        positions.push(x0, y0, x1, y1);
        colors.push(0.7, 0.7, 0.7, 0.7, 0.7, 0.7);
    }

    // 3. Dibujar líneas recortadas (rojo)
    for (const [x0, y0, x1, y1] of lines) {
        const clipped = cohenSutherlandClip(x0, y0, x1, y1, clipRect);
        if (clipped) {
            const [cx0, cy0, cx1, cy1] = clipped;
            positions.push(cx0, cy0, cx1, cy1);
            colors.push(1, 0, 0, 1, 0, 0);
        }
    }

    // Enviar datos a WebGL
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray (positionLocation);
    gl.vertexAttribPointer (positionLocation, 2, gl. FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.enableVertexAttribArray (colorLocation);
    gl.vertexAttribPointer (colorLocation, 3, gl. FLOAT, false, 0, 0);

    // Dibujar todo
    gl.drawArrays (gl.LINE_STRIP, 0, 5); // Rectángulo
    gl.drawArrays(gl.LINES, 5, lines.length * 2); // Líneas originales
    gl.drawArrays (gl. LINES, 5 + lines.length * 2, lines.length * 2); // Líneas re
}

drawScene();