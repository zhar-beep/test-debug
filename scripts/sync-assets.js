/**
 * Asset Synchronizer
 * Keeps root web files (./index.html, ./styles.css, ./app.js, ./assets)
 * and Android Assets (./app/src/main/assets/web/) strictly synchronized.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const androidWebDir = path.join(rootDir, 'app', 'src', 'main', 'assets', 'web');

const coreFiles = ['index.html', 'styles.css', 'app.js'];

console.log('🔄 ==============================================');
console.log('🔄 SYNCING WEB ASSETS: ROOT <-> ANDROID ASSETS');
console.log('🔄 ==============================================');

coreFiles.forEach(file => {
  const rootFile = path.join(rootDir, file);
  const androidFile = path.join(androidWebDir, file);

  if (!fs.existsSync(rootFile) && fs.existsSync(androidFile)) {
    fs.copyFileSync(androidFile, rootFile);
    console.log(`  ⬅️ [COPIED] ${file} (Android -> Root)`);
  } else if (fs.existsSync(rootFile) && !fs.existsSync(androidFile)) {
    fs.copyFileSync(rootFile, androidFile);
    console.log(`  ➡️ [COPIED] ${file} (Root -> Android)`);
  } else if (fs.existsSync(rootFile) && fs.existsSync(androidFile)) {
    const rootStat = fs.statSync(rootFile);
    const androidStat = fs.statSync(androidFile);

    if (rootStat.mtimeMs > androidStat.mtimeMs) {
      fs.copyFileSync(rootFile, androidFile);
      console.log(`  ➡️ [UPDATED] ${file} (Root is newer -> Android Assets)`);
    } else if (androidStat.mtimeMs > rootStat.mtimeMs) {
      fs.copyFileSync(androidFile, rootFile);
      console.log(`  ⬅️ [UPDATED] ${file} (Android Assets is newer -> Root)`);
    } else {
      console.log(`  ✅ [IN SYNC] ${file}`);
    }
  }
});

// Synchronize assets directory (emojis and wallpaper)
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      let shouldCopy = false;
      if (!fs.existsSync(destPath)) {
        shouldCopy = true;
      } else {
        const srcStat = fs.statSync(srcPath);
        const destStat = fs.statSync(destPath);
        if (srcStat.mtimeMs > destStat.mtimeMs) shouldCopy = true;
      }
      if (shouldCopy) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

const rootAssets = path.join(rootDir, 'assets');
const androidAssets = path.join(androidWebDir, 'assets');

if (fs.existsSync(rootAssets)) {
  copyDirSync(rootAssets, androidAssets);
  console.log('  ✅ [ASSETS] assets/ synced to app/src/main/assets/web/assets/');
}

console.log('\n🎉 Synchronization complete! All web assets are 100% matched.\n');
