import { createScene } from './core/SceneManager.js';
import { createCamera } from './core/CameraManager.js';
import { createRenderer } from './core/RendererManager.js';
import { createCube } from './objects/Cube.js';
import { createSphere } from './objects/Sphere.js';
import { createPlane } from './objects/Plane.js';
import { createCylinder } from './objects/Cylinder.js';
import { setupResize } from './utils/ResizeHandler.js';
import { startAnimation } from './animations/AnimationLoop.js';
import { createOrbitControls } from './controls/OrbitControlsManager.js';
import { createLights } from './lights/Lights.js';

//      CONTENEDOR
const container = document.getElementById('container');
//      ESCENA
const scene = createScene();
//      CÁMARA
const camera = createCamera();
//      RENDERER
const renderer = createRenderer(container);

// CAMERA CONTROLS
const controls = createOrbitControls(camera, renderer)

//      OBJETOS
const cube = createCube();
scene.add(cube);

const sphere = createSphere();
scene.add(sphere);

const cylinder = createCylinder();
scene.add(cylinder);

const plane = createPlane();
scene.add(plane);

//      LUCES
createLights(scene);
//      RESPONSIVE
setupResize(camera, renderer);
//      ANIMACIÓN
startAnimation(renderer, scene, camera, controls, cube, sphere, cylinder, plane);

// ======================================================
// EXPERIMENTACIÓN: Parámetros de Luces y Materiales
// ======================================================
// 1. LUZ AMBIENTAL (lights/Lights.js):
//    - intensity: 0.0 → 1.0 (controla el brillo base)
//    - color: 0xffffff (cambia el tono de toda la escena)
//
// 2. LUZ DIRECCIONAL (lights/Lights.js):
//    - position.set(x, y, z): mueve la luz y cambia sombras
//    - intensity: 1 → 5 (más intensidad = más contraste)
//    - color: 0xffaa88 (luz cálida) / 0x88aaff (luz fría)
//    - castShadow: true/false (activa/desactiva sombras)
//
// 3. MATERIALES (objects/Cube.js, Sphere.js, Cylinder.js, Plane.js):
//    - color: cambiar el tono del objeto
//    - shininess: 0 → 200 (más brillo especular, solo Phong)
//    - specular: 0xffffff (color del reflejo, solo Phong)
//    - metalness: 0.0 → 1.0 (qué tan metálico, solo Standard/Physical)
//    - roughness: 0.0 → 1.0 (qué tan rugoso, solo Standard/Physical)
//    - flatShading: true/false (sombreado plano o suave)
//
// 4. SOMBRAS (core/RendererManager.js + cada objeto):
//    - renderer.shadowMap.enabled = true/false
//    - objeto.castShadow = true/false (quién proyecta sombra)
//    - objeto.receiveShadow = true/false (quién recibe sombra)
//
// CONSEJO: cambiá UN parámetro a la vez, observá el resultado,
// y luego probá combinaciones. Así entendés qué hace cada uno.
// ======================================================