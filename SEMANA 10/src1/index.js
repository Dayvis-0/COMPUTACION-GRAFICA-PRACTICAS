import * as THREE from 'three';
import { createScene } from './core/SceneManager.js';
import { createCamera } from './core/CameraManager.js';
import { createRenderer } from './core/RendererManager.js';
import { createCube } from './objects/Cube.js';
import { createLights } from './lights/Lights.js';
import { setupResize } from './utils/ResizeHandler.js';
import { startAnimation } from './animations/AnimationLoop.js';
import { createSphere } from './objects/Sphere.js';
import { createCylinder } from './objects/Cylinder.js';
import { createPlane } from './objects/Plane.js';
import { createOrbitControls } from './controls/OrbitControlsManager.js';

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
const sphere = createSphere();
const cylinder = createCylinder();

// Grupo pivote: los 3 objetos orbitan alrededor de su centro (origen)
const pivotGroup = new THREE.Group();
cube.position.set(2, 0, 0);
sphere.position.set(-2, 0, 0);
cylinder.position.set(0, 0, 2);

pivotGroup.add(cube);
pivotGroup.add(sphere);
pivotGroup.add(cylinder);
scene.add(pivotGroup);

scene.add(createPlane());
//      LUCES
createLights(scene);
//      RESPONSIVE
setupResize(camera, renderer);
//      ANIMACIÓN
startAnimation(renderer, scene, camera, controls, pivotGroup);
