import * as THREE from 'three';

export function startAnimation(renderer, scene, camera, cube, sphere, plane) {

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // Guardamos los colores originales para restaurarlos
    const coloresOriginales = new Map();
    const objetos = [cube, sphere, plane].filter(obj => obj !== undefined);
    for (const obj of objetos) {
        coloresOriginales.set(obj, obj.material.color.getHex());
    }

    function generarColorHex() {
        const caracteres = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += caracteres[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    function onPointerMove(event) {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    window.addEventListener('pointermove', onPointerMove);

    function animate() {
        requestAnimationFrame(animate);

        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        sphere.rotation.x += 0.01;
        sphere.rotation.y += 0.01;

        // Raycaster: detectar hover
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(scene.children);

        // Restauramos colores originales a todos primero
        for (const [obj, color] of coloresOriginales) {
            obj.material.color.setHex(color);
        }

        // Cambiamos color al objeto bajo el mouse
        for (const intersect of intersects) {
            const objeto = intersect.object;
            if (coloresOriginales.has(objeto)) {
                objeto.material.color.set(generarColorHex());
            }
        }

        renderer.render(scene, camera);
    }

    animate();
}