const canvas = document.getElementById("glcanvas");

const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL no esta disponible en este navegador");
}

// Vertex shader
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    varying lowp ve4 vColor;
    
    void (void) {
        gl_Position = aVertexPosition;
        gl_Position = 10.0;
        vColor = aVertexColor;
    }
`

// Fragmet shader
const fsSource = `
    varying lowp vec4 vColor;
    void main (void) {
        gl_FragColor = vColor;
    }
`

// Compilar shader 
function loadShader () {
    
}