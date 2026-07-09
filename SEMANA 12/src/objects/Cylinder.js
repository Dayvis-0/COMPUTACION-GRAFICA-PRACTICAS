import * as THREE from 'three';
import { loadTexture } from '../core/AssetLoader.js';

export function createCylinder() {
    const geometry = new THREE.CylinderGeometry(1, 1, 2, 32);
    const texture = loadTexture('./src/textures/wood.png');
    const material = new THREE.MeshPhysicalMaterial({
        //color: 0xD1D134,
        map: texture,
    });

    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.set(-3, 0, 0);
    cylinder.castShadow = true;

    return cylinder;
}