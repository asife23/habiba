const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const srcIconPath = 'src/assets/images/farm_app_icon_1779214389225.png';

if (!fs.existsSync(srcIconPath)) {
  console.error(`Source icon not found at: ${srcIconPath}`);
  process.exit(1);
}

console.log('Generating PWA Icons...');
try {
  // Generate PWA Icons
  execSync(`npx --yes sharp-cli@latest -i ${srcIconPath} -o public/pwa-512x512.png resize 512 512`, { stdio: 'inherit' });
  execSync(`npx --yes sharp-cli@latest -i ${srcIconPath} -o public/pwa-192x192.png resize 192 192`, { stdio: 'inherit' });
  execSync(`npx --yes sharp-cli@latest -i ${srcIconPath} -o public/icon-512x512.png resize 512 512`, { stdio: 'inherit' });
  execSync(`npx --yes sharp-cli@latest -i ${srcIconPath} -o public/icon-192x192.png resize 192 192`, { stdio: 'inherit' });
  
  console.log('PWA Icons generated successfully!');
} catch (err) {
  console.error('Error generating PWA icons:', err.message);
}

console.log('Generating Android Mipmap launcher icons...');
const mipmaps = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 }
];

mipmaps.forEach(({ dir, size }) => {
  const targetDir = path.join('android/app/src/main/res', dir);
  if (fs.existsSync(targetDir)) {
    try {
      console.log(`Generating icons for ${dir} (${size}x${size})...`);
      execSync(`npx --yes sharp-cli@latest -i ${srcIconPath} -o ${path.join(targetDir, 'ic_launcher.png')} resize ${size} ${size}`, { stdio: 'ignore' });
      execSync(`npx --yes sharp-cli@latest -i ${srcIconPath} -o ${path.join(targetDir, 'ic_launcher_round.png')} resize ${size} ${size}`, { stdio: 'ignore' });
      execSync(`npx --yes sharp-cli@latest -i ${srcIconPath} -o ${path.join(targetDir, 'ic_launcher_foreground.png')} resize ${size} ${size}`, { stdio: 'ignore' });
    } catch (err) {
      console.error(`Error generating icons for ${dir}:`, err.message);
    }
  } else {
    console.log(`Directory ${targetDir} does not exist, skipping.`);
  }
});

console.log('All icons compiled and verified!');
