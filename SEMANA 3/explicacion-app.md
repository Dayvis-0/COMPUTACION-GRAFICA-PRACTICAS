# Explicación detallada de `app.js` — Triángulo rojo en WebGL

## ¿Qué hace este programa?

Dibuja un **triángulo rojo** sobre un **fondo negro** usando WebGL. Parece simple, pero detrás hay todo un pipeline de gráficos por GPU que es la base del 3D.

---

## Línea 1-2: Obtener el canvas

```js
// Obtener el canvas
var canvas = document.getElementById("webgl-canvas");
```

Busca en el HTML un elemento `<canvas id="webgl-canvas">`. El canvas es un rectángulo de píxeles en la página. No es más que un "lienzo vacío" — no tiene capacidad de dibujo por sí mismo, necesita un contexto de renderizado.

---

## Línea 4-5: Obtener el contexto WebGL

```js
// Obtener el contexto WebGL
var gl = canvas.getContext("webgl");
```

**Esta es la línea más importante de todo el código.**

`getContext("webgl")` le pide al navegador que cree un **contexto de renderizado WebGL** asociado a este canvas. El objeto `gl` que devuelve es la interfaz completa hacia la GPU.

### ¿Qué pasa internamente acá?

1. El navegador detecta que pediste `"webgl"` (no `"2d"`)
2. Crea un objeto `WebGLRenderingContext` — implementado en C++ dentro del navegador
3. Se conecta con el driver de la GPU a través del sistema operativo
4. En Windows, Chrome traduce WebGL a **Direct3D 11** mediante **ANGLE** (una capa de traducción)
5. En Linux va directo a **OpenGL**
6. Reserva memoria en la GPU para el framebuffer por defecto
7. Inicializa el estado predeterminado del pipeline gráfico
8. Te devuelve el objeto `gl`

**Cada vez que llamás a un método de `gl`**, no es JavaScript quien lo ejecuta. Son funciones nativas (C++) que terminan en instrucciones para la GPU.

---

## Línea 7-12: Verificar disponibilidad

```js
// Verificar si WebGl está disponible
if (!gl) {
    console.log("WebGL no esta soportado, intenta en otro navegador")
} else {
    console.log("Este navegador soporta WebGL");
}
```

Si `getContext` devolvió `null` (navegador no soporta, GPU bloqueada por drivers corruptos, hardware muy viejo), no podés hacer nada. **Siempre hay que verificar esto antes de continuar.**

---

## Líneas 14-20: Shader de vértices (Vertex Shader)

```js
// Shader de vértices
var vertexShaderSource = `
    attribute vec4 a_Position;
    void main() {
        gl_Position = a_Position;
    }
`;
```

Esto NO es JavaScript. Es un programa en **GLSL (OpenGL Shading Language)** que se va a ejecutar en la **GPU**.

El **Vertex Shader** corre **una vez por cada vértice** del triángulo. Su trabajo es decidir DÓNDE aparece cada vértice en la pantalla.

- `attribute vec4 a_Position;` — declara una variable de entrada. `attribute` significa "recibí este dato desde JavaScript para CADA vértice". `vec4` es un vector de 4 componentes (x, y, z, w).

- `void main()` — la función principal, como en C.

- `gl_Position = a_Position;` — `gl_Position` es una variable **predefinida de salida**. La GPU espera que le asignes la posición final del vértice. Acá simplemente pasamos la posición que recibimos sin modificarla.

---

## Líneas 22-28: Shader de fragmentos (Fragment Shader)

```js
// Shader de fragmentos
var fragmentsShaderSource = `
    precision mediump float;
    void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
`;
```

Este es el programa de GLSL que corre **una vez por cada píxel** que el triángulo cubre en la pantalla.

- `precision mediump float;` — define la precisión de los números decimales. Obligatorio en fragment shaders.

- `gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);` — **ACÁ SE DEFINE EL COLOR ROJO**. `gl_FragColor` es la variable predefinida de salida para el color.

  - `vec4(1.0, 0.0, 0.0, 1.0)` significa:
    - **R = 1.0** → Rojo al máximo
    - **G = 0.0** → Nada de verde
    - **B = 0.0** → Nada de azul
    - **A = 1.0** → Totalmente opaco

**Como esto no depende de ninguna variable, CADA píxel del triángulo va a ser exactamente el mismo rojo.** Todo el triángulo se ve de un solo color sólido.

---

## Líneas 30-44: Función para crear un shader

```js
// Función para crear un shader
function createShader(gl, source, type){
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Error compilando el shader ", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}
```

Esta función **sube el código GLSL a la GPU y lo compila allá**:

1. `gl.createShader(type)` — pide a la GPU que cree un objeto shader del tipo indicado (`VERTEX_SHADER` o `FRAGMENT_SHADER`). La GPU reserva memoria para esto.

2. `gl.shaderSource(shader, source)` — envía el código fuente GLSL a la GPU.

3. `gl.compileShader(shader)` — le dice a la GPU: "compilá este código". La GPU tiene su propio compilador interno.

4. `gl.getShaderParameter(shader, gl.COMPILE_STATUS)` — pregunta si compiló bien. Si falló, imprime el error (el driver de GPU devuelve el mensaje) y libera memoria con `deleteShader`.

---

## Líneas 46-48: Crear los shaders

```js
// Crear los shaders
var vertexShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
var fragmentShader = createShader(gl, fragmentsShaderSource, gl.FRAGMENT_SHADER);
```

Compila ambos shaders en la GPU. `vertexShader` y `fragmentShader` son solo identificadores (IDs enteros) que referencian objetos dentro de la GPU, no datos en JavaScript.

---

## Líneas 50-62: Crear y activar el programa

```js
// Crear el programa
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
```

El **programa** es el pipeline completo: vertex shader + fragment shader **linkeados**. Un shader suelto no sirve. El linking verifica que las salidas del vertex shader coincidan con las entradas del fragment shader (en este caso no hay comunicación entre ellos).

```js
gl.useProgram(program);
```

Le decimos a WebGL: "de ahora en adelante, cuando dibujes, usá ESTE programa". El estado del programa activo queda guardado en el contexto `gl`.

---

## Líneas 64-69: Definir los vértices

```js
// Vertices del triangulo
var vertices = new Float32Array([
    0.0, 0.5,
    -0.5, -0.5,
    0.5, -0.5
]);
```

Son **3 vértices** en coordenadas normalizadas (de -1 a 1):

| Vértice | Coordenadas | Posición en pantalla |
|---------|-------------|----------------------|
| 0 | (0.0, 0.5) | **Arriba al centro** |
| 1 | (-0.5, -0.5) | **Abajo a la izquierda** |
| 2 | (0.5, -0.5) | **Abajo a la derecha** |

Si unís esos 3 puntos, obtenés un **triángulo isósceles** invertido con la punta arriba.

`Float32Array` es un array nativo de 32 bits por elemento. La GPU trabaja EXCLUSIVAMENTE con este formato — no podés pasar un array de JavaScript común.

---

## Líneas 71-75: Crear y llenar el buffer en la GPU

```js
// Crear buffer
var vertexBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
```

1. `gl.createBuffer()` — pide a la GPU que reserve un **buffer object** (un espacio de memoria en la GPU). Todavía está vacío.

2. `gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)` — **bindeo**: activa este buffer como el "buffer de array actual". WebGL es una máquina de estados: bindeás un recurso y después operás sobre él.

3. `gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)` — **sube los datos de los 3 vértices a la GPU**. La GPU copia los 6 números (3 vértices × 2 coordenadas) desde la RAM del sistema a su propia memoria VRAM. `STATIC_DRAW` le dice a la GPU: "estos datos no van a cambiar, optimizá el acceso".

---

## Líneas 77-81: Conectar el buffer con el shader

```js
// Enlazar el atributo 'a_Position' con los datos del buffer
var a_Position = gl.getAttribLocation(program, "a_Position");

gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(a_Position);
```

1. `gl.getAttribLocation(program, "a_Position")` — pregunta al programa linkeado: "¿en qué índice está el atributo `a_Position`?". Devuelve un número entero (ej: 0).

2. **`gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0)`** — le dice a WebGL CÓMO leer los datos del buffer actual:
   - **a_Position**: el índice del atributo
   - **2**: cada vértice tiene 2 componentes (x, y)
   - **gl.FLOAT**: cada componente es un float de 32 bits
   - **false**: no normalizar los valores
   - **0** (stride): los datos están empaquetados uno tras otro
   - **0** (offset): empezar desde el principio del buffer

   **Dato clave**: el shader declaró `a_Position` como `vec4` (4 componentes), pero acá decimos que solo enviamos 2. WebGL completa automáticamente: z = 0.0, w = 1.0.

3. `gl.enableVertexAttribArray(a_Position)` — habilita el atributo. **Si no hacés esto, el shader recibe basura o no recibe nada.** Es uno de los errores más comunes.

---

## Líneas 83-84: Color de fondo

```js
// Limpiar el canvas con un color de fondo
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);
```

1. `clearColor(0.0, 0.0, 0.0, 1.0)` — dice "cuando limpies, usá negro opaco". Esto solo configura el color, no limpia todavía.

2. `clear(gl.COLOR_BUFFER_BIT)` — **llena CADA píxel del canvas con el color configurado**. Todo se pone negro. Sin esta línea, el fondo tendría "basura" de lo que haya estado en el framebuffer antes.

---

## Línea 87: EL COMANDO QUE DIBUJA EL TRIÁNGULO ROJO

```js
// Dibujar el triangulo
gl.drawArrays(gl.TRIANGLES, 0, 3);
```

**Esta es la línea que realmente dibuja.** Todo lo anterior fue preparación. Cuando JavaScript ejecuta esta línea, se dispara todo el pipeline de la GPU.

---

## Viaje completo de `gl.drawArrays(gl.TRIANGLES, 0, 3)`

### Paso 1: JavaScript → GPU

La llamada viaja desde JavaScript al navegador (C++), al driver de gráficos, y finalmente a la GPU.

### Paso 2: Vertex Shader (3 ejecuciones)

La GPU toma los 3 vértices del buffer activo y ejecuta el **vertex shader** una vez por cada uno:

```
Vértice 0: ( 0.0,  0.5) → gl_Position = ( 0.0,  0.5, 0.0, 1.0)
Vértice 1: (-0.5, -0.5) → gl_Position = (-0.5, -0.5, 0.0, 1.0)
Vértice 2: ( 0.5, -0.5) → gl_Position = ( 0.5, -0.5, 0.0, 1.0)
```

### Paso 3: Ensamblado de primitiva

Con `gl.TRIANGLES`, la GPU sabe que cada grupo de 3 vértices forma un triángulo. Los 3 vértices definen el triángulo en pantalla.

### Paso 4: Rasterización

La GPU calcula **qué píxeles de la pantalla quedan DENTRO del triángulo**. Es un proceso matemático que determina, para cada píxel de la pantalla, si está adentro o afuera del área del triángulo.

```
Pantalla (ej: 800×600):

   (0.0, 0.5)      ← vértice superior
      /\
     /  \
    /    \
   /______\
(-0.5,-0.5)  (0.5,-0.5)  ← vértices inferiores

La GPU determina que ~3000 píxeles caen dentro del triángulo
```

Para CADA píxel dentro del triángulo, se genera una **invocación del Fragment Shader**.

### Paso 5: Fragment Shader (1 ejecución por píxel)

Para cada uno de esos ~3000 píxeles, la GPU ejecuta:

```glsl
precision mediump float;
void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```

Las 3000 veces asigna el mismo valor: **rojo puro**. El resultado de cada invocación se escribe en la posición correspondiente del framebuffer.

### Paso 6: Presentación en pantalla

Cuando terminan todas las ejecuciones:
- Los píxeles **fuera** del triángulo → quedaron negros (por `gl.clear`)
- Los píxeles **dentro** del triángulo → están rojos (por el fragment shader)

El navegador toma el framebuffer de la GPU y lo muestra en el canvas de la página.

---

## Resumen visual del pipeline

```
                   JavaScript
                       │
              gl.drawArrays(TRIANGLES, 0, 3)
                       │
                       ▼
   ┌─────────────────────────────────────────────┐
   │           VERTEX SHADER (×3)                │
   │  (0.0, 0.5) → gl_Position                   │
   │  (-0.5,-0.5) → gl_Position                  │
   │  (0.5,-0.5) → gl_Position                   │
   └──────────────────┬──────────────────────────┘
                      ▼
   ┌─────────────────────────────────────────────┐
   │         RASTERIZACIÓN                       │
   │  Convierte el triángulo en ~3000 píxeles    │
   └──────────────────┬──────────────────────────┘
                      ▼
   ┌─────────────────────────────────────────────┐
   │         FRAGMENT SHADER (×3000)             │
   │  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0)   │
   │  → Todos los píxeles salen ROJOS            │
   └──────────────────┬──────────────────────────┘
                      ▼
   ┌─────────────────────────────────────────────┐
   │         FRAMEBUFFER                         │
   │  Fondo negro + triángulo rojo               │
   └──────────────────┬──────────────────────────┘
                      ▼
   ┌─────────────────────────────────────────────┐
   │         PANTALLA                            │
   │  Se ve el triángulo rojo en canvas          │
   └─────────────────────────────────────────────┘
```

---

## Conclusión clave

**`gl.drawArrays` no sabe que el triángulo es rojo.** Solo dice "dibujá 3 vértices como triángulo". El color rojo vive en el **fragment shader**, que es un programa separado que corre en la GPU.

Si querés cambiar el color, no tocás `drawArrays` — tocás `gl_FragColor` en el shader. Si querés cambiar la forma, cambiás los datos del buffer. **Esa separación entre datos (vértices) y comportamiento (shaders) es la esencia de WebGL.**
