'use strict';
/**
 * Encode-only script — uses already-captured frames from enhanced_frames/
 * Skips re-capturing, jumps straight to subtitle generation + FFmpeg encode.
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const SCRATCH      = path.join(__dirname, '..', 'scratch');
const PUBLIC       = path.join(__dirname, '..', 'frontend', 'public');
const VOICEOVERS   = path.join(SCRATCH, 'voiceovers');
const FRAMES_DIR   = path.join(SCRATCH, 'enhanced_frames');
const OUTPUT_VIDEO = path.join(PUBLIC, 'RetailEdge_Pro_Client_Pitch.mp4');

// Scene info — must match how frames were captured
const SCENES = [
  { id: 1,  holdSec: 5,  voiceover: 'scene1',  label: 'Welcome to RetailEdge Pro',          subtitle: 'The Complete Retail Workforce Enablement Platform',          frames: 10 },
  { id: 2,  holdSec: 6,  voiceover: 'scene2',  label: 'Admin Control Center',                subtitle: 'Enterprise-wide visibility at a glance',                     frames: 12 },
  { id: 3,  holdSec: 6,  voiceover: 'scene3',  label: 'Program Manager Dashboard',           subtitle: 'Monitor execution, training progress & team performance',    frames: 12 },
  { id: 4,  holdSec: 5,  voiceover: 'scene4',  label: 'Quiz & Assessment Builder',           subtitle: 'Create MCQ, True/False, Poll & Image-based quizzes',         frames: 10 },
  { id: 5,  holdSec: 5,  voiceover: 'scene5',  label: 'Live Quiz in Action',                 subtitle: 'Real-time gamified engagement for your teams',               frames: 10 },
  { id: 6,  holdSec: 5,  voiceover: 'scene6',  label: 'Training Library',                    subtitle: 'Structured learning paths for retail excellence',             frames: 10 },
  { id: 7,  holdSec: 5,  voiceover: 'scene7',  label: 'Leaderboard & Gamification',          subtitle: 'Drive healthy competition and boost engagement',              frames: 10 },
  { id: 8,  holdSec: 4,  voiceover: 'scene8',  label: 'User Management',                     subtitle: 'Role-based access: Admin, Trainer, Participant, Client',      frames: 8  },
  { id: 9,  holdSec: 4,  voiceover: 'scene9',  label: 'Certifications',                      subtitle: 'Auto-generated certificates for every achievement',           frames: 8  },
  { id: 10, holdSec: 6,  voiceover: 'scene10', label: 'Analytics & Reports',                 subtitle: 'Data-driven insights for smarter training decisions',         frames: 12 },
  { id: 11, holdSec: 5,  voiceover: 'scene11', label: 'Mobile Participant Experience',       subtitle: 'Join quizzes from any device — no app download needed',      frames: 10 },
  { id: 12, holdSec: 5,  voiceover: 'scene15', label: 'RetailEdge Pro — Powering Performance', subtitle: 'Idonneous | retail@idonneous.com',                         frames: 10 },
];

// ===== Rebuild concat list from existing frames =====
function buildConcatList() {
  const concatPath = path.join(FRAMES_DIR, 'concat_list.txt');
  const allFrameFiles = fs.readdirSync(FRAMES_DIR)
    .filter(f => f.endsWith('.png'))
    .sort();

  let lines = [];
  let globalIdx = 0;

  for (const scene of SCENES) {
    const holdPerFrame = scene.holdSec / scene.frames;
    for (let f = 0; f < scene.frames; f++) {
      if (globalIdx < allFrameFiles.length) {
        const framePath = path.join(FRAMES_DIR, allFrameFiles[globalIdx]).replace(/\\/g, '/');
        lines.push(`file '${framePath}'\nduration ${holdPerFrame.toFixed(4)}`);
        globalIdx++;
      }
    }
  }
  // FFmpeg concat requires last file repeated without duration
  const lastFile = path.join(FRAMES_DIR, allFrameFiles[allFrameFiles.length - 1]).replace(/\\/g, '/');
  lines.push(`file '${lastFile}'`);

  fs.writeFileSync(concatPath, lines.join('\n'));
  console.log(`📋 Concat list written (${globalIdx} frames)`);
  return concatPath;
}

// ===== Build audio concat from voiceovers =====
function buildAudioConcatList() {
  const concatPath = path.join(FRAMES_DIR, 'audio_concat.txt');
  const lines = [];
  for (const scene of SCENES) {
    const mp3 = path.join(VOICEOVERS, `${scene.voiceover}.mp3`);
    if (fs.existsSync(mp3) && fs.statSync(mp3).size > 1000) {
      lines.push(`file '${mp3.replace(/\\/g, '/')}'`);
      console.log(`  🎙 ${scene.voiceover}.mp3 → Scene ${scene.id}`);
    } else {
      const fallback = path.join(__dirname, 'test_pad.mp3');
      if (fs.existsSync(fallback)) lines.push(`file '${fallback.replace(/\\/g, '/')}'`);
      console.log(`  ⚠️  No voiceover for scene ${scene.id}, using silence`);
    }
  }
  fs.writeFileSync(concatPath, lines.join('\n'));
  return concatPath;
}

// ===== Build ASS subtitle file =====
function buildSubtitles() {
  const toASS = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.round((sec % 1) * 100);
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  };

  const voiceoverScripts = {
    scene1:  "Idonneous proudly presents RetailEdge Pro — empowering learning and driving performance.",
    scene2:  "Secure role-based access provides every stakeholder a personalized learning experience.",
    scene3:  "Leadership teams gain enterprise-wide visibility into performance and business impact.",
    scene4:  "Manage projects, trainers, schedules, and reporting from a unified interface.",
    scene5:  "Regional performance and compliance insights are available in real time.",
    scene6:  "Deliver engaging content and drive learner success.",
    scene7:  "Track attendance, readiness, and team development.",
    scene8:  "Access learning anytime and anywhere to build capability continuously.",
    scene9:  "RetailEdge Pro transforms workforce data into actionable insights.",
    scene10: "Interactive learning experiences improve engagement and knowledge retention.",
    scene11: "RetailEdge Pro delivers learning wherever work happens.",
    scene15: "RetailEdge Pro — more than a platform. A complete workforce enablement ecosystem.",
  };

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,Arial,56,&H00FFFFFF,&H000000FF,&H00000000,&HAA000000,-1,0,0,0,100,100,0,0,3,2,2,8,60,60,40,1
Style: Subtitle,Arial,36,&H00F0C040,&H000000FF,&H00000000,&HAA000000,0,0,0,0,100,100,0,0,3,1,1,8,60,60,90,1
Style: Voiceover,Arial,38,&H00FFFFFF,&H000000FF,&H00000000,&HAA000000,0,0,0,0,100,100,0,0,3,2,2,2,80,80,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let events = '';
  let currentTime = 0;

  for (const scene of SCENES) {
    const start = currentTime;
    const end = currentTime + scene.holdSec;
    // Title — top-center (alignment 8)
    events += `Dialogue: 0,${toASS(start + 0.3)},${toASS(end - 0.3)},Title,,0,0,0,,${scene.label}\n`;
    // Subtitle — just below title
    events += `Dialogue: 0,${toASS(start + 0.5)},${toASS(end - 0.5)},Subtitle,,0,0,0,,${scene.subtitle}\n`;
    // Voiceover narration — bottom center (alignment 2)
    const vo = voiceoverScripts[scene.voiceover];
    if (vo) {
      events += `Dialogue: 0,${toASS(start + 1.0)},${toASS(end - 1.0)},Voiceover,,0,0,0,,${vo}\n`;
    }
    currentTime = end;
  }

  // Write to temp dir (no spaces in path — FFmpeg requirement on Windows)
  const tmpDir = path.join(os.tmpdir(), 'retailedge_video');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const assPath = path.join(tmpDir, 'subtitles.ass');
  fs.writeFileSync(assPath, header + events);
  console.log(`📝 Subtitles written to temp: ${assPath}`);
  return assPath;
}

// ===== Encode =====
function encode(concatPath, audioConcatPath, subtitlePath) {
  const subPathForFFmpeg = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
  const subtitleFilter   = `subtitles='${subPathForFFmpeg}'`;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatPath).inputOptions(['-f concat', '-safe 0'])
      .input(audioConcatPath).inputOptions(['-f concat', '-safe 0'])
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-crf 18', '-preset medium', '-pix_fmt yuv420p',
        '-movflags +faststart',
        `-vf ${subtitleFilter}`,
        '-r 30', '-shortest'
      ])
      .output(OUTPUT_VIDEO)
      .on('start', () => console.log('\n  ▶ FFmpeg encoding started...'))
      .on('progress', p => {
        const pct = p.percent ? Math.min(100, Math.round(p.percent)) : 0;
        process.stdout.write(`\r  [${'█'.repeat(Math.round(pct/2))}${'░'.repeat(50-Math.round(pct/2))}] ${pct}%  `);
      })
      .on('end', () => {
        const mb = (fs.statSync(OUTPUT_VIDEO).size / 1024 / 1024).toFixed(1);
        console.log(`\n  ✅ Done → ${OUTPUT_VIDEO}  (${mb} MB)`);
        resolve();
      })
      .on('error', err => {
        console.error(`\n  ❌ ${err.message}`);
        reject(err);
      })
      .run();
  });
}

// ===== MAIN =====
(async () => {
  console.time('⏱ Encode time');
  console.log('🎞  RetailEdge Pro — Encode Only (frames already captured)');
  console.log('═'.repeat(60));

  const frames = fs.readdirSync(FRAMES_DIR).filter(f => f.endsWith('.png')).sort();
  console.log(`📁 Found ${frames.length} existing frames in enhanced_frames/`);

  const concatPath      = buildConcatList();
  const audioConcatPath = buildAudioConcatList();
  const subtitlePath    = buildSubtitles();

  await encode(concatPath, audioConcatPath, subtitlePath);

  console.log('\n' + '═'.repeat(60));
  console.log('🎉  RetailEdge Pro Client Pitch Video — READY!');
  console.log(`\n  📁 ${OUTPUT_VIDEO}`);
  console.log(`  🌐 http://localhost:5173/RetailEdge_Pro_Client_Pitch.mp4`);
  console.timeEnd('⏱ Encode time');
})();
