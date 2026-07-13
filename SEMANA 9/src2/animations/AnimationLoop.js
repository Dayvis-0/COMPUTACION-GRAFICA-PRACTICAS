import * as THREE from 'three';

export function startAnimation(renderer, scene, camera, cube, sphere, plane) {

    function animate() {
        requestAnimationFrame(animate);
        
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        sphere.rotation.x += 0.01;
        sphere.rotation.y += 0.01;

        const time = Date.now() * 0.002;
        cube.material.color.setHSL(Math.sin(time) * 0.5 + 0.5, 1, 0.5);
        sphere.material.color.setHSL(Math.sin(time) * 0.5 + 0.5, 1, 0.5);

        renderer.render(scene, camera);
    }

    animate();
}