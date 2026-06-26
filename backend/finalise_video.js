'use strict';
/**
 * RetailEdge Pro — Video Finaliser (Music Only)
 *
 * Replaces old TTS voiceover with an upbeat background music track,
 * removes subtitles, and produces a clean, fast-paced video presentation.
 */

const { spawnSync } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

// ===== PATHS =====
const ROOT    = path.join(__dirname, '..');
const PUBLIC  = path.join(ROOT, 'frontend', 'public');
const DIST    = path.join(ROOT, 'frontend', 'dist');
const AUDIO   = path.join(ROOT, 'scratch', 'video_audio');
const VIDEO_IN  = path.join(PUBLIC, 'RetailEdge_Pro_Conference_Video.mp4');
const VIDEO_FINAL = path.join(PUBLIC, 'RetailEdge_Pro_Final.mp4');
const VIDEO_EXEC  = path.join(PUBLIC, 'RetailEdge_Pro_Executive_Final.mp4');
const VIDEO_LOOP  = path.join(PUBLIC, 'RetailEdge_Pro_Booth_Loop_Final.mp4');

if (!fs.existsSync(AUDIO)) fs.mkdirSync(AUDIO, { recursive: true });

// Total duration based on the new fast-paced timings
const TOTAL_DUR = 79; // ~79 seconds

async function produceFinishedVideo() {
  console.log('\n🎞  Adding cinematic music and muxing final video...');

  const cinematicPad = path.join(AUDIO, 'bgm.mp3');

  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(VIDEO_IN)
      .input(cinematicPad)
      .outputOptions([
        '-map 0:v',
        '-map 1:a',
        '-c:a aac',
        '-b:a 192k',
        '-c:v copy', // Copy the video directly for speed
        '-shortest',
      ])
      .output(VIDEO_FINAL)
      .on('start', cmd => console.log('  ▶ Muxing audio and video...'))
      .on('end', () => {
        const mb = (fs.statSync(VIDEO_FINAL).size / 1024 / 1024).toFixed(1);
        console.log(`\n  ✅ Full video: ${VIDEO_FINAL} (${mb} MB)`);
        resolve();
      })
      .on('error', reject)
      .run();
  });
}

// ===== STEP 5: CREATE EXEC + LOOP CUTS =====
async function createCuts() {
  console.log('\n✂️  Creating Executive and Booth Loop cuts...');

  // Executive cut (First 40s)
  await new Promise((resolve, reject) => {
    ffmpeg(VIDEO_FINAL)
      .setDuration(40)
      .videoCodec('copy')
      .audioCodec('copy')
      .output(VIDEO_EXEC)
      .on('end', () => resolve())
      .on('error', e => { console.warn('  ⚠ Exec cut error:', e.message); resolve(); })
      .run();
  });

  // Social Media Teaser (First 15s)
  await new Promise((resolve, reject) => {
    ffmpeg(VIDEO_FINAL)
      .setDuration(15)
      .videoCodec('copy')
      .audioCodec('copy')
      .output(VIDEO_LOOP)
      .on('end', () => resolve())
      .on('error', e => { console.warn('  ⚠ Loop cut error:', e.message); resolve(); })
      .run();
  });
}

function copyToDist(files) {
  if (!fs.existsSync(DIST)) return;
  files.forEach(f => {
    if (f && fs.existsSync(f)) {
      const dest = path.join(DIST, path.basename(f));
      fs.copyFileSync(f, dest);
    }
  });
}

// ===== MAIN =====
(async () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   RetailEdge Pro — Video Finalisation (Music Only)       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  try {
    // Burn subtitles + mux audio
    await produceFinishedVideo();

    // Create cuts
    await createCuts();

    // Copy to dist
    copyToDist([VIDEO_FINAL, VIDEO_EXEC, VIDEO_LOOP]);

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('🎉  FINALISATION COMPLETE');
    console.log('═'.repeat(60));
    [
      [VIDEO_FINAL, 'Full (~79s)'],
      [VIDEO_EXEC,  'Executive (~40s)'],
      [VIDEO_LOOP,  'Social Teaser (~15s)'],
    ].forEach(([f, label]) => {
      if (fs.existsSync(f)) {
        const mb = (fs.statSync(f).size / 1024 / 1024).toFixed(1);
        console.log(`\n  📁 ${path.basename(f)} — ${label}`);
        console.log(`     Size: ${mb} MB`);
      }
    });
    console.log('\n🌐 Download Links:');
    console.log('  http://localhost:5173/RetailEdge_Pro_Final.mp4');
    console.log('  http://localhost:5173/RetailEdge_Pro_Executive_Final.mp4');
    console.log('  http://localhost:5173/RetailEdge_Pro_Booth_Loop_Final.mp4');

  } catch (err) {
    console.error('\n❌ Fatal:', err.message);
    process.exit(1);
  }
})();
