const fs = require('fs');
const path = require('path');

const itemsToCopy = [
  // Legacy files (kept for now)
  'buildingCatalog.js',
  'saveAdapter.js',
  'buildTool.js',
  'game.js',
  'map.png',
  'favicon.ico',

  // Remake foundation content
  'data',
  'assets'
];

const distDir = 'dist';

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

itemsToCopy.forEach(item => {
  const src = path.join(__dirname, item);
  const dest = path.join(__dirname, distDir, item);

  try {
    copyRecursive(src, dest);
    console.log(`Copied ${item} to dist/`);
  } catch (err) {
    console.error(`Error copying ${item}:`, err);
    process.exit(1);
  }
});

console.log('Post-build copy completed successfully!');