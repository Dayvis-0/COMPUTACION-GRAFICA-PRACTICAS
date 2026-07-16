import * as THREE from 'three';

export function createLights(scene) {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);

    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;

    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffaa00, 2, 10, 2);
    pointLight.position.set(0, 2, 2);
    scene.add(pointLight);

    const helper = new THREE.PointLightHelper(pointLight, 0.5);
    scene.add(helper);

    const spotLight = new THREE.SpotLight(0xffffff, 100, 20, Math.PI / 6, 0.5, 1);
    spotLight.position.set(4, 6, 4);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    const spotHelper = new THREE.SpotLightHelper(spotLight);
    scene.add(spotHelper);

    // ============================================================
    // PointLight(color, intensity, distance, decay)
    // ============================================================
    //
    // intensity (default: 1):
    //   Brillo de la luz. A mayor valor, más ilumina los objetos.
    //   Probá: 0.5, 2, 5, 10
    //
    // distance (default: 0 = infinito):
    //   Alcance máximo de la luz. Más allá no afecta objetos.
    //   Probá: 3, 5, 10, 0
    //
    // decay (default: 2):
    //   Atenuación con distancia. 0 = no decae, 1 = lineal, 2 = cuadrática.
    //   Probá: 0, 1, 2
    //
    // CÓMO EXPLORAR:
    //   1. Cambiá UN parámetro a la vez.
    //   2. Mové pointLight.position.set(x, y, z).
    //   3. Desactivá otras luces (comentá scene.add) para ver el efecto puro.
    // ============================================================
    //
    // ============================================================
    // SpotLight(color, intensity, distance, angle, penumbra, decay)
    // ============================================================
    //
    // angle (default: Math.PI/3):
    //   Ángulo del cono de luz. Más chico = haz más angosto.
    //   Probá: 0.2, Math.PI/4, Math.PI/2
    //
    // penumbra (default: 0):
    //   Suavizado del borde del cono. 0 = borde duro, 1 = borde difuso.
    //   Probá: 0, 0.3, 0.7, 1
    //
    // target:
    //   Hacia dónde apunta. Mové spotLight.target.position.set(x, y, z).
    //
    // CÓMO EXPLORAR:
    //   1. Cambiá angle para controlar el ancho del haz.
    //   2. angle chico + penumbra alta → haz enfocado con bordes suaves.
    //   3. Mové el target para apuntar a distintos objetos.
    //   4. Apagá otras luces para ver el efecto puro.
    // ============================================================
}