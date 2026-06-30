import * as THREE from 'three';

export function startAnimation(renderer, scene, camera, controls, pivotGroup) {

    let tiempo = 0;

    // Referencias a los hijos (orden: cube, sphere, cylinder)
    const cube = pivotGroup.children[0];
    const sphere = pivotGroup.children[1];
    const cylinder = pivotGroup.children[2];

    function animate() {
        requestAnimationFrame(animate);
        tiempo += 0.03;

        // Órbita: rotar el grupo entero → todos los objetos giran alrededor del centro
        pivotGroup.rotation.y += 0.01;

        // 1. Escalado del cilindro en Y
        cylinder.scale.y = 1 + Math.abs(Math.sin(tiempo * 0.2));
        
        // 2. Rotacion del cubo en X e Y (sobre su propio eje)
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        // 3. Rebote de la esfera en Y
        sphere.position.y = Math.abs(Math.sin(tiempo * 0.5)) * 2;

        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}