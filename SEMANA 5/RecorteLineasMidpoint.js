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

// 4. Algoritmo Midpoint Subdivision (Punto Medio)
// Funcion para calcular el codigo de region de un punto
function getRegionCode(x, y, clip) {
    let code = 0;

    if (x < clip.xmin) code |= 1; // Izquierda
    if (x > clip.xmax) code |= 2; // Derecha 
    if (y < clip.ymin) code |= 4; // Abajo
    if (y > clip.ymax) code |= 8; // Arriba

    return code;
}

// Funcion para recortar la linea usando Midpoint Subdivision
function midPointClip(x1, y1, x2, y2, clip) {
    // Generar los codigos de region para los dos puntos
    let code1 = getRegionCode(x1, y1, clip);
    let code2 = getRegionCode(x2, y2, clip);

    // Si ambos estan dentro, la linea es completamente visible
    if (code1 === 0 && code2 === 0) {
        return [x1, y1, x2, y2];
    }

    // Si ambos comparten una misma region exterior, esta completamente fuera
    if ((code1 & code2) !== 0) {
        return null;
    }

    // --- Subdivision por punto medio ---
    // Para cada punto exterior, se usa busqueda binaria (midpoint subdivision)
    // para encontrar el punto de interseccion con el borde de recorte.

    if (code1 !== 0) {
        // P1 esta fuera → moverlo hacia P2 (que esta dentro o cruza)
        let inX = x2, inY = y2;   // punto interior conocido (o asumido)
        let outX = x1, outY = y1; // punto exterior
        let iter = 0;

        while (iter < 50) {
            const mx = (inX + outX) / 2;
            const my = (inY + outY) / 2;

            if (getRegionCode(mx, my, clip) === 0) {
                // El punto medio esta dentro → mover el punto interior hacia afuera
                inX = mx;
                inY = my;
            } else {
                // El punto medio esta fuera → mover el punto exterior hacia adentro
                outX = mx;
                outY = my;
            }

            // Si la distancia entre ambos puntos es muy pequena, convergio
            if (Math.abs(inX - outX) < 0.0001 && Math.abs(inY - outY) < 0.0001) break;
            iter++;
        }
        // El punto de interseccion es el ultimo punto interior encontrado
        x1 = inX;
        y1 = inY;
        code1 = getRegionCode(x1, y1, clip);
    }

    if (code2 !== 0) {
        // P2 esta fuera → moverlo hacia P1 (que ya deberia estar dentro o cruza)
        let inX = x1, inY = y1;
        let outX = x2, outY = y2;
        let iter = 0;

        while (iter < 50) {
            const mx = (inX + outX) / 2;
            const my = (inY + outY) / 2;

            if (getRegionCode(mx, my, clip) === 0) {
                inX = mx;
                inY = my;
            } else {
                outX = mx;
                outY = my;
            }

            if (Math.abs(inX - outX) < 0.0001 && Math.abs(inY - outY) < 0.0001) break;
            iter++;
        }
        x2 = inX;
        y2 = inY;
        code2 = getRegionCode(x2, y2, clip);
    }

    // Verificacion final: si ambos puntos estan dentro, la linea es visible
    if (code1 === 0 && code2 === 0) {
        return [x1, y1, x2, y2];
    }

    return null;
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
