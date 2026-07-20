'use strict';
/**
 * RetailEdge Pro — Live UI Video Producer
 * Captures the ACTUAL running frontend at http://localhost:5173
 * using real credentials and navigates through the live app.
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
console.log('📌 FFmpeg path:', ffmpegInstaller.path);

const SCRATCH     = path.join(__dirname, '..', 'scratch');
const PUBLIC      = path.join(__dirname, '..', 'frontend', 'public');
const FRAMES_DIR  = path.join(SCRATCH, 'live_ui_frames');

if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });
// Clean old frames
fs.readdirSync(FRAMES_DIR).filter(f => f.endsWith('.png'))
  .forEach(f => fs.unlinkSync(path.join(FRAMES_DIR, f)));
console.log('🧹 Cleaned old frames');

const wait = ms => new Promise(r => setTimeout(r, ms));

// Helper: set React input value via native setter + events
async function safeType(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 15000 });
  await page.click(selector);
  await page.evaluate((sel, txt) => {
    const input = document.querySelector(sel);
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, txt);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, selector, text);
}

// Scene definition: list of pages to capture with hold duration
const SCENES = [
  { label: 'Login Page',            url: null,                             hold: 3, waitFor: 'input[type="email"]' },
  { label: 'Admin Dashboard',       url: 'http://localhost:5173/dashboard',hold: 5, waitFor: 'nav' },
  { label: 'PM Dashboard',          url: 'http://localhost:5173/pm-dashboard', hold: 5, waitFor: 'nav' },
  { label: 'Quiz Builder',          url: 'http://localhost:5173/builder',  hold: 5, waitFor: 'nav' },
  { label: 'Users',                 url: 'http://localhost:5173/users',    hold: 4, waitFor: 'nav' },
  { label: 'Trainings',             url: 'http://localhost:5173/trainings',hold: 4, waitFor: 'nav' },
  { label: 'Certificates',          url: 'http://localhost:5173/certificates', hold: 4, waitFor: 'nav' },
  { label: 'Reports',               url: 'http://localhost:5173/reports',  hold: 5, waitFor: 'nav' },
  { label: 'Join Quiz (Mobile)',     url: 'http://localhost:5173/join',     hold: 4, waitFor: 'body', mobile: true },
];

async function captureScene(browser, puppeteer, sceneIdx, scene, frameOffset) {
  const { default: puppeteerPkg } = puppeteer;
  console.log(`\n📸 Scene ${sceneIdx + 1}/${SCENES.length}: ${scene.label}`);
  const page = await browser.newPage();

  if (scene.mobile) {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  } else {
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  }

  try {
    // Login first
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(1500);

    // Click Quick Fill — Admin
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.trim() === 'Admin');
      if (btn) { btn.click(); return true; }
      return false;
    });

    if (!clicked) {
      await safeType(page, 'input[type="email"]', 'admin@quizhive.com');
      await safeType(page, 'input[type="password"]', 'password123');
    }

    await wait(500);
    await page.click('button[type="submit"]');

    // Wait for sidebar (logged in)
    await page.waitForSelector('nav', { timeout: 20000 });
    await wait(1500);

    // Navigate to target URL
    if (scene.url) {
      await page.goto(scene.url, { waitUntil: 'networkidle0', timeout: 20000 }).catch(() => {});
      await page.waitForSelector(scene.waitFor || 'nav', { timeout: 10000 }).catch(() => {});
      await wait(4000); // let charts + animations render
    }

    // Capture multiple frames for this scene (creates smooth hold)
    const framesPerScene = Math.max(1, scene.hold * 2); // ~2 frames per second of hold
    const capturedFrames = [];
    for (let f = 0; f < framesPerScene; f++) {
      const frameIdx = frameOffset + f;
      const frameName = `frame_${String(frameIdx).padStart(4, '0')}_s${String(sceneIdx + 1).padStart(2, '0')}_f${f}.png`;
      const framePath = path.join(FRAMES_DIR, frameName);
      await page.screenshot({ path: framePath, type: 'png', fullPage: false });
      const kb = Math.round(fs.statSync(framePath).size / 1024);
      process.stdout.write(`  → ${frameName} [${kb}KB]\n`);
      capturedFrames.push({ path: framePath, holdSec: scene.hold / framesPerScene });
      if (f < framesPerScene - 1) await wait(500);
    }
    return capturedFrames;
  } catch (err) {
    console.error(`  ❌ Error on scene ${scene.label}:`, err.message);
    // Capture whatever is visible
    const frameName = `frame_${String(frameOffset).padStart(4, '0')}_s${String(sceneIdx + 1).padStart(2, '0')}_error.png`;
    const framePath = path.join(FRAMES_DIR, frameName);
    await page.screenshot({ path: framePath }).catch(() => {});
    return [{ path: framePath, holdSec: scene.hold }];
  } finally {
    await page.close();
  }
}

function buildConcatList(frames) {
  const concatPath = path.join(FRAMES_DIR, 'concat_list.txt');
  const lines = frames.map(f => `file '${f.path.replace(/\\/g, '/')}'\nduration ${f.holdSec}`);
  lines.push(`file '${frames[frames.length - 1].path.replace(/\\/g, '/')}'`);
  fs.writeFileSync(concatPath, lines.join('\n'));
  console.log(`\n📋 Concat list written.`);
  return concatPath;
}

function encodeVideo(concatPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatPath)
      .inputOptions(['-f concat', '-safe 0'])
      .videoCodec('libx264')
      .outputOptions(['-crf 18', '-preset medium', '-pix_fmt yuv420p', '-movflags +faststart', '-vf scale=1920:1080', '-r 30'])
      .output(outputPath)
      .on('start', c => console.log(`  ▶ Encoding started...`))
      .on('progress', p => {
        const pct = p.percent ? Math.min(100, Math.round(p.percent)) : 0;
        process.stdout.write(`\r  [${'█'.repeat(Math.round(pct / 2))}${'░'.repeat(50 - Math.round(pct / 2))}] ${pct}%  `);
      })
      .on('end', () => {
        console.log(`\n  ✅ Video saved → ${outputPath}`);
        const mb = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
        console.log(`  📦 Size: ${mb} MB`);
        resolve(outputPath);
      })
      .on('error', err => {
        console.error(`\n  ❌ Encode error: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

(async () => {
  console.time('⏱ Total production time');
  const { default: puppeteer } = await import('puppeteer');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080',
           '--disable-web-security', '--force-color-profile=srgb',
           '--disable-background-timer-throttling']
  });

  let allFrames = [];
  let frameOffset = 0;

  console.log('\n🎬 RetailEdge Pro — Live UI Video Production');
  console.log('═'.repeat(60));
  console.log(`📺 Capturing ${SCENES.length} live app scenes from http://localhost:5173`);
  console.log('═'.repeat(60));

  for (let i = 0; i < SCENES.length; i++) {
    const frames = await captureScene(browser, { default: puppeteer }, i, SCENES[i], frameOffset);
    allFrames = allFrames.concat(frames);
    frameOffset += frames.length;
  }

  await browser.close();
  console.log(`\n✅ Captured ${allFrames.length} frames total.`);

  const concatPath = buildConcatList(allFrames);
  const outputPath = path.join(PUBLIC, 'RetailEdge_Pro_LiveUI_Demo.mp4');

  console.log('\n🎞  Encoding final video...');
  await encodeVideo(concatPath, outputPath);

  console.log('\n' + '═'.repeat(60));
  console.log('🎉  DONE — RetailEdge Pro Live UI Demo Video');
  console.log('═'.repeat(60));
  console.log(`\n  📁 ${outputPath}`);
  console.log(`\n  🌐 http://localhost:5173/RetailEdge_Pro_LiveUI_Demo.mp4`);
  console.timeEnd('⏱ Total production time');
})();
