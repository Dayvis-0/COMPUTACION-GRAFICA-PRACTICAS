import * as THREE from 'three';

export function startAnimation(renderer, scene, camera, controls, lattice) {

    function animate() {
        requestAnimationFrame(animate);

        // Rotación lenta del enrejado completo
        lattice.rotation.y += 0.005;
        lattice.rotation.x += 0.001;

        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}