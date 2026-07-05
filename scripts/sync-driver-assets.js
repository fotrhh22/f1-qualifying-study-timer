const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const srcDir = path.join(__dirname, '../public/image');
const destDirs = [
  path.join(__dirname, '../ios/App/App/Assets.xcassets'),
  path.join(__dirname, '../ios/App/F1TimerWidget/Assets.xcassets')
].filter(dir => fs.existsSync(dir));

if (!fs.existsSync(srcDir)) {
  console.error(`Source directory ${srcDir} does not exist.`);
  process.exit(1);
}

if (destDirs.length === 0) {
  console.error(`None of the destination Asset Catalogs exist.`);
  process.exit(1);
}

// Clean up old synced imagesets to prevent leftovers
destDirs.forEach(dir => {
  console.log(`Cleaning old synced assets in ${dir}...`);
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    if (item.startsWith('2026') && item.endsWith('.imageset')) {
      const fullPath = path.join(dir, item);
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  });
});

// Accept source AVIFs and PNGs. PNG is preferred when both exist.
const sourceFiles = fs.readdirSync(srcDir).filter(f => /\.(avif|png)$/i.test(f));
const filesByBaseName = new Map();
sourceFiles.forEach(file => {
  const extension = path.extname(file).toLowerCase();
  const baseName = path.basename(file, extension);
  if (!filesByBaseName.has(baseName) || extension === '.png') {
    filesByBaseName.set(baseName, file);
  }
});
const files = [...filesByBaseName.values()];

console.log(`Found ${files.length} image files to synchronize.`);

files.forEach(file => {
  const baseName = path.basename(file, path.extname(file));
  const srcFilePath = path.join(srcDir, file);

  destDirs.forEach(destDir => {
    const imagesetDir = path.join(destDir, `${baseName}.imageset`);

    // Create .imageset folder
    if (!fs.existsSync(imagesetDir)) {
      fs.mkdirSync(imagesetDir, { recursive: true });
    }

    const renditions = [
      { scale: '1x', size: 48, filename: `${baseName}.png` },
      { scale: '2x', size: 96, filename: `${baseName}@2x.png` },
      { scale: '3x', size: 144, filename: `${baseName}@3x.png` },
    ];

    try {
      renditions.forEach(({ size, filename }) => {
        execFileSync('sips', [
          '-s', 'format', 'png',
          '-z', String(size), String(size),
          srcFilePath,
          '--out', path.join(imagesetDir, filename),
        ], { stdio: 'ignore' });
      });
    } catch (err) {
      console.error(`Failed to prepare ${file} using sips:`, err.message);
      return;
    }

    // Write Contents.json referencing the PNG file
    const contentsJson = {
      images: renditions.map(({ filename, scale }) => ({
        filename,
        idiom: 'universal',
        scale,
      })),
      info: {
        author: "xcode",
        version: 1
      },
      properties: {
        'template-rendering-intent': 'original'
      }
    };

    fs.writeFileSync(
      path.join(imagesetDir, 'Contents.json'),
      JSON.stringify(contentsJson, null, 2)
    );
  });

  console.log(`Successfully converted and synced: ${baseName}.imageset (PNG)`);
});

console.log('Synchronization and conversion complete!');
