import { createScene } from './core/SceneManager.js';
import { createCamera } from './core/CameraManager.js';
import { createRenderer } from './core/RendererManager.js';
import { createCube } from './objects/Cube.js';
import { createSphere } from './objects/Sphere.js';
import { createLights } from './lights/Lights.js';
import { setupResize } from './utils/ResizeHandler.js';
import { startAnimation } from './animations/AnimationLoop.js';
import { createPlane } from './objects/Plane.js';

//      CONTENEDOR
const container = document.getElementById('container');
//      ESCENA
const scene = createScene();
//      CÁMARA
const camera = createCamera();
//      RENDERER
const renderer = createRenderer(container);
//      OBJETOS
const cube = createCube();
scene.add(cube);

const sphere = createSphere();
scene.add(sphere);

const plane = createPlane();
scene.add(plane); 
//      LUCES
createLights(scene);
//      RESPONSIVE
setupResize(camera, renderer);
//      ANIMACIÓN
startAnimation(renderer, scene, camera, cube, sphere);

