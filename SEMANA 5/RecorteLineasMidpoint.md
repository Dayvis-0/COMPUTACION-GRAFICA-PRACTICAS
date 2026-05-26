# Algoritmo Midpoint Subdivision — Explicación línea por línea

## 1. Shaders (líneas 1–21)

```js
// Línea 1
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
```

**vertexShaderSource** — Código GLSL (OpenGL Shading Language) del **vertex shader**.

- **Línea 3:** `attribute vec2 a_position` — declara un atributo de entrada que recibe un vector de 2 componentes (x, y) por cada vértice.
- **Línea 4:** `attribute vec3 a_color` — atributo de entrada con 3 componentes (r, g, b) para el color de cada vértice.
- **Línea 5:** `varying vec3 v_color` — variable de salida que se interpolará entre vértices y se pasará al fragment shader.
- **Línea 8:** `gl_Position = vec4(a_position, 0.0, 1.0)` — convierte las coordenadas 2D en un vec4 (x, y, z=0, w=1) que OpenGL necesita para la posición. Las coordenadas están en **NDC** (Normalized Device Coordinates), van de -1 a 1.
- **Línea 9:** `v_color = a_color` — pasa el color al fragment shader.

```js
// Línea 13
// Shader de fragmentos: recibe color y lo aplica al fragmento 
const fragmentShaderSource = `
    precision mediump float;
    varying vec3 v_color;

    void main() {
        gl_FragColor = vec4(v_color, 1.0);
    }
`;
```

**fragmentShaderSource** — Código GLSL del **fragment shader**.

- **Línea 15:** `precision mediump float` — define precisión media para los floats (necesario en WebGL).
- **Línea 16:** `varying vec3 v_color` — recibe el color interpolado desde el vertex shader.
- **Línea 19:** `gl_FragColor = vec4(v_color, 1.0)` — asigna el color final del píxel (RGB del varying + alpha=1.0).

---

## 2. Contexto WebGL (líneas 24–30)

```js
// Línea 24
// 1. Obtener contexto WebGL 
const canvas = document.getElementById("glcanvas");     // Línea 25
const gl = canvas.getContext("webgl");                  // Línea 26
                                                        // 
if (!gl) {                                              // Línea 28
    alert("WebGL no es compatible con este navegador.");// Línea 29
}                                                       // Línea 30
```

- **Línea 25:** Obtiene el elemento `<canvas>` del HTML por su id `"glcanvas"`.
- **Línea 26:** Solicita el contexto WebGL. Si el navegador no soporta WebGL, devuelve `null`.
- **Línea 28–30:** Si no hay contexto WebGL, muestra una alerta y el programa no continúa.

---

## 3. Compilación de shaders y programa (líneas 32–56)

```js
// Línea 32
// 2. Compilar shader y crear programa
function createShader(gl, type, source) {   // Línea 33
    const shader = gl.createShader(type);     // Línea 34
                                              // 
    gl.shaderSource(shader, source);          // Línea 36
    gl.compileShader(shader);                 // Línea 37
                                              // 
    return shader;                            // Línea 39
}                                             // Línea 40
```

- **Línea 33:** Función que recibe el contexto (`gl`), el tipo de shader (`gl.VERTEX_SHADER` o `gl.FRAGMENT_SHADER`), y el código fuente.
- **Línea 34:** `gl.createShader(type)` — crea un objeto shader vacío del tipo indicado.
- **Línea 36:** `gl.shaderSource(shader, source)` — asigna el código fuente al shader.
- **Línea 37:** `gl.compileShader(shader)` — compila el shader. Si hay errores, no lanza excepción, hay que consultar con `gl.getShaderParameter(shader, gl.COMPILE_STATUS)`.
- **Línea 39:** Devuelve el shader compilado.

```js
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);    // Línea 42
const fragmetShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource); // Línea 43
```

> **Nota:** Hay un typo en `fragmetShader` (falta la `n`), pero como se usa consistentemente, funciona.

```js
function createProgram(gl, vShader, fShader) {  // Línea 45
    const program = gl.createProgram();           // Línea 46
                                                  // 
    gl.attachShader(program, vShader);            // Línea 48
    gl.attachShader(program, fShader);            // Línea 49
    gl.linkProgram(program);                      // Línea 50
                                                  // 
    return program;                               // Línea 52
}                                                 // Línea 53
```

- **Línea 46:** `gl.createProgram()` — crea un programa de shaders vacío.
- **Línea 48–49:** Adjunta el vertex shader y el fragment shader al programa.
- **Línea 50:** `gl.linkProgram(program)` — enlaza los shaders en un programa ejecutable. WebGL verificará que los shaders sean compatibles entre sí.
- **Línea 52:** Devuelve el programa enlazado.

```js
const program = createProgram(gl, vertexShader, fragmetShader);  // Línea 55
gl.useProgram(program);                                           // Línea 56
```

- **Línea 55:** Crea el programa combinando ambos shaders.
- **Línea 56:** `gl.useProgram(program)` — activa el programa para que sea usado en los próximos dibujados.

---

## 4. Atributos y buffers (líneas 58–63)

```js
// Línea 58
// 3. Obtener ubicaciones de atributos 
const positionLocation = gl.getAttribLocation(program, "a_position"); // Línea 59
const colorLocation = gl.getAttribLocation(program, "a_color");       // Línea 60
                                                                      // 
const positionBuffer = gl.createBuffer();                             // Línea 62
const colorBuffer = gl.createBuffer();                                // Línea 63
```

- **Línea 59:** `gl.getAttribLocation(program, "a_position")` — obtiene el índice (ubicación) del atributo `a_position` dentro del programa. Necesitamos este índice para luego vincular los datos.
- **Línea 60:** Lo mismo para `a_color`.
- **Línea 62–63:** `gl.createBuffer()` — crea dos buffers de GPU: uno para posiciones y otro para colores. Los buffers son memoria en la GPU donde enviaremos los vértices.

---

## 5. puntoEstaDentro — verificación de punto en rectángulo (líneas 65–73)

```js
// Línea 65
// 4. Algoritmo Midpoint Subdivision (Punto Medio) — versión PURA
// Sin region codes, sin trivial accept/reject, sin bits.
// Solo subdivide recursivamente en el punto medio hasta el límite de
// profundidad, y ahi verifica si el punto medio esta dentro del rectangulo.

// Funcion para verificar si un punto esta dentro del rectangulo de recorte
function puntoEstaDentro(x, y, clip) {               // Línea 69
    return x >= clip.xmin && x <= clip.xmax          // Línea 70
        && y >= clip.ymin && y <= clip.ymax;         // Línea 70 (cont.)
}                                                    // Línea 71
```

Esta función reemplaza a `getRegionCode`. No usa bits, no usa códigos, no usa OR binario. Es una **comparación directa de coordenadas**:

- `x >= clip.xmin && x <= clip.xmax` → ¿x está dentro en horizontal?
- `y >= clip.ymin && y <= clip.ymax` → ¿y está dentro en vertical?
- Devuelve `true` si ambas condiciones se cumplen, `false` si no.

> Esta es la ÚNICA función de "test" que necesita el Midpoint puro. Nada de region codes, nada de bits.

---

## 6. midPointClip — núcleo del algoritmo (líneas 75–104)

```js
// Linea 73
// Funcion para recortar la linea usando Midpoint Subdivision puro
function midPointClip(x1, y1, x2, y2, clip, profundidad = 0) {
    const MAX_PROFUNDIDAD = 15;
```

Recibe las coordenadas de los dos puntos de la línea `(x1, y1)` y `(x2, y2)`, el rectángulo de recorte `clip` (con `xmin, xmax, ymin, ymax`), y un parámetro `profundidad` que inicia en 0 y controla cuán profundo subdivide.

- **`profundidad = 0`:** es el valor por defecto. La primera llamada no necesita pasarlo.
- **`MAX_PROFUNDIDAD = 15`:** con 15 subdivisiones, el segmento más pequeño mide aproximadamente `(tamaño_inicial) / 2^15`. En NDC (rango -1 a 1), eso da ~0.00006 — muy por debajo de la precisión de píxel.

### 6.1 Caso base: máxima profundidad alcanzada (líneas 78–88)

```js
    if (profundidad >= MAX_PROFUNDIDAD) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        if (puntoEstaDentro(mx, my, clip)) {
            return [x1, y1, x2, y2];
        }
        return null;
    }
```

Cuando se llega al límite de subdivisiones:

1. Se calcula el **punto medio** `(mx, my)` del segmento actual.
2. Si ese punto medio está **dentro** del rectángulo → se acepta el segmento completo.
3. Si está **fuera** → se rechaza (`null`).

**¿Por qué funciona?** Si después de subdividir 15 veces (el segmento ya es diminuto, ~0.00006 en NDC), el punto medio sigue estando fuera, significa que todo el segmento está fuera. No hay posibilidad de que "atraviese" el rectángulo sin que su punto medio caiga dentro.

> **Importante:** Este es el ÚNICO caso base. No hay `code1 === 0 && code2 === 0`, no hay `(code1 & code2) !== 0`. Solo existe "llegué al límite de profundidad → evaluó el punto medio".

### 6.2 Paso recursivo: subdivisión en el punto medio (líneas 90–110)

```js
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;

    const izquierda = midPointClip(x1, y1, mx, my, clip, profundidad + 1);
    const derecha   = midPointClip(mx, my, x2, y2, clip, profundidad + 1);

    if (izquierda && derecha) {
        return [izquierda[0], izquierda[1], derecha[2], derecha[3]];
    }

    return izquierda || derecha || null;
```

Aquí está el corazón del algoritmo:

1. **Se calcula el punto medio** `(mx, my)` entre P1 y P2.
2. **Se recurre** en las dos mitades (incrementando `profundidad + 1`):
   - `izquierda`: del P1 original al punto medio.
   - `derecha`: del punto medio al P2 original.
3. **Combinación de resultados:**
   - Si **ambas mitades** tienen segmentos visibles → se fusionan en un solo segmento: el inicio de la izquierda con el final de la derecha. Esto funciona porque la región de recorte es convexa, así que la parte visible de una línea siempre es un segmento **continuo**.
   - Si **solo una mitad** tiene segmento visible → se devuelve ese.
   - Si **ninguna** tiene → se devuelve `null`.

**Visualización del proceso recursivo:**

```
               P1 ······················ P2
                           ↓
               P1 ········ M ········ P2
                          / \
                         /   \
              P1 ··· M1  ···  M2 ··· P2
               /\          /\          /\
              /  \        /  \        /  \
          P1  M3 M4 M1  M1 M5 M6 M2  M2 M7 M8 P2
          ✗  ✓  ✗  ✓     ✓  ✓  ✗  ✓    ✓  ✗  ✗  ✓
          
          ✓ = punto medio dentro → se acepta
          ✗ = punto medio fuera → se rechaza

Resultado: se fusionan los segmentos aceptados
         → izquierda devuelve [M4, M1], derecha devuelve [M2, M7]
         → fusión: [M4, M7] (linea recortada final)
```

### Diferencias CLAVE con Cohen-Sutherland

| Aspecto | Cohen-Sutherland | Midpoint Subdivision puro |
|---------|-----------------|---------------------------|
| Test de punto | Código de 4 bits con `\|=` | `puntoEstaDentro()` con `&&` |
| Trivial accept | `code1 \| code2 === 0` | **No existe** |
| Trivial reject | `code1 & code2 !== 0` | **No existe** |
| Intersección | Fórmula directa: `x = x1 + (x2-x1)*(clip.ymax-y1)/(y2-y1)` | Subdivisión recursiva por punto medio |
| Estructura | Iterativa (while loop) | **Recursiva** |
| Precisión | Determinista (un cálculo) | Controlada por `MAX_PROFUNDIDAD` |
| Operaciones | Multiplicación, división, AND, OR | Solo sumas, restas, división entre 2 |
| Eficiencia | Muy eficiente (pocas iteraciones) | Ineficiente para líneas grandes (explora todo el árbol) |

El Midpoint puro es **más simple conceptualmente** pero **más costoso computacionalmente**. Su ventaja histórica es que solo necesita sumadores y shifters (división entre 2), sin multiplicadores — ideal para hardware gráfico antiguo.

---

## 7. Datos de entrada (líneas 106–119)

```js
const lines = [                                             // Línea 107
    [-0.8, -0.6, 0.6, 0.9],    // Línea 108 — cruza el rectángulo en diagonal
    [-0.9, 0.5, 0.8, -0.4],    // Línea 109 — cruza en diagonal opuesta
    [-0.2, -0.2, 0.2, 0.2]     // Línea 110 — completamente dentro
];                                                          // Línea 111
```

Tres líneas de prueba:
1. **Línea 108:** `(-0.8, -0.6)` a `(0.6, 0.9)` — cruza el rectángulo en diagonal de abajo-izquierda a arriba-derecha.
2. **Línea 109:** `(-0.9, 0.5)` a `(0.8, -0.4)` — cruza en diagonal inversa.
3. **Línea 110:** `(-0.2, -0.2)` a `(0.2, 0.2)` — está completamente dentro del rectángulo de recorte.

```js
const clipRect = {                       // Línea 114
    xmin: -0.5,                          // Línea 115
    xmax: 0.5,                           // Línea 116
    ymin: -0.5,                          // Línea 117
    ymax: 0.5                            // Línea 118
};                                       // Línea 119
```

Rectángulo de recorte cuadrado centrado en el origen, que abarca de -0.5 a 0.5 en ambos ejes (en coordenadas NDC).

---

## 8. drawScene — renderizado (líneas 121–173)

```js
function drawScene() {                   // Línea 122
    gl.clearColor(1, 1, 1, 1);          // Línea 123
    gl.clear(gl.COLOR_BUFFER_BIT);      // Línea 124
```

- **Línea 123:** Establece el color de fondo en blanco (RGB 1,1,1) con alpha 1.
- **Línea 124:** Limpia el buffer de color (pinta todo el canvas de blanco).

```js
    const positions = [];   // Línea 125
    const colors = [];      // Línea 126
```

Arrays que acumularán todos los vértices a dibujar. WebGL dibuja todo de una sola vez.

### 8.1 Rectángulo de recorte (líneas 128–140)

```js
    const box = [                      // Línea 129
        clipRect.xmin, clipRect.ymin, // Línea 130 — esquina inferior izquierda
        clipRect.xmax, clipRect.ymin, // Línea 131 — esquina inferior derecha
        clipRect.xmax, clipRect.ymax, // Línea 132 — esquina superior derecha
        clipRect.xmin, clipRect.ymax, // Línea 133 — esquina superior izquierda
        clipRect.xmin, clipRect.ymin  // Línea 134 — vuelve al inicio
    ];

    for (let i = 0; i < box.length; i += 2) {  // Línea 137
        positions.push(box[i], box[i + 1]);     // Línea 138
        colors.push(0, 0, 1);                   // Línea 139 — Azul
    }                                           // Línea 140
```

- Itera sobre los pares de coordenadas en `box` (cada 2 elementos es un vértice).
- Añade cada vértice a `positions`.
- Añade color azul `(0, 0, 1)` para cada vértice del rectángulo.

### 8.2 Líneas originales en gris (líneas 142–146)

```js
    for (const [x0, y0, x1, y1] of lines) {   // Línea 143
        positions.push(x0, y0, x1, y1);        // Línea 144
        colors.push(0.7, 0.7, 0.7, 0.7, 0.7, 0.7); // Línea 145
    }
```

- **Línea 143:** Desestructura cada línea en sus 4 coordenadas: `(x0, y0)` inicio, `(x1, y1)` fin.
- **Línea 144:** Añade los 4 valores (2 vértices) a `positions`.
- **Línea 145:** Añade color gris `(0.7, 0.7, 0.7)` para cada uno de los 2 vértices → 6 valores de color.

### 8.3 Líneas recortadas en rojo (líneas 148–156)

```js
    for (const [x0, y0, x1, y1] of lines) {       // Línea 149
        const clipped = midPointClip(x0, y0, x1, y1, clipRect);  // Línea 150
        if (clipped) {                             // Línea 151
            const [cx0, cy0, cx1, cy1] = clipped; // Línea 152
            positions.push(cx0, cy0, cx1, cy1);    // Línea 153
            colors.push(1, 0, 0, 1, 0, 0);         // Línea 154
        }
    }
```

- **Línea 150:** Aplica el algoritmo Midpoint a cada línea original. Si la línea no es visible, devuelve `null`.
- **Línea 151:** Solo si la línea tiene parte visible (`clipped !== null`).
- **Línea 152:** Desestructura el resultado en las coordenadas recortadas.
- **Línea 153–154:** Añade los vértices recortados con color rojo `(1, 0, 0)`.

### 8.4 Envío de datos a WebGL (líneas 158–172)

```js
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);               // Línea 159
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW); // Línea 160
    gl.enableVertexAttribArray (positionLocation);                // Línea 161
    gl.vertexAttribPointer (positionLocation, 2, gl.FLOAT, false, 0, 0); // Línea 162

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);                  // Línea 164
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW); // Línea 165
    gl.enableVertexAttribArray (colorLocation);                   // Línea 166
    gl.vertexAttribPointer (colorLocation, 3, gl.FLOAT, false, 0, 0); // Línea 167

    // Dibujar todo
    gl.drawArrays (gl.LINE_STRIP, 0, 5);                         // Línea 170 — Rectangulo
    gl.drawArrays(gl.LINES, 5, lines.length * 2);               // Línea 171 — Lineas originales
    gl.drawArrays(gl.LINES, 5 + lines.length * 2, lines.length * 2); // Línea 172 — Lineas recortadas
```

**`gl.drawArrays(modo, inicio, cantidad)`** dibuja desde la posición `inicio` en el array, tomando `cantidad` vértices.

| Llamada | Modo | Inicio | Cantidad | Explicación |
|---------|------|--------|----------|-------------|
| Línea 170 | `LINE_STRIP` | 0 | 5 | Dibuja el rectángulo como una línea continua que conecta los 5 puntos. |
| Línea 171 | `LINES` | 5 | 6 | 3 líneas × 2 vértices = 6. Empieza después del rectángulo (que ocupa las posiciones 0–4). |
| Línea 172 | `LINES` | 11 | 6 | Empieza después de: rectángulo (5) + líneas originales (6) = 11. Dibuja las líneas recortadas. |

---

## 9. Ejecución (línea 175)

```js
drawScene();  // Línea 175
```

Llama a `drawScene()` para dibujar todo en el canvas. Esta línea se ejecuta inmediatamente cuando el script se carga.

---

## Resumen del flujo completo

```
1. HTML carga la página
2. El <script> carga RecorteLineasMidpoint.js
3. Se crean shaders y programa WebGL
4. Se inicializan buffers
5. drawScene() es llamada
6. drawScene:
   a. Limpia el canvas (fondo blanco)
   b. Acumula vértices del rectángulo (azul)
   c. Acumula vértices de líneas originales (gris)
   d. Para cada línea, llama a midPointClip()
   e. Si la línea recortada es visible, acumula sus vértices (rojo)
   f. Envía todos los datos a la GPU
   g. Dibuja los 3 grupos (rectángulo, originales, recortadas)
```

El canvas muestra 3 elementos:
- **Azul:** el rectángulo de recorte
- **Gris:** las líneas originales completas (incluyendo las partes fuera del rectángulo)
- **Rojo:** solo la porción de cada línea que queda dentro del rectángulo
