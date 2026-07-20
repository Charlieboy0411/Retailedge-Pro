'use strict';
/**
 * Premium Animation — Full Multi-Scene Capture
 * Jumps into each scene, lets CSS animations play from t=0,
 * captures keyframes at real timing intervals, then encodes.
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const SCRATCH    = path.join(__dirname, '..', 'scratch');
const PUBLIC     = path.join(__dirname, '..', 'frontend', 'public');
const FRAMES_DIR = path.join(SCRATCH, 'premium_frames');
const HTML_FILE  = path.join(SCRATCH, 'premium_animation.html');
const FILE_URL   = 'file:///' + HTML_FILE.replace(/\\/g, '/');
const VOICEOVERS = path.join(SCRATCH, 'voiceovers');

if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });
fs.readdirSync(FRAMES_DIR).filter(f => f.endsWith('.png'))
  .forEach(f => fs.unlinkSync(path.join(FRAMES_DIR, f)));

const wait = ms => new Promise(r => setTimeout(r, ms));

// Scene definitions — must match HTML
const SCENES = [
  { id: 1, durationMs: 7000,  voiceover: 'scene1',  outputName: 'RetailEdge_Pro_Premium_Scene1.mp4',  freezeAt: null  },
  { id: 2, durationMs: 8000,  voiceover: 'scene2',  outputName: 'RetailEdge_Pro_Premium_Scene2.mp4',  freezeAt: 5000  },
  { id: 3, durationMs: 10000, voiceover: 'scene3',  outputName: 'RetailEdge_Pro_Premium_Scene3.mp4',  freezeAt: null  },
  { id: 4, durationMs: 10000, voiceover: 'scene4',  outputName: 'RetailEdge_Pro_Premium_Scene4.mp4',  freezeAt: null  },
  { id: 5, durationMs: 12000, voiceover: 'scene5',  outputName: 'RetailEdge_Pro_Premium_Scene5.mp4',  freezeAt: null  },
  { id: 6, durationMs: 12000, voiceover: 'scene6',  outputName: 'RetailEdge_Pro_Premium_Scene6.mp4',  freezeAt: null  },
  { id: 7, durationMs: 10000, voiceover: 'scene7',  outputName: 'RetailEdge_Pro_Premium_Scene7.mp4',  freezeAt: null  },
  { id: 8, durationMs: 12000, voiceover: 'scene8',  outputName: 'RetailEdge_Pro_Premium_Scene8.mp4',  freezeAt: null  },
  { id: 9,  durationMs: 10000, voiceover: 'scene9',  outputName: 'RetailEdge_Pro_Premium_Scene9.mp4',  freezeAt: null  },
  { id: 10, durationMs: 12000, voiceover: 'scene10', outputName: 'RetailEdge_Pro_Premium_Scene10.mp4', freezeAt: null  },
  { id: 11, durationMs: 14000, voiceover: 'scene11', outputName: 'RetailEdge_Pro_Premium_Scene11.mp4', freezeAt: null  },
  { id: 12, durationMs: 13000, voiceover: 'scene12', outputName: 'RetailEdge_Pro_Premium_Scene12.mp4', freezeAt: null  },
];

// Keyframe interval (ms) — 150ms ≈ ~6.7fps
const INTERVAL_MS = 150;

async function captureSceneFrames(page, scene, frameOffset) {
  console.log(`\n🎬 Scene ${scene.id}: ${scene.durationMs / 1000}s | Freeze: ${scene.freezeAt ? scene.freezeAt/1000+'s' : 'none'}`);

  // Activate this scene only via JS injection
  await page.evaluate((sceneId, totalScenes) => {
    // Remove active from all scenes
    document.querySelectorAll('.scene').forEach(s => {
      s.classList.remove('active');
      s.classList.remove('frozen');
    });
    // Activate target scene — this restarts its CSS animations
    const el = document.getElementById('scene' + sceneId);
    if (el) {
      // Force animation restart by removing and re-adding
      el.style.display = 'none';
      el.offsetHeight; // reflow
      el.style.display = '';
      el.classList.add('active');
    }
    // Reset progress
    const pb = document.getElementById('progress-bar');
    if (pb) pb.style.width = '0%';
  }, scene.id, SCENES.length);

  // Wait for initial render and image loading (longer for Scene 6 avatars)
  await wait(scene.id === 6 ? 2500 : 500);

  const capturedFrames = [];
  let frameIdx = frameOffset;
  const keyframeTimes = [];
  for (let ms = 0; ms <= scene.durationMs - INTERVAL_MS; ms += INTERVAL_MS) {
    keyframeTimes.push(ms);
  }

  let realElapsed = 0;
  const tickStart = Date.now();

  for (let i = 0; i < keyframeTimes.length; i++) {
    const ms = keyframeTimes[i];
    const nextMs = keyframeTimes[i + 1] ?? scene.durationMs;
    const holdSec = ((nextMs - ms) / 1000).toFixed(4);

    // Apply freeze if this scene has a freeze point
    if (scene.freezeAt !== null && ms >= scene.freezeAt) {
      await page.evaluate((sceneId) => {
        const el = document.getElementById('scene' + sceneId);
        if (el && !el.classList.contains('frozen')) el.classList.add('frozen');
      }, scene.id);
    }

    const frameName = `frame_${String(frameIdx).padStart(4, '0')}_s${String(scene.id).padStart(2,'0')}_t${ms}.png`;
    const framePath = path.join(FRAMES_DIR, frameName);
    await page.screenshot({ path: framePath, type: 'png' });
    capturedFrames.push({ path: framePath, holdSec });
    frameIdx++;

    process.stdout.write(`\r  [S${scene.id}] Frame ${i+1}/${keyframeTimes.length}  t=${ms}ms  `);

    // Throttle to ~realtime so CSS animations actually progress
    const targetTime = tickStart + ms + 500;
    const now = Date.now();
    if (targetTime > now) await wait(targetTime - now);
  }

  console.log(`\n  ✅ ${capturedFrames.length} frames captured for Scene ${scene.id}`);
  return capturedFrames;
}

function buildConcatList(allFrames, label) {
  const concatPath = path.join(FRAMES_DIR, `concat_${label}.txt`);
  const lines = allFrames.map(f => `file '${f.path.replace(/\\/g, '/')}'\nduration ${f.holdSec}`);
  lines.push(`file '${allFrames[allFrames.length - 1].path.replace(/\\/g, '/')}'`);
  fs.writeFileSync(concatPath, lines.join('\n'));
  return concatPath;
}

function encodeSegment(concatPath, voiceoverName, outputPath) {
  const mp3Path = path.join(VOICEOVERS, `${voiceoverName}.mp3`);
  const hasAudio = fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 1000;

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg()
      .input(concatPath).inputOptions(['-f concat', '-safe 0'])
      .videoCodec('libx264')
      .outputOptions(['-crf 16', '-preset medium', '-pix_fmt yuv420p', '-movflags +faststart', '-vf scale=1920:1080', '-r 30']);

    if (hasAudio) {
      cmd.input(mp3Path);
      cmd.audioCodec('aac');
      // Remove -shortest to prevent the video from cutting off when the audio ends.
      // Slow down audio slightly to fill more space.
      cmd.outputOptions(['-af', 'atempo=0.9']);
      console.log(`  🎙️ Audio: ${voiceoverName}.mp3`);
    }

    cmd.output(outputPath)
      .on('start', () => process.stdout.write('  ▶ Encoding...'))
      .on('progress', p => {
        const pct = p.percent ? Math.min(100, Math.round(p.percent)) : 0;
        process.stdout.write(`\r  [${'█'.repeat(Math.round(pct/2))}${'░'.repeat(50-Math.round(pct/2))}] ${pct}%  `);
      })
      .on('end', () => {
        const mb = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
        console.log(`\n  ✅ ${path.basename(outputPath)}  (${mb} MB)`);
        resolve();
      })
      .on('error', err => { console.error(`\n  ❌ ${err.message}`); reject(err); })
      .run();
  });
}

function encodeCombined(segmentPaths, outputPath) {
  // Concat all segment MP4s into one final video
  const concatPath = path.join(FRAMES_DIR, 'segments_concat.txt');
  const lines = segmentPaths.map(p => `file '${p.replace(/\\/g, '/')}'`);
  fs.writeFileSync(concatPath, lines.join('\n'));

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatPath).inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .output(outputPath)
      .on('start', () => process.stdout.write('  ▶ Combining segments...'))
      .on('end', () => {
        const mb = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
        console.log(`\n  ✅ Combined → ${path.basename(outputPath)}  (${mb} MB)`);
        resolve();
      })
      .on('error', err => { console.error(`\n  ❌ ${err.message}`); reject(err); })
      .run();
  });
}

(async () => {
  console.time('⏱ Total render time');
  console.log('✨ RetailEdge Pro — Premium Animation Capture');
  console.log('═'.repeat(55));
  console.log(`📺 ${SCENES.length} scene(s) | 1920×1080 | ~${SCENES.reduce((a,s) => a + s.durationMs/1000, 0)}s total`);
  console.log('═'.repeat(55));

  const { default: puppeteer } = await import('puppeteer');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--allow-file-access-from-files',
      '--disable-web-security',
      '--force-color-profile=srgb',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(FILE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await wait(2000);

  const segmentPaths = [];
  let frameOffset = 0;

  for (const scene of SCENES) {
    const frames = await captureSceneFrames(page, scene, frameOffset);
    frameOffset += frames.length;

    const concatPath = buildConcatList(frames, `s${scene.id}`);
    const segOut = path.join(PUBLIC, scene.outputName);
    await encodeSegment(concatPath, scene.voiceover, segOut);
    segmentPaths.push(segOut);
  }

  await browser.close();

  // Combine all segments into one preview
  const combinedOutput = path.join(PUBLIC, 'RetailEdge_Pro_Premium_Preview.mp4');
  if (segmentPaths.length > 1) {
    console.log('\n🔗 Combining all segments...');
    await encodeCombined(segmentPaths, combinedOutput);
  }

  console.log('\n' + '═'.repeat(55));
  console.log('🎉  PREMIUM ANIMATION RENDER COMPLETE');
  console.log('═'.repeat(55));
  segmentPaths.forEach(p => console.log(`  📁 ${path.basename(p)}`));
  if (segmentPaths.length > 1) console.log(`  📁 RetailEdge_Pro_Premium_Preview.mp4 (combined)`);
  console.log(`\n  🌐 http://localhost:5173/RetailEdge_Pro_Premium_Preview.mp4`);
  console.timeEnd('⏱ Total render time');
})();
