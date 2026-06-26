'use strict';

const puppeteer = require('puppeteer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const CONFIG = {
  htmlPath: path.join(__dirname, '..', 'scratch', 'cinematic_demo_animation.html'),
  outputDir: path.join(__dirname, '..', 'frontend', 'public'),
  framesDir: path.join(__dirname, '..', 'scratch', 'cinematic_frames'),
  voiceoverDir: path.join(__dirname, '..', 'scratch', 'voiceovers'),
  width: 1920,
  height: 1080,
  fps: 30, // PRD specifies 30 FPS
  outputFile: 'RetailEdge_Pro_Conference_Demo.mp4',
  totalDurationMs: 156000, // 156 seconds total
};

const SCENE_TIMINGS = [
  { id: 'scene1', startMs: 0 },
  { id: 'scene2', startMs: 10000 },
  { id: 'scene3', startMs: 20000 },
  { id: 'scene4', startMs: 28000 },
  { id: 'scene5', startMs: 36000 },
  { id: 'scene6', startMs: 44000 },
  { id: 'scene7', startMs: 52000 },
  { id: 'scene8', startMs: 60000 },
  { id: 'scene9', startMs: 68000 },
  { id: 'scene10', startMs: 76000 },
  { id: 'scene11', startMs: 96000 },
  { id: 'scene12', startMs: 116000 },
  { id: 'scene13', startMs: 126000 },
  { id: 'scene14', startMs: 136000 },
  { id: 'scene15', startMs: 146000 }
];

if (!fs.existsSync(CONFIG.framesDir)) fs.mkdirSync(CONFIG.framesDir, { recursive: true });

// Clean old frames (disabled to allow resume)
// const oldFrames = fs.readdirSync(CONFIG.framesDir).filter(f => f.endsWith('.png'));
// console.log(`🧹 Cleaning ${oldFrames.length} old cinematic frames...`);
// oldFrames.forEach(f => fs.unlinkSync(path.join(CONFIG.framesDir, f)));

async function captureFrames() {
  console.log('\n🎬 RetailEdge Pro Cinematic Production');
  console.log('═'.repeat(60));
  
  const browser = await puppeteer.launch({
    headless: 'new',
    protocolTimeout: 180000,
    timeout: 180000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', `--window-size=${CONFIG.width},${CONFIG.height}`]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: CONFIG.width, height: CONFIG.height, deviceScaleFactor: 1 });

  const fileUrl = 'file:///' + CONFIG.htmlPath.replace(/\\/g, '/');
  console.log(`\n📂 Loading: ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const totalFrames = Math.ceil((CONFIG.totalDurationMs / 1000) * CONFIG.fps);
  const msPerFrame = 1000 / CONFIG.fps;

  console.log(`\n🎥 Capturing ${totalFrames} frames at ${CONFIG.fps}fps...`);

  let frameCount = 0;
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

    const videoTimeMs = frame * msPerFrame;

    await page.evaluate((targetTimeMs) => {
      const durations = window.__videoMeta.durations;
      let accumulated = 0;
      let targetScene = 1;

      for (let i = 0; i < durations.length; i++) {
        if (accumulated + durations[i] > targetTimeMs) {
          targetScene = i + 1;
          break;
        }
        accumulated += durations[i];
        if (i === durations.length - 1) {
          targetScene = durations.length;
        }
      }

      const currentScene = window.__videoMeta.currentScene();
      if (targetScene !== currentScene) {
        const prev = document.getElementById(`scene${currentScene}`);
        const next = document.getElementById(`scene${targetScene}`);
        if (prev) prev.classList.remove('active');
        if (next) next.classList.add('active');
      }

      const total = durations.reduce((a, b) => a + b, 0);
      const pb = document.getElementById('progress-bar');
      if (pb) pb.style.width = Math.min(100, (targetTimeMs / total) * 100) + '%';
    }, videoTimeMs);

    await page.screenshot({ path: framePath, type: 'png' });
    frameCount++;

    if (frame % CONFIG.fps === 0) {
      const pct = Math.round((frame / totalFrames) * 100);
      process.stdout.write(`\rProgress: ${pct}% | Frame ${frame}/${totalFrames}  `);
    }
  }

  await browser.close();
  console.log(`\n✅ Frame capture complete!`);
  return frameCount;
}

async function encodeVideoWithAudio() {
  console.log('\n🎞  Encoding video and mixing audio with FFmpeg...');
  const outputPath = path.join(CONFIG.outputDir, CONFIG.outputFile);
  const framesPattern = path.join(CONFIG.framesDir, 'frame_%06d.png');

  // Build the ffmpeg command
  let command = ffmpeg()
    .input(framesPattern)
    .inputOptions([`-framerate ${CONFIG.fps}`]);

  // Check for valid voiceovers
  let audioInputs = [];
  SCENE_TIMINGS.forEach(scene => {
    const audioPath = path.join(CONFIG.voiceoverDir, `${scene.id}.mp3`);
    if (fs.existsSync(audioPath)) {
      const stats = fs.statSync(audioPath);
      if (stats.size > 100) { // Valid file
        audioInputs.push({ path: audioPath, delayMs: scene.startMs });
      }
    }
  });

  if (audioInputs.length > 0) {
    audioInputs.forEach(ai => command.input(ai.path));

    // Create complex filter for audio mixing
    let filterComplex = '';
    let mixInputs = '';
    
    audioInputs.forEach((ai, index) => {
      // index + 1 because index 0 is the video stream
      const streamIdx = index + 1;
      filterComplex += `[${streamIdx}:a]adelay=${ai.delayMs}|${ai.delayMs}[a${streamIdx}];`;
      mixInputs += `[a${streamIdx}]`;
    });
    
    filterComplex += `${mixInputs}amix=inputs=${audioInputs.length}[aout]`;
    
    command.complexFilter(filterComplex);
    command.outputOptions(['-map 0:v', '-map [aout]', '-c:v libx264', '-c:a aac', '-pix_fmt yuv420p', '-preset fast', '-crf 18', '-movflags +faststart']);
  }

  return new Promise((resolve, reject) => {
    command
      .output(outputPath)
      .on('progress', p => {
        const pct = p.percent ? Math.round(p.percent) : 0;
        process.stdout.write(`\rEncoding: ${pct}%  `);
      })
      .on('end', () => {
        console.log(`\n✅ Video production complete! Saved to ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('\n❌ FFmpeg error:', err.message);
        reject(err);
      })
      .run();
  });
}

(async () => {
  try {
    console.time('⏱ Production Time');
    await captureFrames();
    await encodeVideoWithAudio();
    console.timeEnd('⏱ Production Time');
  } catch (err) {
    console.error('\n❌ Pipeline error:', err);
    process.exit(1);
  }
})();
