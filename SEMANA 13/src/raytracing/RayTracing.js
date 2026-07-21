import * as THREE from 'three';
import { pointShadow } from 'three/src/nodes/TSL.js';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export function getRaycaster() {
    return raycaster;
}

export function getPointer() {
    return pointer;
}