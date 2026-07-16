import * as THREE from 'three';

export function createMaterialComparison() {
    const group = new THREE.Group();

    const geometry = new THREE.SphereGeometry(0.8, 32, 32);

    const materials = [
        new THREE.MeshBasicMaterial({ color: 0xE56B43 }),
        new THREE.MeshLambertMaterial({ color: 0xE56B43 }),
        new THREE.MeshPhongMaterial({ color: 0xE56B43, shininess: 80 }),
        new THREE.MeshStandardMaterial({ color: 0xE56B43, metalness: 0.3, roughness: 0.4 }),
        new THREE.MeshPhysicalMaterial({ color: 0xE56B43, metalness: 0.1, roughness: 0.2, clearcoat: 0.5 }),
    ];

    materials.forEach((material, i) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(-4 + i * 2, 0, 0);
        group.add(mesh);
    });

    return group;
}
