const fs = require('fs');
const { createCanvas } = require('canvas');

// Create 16x16 icon
const canvas16 = createCanvas(16, 16);
const ctx16 = canvas16.getContext('2d');
ctx16.fillStyle = '#4285f4';
ctx16.fillRect(0, 0, 16, 16);
ctx16.fillStyle = '#fff';
ctx16.font = '8px Arial';
ctx16.fillText('T', 4, 12);
const buffer16 = canvas16.toBuffer('image/png');
fs.writeFileSync('icons/icon16.png', buffer16);

// Create 48x48 icon
const canvas48 = createCanvas(48, 48);
const ctx48 = canvas48.getContext('2d');
ctx48.fillStyle = '#4285f4';
ctx48.fillRect(0, 0, 48, 48);
ctx48.fillStyle = '#fff';
ctx48.font = '20px Arial';
ctx48.fillText('T', 14, 34);
const buffer48 = canvas48.toBuffer('image/png');
fs.writeFileSync('icons/icon48.png', buffer48);

// Create 128x128 icon
const canvas128 = createCanvas(128, 128);
const ctx128 = canvas128.getContext('2d');
ctx128.fillStyle = '#4285f4';
ctx128.fillRect(0, 0, 128, 128);
ctx128.fillStyle = '#fff';
ctx128.font = '50px Arial';
ctx128.fillText('T', 40, 90);
const buffer128 = canvas128.toBuffer('image/png');
fs.writeFileSync('icons/icon128.png', buffer128);

console.log('Icons created successfully');