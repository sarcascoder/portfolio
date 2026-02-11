/**
 * ICE TEXTURE - Generates a streaky/frosty canvas texture
 * Used for the smiley face overlay on Mercury
 */

import * as THREE from 'three';

export function generateIceTexture({ size = 512, repeat = 1.6 } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base: off-white with slight blue tint
    ctx.fillStyle = 'rgba(220, 235, 245, 1)';
    ctx.fillRect(0, 0, size, size);

    // Streaky frost lines
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 120; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const len = 20 + Math.random() * 80;
        const angle = (Math.random() - 0.5) * 0.6; // mostly horizontal streaks

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.strokeStyle = `rgba(180, 210, 240, ${0.3 + Math.random() * 0.5})`;
        ctx.lineWidth = 0.5 + Math.random() * 1.5;
        ctx.beginPath();
        ctx.moveTo(-len / 2, 0);
        ctx.lineTo(len / 2, 0);
        ctx.stroke();
        ctx.restore();
    }

    // Soft noise spots
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 300; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 1 + Math.random() * 4;
        ctx.fillStyle = `rgba(200, 220, 240, ${0.3 + Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    return texture;
}
