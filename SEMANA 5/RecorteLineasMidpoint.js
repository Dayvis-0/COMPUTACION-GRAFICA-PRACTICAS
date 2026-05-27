// 4. ALGORITMO MIDPOINT SUBDIVISION

/* Idea: parte la línea por la mitad una y otra vez hasta que cada pedacito
quede totalmente dentro de la ventana (mostralo) o totalmente fuera (descartalo).
Si un extremo está dentro y el otro fuera, el punto medio se acerca al borde.
Repetís recursivamente hasta que solo sobre lo visible. */

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

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource); // ← Compila vertex shader
const fragmetShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource); // ← Compila fragment shader

function createProgram(gl, vShader, fShader) { // ← Une vertex + fragment en un programa
    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    return program;
}

const program = createProgram(gl, vertexShader, fragmetShader); // ← Programa listo para renderizar
gl.useProgram(program); // ← Activar programa

// 3. Obtener ubicaciones de atributos y crear buffers
const positionLocation = gl.getAttribLocation(program, "a_position"); // ← Ubicar atributo posición
const colorLocation = gl.getAttribLocation(program, "a_color"); // ← Ubicar atributo color

const positionBuffer = gl.createBuffer(); // ← Buffer de coordenadas
const colorBuffer = gl.createBuffer(); // ← Buffer de colores

// Códigos de región binarios (Top, Bottom, Right, Left)
const INSIDE = 0; // 0000 — Dentro
const LEFT   = 1; // 0001 — Izquierda
const RIGHT  = 2; // 0010 — Derecha
const BOTTOM = 4; // 0100 — Abajo
const TOP    = 8; // 1000 — Arriba

// Calcula el código de región para un punto dado 
function calcularOutCode(x, y, clip) { // ← OutCode: 4 bits (T/B/R/L)
    let code = INSIDE;
    if (x < clip.xmin)      code |= LEFT;   // ← Bit 0: fuera izq
    else if (x > clip.xmax) code |= RIGHT;  // ← Bit 1: fuera der
    if (y < clip.ymin)      code |= BOTTOM; // ← Bit 2: fuera abajo
    else if (y > clip.ymax) code |= TOP;    // ← Bit 3: fuera arriba
    return code;
}

// Recorte por subdivisión de punto medio (Midpoint Subdivision)
function midPointClip(x1, y1, x2, y2, clip) { 
    const code1 = calcularOutCode(x1, y1, clip); // ← OutCode punto 1
    const code2 = calcularOutCode(x2, y2, clip); // ← OutCode punto 2

    // CASO 1: Aceptación Trivial (Ambos dentro)
    if ((code1 | code2) === 0) { // ← OR = 0 → ambos bits en 0 → ambos DENTRO
        return [x1, y1, x2, y2]; // ← Línea visible completa
    }

    // CASO 2: Rechazo Trivial (Misma región externa)
    if ((code1 & code2) !== 0) { // ← AND ≠ 0 → comparten bit fuera → RECHAZAR
        return null; // ← Línea invisible
    } 

    // Límite de precisión: puntos casi idénticos
    if (Math.abs(x1 - x2) < 1e-5 && Math.abs(y1 - y2) < 1e-5) { // ← Muy cerca? ya no subdividir
        return null;
    }

    // CASO 3: Indeterminado → SUBDIVIDIR
    const mx = (x1 + x2) / 2; // ← Punto medio X
    const my = (y1 + y2) / 2; // ← Punto medio Y

    const izquierda = midPointClip(x1, y1, mx, my, clip); // ← Mitad izquierda (recursivo)
    const derecha   = midPointClip(mx, my, x2, y2, clip); // ← Mitad derecha (recursivo)

    // Unir si ambas mitades tienen segmento visible
    if (izquierda && derecha) { // ← Ambas mitades visibles?
        return [izquierda[0], izquierda[1], derecha[2], derecha[3]]; // ← Unir en una línea
    }
    return izquierda || derecha; // ← Solo una mitad visible
}


// Líneas originales (pares de puntos)
const lines = [ // ← 3 líneas de prueba: cruzando, afuera, dentro
    [-0.8, -0.6, 0.6, 0.9],  // ← Cruza la región
    [-0.9, 0.5, 0.8, -0.4],  // ← Cruza la región
    [-0.2, -0.2, 0.2, 0.2],   // ← Totalmente dentro
    [-0.3, -0.2, 0.2, 0.2],   // ← Totalmente dentro
    [-0.4, -0.2, 0.2, 0.2],   // ← Totalmente dentro
    [-0.5, -0.2, 0.2, 0.2],   // ← Totalmente dentro
    [-0.6, -0.2, 0.2, 0.2]   // ← Totalmente dentro

];

// Región de recorte (viewport)
const clipRect = { // ← Ventana de recorte [-0.5, 0.5] en X e Y
    xmin: -0.5,
    xmax: 0.5,
    ymin: -0.5,
    ymax: 0.5
};

// Dibujar todo
function drawScene() { 
    gl.clearColor(1, 1, 1, 1); // ← Fondo blanco
    gl.clear(gl.COLOR_BUFFER_BIT); // ← Limpiar pantalla
    
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
    let clippedVertices = 0; // ← Contador de vértices recortados
    for (const [x0, y0, x1, y1] of lines) {
        const clipped = midPointClip(x0, y0, x1, y1, clipRect); // ← Aplicar recorte
        if (clipped) {
            positions.push(clipped[0], clipped[1], clipped[2], clipped[3]);
            colors.push(1, 0, 0, 1, 0, 0);
            clippedVertices += 2;
        }
    }

    // Enviar datos a WebGL
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); // ← Activar buffer posición
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW); // ← Subir vértices a GPU
    gl.enableVertexAttribArray(positionLocation); // ← Habilitar atributo posición
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0); // ← 2 floats por vértice

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer); // ← Activar buffer color
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW); // ← Subir colores a GPU
    gl.enableVertexAttribArray(colorLocation); // ← Habilitar atributo color
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0); // ← 3 floats por color

    // Renderizado 
    gl.drawArrays(gl.LINE_STRIP, 0, 5); // ← Rectángulo recorte
    gl.drawArrays(gl.LINES, 5, lines.length * 2); // ← Líneas originales
    gl.drawArrays(gl.LINES, 5 + (lines.length * 2), clippedVertices); // ← Líneas recortadas
}

drawScene();