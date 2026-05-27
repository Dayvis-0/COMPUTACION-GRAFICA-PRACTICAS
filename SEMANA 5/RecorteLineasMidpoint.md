# Explicación paso a paso de RecorteLineasMidpoint.js 🚀

¡Hola! En esta guía vamos a desarmar el código del archivo `RecorteLineasMidpoint.js` pieza por pieza. La idea es que entiendas la lógica detrás de cada línea sin enredarte con palabras raras o tecnismos aburridos. 

Imaginate que estamos construyendo un sistema de dibujo digital y queremos que las líneas largas se "corten" automáticamente para que solo se vea la parte que cae dentro de un marco o caja azul. ¡Eso es lo que hace este código!

---

## 💻 PARTE 1: Las Recetas de Dibujo (Shaders) (Líneas 1 a 21)

La tarjeta gráfica de tu computadora (la GPU) no entiende JavaScript directamente. Necesita "recetas" especiales escritas en un lenguaje llamado GLSL. Estas recetas se llaman **Shaders**. Acá tenemos dos:

```javascript
// Shader de vértices: recibe dónde están los puntos y qué color tienen
const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec3 a_color;
    varying vec3 v_color;

    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_color = a_color;
    }
`;
```
* **Línea 2:** Creamos una constante con el texto de la receta para los puntos (vértices).
* **Línea 3 (`attribute vec2 a_position`):** Le dice a la tarjeta gráfica que va a recibir pares de números `(x, y)` que representan la posición de cada punto en la pantalla.
* **Línea 4 (`attribute vec3 a_color`):** Le dice que también va a recibir tres números para el color (Rojo, Verde y Azul) de ese punto.
* **Línea 5 (`varying vec3 v_color`):** Esto es como un "puente". Sirve para pasarle el color de este punto al siguiente paso del dibujo.
* **Líneas 7 a 10 (`void main() { ... }`):** Es la acción principal.
  * **Línea 8 (`gl_Position = ...`):** WebGL (el motor gráfico) trabaja en 3D/4D, así que agarra nuestro punto `(x, y)` en 2D y le agrega un `0.0` para la profundidad (Z) y un `1.0` de escala. 
  * **Línea 9 (`v_color = a_color`):** Copia el color recibido al "puente" para mandarlo al pintor.

```javascript
// Shader de fragmentos: pinta el color final en cada píxel
const fragmentShaderSource = `
    precision mediump float;
    varying vec3 v_color;

    void main() {
        gl_FragColor = vec4(v_color, 1.0);
    }
`;
```
* **Línea 14:** Creamos la constante para el "pintor de píxeles" (Fragment Shader).
* **Línea 15 (`precision mediump float`):** Le dice a la tarjeta de video que trabaje con números decimales de precisión media para no consumir energía y memoria al divino botón.
* **Línea 16 (`varying vec3 v_color`):** Recibe el color desde el "puente" que creamos en el shader anterior.
* **Líneas 18 a 20 (`void main() { ... }`):**
  * **Línea 19 (`gl_FragColor = ...`):** Pinta el píxel de la pantalla con el color recibido y le pone un `1.0` al final, lo que significa que el color es 100% sólido (nada de transparencia).

---

## 🎨 PARTE 2: Preparando el Lienzo en el Navegador (Líneas 23 a 30)

Acá es donde JavaScript conecta con la pantalla de tu navegador.

```javascript
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL no es compatible con este navegador.");
}
```
* **Línea 24:** Buscamos el elemento visual en el HTML (la etiqueta `<canvas>`) usando su ID `"glcanvas"`. Pensalo como el cuadro físico donde vamos a pintar.
* **Línea 25:** Le pedimos al lienzo que nos dé su "motor de WebGL" para poder dibujar usando la tarjeta gráfica. Lo guardamos en la variable `gl`.
* **Líneas 27 a 29:** Si el navegador es muy viejo o no soporta esta tecnología, `gl` estará vacío, así que mostramos un cartel de alerta avisándole al usuario.

---

## 🛠️ PARTE 3: Compilando y Enlazando las Recetas (Líneas 32 a 52)

Como las recetas (Shaders) están escritas como simple texto en JavaScript, tenemos que traducirlas al idioma nativo de la tarjeta gráfica.

```javascript
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}
```
* **Línea 32:** Creamos una función para compilar cualquier shader.
* **Línea 33:** Le pedimos a WebGL que cree un contenedor de shader vacío en la tarjeta gráfica.
* **Línea 34:** Le cargamos el texto de la receta a ese contenedor.
* **Línea 35:** Traducimos (compilamos) la receta.
* **Línea 36:** Devolvemos el shader ya compilado y listo para usar.

```javascript
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmetShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
```
* **Línea 39:** Compilamos el shader de vértices.
* **Línea 40:** Compilamos el shader de fragmentos. (Nota: en el código original se escribió `fragmetShader` sin la letra 'n', ¡pero funciona igual porque se usa el mismo nombre en todos lados!).

```javascript
function createProgram(gl, vShader, fShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    return program;
}

const program = createProgram(gl, vertexShader, fragmetShader);
gl.useProgram(program);
```
* **Línea 42:** Creamos una función para unir ambos shaders en un solo "programa de dibujo".
* **Línea 43:** Crea un programa de WebGL vacío.
* **Líneas 44 y 45:** Vincula el shader de vértices y el de fragmentos a ese programa (para que trabajen en equipo).
* **Línea 46:** Enlaza y sella el programa.
* **Línea 50:** Creamos el programa definitivo usando los shaders compilados.
* **Línea 51:** Le ordenamos a WebGL: *"Che, a partir de ahora, todo lo que dibuje se hace usando este programa"*.

---

## 📮 PARTE 4: Creando los Canales de Comunicación (Líneas 53 a 59)

Ahora necesitamos conectar los datos de nuestro código JavaScript con las variables del shader en la GPU.

```javascript
const positionLocation = gl.getAttribLocation(program, "a_position");
const colorLocation = gl.getAttribLocation(program, "a_color");

const positionBuffer = gl.createBuffer();
const colorBuffer = gl.createBuffer();
```
* **Línea 54:** Buscamos la dirección del "buzón de entrada" llamado `a_position` en la GPU.
* **Línea 55:** Buscamos la dirección del "buzón de entrada" llamado `a_color` en la GPU.
* **Línea 57:** Creamos un buffer para las posiciones. Un *buffer* es como una cinta transportadora rápida que lleva los números del procesador a la memoria de la tarjeta de video.
* **Línea 58:** Creamos otro buffer similar para los colores.

---

## 📐 PARTE 5: El Corazón del Recorte (Algoritmo Midpoint) (Líneas 61 a 112)

Acá es donde pasa la magia matemática para saber si una línea está adentro de nuestra caja de recorte, si está afuera, o si cruza los bordes y hay que cortarla.

### Los códigos de región (Outcodes)
Imaginá que dividimos toda la pantalla en 9 zonas usando las líneas del marco (la caja). A cada zona le damos un código binario de 4 dígitos:

```
    1001 (Arriba-Izquierda) | 1000 (Arriba) | 1010 (Arriba-Derecha)
    -----------------------+---------------+---------------------
    0001 (Izquierda)        | 0000 (DENTRO) | 0010 (Derecha)
    -----------------------+---------------+---------------------
    0101 (Abajo-Izquierda)  | 0100 (Abajo)  | 0110 (Abajo-Derecha)
```

En el código se definen estos números decimales que equivalen a esos bits:
```javascript
const INSIDE = 0; // 0000 (Adentro)
const LEFT   = 1; // 0001 (Izquierda)
const RIGHT  = 2; // 0010 (Derecha)
const BOTTOM = 4; // 0100 (Abajo)
const TOP    = 8; // 1000 (Arriba)
```

### ¿Cómo sabemos dónde está un punto?
La función `calcularOutCode` evalúa las coordenadas de cualquier punto `(x, y)` respecto a los bordes de la caja de recorte (`clip`).

```javascript
function calcularOutCode(x, y, clip) {
    let code = INSIDE; // Empezamos asumiendo que el punto está ADENTRO (0000)
    
    if (x < clip.xmin)      code |= LEFT;   // Si está muy a la izquierda, prendemos el bit de LEFT
    else if (x > clip.xmax) code |= RIGHT;  // Si está muy a la derecha, prendemos el bit de RIGHT
    
    if (y < clip.ymin)      code |= BOTTOM; // Si está muy abajo, prendemos el bit de BOTTOM
    else if (y > clip.ymax) code |= TOP;    // Si está muy arriba, prendemos el bit de TOP
    
    return code; // Devolvemos el código final
}
```
* **Línea 71:** Definimos la función.
* **Línea 72:** Empezamos con el código en `0` (dentro).
* **Líneas 73 a 76:** Usamos el operador `|=` (OR binario) que funciona como un interruptor de luz. Si se cumple la condición, "prende" el bit correspondiente de la región externa.

---

### La Función de Recorte por Subdivisión (Recursiva)
Esta función recibe los dos extremos de una línea: Punto 1 `(x1, y1)` y Punto 2 `(x2, y2)`.

```javascript
function midPointClip(x1, y1, x2, y2, clip) {
    const code1 = calcularOutCode(x1, y1, clip);
    const code2 = calcularOutCode(x2, y2, clip);
```
* **Línea 81:** Definimos la función.
* **Líneas 82 y 83:** Calculamos las regiones donde están los dos extremos de la línea.

Ahora evaluamos tres situaciones posibles:

#### Caso 1: Aceptación Trivial (Toda la línea está adentro)
```javascript
    if ((code1 | code2) === 0) {
        return [x1, y1, x2, y2];
    }
```
* **Línea 86:** Si hacemos un `OR` binario entre ambos códigos y da `0` (es decir, `0000 | 0000`), significa que ambos extremos están dentro de la caja. 
* **Línea 87:** Devolvemos la línea tal cual, no hay nada que recortar.

#### Caso 2: Rechazo Trivial (Toda la línea está afuera)
```javascript
    if ((code1 & code2) !== 0) {
        return null;
    }
```
* **Línea 91:** Si hacemos un `AND` binario (`&`) y da distinto de `0`, significa que los dos puntos comparten al menos un bit exterior. Por ejemplo, ambos están a la izquierda de la caja. Si pasa eso, la línea no cruza la pantalla de ninguna forma.
* **Línea 92:** La descartamos por completo devolviendo `null`.

#### Límite de Precisión (Caso de parada)
```javascript
    if (Math.abs(x1 - x2) < 1e-5 && Math.abs(y1 - y2) < 1e-5) {
        return null;
    }
```
* **Línea 96:** Si la línea se volvió extremadamente corta (menos de `0.00001` de longitud), paramos la búsqueda para evitar que el programa se cuelgue en un bucle infinito. Devolvemos `null`.

#### Caso 3: Indeterminado (Subdivisión por Punto Medio)
Si la línea no está completamente adentro ni completamente afuera, ¡tenemos que cortarla por la mitad!

```javascript
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;

    const izquierda = midPointClip(x1, y1, mx, my, clip);
    const derecha   = midPointClip(mx, my, x2, y2, clip);
```
* **Líneas 101 y 102:** Calculamos las coordenadas del **punto medio** `(mx, my)` de la línea.
* **Línea 104:** Volvemos a llamar a la función (recursividad) para la primera mitad (desde el Punto 1 hasta el Punto Medio). Lo guardamos en `izquierda`.
* **Línea 105:** Hacemos lo mismo para la segunda mitad (desde el Punto Medio hasta el Punto 2). Lo guardamos en `derecha`.

#### Combinando los Resultados
Una vez que las mitades se procesan (y se siguen subdividiendo hasta encontrar qué partes entran en la caja), unimos las piezas:

```javascript
    if (izquierda && derecha) {
        return [izquierda[0], izquierda[1], derecha[2], derecha[3]];
    }
    return izquierda || derecha;
}
```
* **Líneas 108 a 110:** Si ambas mitades tienen partes visibles, las unimos: tomamos el inicio de la `izquierda` y el final de la `derecha` para formar una sola línea continua recortada.
* **Línea 111:** Si solo una mitad sobrevivió, la devolvemos. Si ninguna es válida, devolverá `null`.

---

## 📊 PARTE 6: Datos de Prueba (Líneas 115 a 128)

Definimos las líneas que queremos dibujar y el tamaño de nuestra caja de recorte.

```javascript
const lines = [
    [-0.8, -0.6, 0.6, 0.9],  // Cruza el marco en diagonal
    [-0.9, 0.5, 0.8, -0.4],  // Cruza en diagonal opuesta
    [-0.2, -0.2, 0.2, 0.2]   // Está completamente adentro
];

const clipRect = {
    xmin: -0.5,
    xmax: 0.5,
    ymin: -0.5,
    ymax: 0.5
};
```
* **Líneas 116 a 120:** Una lista con 3 líneas representadas por sus coordenadas `[x de inicio, y de inicio, x de fin, y de fin]`. Las coordenadas van de `-1.0` a `1.0` (que es el rango de la pantalla en WebGL).
* **Líneas 123 a 128:** El objeto que define nuestra caja de recorte. Es un cuadrado perfecto centrado en el medio de la pantalla (de `-0.5` a `0.5` en ambos ejes).

---

## 🎨 PARTE 7: La Función de Dibujo Principal (drawScene) (Líneas 131 a 184)

Esta función junta todos los datos, calcula los recortes y le dice a la tarjeta gráfica que pinte todo en la pantalla.

```javascript
function drawScene() {
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    const positions = [];
    const colors = [];
```
* **Línea 131:** Definimos la función.
* **Línea 132:** Elegimos el color blanco `(1, 1, 1, 1)` para limpiar el fondo.
* **Línea 133:** Limpiamos la pantalla con ese color blanco.
* **Líneas 135 y 136:** Creamos listas vacías para ir metiendo los puntos y los colores de todo lo que vamos a dibujar de una sola pasada.

### 1. Preparando la Caja Azul de Recorte
```javascript
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
```
* **Líneas 139 a 145:** Definimos los 5 puntos necesarios para dibujar el contorno del cuadrado (esquina inferior izquierda, inferior derecha, superior derecha, superior izquierda y volvemos al inicio para cerrar la caja).
* **Líneas 147 a 150:** Metemos esos puntos a nuestra lista de posiciones y le asignamos el color azul `(0, 0, 1)` (Rojo=0, Verde=0, Azul=1) a cada esquina.

### 2. Preparando las Líneas Originales (en Gris)
```javascript
    for (const [x0, y0, x1, y1] of lines) {
        positions.push(x0, y0, x1, y1);
        colors.push(0.7, 0.7, 0.7, 0.7, 0.7, 0.7);
    }
```
* **Líneas 153 a 156:** Recorremos las tres líneas originales de prueba. Las agregamos a la lista de posiciones y les ponemos color gris claro `(0.7, 0.7, 0.7)` tanto al punto de inicio como al de fin.

### 3. Calculando y Preparando las Líneas Recortadas (en Rojo)
```javascript
    let clippedVertices = 0;
    for (const [x0, y0, x1, y1] of lines) {
        const clipped = midPointClip(x0, y0, x1, y1, clipRect);
        if (clipped) {
            positions.push(clipped[0], clipped[1], clipped[2], clipped[3]);
            colors.push(1, 0, 0, 1, 0, 0);
            clippedVertices += 2;
        }
    }
```
* **Línea 159:** Llevamos la cuenta de cuántos puntos recortados pudimos dibujar.
* **Línea 160:** Recorremos de nuevo las tres líneas de prueba.
* **Línea 161:** Le aplicamos el algoritmo de recorte `midPointClip` a cada línea.
* **Líneas 162 a 166:** Si la línea tiene una parte visible adentro de la caja (es decir, no es `null`):
  * Guardamos sus nuevas coordenadas recortadas.
  * Les ponemos color rojo puro `(1, 0, 0)`.
  * Sumamos 2 a la cantidad de puntos recortados.

---

### 4. Enviando la Información a la Tarjeta Gráfica
Hasta ahora solo tenemos listas de números en la memoria común de la computadora. Hay que cargarlos en la GPU usando los buffers que creamos antes.

```javascript
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
```
* **Línea 170:** Activamos el buffer de posiciones.
* **Línea 171:** Subimos la lista de posiciones (convertida a un formato ultra-rápido de JavaScript llamado `Float32Array`) a la GPU.
* **Línea 172:** Habilitamos el buzón de entrada `positionLocation` en la GPU.
* **Línea 173:** Le explicamos a la GPU cómo tiene que leer los datos: *"Tomá los números de a pares (2 componentes), porque representan coordenadas X e Y"* (`2, gl.FLOAT`).

Hacemos exactamente lo mismo para los colores:
```javascript
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
```
* **Líneas 175 a 178:** Cargamos el array de colores a la GPU. En este caso le decimos que lee de a 3 números (`3, gl.FLOAT`) porque representan los canales de color Rojo, Verde y Azul.

---

### 5. El Renderizado (Dibujar en la pantalla)
Ahora que la GPU tiene todos los datos, le ordenamos que los pinte.

```javascript
    gl.drawArrays(gl.LINE_STRIP, 0, 5); // Rectángulo
    gl.drawArrays(gl.LINES, 5, lines.length * 2); // Líneas originales
    gl.drawArrays(gl.LINES, 5 + (lines.length * 2), clippedVertices); // Líneas recortadas reales
}
```
* **Línea 181:** Dibuja el marco azul. Usa `LINE_STRIP` que conecta un punto con el siguiente secuencialmente. Empieza desde el punto `0` y dibuja `5` vértices.
* **Línea 182:** Dibuja las líneas originales en gris. Usa `LINES` (dibuja líneas individuales uniendo pares de puntos sueltos). Empieza en el punto `5` (donde termina el rectángulo azul) y dibuja 6 puntos (`lines.length * 2`).
* **Línea 183:** Dibuja las líneas recortadas en rojo. Empieza desde el final de las líneas originales (`5 + 6 = 11`) y dibuja solo los puntos que sobrevivieron al recorte (`clippedVertices`).

---

## 🚀 PARTE 8: Ejecución Inicial (Línea 186)

```javascript
drawScene();
```
* **Línea 186:** Ejecuta la función de dibujo inmediatamente al cargar el script. Si no llamamos a esta función, el lienzo quedaría completamente en blanco.

---

## 🔄 Resumen visual de lo que pasa

Cuando abrís este programa en el navegador:
1. WebGL prepara la tarjeta de video y compila las fórmulas de color y posición.
2. Dibuja un **cuadrado azul** que sirve de ventana o marco.
3. Dibuja las **líneas completas de color gris** detrás.
4. Calcula con el algoritmo **Midpoint** dónde se cruzan las líneas grises con el borde azul.
5. Dibuja **líneas rojas** exactamente sobre los segmentos que cayeron dentro del marco azul.

¡Y listo! Es así de fácil, hermano. Espero que te sirva para entender la lógica del algoritmo de subdivisión y cómo interactúa con WebGL paso a paso.
