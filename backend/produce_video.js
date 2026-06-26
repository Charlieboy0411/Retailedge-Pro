'use strict';

const puppeteer = require('puppeteer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ===== CONFIGURATION =====
const CONFIG = {
  htmlPath: path.join(__dirname, '..', 'scratch', 'video_animation.html'),
  outputDir: path.join(__dirname, '..', 'frontend', 'public'),
  framesDir: path.join(__dirname, '..', 'scratch', 'video_frames'),
  width: 1920,
  height: 1080,
  fps: 24,
  outputFile: 'RetailEdge_Pro_Conference_Video.mp4',
  // Total duration: 22 scenes × 15s + scene12 = 20s → 335s total
  totalDurationMs: 335000,
  // Capture every Nth frame (1 = every frame, 2 = every 2nd frame for speed)
  captureIntervalMs: Math.round(1000 / 24), // ~41ms for 24fps
};

// ===== SETUP =====
if (!fs.existsSync(CONFIG.framesDir)) {
  fs.mkdirSync(CONFIG.framesDir, { recursive: true });
}

// Clean old frames
// const oldFrames = fs.readdirSync(CONFIG.framesDir).filter(f => f.endsWith('.png'));
// console.log(`🧹 Cleaning ${oldFrames.length} old frames...`);
// oldFrames.forEach(f => fs.unlinkSync(path.join(CONFIG.framesDir, f)));

async function captureFrames() {
  console.log('\n🎬 RetailEdge Pro — Video Production Pipeline');
  console.log('═'.repeat(60));
  console.log(`📐 Resolution: ${CONFIG.width}x${CONFIG.height}`);
  console.log(`🎞  Frame Rate: ${CONFIG.fps} fps`);
  console.log(`⏱  Duration:   ${CONFIG.totalDurationMs / 1000}s (${Math.round(CONFIG.totalDurationMs / 1000 / 60)} min ${Math.round(CONFIG.totalDurationMs / 1000 % 60)} sec)`);
  console.log(`📦 Output:     ${CONFIG.outputFile}`);
  console.log('═'.repeat(60));

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--window-size=${CONFIG.width},${CONFIG.height}`,
      '--disable-web-security',
      '--allow-file-access-from-files',
      '--disable-features=VizDisplayCompositor',
      '--run-all-compositor-stages-before-draw',
      '--disable-threaded-animation',
      '--disable-threaded-scrolling',
      '--disable-checker-imaging',
      '--disable-image-animation-resync',
      '--force-color-profile=srgb',
    ],
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: CONFIG.width,
    height: CONFIG.height,
    deviceScaleFactor: 1,
  });

  // Load the animation HTML
  const fileUrl = 'file:///' + CONFIG.htmlPath.replace(/\\/g, '/');
  console.log(`\n📂 Loading: ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for fonts and images to load
  await new Promise(r => setTimeout(r, 3000));

  // ===== FRAME CAPTURE LOOP =====
  const totalFrames = Math.ceil((CONFIG.totalDurationMs / 1000) * CONFIG.fps);
  const msPerFrame = 1000 / CONFIG.fps;

  console.log(`\n🎥 Capturing ${totalFrames} frames at ${CONFIG.fps}fps...`);
  console.log('Progress: [' + ' '.repeat(50) + '] 0%');

  let frameCount = 0;
  let lastScene = 0;

  for (let frame = 0; frame < totalFrames; frame++) {
    const framePath = path.join(CONFIG.framesDir, `frame_${String(frame).padStart(6, '0')}.png`);
    if (fs.existsSync(framePath)) {
      continue;
    }

    if (frameCount > 0 && frameCount % 500 === 0) {
      console.log('\n🔄 Refreshing page to prevent memory leaks...');
      await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
    }

    // Calculate what time in the video this frame represents
    const videoTimeMs = frame * msPerFrame;

    // Manipulate the scene timing via JS injection (time-warp approach)
    // Instead of waiting real-time, we advance the video state programmatically
    await page.evaluate((targetTimeMs) => {
      // Override the scene timing to jump to targetTimeMs
      const durations = window.__videoMeta.durations;
      let accumulated = 0;
      let targetScene = 1;
      let timeInScene = 0;

      for (let i = 0; i < durations.length; i++) {
        if (accumulated + durations[i] > targetTimeMs) {
          targetScene = i + 1;
          timeInScene = targetTimeMs - accumulated;
          break;
        }
        accumulated += durations[i];
        if (i === durations.length - 1) {
          targetScene = durations.length;
          timeInScene = durations[i];
        }
      }

      // Update scene if needed
      const currentScene = window.__videoMeta.currentScene();
      if (targetScene !== currentScene) {
        // Activate the correct scene
        const prev = document.getElementById(`scene${currentScene}`);
        const next = document.getElementById(`scene${targetScene}`);
        if (prev) prev.classList.remove('active');
        if (next) next.classList.add('active');
        window.__currentSceneOverride = targetScene;
      }

      // Update progress bar
      const total = durations.reduce((a, b) => a + b, 0);
      const pct = Math.min(100, (targetTimeMs / total) * 100);
      const pb = document.getElementById('progress-bar');
      if (pb) pb.style.width = pct + '%';

      // Update scene counter
      const sc = document.getElementById('scene-counter');
      if (sc) sc.textContent = `${String(targetScene).padStart(2, '0')} / 22`;

    }, videoTimeMs);

    // Capture frame
    await page.screenshot({ path: framePath, type: 'png', fullPage: false });
    frameCount++;

    // Progress report every 24 frames (1 second)
    if (frame % CONFIG.fps === 0) {
      const pct = Math.round((frame / totalFrames) * 100);
      const filled = Math.round(pct / 2);
      const bar = '█'.repeat(filled) + '░'.repeat(50 - filled);
      const currentScene = await page.evaluate(() => window.__currentSceneOverride || window.__videoMeta.currentScene());
      process.stdout.write(`\rProgress: [${bar}] ${pct}% | Scene ${currentScene}/22 | Frame ${frame}/${totalFrames}  `);
    }
  }

  await browser.close();

  console.log(`\n\n✅ Frame capture complete! ${frameCount} frames saved.`);
  return frameCount;
}

async function encodeVideo(frameCount) {
  console.log('\n🎞  Encoding video with FFmpeg...');
  console.log('═'.repeat(60));

  const outputPath = path.join(CONFIG.outputDir, CONFIG.outputFile);
  const framesPattern = path.join(CONFIG.framesDir, 'frame_%06d.png');

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(framesPattern)
      .inputOptions([
        `-framerate ${CONFIG.fps}`,
      ])
      .videoCodec('libx264')
      .outputOptions([
        '-pix_fmt yuv420p',
        '-preset slow',
        '-crf 18',           // High quality (0=lossless, 51=worst)
        '-movflags +faststart',
        `-vf scale=${CONFIG.width}:${CONFIG.height}`,
      ])
      .output(outputPath)
      .on('start', cmd => console.log(`\n▶ FFmpeg started: ${cmd.substring(0, 100)}...`))
      .on('progress', p => {
        const pct = p.percent ? Math.round(p.percent) : 0;
        const filled = Math.round(pct / 2);
        process.stdout.write(`\rEncoding: [${'█'.repeat(filled)}${'░'.repeat(50 - filled)}] ${pct}%  `);
      })
      .on('end', () => {
        console.log('\n\n✅ Video encoding complete!');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('\n❌ FFmpeg error:', err.message);
        reject(err);
      })
      .run();
  });
}

async function createExecVersion(fullVideoPath) {
  console.log('\n📽  Creating Executive Version (2-min)...');
  // Extract first 120s (scenes 1-8) for executive version
  const execPath = path.join(CONFIG.outputDir, 'RetailEdge_Pro_Executive_Video.mp4');

  return new Promise((resolve, reject) => {
    ffmpeg(fullVideoPath)
      .setDuration(120)
      .videoCodec('libx264')
      .outputOptions(['-pix_fmt yuv420p', '-preset fast', '-crf 20', '-movflags +faststart'])
      .output(execPath)
      .on('end', () => { console.log('✅ Executive version created'); resolve(execPath); })
      .on('error', err => { console.warn('⚠ Executive version skipped:', err.message); resolve(null); })
      .run();
  });
}

async function createLoopVersion(fullVideoPath) {
  console.log('\n🔄 Creating Booth Loop Version (90-sec)...');
  const loopPath = path.join(CONFIG.outputDir, 'RetailEdge_Pro_Booth_Loop.mp4');

  return new Promise((resolve, reject) => {
    ffmpeg(fullVideoPath)
      .setDuration(90)
      .videoCodec('libx264')
      .outputOptions(['-pix_fmt yuv420p', '-preset fast', '-crf 22', '-movflags +faststart'])
      .output(loopPath)
      .on('end', () => { console.log('✅ Booth loop version created'); resolve(loopPath); })
      .on('error', err => { console.warn('⚠ Booth loop skipped:', err.message); resolve(null); })
      .run();
  });
}

async function copyToDist(files) {
  const distDir = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(distDir)) {
    for (const f of files) {
      if (f && fs.existsSync(f)) {
        const dest = path.join(distDir, path.basename(f));
        fs.copyFileSync(f, dest);
        console.log(`📋 Copied to dist: ${path.basename(f)}`);
      }
    }
  }
}

async function printSummary(files) {
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 PRODUCTION COMPLETE — RetailEdge Pro Video Suite');
  console.log('═'.repeat(60));

  for (const f of files) {
    if (f && fs.existsSync(f)) {
      const stats = fs.statSync(f);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
      console.log(`\n  📁 ${path.basename(f)}`);
      console.log(`     Size: ${sizeMB} MB`);
      console.log(`     Path: ${f}`);
    }
  }

  console.log('\n🌐 Download Links (Local Dev Server):');
  console.log('  Full Video:       http://localhost:5173/RetailEdge_Pro_Conference_Video.mp4');
  console.log('  Executive (2min): http://localhost:5173/RetailEdge_Pro_Executive_Video.mp4');
  console.log('  Booth Loop:       http://localhost:5173/RetailEdge_Pro_Booth_Loop.mp4');
  console.log('\n' + '═'.repeat(60));
}

// ===== MAIN PIPELINE =====
(async () => {
  try {
    console.time('⏱ Total production time');

    // Stage 1: Capture frames
    const frameCount = await captureFrames();

    // Stage 2: Encode full video
    const fullVideoPath = await encodeVideo(frameCount);

    // Stage 3: Create cut-down versions
    const execPath = await createExecVersion(fullVideoPath);
    const loopPath = await createLoopVersion(fullVideoPath);

    // Stage 4: Copy to dist
    await copyToDist([fullVideoPath, execPath, loopPath]);

    // Stage 5: Summary
    await printSummary([fullVideoPath, execPath, loopPath]);

    console.timeEnd('⏱ Total production time');

  } catch (err) {
    console.error('\n❌ Production pipeline error:', err);
    process.exit(1);
  }
})();
