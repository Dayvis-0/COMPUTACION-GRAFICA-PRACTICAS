import * as THREE from 'three';

export function createRenderer(container) {
    const renderer = new THREE.WebGLRenderer({antialias: true});

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;

    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // BasicShadowMap PCFShadowMap PCFShadowMap VSMShadowMap 

    return renderer;
}