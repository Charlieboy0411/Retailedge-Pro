'use strict';
/**
 * RetailEdge Pro — Subtitle Sync Fix
 *
 * Problem: original SRT timecodes were hand-written guesses and don't match the TTS audio.
 * Fix: Rebuild ASS subtitles timed to EXACT TTS durations per scene.
 *
 * For each scene:
 *   - absoluteStart = sum of all previous scene durations
 *   - speechEnd = absoluteStart + min(ttsDuration, sceneDuration)
 *   - Show subtitle from absoluteStart → speechEnd only (no subtitle during silence padding)
 *   - Split long VO text into 2-3 segments for readability
 */

const ffmpeg    = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs        = require('fs');
const path      = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

const ROOT         = path.join(__dirname, '..');
const PUBLIC       = path.join(ROOT, 'frontend', 'public');
const DIST         = path.join(ROOT, 'frontend', 'dist');
const AUDIO_DIR    = path.join(ROOT, 'scratch', 'video_audio');
const MASTER_WAV   = path.join(AUDIO_DIR, 'master_voiceover.wav');
const VIDEO_SILENT = path.join(PUBLIC, 'RetailEdge_Pro_Conference_Video.mp4');   // silent video
const OUT_FULL     = path.join(PUBLIC, 'RetailEdge_Pro_Final_With_Audio.mp4');
const OUT_EXEC     = path.join(PUBLIC, 'RetailEdge_Pro_Executive_Final.mp4');
const OUT_LOOP     = path.join(PUBLIC, 'RetailEdge_Pro_Booth_Loop_Final.mp4');
const ASS_PATH     = path.join(AUDIO_DIR, 'subtitles_synced.ass');

// ===== SCENE DATA =====
// ttsDur = actual TTS audio duration from production log
// sceneDur = allocated scene duration (from video structure)
// vo = voiceover text for this scene
const SCENES = [
  { scene:1,  sceneDur:15, ttsDur:15.0, vo:"Idonneous proudly presents RetailEdge Pro — a next-generation learning and workforce development platform designed specifically for retail, FMCG, field sales, merchandising, and business transformation." },
  { scene:2,  sceneDur:15, ttsDur:9.5,  vo:"Organizations often struggle with inconsistent training, compliance challenges, and limited visibility into workforce readiness." },
  { scene:3,  sceneDur:15, ttsDur:9.7,  vo:"RetailEdge Pro unifies learning, assessments, certifications, analytics, and workforce development into one intelligent platform." },
  { scene:4,  sceneDur:15, ttsDur:8.0,  vo:"Secure role-based access ensures every stakeholder experiences a personalized and protected learning environment." },
  { scene:5,  sceneDur:15, ttsDur:10.0, vo:"The centralized dashboard provides real-time visibility into learning performance, certifications, workforce readiness, and business outcomes." },
  { scene:6,  sceneDur:15, ttsDur:8.2,  vo:"Leadership teams gain complete visibility into organizational capability, training effectiveness, and business impact." },
  { scene:7,  sceneDur:15, ttsDur:8.1,  vo:"The COO dashboard focuses on operational excellence, workforce utilization, and project execution." },
  { scene:8,  sceneDur:15, ttsDur:7.0,  vo:"Regional leaders can monitor performance across locations, teams, and operational programs." },
  { scene:9,  sceneDur:15, ttsDur:7.4,  vo:"Learners access a structured library of training content designed to build capability and drive performance." },
  { scene:10, sceneDur:15, ttsDur:5.8,  vo:"Interactive learning experiences increase engagement and improve knowledge retention." },
  { scene:11, sceneDur:15, ttsDur:5.9,  vo:"The assessment engine accurately measures learning outcomes and identifies skill gaps." },
  { scene:12, sceneDur:20, ttsDur:9.6,  vo:"RetailEdge Pro transforms assessments into engaging experiences through real-time participation, live rankings, and interactive learning." },
  { scene:13, sceneDur:15, ttsDur:6.4,  vo:"Automated certification workflows simplify compliance and validate workforce capability." },
  { scene:14, sceneDur:15, ttsDur:8.9,  vo:"Program Managers oversee projects, users, trainers, schedules, and client reporting from a single control center." },
  { scene:15, sceneDur:15, ttsDur:6.3,  vo:"Training leaders gain powerful insights into learning effectiveness and workforce development." },
  { scene:16, sceneDur:15, ttsDur:7.9,  vo:"Supervisors can monitor team readiness, identify learning gaps, and drive performance improvement." },
  { scene:17, sceneDur:15, ttsDur:7.0,  vo:"The Marketing Manager dashboard monitors field campaign readiness, product activation coverage, content engagement, and live assessment metrics." },
  { scene:18, sceneDur:15, ttsDur:5.6,  vo:"Advanced analytics convert learning data into actionable business intelligence." },
  { scene:19, sceneDur:15, ttsDur:7.4,  vo:"Artificial intelligence helps organizations proactively identify risks and optimize learning outcomes." },
  { scene:20, sceneDur:15, ttsDur:7.1,  vo:"RetailEdge Pro enables learning anywhere, anytime through a fully responsive mobile experience." },
  { scene:21, sceneDur:15, ttsDur:8.4,  vo:"Organizations achieve measurable improvements in onboarding speed, compliance, productivity, and workforce performance." },
  { scene:22, sceneDur:15, ttsDur:15.0, vo:"RetailEdge Pro is more than a learning platform. It is a complete workforce enablement ecosystem designed to build capability, drive performance, and transform business outcomes. Presented by Idonneous." },
];

// ===== HELPERS =====
function toAssTime(sec) {
  // Format: H:MM:SS.cs (centiseconds)
  const h  = Math.floor(sec / 3600);
  const m  = Math.floor((sec % 3600) / 60);
  const s  = Math.floor(sec % 60);
  const cs = Math.round((sec % 1) * 100);
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

function splitWords(text, parts) {
  const words = text.split(' ');
  const chunkSize = Math.ceil(words.length / parts);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }
  return chunks;
}

// ===== BUILD SYNCED ASS =====
function buildSyncedAss() {
  const assHeader = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Inter,50,&H00FFFFFF,&H000000FF,&H00000000,&HCC000000,-1,0,0,0,100,100,0.5,0,1,3.5,2,2,100,100,70,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const dialogues = [];
  let absoluteStart = 0;

  for (const sc of SCENES) {
    // How long speech actually plays (TTS was sped up if longer than scene, padded if shorter)
    const speechDur = Math.min(sc.ttsDur, sc.sceneDur);
    const speechEnd = absoluteStart + speechDur;

    // Add a small lead-in (0.3s) so subtitle appears slightly before first word
    const subStart = absoluteStart + 0.3;
    const subEnd   = speechEnd - 0.2;  // end just before silence

    // Split text for readability
    const wordCount = sc.vo.split(' ').length;
    let parts = 1;
    if (wordCount > 25) parts = 3;
    else if (wordCount > 12) parts = 2;

    const chunks = splitWords(sc.vo, parts);
    const chunkDur = (subEnd - subStart) / chunks.length;

    chunks.forEach((chunk, i) => {
      const start = subStart + i * chunkDur;
      const end   = subStart + (i + 1) * chunkDur;
      dialogues.push(
        `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},Default,,0,0,0,,{\\fad(250,250)}${chunk}`
      );
    });

    console.log(`  Scene ${String(sc.scene).padStart(2,'0')}: abs=${absoluteStart.toFixed(1)}s speech=${speechDur.toFixed(1)}s → ${chunks.length} sub(s)`);
    absoluteStart += sc.sceneDur;
  }

  fs.writeFileSync(ASS_PATH, assHeader + dialogues.join('\n'));
  console.log(`\n✅ Synced ASS written: ${dialogues.length} dialogue lines`);
  return ASS_PATH;
}

// ===== RE-ENCODE WITH SYNCED SUBS =====
async function encodeWithSyncedSubs(assPath, inputVideo, outputPath, opts = {}) {
  const { durationSec } = opts;
  const assEscaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  const totalSec = durationSec || SCENES.reduce((a, b) => a + b.sceneDur, 0);

  console.log(`\n🎞  Encoding: ${path.basename(outputPath)}`);

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg()
      .input(inputVideo)
      .input(MASTER_WAV)
      .videoFilters([`ass='${assEscaped}'`])
      .audioCodec('aac')
      .audioBitrate('192k')
      .videoCodec('libx264')
      .outputOptions([
        '-crf 18',
        '-preset medium',
        '-pix_fmt yuv420p',
        '-movflags +faststart',
        '-shortest',
      ]);

    if (durationSec) cmd.setDuration(durationSec);

    cmd
      .output(outputPath)
      .on('start', c => console.log('  ▶', c.substring(0, 110) + '...'))
      .on('progress', p => {
        if (p.timemark) {
          const parts = p.timemark.split(':');
          const curSec = (+parts[0]) * 3600 + (+parts[1]) * 60 + parseFloat(parts[2]);
          const pct = Math.min(100, Math.round((curSec / totalSec) * 100));
          process.stdout.write(`\r  Progress: [${'█'.repeat(Math.round(pct/2))}${'░'.repeat(50-Math.round(pct/2))}] ${pct}% (${p.timemark})  `);
        }
      })
      .on('end', () => {
        const mb = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
        console.log(`\n  ✅ Done: ${path.basename(outputPath)} (${mb} MB)`);
        resolve();
      })
      .on('error', err => {
        console.error(`\n  ❌ Error: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

function copyToDist(files) {
  if (!fs.existsSync(DIST)) return;
  files.forEach(f => {
    if (f && fs.existsSync(f)) {
      fs.copyFileSync(f, path.join(DIST, path.basename(f)));
      console.log(`  📋 Copied to dist: ${path.basename(f)}`);
    }
  });
}

// ===== MAIN =====
(async () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   RetailEdge Pro — Subtitle Sync Fix                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.time('⏱ Total time');

  // Verify master audio exists (from previous run)
  if (!fs.existsSync(MASTER_WAV)) {
    console.error(`❌ Master WAV not found: ${MASTER_WAV}`);
    console.error('   Run finalise_video.js first to generate TTS audio.');
    process.exit(1);
  }
  const wavMb = (fs.statSync(MASTER_WAV).size / 1024 / 1024).toFixed(1);
  console.log(`✅ Master WAV found: ${wavMb} MB`);

  // Verify silent video exists
  if (!fs.existsSync(VIDEO_SILENT)) {
    console.error(`❌ Silent video not found: ${VIDEO_SILENT}`);
    process.exit(1);
  }

  console.log('\n📝 Building scene-accurate synced subtitles...');
  const assPath = buildSyncedAss();

  // Full 5m20s video
  await encodeWithSyncedSubs(assPath, VIDEO_SILENT, OUT_FULL);

  // Executive 2-min cut
  await encodeWithSyncedSubs(assPath, VIDEO_SILENT, OUT_EXEC, { durationSec: 120 });

  // Booth loop 90s cut
  await encodeWithSyncedSubs(assPath, VIDEO_SILENT, OUT_LOOP, { durationSec: 90 });

  copyToDist([OUT_FULL, OUT_EXEC, OUT_LOOP]);

  console.log('\n' + '═'.repeat(60));
  console.log('🎉  SYNC FIX COMPLETE');
  console.log('═'.repeat(60));
  for (const [f, label] of [
    [OUT_FULL, 'Full 5m20s — Voice + Synced Subs'],
    [OUT_EXEC, 'Executive 2min — Voice + Synced Subs'],
    [OUT_LOOP, 'Booth Loop 90s — Voice + Synced Subs'],
  ]) {
    if (fs.existsSync(f)) {
      const mb = (fs.statSync(f).size / 1024 / 1024).toFixed(1);
      console.log(`\n  📁 ${path.basename(f)}  (${mb} MB)`);
    }
  }
  console.log('\n🌐 Download:');
  console.log('  http://localhost:5173/RetailEdge_Pro_Final_With_Audio.mp4');
  console.log('  http://localhost:5173/RetailEdge_Pro_Executive_Final.mp4');
  console.log('  http://localhost:5173/RetailEdge_Pro_Booth_Loop_Final.mp4');

  console.timeEnd('⏱ Total time');
})();
