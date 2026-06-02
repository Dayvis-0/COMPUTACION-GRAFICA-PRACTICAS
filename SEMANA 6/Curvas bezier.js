// Configuracion inicial
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

// Shaders
async function loadShader(url, type) {
    const response = await fetch(url);
    const source = await response.text();
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
    }

    return shader;
}

async function initProgram() {
    const vs = await loadShader("shaders/Vertex.glsl", gl.VERTEX_SHADER);
    const fs = await loadShader("shaders/Fragment.glsl", gl.FRAGMENT_SHADER);
    const program = gl.createProgram();

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    return program;
}

// Puntos de control inciales 
let controlPoints = [
    [-0.8, -0.5], 
    [-0.4, 0.8], 
    [0.4, -0.8], 
    [0.8, 0.5] 
];

let draggingPoint = null; 

// Algoritmo de De Castljau
function deCasteljau(points, t) {
    let temp = points.map(p => [...p]);

    for (let r = 1; r < points.length; r++) {
        for (let i = 0; i < points.length - r; i++) {
            temp[i][0] = (1 - t) * temp[i][0] + t * temp[i + 1][0]; 
            temp[i][1] = (1 - t) * temp[i][1] + t * temp[i + 1][1]; 
        }
    }

    return temp[0];
}

// Generar curva De Casteljau
function generateCurveDeCateljau(resolution = 200) {
    let curve = [];

    for (let i = 0; i <= resolution; i++) {
        let t = i / resolution;
        
        curve.push(deCasteljau(controlPoints, t));
    }

    return curve;
}

// Buffers
function createBuffer(data) {
    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.flat()), gl.STATIC_DRAW);

    return buffer;
}

async function main() {
    const program = await initProgram();
    const positionLoc = gl.getAttribLocation (program, "a_position");
    const colorLoc = gl.getUniformLocation (program, "u_color");

    function draw() {
        gl.clearColor (0.07, 0.07, 0.07, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Polígono de control (gris)
        gl.uniform4f (colorLoc, 0.5, 0.5, 0.5, 1); 

        let controlBuffer = createBuffer (controlPoints);

        gl.bindBuffer(gl.ARRAY_BUFFER, controlBuffer);
        gl.vertexAttribPointer (positionLoc, 2, gl. FLOAT, false, 0, 0);
        gl.enableVertexAttribArray (positionLoc);
        gl.drawArrays(gl.LINE_STRIP, 0, controlPoints.length);

        // Puntos de control (rojo)
        gl.uniform4f (colorLoc, 1, 0, 0, 1);
        gl.drawArrays (gl.POINTS, 0, controlPoints.length);

        // Curva de Bézier con De Casteljau (amarillo)
        let curveCasteljau = generateCurveDeCateljau();

        gl.uniform4f (colorLoc, 1, 1, 0, 1);
        
        let curveBufferCasteljau = createBuffer (curveCasteljau);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, curveBufferCasteljau);
        gl.vertexAttribPointer (positionLoc, 2, gl. FLOAT, false, 0, 0);
        gl.enableVertexAttribArray (positionLoc);
        gl.drawArrays(gl.LINE_STRIP, 0, curveCasteljau.length);
    }

    function animate(t) {
        draw();
        // Punto actual en verde
        let point = deCasteljau (controlPoints, (Math.sin(Date.now() * 0.001) + 1) / 2);

        gl.uniform4f (colorLoc, 0, 1, 0, 1);

        let pointBuffer = createBuffer ([point]);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
        gl.vertexAttribPointer (positionLoc, 2, gl. FLOAT, false, 0, 0);
        gl.enableVertexAttribArray (positionLoc);
        gl.drawArrays (gl.POINTS, 0, 1);
        requestAnimationFrame (animate);
    }

    animate();
}

main();

//Interacción con mouse ---
canvas.addEventListener("mousedown", e => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / canvas.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / canvas.height) * 2 - 1);

    controlPoints.forEach((p, i) => {
        if (Math.hypot(p[0] -x, p[1] - y) < 0.05) draggingPoint = i;
    });
});

canvas.addEventListener("mousemove", e => {
    if (draggingPoint !== null) {
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / canvas.width) * 2 - 1;
        const y = -(((e.clientY - rect.top) / canvas.height) * 2 - 1);

        controlPoints [draggingPoint] = [x, y];
    }
});

canvas.addEventListener("mouseup", () => draggingPoint = null);