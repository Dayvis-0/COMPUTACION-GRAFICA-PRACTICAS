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

// 4. Algoritmo Midpoint Subdivision (Punto Medio) — versión PURA
// Solo subdivide recursivamente en el punto medio hasta el límite de
// profundidad, y ahi verifica si el punto medio esta dentro del rectangulo.

// Funcion para verificar si un punto esta dentro del rectangulo de recorte
function puntoEstaDentro(x, y, clip) {
    return x >= clip.xmin && x <= clip.xmax && y >= clip.ymin && y <= clip.ymax;
}

// Funcion para recortar la linea usando Midpoint Subdivision puro
function midPointClip(x1, y1, x2, y2, clip, profundidad = 0) {
    const MAX_PROFUNDIDAD = 15;

    // Caso base: se llego a la maxima profundidad de subdivision
    // Se evalua el punto medio del segmento actual
    if (profundidad >= MAX_PROFUNDIDAD) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        if (puntoEstaDentro(mx, my, clip)) {
            return [x1, y1, x2, y2];
        }
        return null;
    }

    // Paso recursivo: subdividir en el punto medio
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;

    const izquierda = midPointClip(x1, y1, mx, my, clip, profundidad + 1);
    const derecha   = midPointClip(mx, my, x2, y2, clip, profundidad + 1);

    // Fusionar segmentos adyacentes (el rectangulo es convexo, asi que
    // si ambos lados tienen parte visible, forman un solo segmento continuo)
    if (izquierda && derecha) {
        return [izquierda[0], izquierda[1], derecha[2], derecha[3]];
    }

    return izquierda || derecha || null;
}

// Lineas originales (pares de puntos)
const lines = [
    [-0.8, -0.6, 0.6, 0.9],
    [-0.9, 0.5, 0.8, -0.4],
    [-0.2, -0.2, 0.2, 0.2]
];

// Region de recorte
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

    // 1. Dibujar rectangulo de recorte
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

    // 2. Dibujar lineas originales (gris)
    for (const [x0, y0, x1, y1] of lines) {
        positions.push(x0, y0, x1, y1);
        colors.push(0.7, 0.7, 0.7, 0.7, 0.7, 0.7);
    }

    // 3. Dibujar lineas recortadas (rojo)
    for (const [x0, y0, x1, y1] of lines) {
        const clipped = midPointClip(x0, y0, x1, y1, clipRect);
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
    gl.vertexAttribPointer (positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.enableVertexAttribArray (colorLocation);
    gl.vertexAttribPointer (colorLocation, 3, gl.FLOAT, false, 0, 0);

    // Dibujar todo
    gl.drawArrays (gl.LINE_STRIP, 0, 5); // Rectangulo
    gl.drawArrays(gl.LINES, 5, lines.length * 2); // Lineas originales
    gl.drawArrays(gl.LINES, 5 + lines.length * 2, lines.length * 2); // Lineas recortadas
}

drawScene();