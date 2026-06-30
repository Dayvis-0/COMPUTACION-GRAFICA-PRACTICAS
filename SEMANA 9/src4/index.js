import { createScene } from './core/SceneManager.js';
import { createCamera } from './core/CameraManager.js';
import { createRenderer } from './core/RendererManager.js';
import { createCube } from './objects/Cube.js';
import { createLights } from './lights/Lights.js';
import { setupResize } from './utils/ResizeHandler.js';
import { startAnimation } from './animations/AnimationLoop.js';

//      CONTENEDOR
const container = document.getElementById('container');
//      ESCENA
const scene = createScene();
//      CÁMARA — FOV 45° (probar también 120°), posición inicial modificada
const camera = createCamera({ fov: 45, x: 3, y: 2, z: 5 });
//      RENDERER
const renderer = createRenderer(container);
//      OBJETOS
const cube = createCube();
scene.add(cube);
//      LUCES
createLights(scene);
//      RESPONSIVE
setupResize(camera, renderer);
//      ANIMACIÓN
startAnimation(renderer, scene, camera, cube);

/*═══════════════════════════════════════════════════════════════
                     ACTIVIDAD 3 — CÁMARA
  ═══════════════════════════════════════════════════════════════

  1. CAMBIAR FOV (campo de visión)
     📁 src4/index.js  — línea 14: createCamera({ fov: 45, ... })
     → Cambiar 45 por 120 y recargar (F5)
       fov: 45   = zoom más cerrado, menos distorsión
       fov: 120  = gran angular, se ve más escena pero con distorsión
       Probar también: 60 (estándar), 90 (amplio)

  2. CAMBIAR POSICIÓN INICIAL (x, y, z)
     📁 src4/index.js  — línea 14: createCamera({ ..., x: 3, y: 2, z: 5 })
     → x positivo = cámara a la derecha,  negativo = a la izquierda
     → y positivo = cámara arriba,        negativo = abajo
     → z positivo = cámara atrás,         negativo = adelante
       Ejemplos para probar:
         (0, 0, 5)   → frente al cubo, centrado
         (5, 3, 5)   → desde arriba a la derecha
         (0, 5, 0)   → vista cenital (desde arriba)

  3. CAMBIAR ÓRBITA AUTOMÁTICA
     📁 src4/animations/AnimationLoop.js  — líneas 4-5
     → orbitRadius: distancia de la cámara al centro
         3 = órbita más cercana   8 = órbita más lejana
     → orbitSpeed: velocidad de giro
         0.2 = lento   1.0 = rápido   2.0 = muy rápido
     → camera.lookAt(0, 0, 0): la cámara siempre mira al centro
       Probar lookAt(0, 2, 0) para mirar hacia arriba

  ═══════════════════════════════════════════════════════════════
                  ACTIVIDAD 4 — ORBIT CONTROLS
  ═══════════════════════════════════════════════════════════════

  Reemplaza la órbita automática por control manual con el mouse.

  1. IMPORTAR OrbitControls
     📁 src4/index.js  — agregar al inicio con los otros imports:
     → import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

  2. CREAR LOS CONTROLES
     📁 src4/index.js  — después de crear el renderer (línea 16), agregar:
     → const controls = new OrbitControls(camera, renderer.domElement);
     → controls.enableDamping = true;   // movimiento suave
     → controls.dampingFactor = 0.05;

  3. ACTUALIZAR EN EL BUCLE
     📁 src4/animations/AnimationLoop.js
     → Agregar controls.update(); DENTRO de la función animate()
     → Opcional: sacar el movimiento orbital (sin/cos) para que no pelee
     → La función debe recibir controls como parámetro

  4. PASAR CONTROLS A LA ANIMACIÓN
     📁 src4/index.js  — línea 25: startAnimation(renderer, scene, camera, cube, controls);
     📁 src4/animations/AnimationLoop.js  — agregar controls como 5to parámetro

  💡 Con OrbitControls activo:
     → Click + arrastrar = orbitar alrededor del centro
     → Scroll            = zoom
     → Click derecho + arrastrar = paneo (desplazar)

*/

