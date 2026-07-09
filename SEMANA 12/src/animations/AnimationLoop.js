import * as THREE from 'three';

export function startAnimation(renderer, scene, camera, controls, cube, sphere, cylinder) {

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