import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const textureLoader = new THREE.TextureLoader();

export function loadTexture(path) {
    return textureLoader.load(path);
}

const gltfLoader = new GLTFLoader();

 export function loadGLTF(path) {
    return new  Promise(
        (resolve, reject) => {
            gltfLoader.load(
                path, 
                (gltf) => {
                    resolve(
                        gltf.scene
                    );
                },
                undefined,
                reject
            );
        }
    );
 }