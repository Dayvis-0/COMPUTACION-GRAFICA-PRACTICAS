import * as THREE from 'three';

export function startAnimation(renderer, scene, camera, controls, cube, sphere, cylinder) {

    let anguloCubo = 0;
    let anguloCilindro = 0;
    const radioCubo = 2.5;
    const radioCilindro = 5;
    const velCubo = 0.02;
    const velCilindro = -0.015;

    function animate() {
        requestAnimationFrame(animate);

        // Órbita del cubo alrededor de la esfera
        anguloCubo += velCubo;
        cube.position.x = radioCubo * Math.cos(anguloCubo);
        cube.position.z = radioCubo * Math.sin(anguloCubo);

        // Órbita del cilindro alrededor de la esfera
        anguloCilindro += velCilindro;
        cylinder.position.x = radioCilindro * Math.cos(anguloCilindro);
        cylinder.position.z = radioCilindro * Math.sin(anguloCilindro);

        // Auto-rotación de cada objeto
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        cylinder.rotation.y += 0.01;
        sphere.rotation.y += 0.005;

        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}