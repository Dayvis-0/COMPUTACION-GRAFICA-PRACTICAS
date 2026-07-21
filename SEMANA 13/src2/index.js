import * as THREE from 'three';
import { createScene } from './core/SceneManager.js';
import { createCamera } from './core/CameraManager.js';
import { createRenderer } from './core/RendererManager.js';
import { createSphere } from './objects/Sphere.js';
import { setupResize } from './utils/ResizeHandler.js';
import { startAnimation } from './animations/AnimationLoop.js';
import { createOrbitControls } from './controls/OrbitControlsManager.js';
import { createLights } from './lights/Lights.js';

// ============================================================
// CONFIGURACIÓN DEL ENREJADO DE PERCOLACIÓN
// ============================================================
const GRID_X = 3;    // columnas (izquierda → derecha)
const GRID_Y = 3;    // filas    (abajo → arriba)
const GRID_Z = 3;    // profundidad (atrás → adelante)
const SPACING = 0.95; // separación centro a centro
const RADIUS = 0.45;  // radio de cada esfera

// ============================================================
// RUTA DE PERCOLACIÓN (coordenadas en el enrejado)
// ============================================================
// Arranca en inferior izquierdo, va diagonal al centro,
// sube al centro superior, y tiene una rama lateral.
const PATH_COORDS = new Set([
    // Tramo inferior: arranca en (0,0,0) y avanza en diagonal
    '0,0,0', '1,0,0', '1,1,0',
    // Centro del cubo
    '1,1,1',
    // Tramo ascendente: sube por el centro
    '1,2,1',
    // Ramificación lateral hacia la derecha
    '2,1,1',
]);

function esRuta(x, y, z) {
    return PATH_COORDS.has(`${x},${y},${z}`);
}

// ============================================================
// CONSTRUCCIÓN
// ============================================================
const container = document.getElementById('container');
const scene = createScene();
const camera = createCamera();
const renderer = createRenderer(container);
const controls = createOrbitControls(camera, renderer);

// Grupo contenedor para rotar todo junto
const lattice = new THREE.Group();

// Generamos el enrejado
for (let x = 0; x < GRID_X; x++) {
    for (let y = 0; y < GRID_Y; y++) {
        for (let z = 0; z < GRID_Z; z++) {
            const enRuta = esRuta(x, y, z);
            const color = enRuta ? 0xdd2222 : 0x999999;
            const sphere = createSphere(color, RADIUS);

            // Centramos el enrejado en el origen
            sphere.position.set(
                (x - (GRID_X - 1) / 2) * SPACING,
                (y - (GRID_Y - 1) / 2) * SPACING,
                (z - (GRID_Z - 1) / 2) * SPACING
            );

            lattice.add(sphere);
        }
    }
}

scene.add(lattice);

//      LUCES
createLights(scene);
//      RESPONSIVE
setupResize(camera, renderer);
//      ANIMACIÓN
startAnimation(renderer, scene, camera, controls, lattice);

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