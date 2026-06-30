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
scene.add(cube);

const sphere = createSphere();
scene.add(sphere);

const cylinder = createCylinder();
scene.add(cylinder);
scene.add(createPlane());
//      LUCES
createLights(scene);
//      RESPONSIVE
setupResize(camera, renderer);
//      ANIMACIÓN
startAnimation(renderer, scene, camera, controls, cube, sphere, cylinder);
