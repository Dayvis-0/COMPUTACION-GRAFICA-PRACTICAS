import * as THREE from 'three';

export function startAnimation(renderer, scene, camera, cube) {
    const orbitRadius = 5;
    const orbitSpeed = 0.5;

    function animate() {
        requestAnimationFrame(animate);

        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        // Movimiento orbital simple: cámara gira alrededor del origen
        const time = performance.now() * 0.001; // segundos
        camera.position.x = orbitRadius * Math.sin(time * orbitSpeed);
        camera.position.z = orbitRadius * Math.cos(time * orbitSpeed);
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }

    animate();
}