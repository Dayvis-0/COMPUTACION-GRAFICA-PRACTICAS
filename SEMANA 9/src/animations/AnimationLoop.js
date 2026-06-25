import * as THREE from 'three';

export function startAnimation(renderer, scene, camera, cube) {

    function animate() {
        requestAnimationFrame(animate);
        
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }

    animate();
}