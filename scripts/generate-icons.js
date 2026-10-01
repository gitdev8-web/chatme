import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Find source logo
const logoPath = path.resolve('public/logo.png');
const altLogo = path.resolve('src/assets/images/devchat_neon_logo_1790843364772.jpg');
const source = fs.existsSync(logoPath) ? logoPath : (fs.existsSync(altLogo) ? altLogo : null);

if (source) {
  console.log(`Using official DEV CHAT logo from: ${source}`);
  try {
    execSync(`convert "${source}" -resize 512x512 "${path.join(publicDir, 'pwa-512x512.png')}"`);
    execSync(`convert "${source}" -resize 192x192 "${path.join(publicDir, 'pwa-192x192.png')}"`);
    execSync(`convert "${source}" -resize 180x180 "${path.join(publicDir, 'apple-touch-icon.png')}"`);
    execSync(`convert "${source}" -resize 32x32 "${path.join(publicDir, 'favicon-32x32.png')}"`);
    execSync(`convert "${source}" -resize 16x16 "${path.join(publicDir, 'favicon-16x16.png')}"`);
    execSync(`convert "${source}" -define icon:auto-resize=64,48,32,16 "${path.join(publicDir, 'favicon.ico')}"`);
    execSync(`convert "${source}" -resize 410x410 -background "#031c11" -gravity center -extent 512x512 "${path.join(publicDir, 'pwa-maskable-512x512.png')}"`);
    if (!fs.existsSync(logoPath)) {
      execSync(`convert "${source}" -resize 512x512 "${logoPath}"`);
    }
    console.log('Successfully generated all PWA icons and favicons from DEV CHAT logo!');
  } catch (err) {
    console.error('Error running convert:', err);
  }
} else {
  console.warn('Source logo not found.');
}
