import * as THREE from 'three';
import { getRaycaster, getPointer } from '../raytracing/RayTracing.js';


export function startAnimation(renderer, scene, camera, controls, cube, sphere, cylinder) {
    const raycaster = getRaycaster();
    const pointer = getPointer();

    function generarColorHex() {
        const caracteres = "0123456789ABCDEF";
        let color = "#";

        for (let i = 0; i < 6; i++) {
            color += caracteres[Math.floor(Math.random() * 16)];
        }

        return color;
    }

    function onPointerMove(event) {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);

        const intersects = raycaster.intersectObjects(scene.children);

        for (let i = 0; i < intersects.length; i++) {
            const color_ = generarColorHex();
            intersects[i].object.material.color.set(color_);
        }
    }

    // Registrar el evento UNA SOLA VEZ, fuera del loop
    window.addEventListener("click", onPointerMove);

    let tiempo = 0;

    function animate() {
        requestAnimationFrame(animate);
        tiempo += 0.03;

        // 1. Escalado del cilindro en Y
        cylinder.scale.y = 1 + Math.abs(Math.sin(tiempo * 0.2));
        
        // 2. Rotacion del cubo en X e Y
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        // 3. Rebote de la esfera en Y
        //sphere.position.y = Math.abs(Math.sin(tiempo * 0.5)) * 2;

        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}