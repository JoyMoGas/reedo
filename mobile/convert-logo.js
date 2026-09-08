const fs = require('fs');
const path = require('path');

// Try to find sharp
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  try {
    // try to find it inside expo's dependencies
    sharp = require(path.join(__dirname, 'node_modules', '@expo', 'image-utils', 'node_modules', 'sharp'));
  } catch (e2) {
    console.error("Could not find sharp module.");
    process.exit(1);
  }
}

sharp(path.join(__dirname, 'assets', 'LOGO.svg'))
  .resize(1024, 1024)
  .png()
  .toFile(path.join(__dirname, 'assets', 'LOGO.png'))
  .then(() => console.log('Successfully converted LOGO.svg to LOGO.png'))
  .catch(err => {
    console.error('Error converting image:', err);
    process.exit(1);
  });
