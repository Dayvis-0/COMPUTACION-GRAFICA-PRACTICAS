import * as THREE from 'three';

export function startAnimation(renderer, scene, camera, cube, controls) {

    function animate() {
        requestAnimationFrame(animate);

        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        controls.update();

        renderer.render(scene, camera);
    }

    animate();
}