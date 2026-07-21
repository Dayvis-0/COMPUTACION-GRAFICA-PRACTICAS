import * as THREE from 'three';
import { loadTexture } from '../core/AssetLoader.js';

export function createSphere() {
    const geometry = new THREE.SphereGeometry(0.8, 100, 100);
    const texture = loadTexture('./src/textures/esfera.png');
    const material = new THREE.MeshPhongMaterial({
        //color: 0xE56B43,
        map: texture,
        flatShading: true
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(3, 0, 0);
    sphere.castShadow = true;

    return sphere;
}