import * as THREE from 'three';
import { getRaycaster, getPointer } from '../raytracing/RayTracing.js';


export function startAnimation(renderer, scene, camera, controls, cube, sphere, cylinder, plane) {
    const raycaster = getRaycaster();
    const pointer = getPointer();

    // Guardamos colores originales de los objetos
    const objetos = [cube, sphere, cylinder, plane].filter(obj => obj !== undefined);
    const coloresOriginales = new Map();
    for (const obj of objetos) {
        coloresOriginales.set(obj, obj.material.color.getHex());
    }

    let objetoActual = null; // qué objeto está siendo hovereado

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
    }

    // Escuchamos el movimiento del mouse
    window.addEventListener("pointermove", onPointerMove);

    let tiempo = 0;

    function animate() {
        requestAnimationFrame(animate);
        tiempo += 0.03;

        // 1. Escalado del cilindro en Y
        cylinder.scale.y = 1 + Math.abs(Math.sin(tiempo * 0.2));
        
        // 2. Rotacion del cubo en X e Y
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        // 3. HOVER: detectamos qué objeto está bajo el mouse
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(scene.children);

        // Encontramos el primer objeto "trackeable" bajo el mouse
        let hovered = null;
        for (const intersect of intersects) {
            if (coloresOriginales.has(intersect.object)) {
                hovered = intersect.object;
                break;
            }
        }

        // Si el objeto bajo el mouse es DISTINTO al anterior...
        if (hovered !== objetoActual) {
            // Restauramos el color del anterior
            if (objetoActual !== null) {
                objetoActual.material.color.setHex(coloresOriginales.get(objetoActual));
            }
            // Cambiamos color del nuevo
            if (hovered !== null) {
                hovered.material.color.set(generarColorHex());
            }
            objetoActual = hovered;
        }

        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}