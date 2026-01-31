const fs = require('fs');
const path = require('path');

const files = [
  'buildingCatalog.js',
  'saveAdapter.js',
  'buildTool.js',
  'game.js',
  'map.png',
  'favicon.ico'
];

const distDir = 'dist';

files.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(__dirname, distDir, file);

  try {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to dist/`);
  } catch (err) {
    console.error(`Error copying ${file}:`, err);
    process.exit(1);
  }
});

console.log('Post-build copy completed successfully!');