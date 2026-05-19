// Interfaz con 4 ejercicios (seleccionables mediante menú)

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL no esta disponible en este navegador");
}

let shaderProgram;
let positionAttributeLocation;
let transformLocation;
let colorLocation;
let buffers;
let currentExercise = 1;

// Shaders para cada ejercicio
const shaders = {
    1: {
        // Color según posición
        vs: `
            attribute vec2 a_position;
            varying vec2 v_position;
            uniform mat3 u_transform;
            
            void main(void) {
                vec3 pos = u_transform * vec3(a_position, 1.0);
                gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);
                v_position = a_position;
            }
        `,
        fs: `
            precision mediump float;
            varying vec2 v_position;
            
            void main() {
                float red = clamp(v_position.x + 0.5, 0.0, 1.0);
                float green = clamp(v_position.y + 0.5, 0.0, 1.0);
                gl_FragColor = vec4(red, green, 0.0, 1.0);
            }
        `
    },
    2: {
        // Triángulo equilátero
        vs: `
            attribute vec2 a_position;
            uniform mat3 u_transform;
            
            void main(void) {
                vec3 pos = u_transform * vec3(a_position, 1.0);
                gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);
            }
        `,
        fs: `
            precision mediump float;
            
            void main() {
                gl_FragColor = vec4(0.8, 0.2, 0.2, 1.0);
            }
        `
    },
    3: {
        // Animación automática
        vs: `
            attribute vec2 a_position;
            uniform mat3 u_transform;
            
            void main(void) {
                vec3 pos = u_transform * vec3(a_position, 1.0);
                gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);
            }
        `,
        fs: `
            precision mediump float;
            
            void main() {
                gl_FragColor = vec4(0.8, 0.2, 0.2, 1.0);
            }
        `
    },
    4: {
        // 3 cuadrados con color variable
        vs: `
            attribute vec2 a_position;
            uniform mat3 u_transform;
            
            void main(void) {
                vec3 pos = u_transform * vec3(a_position, 1.0);
                gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);
            }
        `,
        fs: `
            precision mediump float;
            uniform vec3 u_color;
            
            void main() {
                gl_FragColor = vec4(u_color, 1.0);
            }
        `
    }
};

// Crear buffers para cuadrado, triángulo y 3 cuadrados separados
function createBuffers() {
    const squareVertices = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
    const squareIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    
    const squareVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, squareVertices, gl.STATIC_DRAW);
    
    const squareIBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareIBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, squareIndices, gl.STATIC_DRAW);
    
    // Triángulo
    const side = 1.0;
    const height = side * Math.sqrt(3) / 2;
    
    const triangleVertices = new Float32Array([0, height * 2/3, -side/2, -height/3, side/2, -height/3]);
    const triangleIndices = new Uint16Array([0, 1, 2]);
    
    const triangleVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
    
    const triangleIBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
    
    // Función para crear un cuadrado independiente
    function createOneSquareBuffers() {
        const vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferData(gl.ARRAY_BUFFER, squareVertices, gl.STATIC_DRAW);
        
        const ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, squareIndices, gl.STATIC_DRAW);
        
        return { vertexBuffer: vb, indexBuffer: ib, vertexCount: 6 };
    }
    
    return {
        square: { vertexBuffer: squareVBuffer, indexBuffer: squareIBuffer, vertexCount: 6 },
        triangle: { vertexBuffer: triangleVBuffer, indexBuffer: triangleIBuffer, vertexCount: 3 },
        square1: createOneSquareBuffers(),
        square2: createOneSquareBuffers(),
        square3: createOneSquareBuffers()
    };
}

function createShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function initShaderProgram(vsSource, fsSource) {
    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

function createTranslationMatrix(tx, ty) {
    return new Float32Array([1, 0, 0, 0, 1, 0, tx, ty, 1]);
}

function createRotationMatrix(angleRad) {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    return new Float32Array([c, s, 0, -s, c, 0, 0, 0, 1]);
}

function createScaleMatrix(sx, sy) {
    return new Float32Array([sx, 0, 0, 0, sy, 0, 0, 0, 1]);
}

function multiplyMat3(a, b) {
    const a00 = a[0], a01 = a[3], a02 = a[6];
    const a10 = a[1], a11 = a[4], a12 = a[7];
    const a20 = a[2], a21 = a[5], a22 = a[8];
    const b00 = b[0], b01 = b[3], b02 = b[6];
    const b10 = b[1], b11 = b[4], b12 = b[7];
    const b20 = b[2], b21 = b[5], b22 = b[8];

    return new Float32Array([
        a00*b00 + a01*b10 + a02*b20,
        a10*b00 + a11*b10 + a12*b20,
        a20*b00 + a21*b10 + a22*b20,
        a00*b01 + a01*b11 + a02*b21,
        a10*b01 + a11*b11 + a12*b21,
        a20*b01 + a21*b11 + a22*b21,
        a00*b02 + a01*b12 + a02*b22,
        a10*b02 + a11*b12 + a12*b22,
        a20*b02 + a21*b12 + a22*b22
    ]);
}

function drawObject(bufferObj, transformMatrix, color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferObj.vertexBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferObj.indexBuffer);
    gl.uniformMatrix3fv(transformLocation, false, transformMatrix);
    if (color) {
        gl.uniform3fv(colorLocation, color);
    }
    gl.drawElements(gl.TRIANGLES, bufferObj.vertexCount, gl.UNSIGNED_SHORT, 0);
}

// Ejercicio 1: Color según posición
function drawExercise1() {
    const tx = parseFloat(document.getElementById('tx').value);
    const ty = parseFloat(document.getElementById('ty').value);
    const angle = parseFloat(document.getElementById('angle').value);
    const sx = parseFloat(document.getElementById('sx').value);
    const sy = parseFloat(document.getElementById('sy').value);

    document.getElementById('txValue').innerText = tx.toFixed(2);
    document.getElementById('tyValue').innerText = ty.toFixed(2);
    document.getElementById('angleValue').innerText = angle.toFixed(2);
    document.getElementById('sxValue').innerText = sx.toFixed(2);
    document.getElementById('syValue').innerText = sy.toFixed(2);

    const T = createTranslationMatrix(tx, ty);
    const R = createRotationMatrix(angle);
    const S = createScaleMatrix(sx, sy);

    let M = multiplyMat3(T, R);
    M = multiplyMat3(M, S);

    gl.uniformMatrix3fv(transformLocation, false, M);

    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.square.vertexBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.square.indexBuffer);
    gl.drawElements(gl.TRIANGLES, buffers.square.vertexCount, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(drawExercise1);
}

// Ejercicio 2: Triángulo
function drawExercise2() {
    const tx = parseFloat(document.getElementById('tx').value);
    const ty = parseFloat(document.getElementById('ty').value);
    const angle = parseFloat(document.getElementById('angle').value);
    const sx = parseFloat(document.getElementById('sx').value);
    const sy = parseFloat(document.getElementById('sy').value);

    document.getElementById('txValue').innerText = tx.toFixed(2);
    document.getElementById('tyValue').innerText = ty.toFixed(2);
    document.getElementById('angleValue').innerText = angle.toFixed(2);
    document.getElementById('sxValue').innerText = sx.toFixed(2);
    document.getElementById('syValue').innerText = sy.toFixed(2);

    const T = createTranslationMatrix(tx, ty);
    const R = createRotationMatrix(angle);
    const S = createScaleMatrix(sx, sy);

    let M = multiplyMat3(T, R);
    M = multiplyMat3(M, S);

    gl.uniformMatrix3fv(transformLocation, false, M);

    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.triangle.vertexBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.triangle.indexBuffer);
    gl.drawElements(gl.TRIANGLES, buffers.triangle.vertexCount, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(drawExercise2);
}

// Ejercicio 3: Animación automática
function drawExercise3() {
    const time = performance.now();
    const t = time * 0.001;
    
    const angle = t * 1.5;
    const tx = Math.sin(t * 2) * 0.5;
    const ty = Math.cos(t * 1.5) * 0.3;
    const sx = 0.5;
    const sy = 0.5;
    
    const T = createTranslationMatrix(tx, ty);
    const R = createRotationMatrix(angle);
    const S = createScaleMatrix(sx, sy);
    
    let M = multiplyMat3(T, R);
    M = multiplyMat3(M, S);
    
    gl.uniformMatrix3fv(transformLocation, false, M);
    
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.square.vertexBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.square.indexBuffer);
    gl.drawElements(gl.TRIANGLES, buffers.square.vertexCount, gl.UNSIGNED_SHORT, 0);
    
    requestAnimationFrame(drawExercise3);
}

// Ejercicio 4: 3 cuadrados
function drawExercise4() {
    const time = performance.now();
    const t = time * 0.001;
    
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Cuadrado 1: Rojo
    const angle1 = -t * 1.0;
    const tx1 = Math.sin(t * 1.5) * 0.4;
    const ty1 = Math.cos(t * 1.2) * 0.3;
    
    const T1 = createTranslationMatrix(tx1, ty1);
    const R1 = createRotationMatrix(angle1);
    const S1 = createScaleMatrix(0.3, 0.3);
    
    let M1 = multiplyMat3(T1, R1);
    M1 = multiplyMat3(M1, S1);
    
    drawObject(buffers.square1, M1, [0.9, 0.2, 0.2]);
    
    // Cuadrado 2: Verde
    const angle2 = t * 1.2 + Math.PI / 4;
    const tx2 = Math.cos(t * 1.0 + 2) * 0.5;
    const ty2 = Math.sin(t * 0.8 + 1) * 0.4;
    
    const T2 = createTranslationMatrix(tx2 - 0.5, ty2 + 0.3);
    const R2 = createRotationMatrix(angle2);
    const S2 = createScaleMatrix(0.25, 0.25);
    
    let M2 = multiplyMat3(T2, R2);
    M2 = multiplyMat3(M2, S2);
    
    drawObject(buffers.square2, M2, [0.2, 0.8, 0.2]);
    
    // Cuadrado 3: Azul
    const angle3 = -t * 0.8 + Math.PI / 2;
    const tx3 = Math.sin(t * 0.7 + 3) * 0.4;
    const ty3 = Math.cos(t * 1.3 + 1) * 0.35;
    
    const T3 = createTranslationMatrix(tx3 + 0.5, ty3 - 0.2);
    const R3 = createRotationMatrix(angle3);
    const S3 = createScaleMatrix(0.35, 0.35);
    
    let M3 = multiplyMat3(T3, R3);
    M3 = multiplyMat3(M3, S3);
    
    drawObject(buffers.square3, M3, [0.2, 0.2, 0.9]);
    
    requestAnimationFrame(drawExercise4);
}

// Cambiar ejercicio
function changeExercise(exerciseNumber) {
    currentExercise = exerciseNumber;
    
    const shaderSources = shaders[exerciseNumber];
    
    shaderProgram = initShaderProgram(shaderSources.vs, shaderSources.fs);
    gl.useProgram(shaderProgram);
    
    positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');
    gl.enableVertexAttribArray(positionAttributeLocation);
    transformLocation = gl.getUniformLocation(shaderProgram, 'u_transform');
    colorLocation = gl.getUniformLocation(shaderProgram, 'u_color');
    
    buffers = createBuffers();
    
    const controls = document.getElementById('controls');
    if (exerciseNumber === 1 || exerciseNumber === 2) {
        controls.style.display = 'block';
    } else {
        controls.style.display = 'none';
    }
    
    const info = document.getElementById('info');
    const infoTexts = {
        1: 'Ejercicio 1: Color según posición X/Y del vértice',
        2: 'Ejercicio 2: Triángulo equilátero centrado',
        3: 'Ejercicio 3: Animación automática (rotación + traslación sinusoidal)',
        4: 'Ejercicio 4: 3 cuadrados con transformaciones independientes'
    };
    info.innerText = infoTexts[exerciseNumber];
    
    const drawFunctions = {
        1: drawExercise1,
        2: drawExercise2,
        3: drawExercise3,
        4: drawExercise4
    };
    
    drawFunctions[exerciseNumber]();
}

document.getElementById('ejercicio').addEventListener('change', (e) => {
    changeExercise(parseInt(e.target.value));
});

changeExercise(1);