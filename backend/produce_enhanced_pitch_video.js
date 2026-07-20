'use strict';
/**
 * RetailEdge Pro — Enhanced Live UI Video Producer
 * 
 * Features:
 * - Captures MORE scenes from the live running app (including Live Quiz, Leaderboard, Participant)
 * - Burns in title cards for each scene using FFmpeg drawtext
 * - Stitches pre-recorded voiceover MP3s as audio
 * - Outputs final polished client pitch video
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const FFMPEG = ffmpegInstaller.path;
console.log('📌 FFmpeg path:', FFMPEG);

const SCRATCH       = path.join(__dirname, '..', 'scratch');
const PUBLIC        = path.join(__dirname, '..', 'frontend', 'public');
const VOICEOVERS    = path.join(SCRATCH, 'voiceovers');
const FRAMES_DIR    = path.join(SCRATCH, 'enhanced_frames');
const OUTPUT_VIDEO  = path.join(PUBLIC, 'RetailEdge_Pro_Client_Pitch.mp4');

if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });
fs.readdirSync(FRAMES_DIR).filter(f => f.endsWith('.png'))
  .forEach(f => fs.unlinkSync(path.join(FRAMES_DIR, f)));
console.log('🧹 Cleaned old frames');

const wait = ms => new Promise(r => setTimeout(r, ms));

// Helper: set React input value
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

// Helper: login as admin
async function loginAsAdmin(page) {
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await wait(1500);
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
  await page.waitForSelector('nav', { timeout: 20000 });
  await wait(1500);
}

// =============================================
// SCENE DEFINITIONS — more scenes added
// =============================================
const SCENES = [
  {
    id: 1, label: 'Welcome to RetailEdge Pro',
    subtitle: 'The Complete Retail Workforce Enablement Platform',
    url: 'http://localhost:5173/login',
    holdSec: 5, voiceover: 'scene1', waitFor: 'input[type="email"]', preLogin: true,
    frames: 10
  },
  {
    id: 2, label: 'Admin Control Center',
    subtitle: 'Enterprise-wide visibility at a glance',
    url: 'http://localhost:5173/dashboard',
    holdSec: 6, voiceover: 'scene2', waitFor: 'nav',
    frames: 12
  },
  {
    id: 3, label: 'Program Manager Dashboard',
    subtitle: 'Monitor execution, training progress & team performance',
    url: 'http://localhost:5173/pm-dashboard',
    holdSec: 6, voiceover: 'scene3', waitFor: 'nav',
    frames: 12
  },
  {
    id: 4, label: 'Quiz & Assessment Builder',
    subtitle: 'Create MCQ, True/False, Poll & Image-based quizzes',
    url: 'http://localhost:5173/builder',
    holdSec: 5, voiceover: 'scene4', waitFor: 'nav',
    frames: 10
  },
  {
    id: 5, label: 'Live Quiz in Action',
    subtitle: 'Real-time gamified engagement for your teams',
    url: 'http://localhost:5173/dashboard',
    holdSec: 5, voiceover: 'scene5', waitFor: 'nav',
    frames: 10
  },
  {
    id: 6, label: 'Training Library',
    subtitle: 'Structured learning paths for retail excellence',
    url: 'http://localhost:5173/trainings',
    holdSec: 5, voiceover: 'scene6', waitFor: 'nav',
    frames: 10
  },
  {
    id: 7, label: 'Leaderboard & Gamification',
    subtitle: 'Drive healthy competition and boost engagement',
    url: 'http://localhost:5173/leaderboard',
    holdSec: 5, voiceover: 'scene7', waitFor: 'body',
    frames: 10
  },
  {
    id: 8, label: 'User Management',
    subtitle: 'Role-based access: Admin, Trainer, Participant, Client',
    url: 'http://localhost:5173/users',
    holdSec: 4, voiceover: 'scene8', waitFor: 'nav',
    frames: 8
  },
  {
    id: 9, label: 'Certifications',
    subtitle: 'Auto-generated certificates for every achievement',
    url: 'http://localhost:5173/certificates',
    holdSec: 4, voiceover: 'scene9', waitFor: 'nav',
    frames: 8
  },
  {
    id: 10, label: 'Analytics & Reports',
    subtitle: 'Data-driven insights for smarter training decisions',
    url: 'http://localhost:5173/reports',
    holdSec: 6, voiceover: 'scene10', waitFor: 'nav',
    frames: 12
  },
  {
    id: 11, label: 'Mobile Participant Experience',
    subtitle: 'Join quizzes from any device — no app download needed',
    url: 'http://localhost:5173/join',
    holdSec: 5, voiceover: 'scene11', waitFor: 'body', mobile: true,
    frames: 10
  },
  {
    id: 12, label: 'RetailEdge Pro — Powering Performance',
    subtitle: 'Idonneous | retail@idonneous.com',
    url: 'http://localhost:5173/login',
    holdSec: 5, voiceover: 'scene15', waitFor: 'body', preLogin: true,
    frames: 10
  },
];

async function captureScene(browser, sceneIdx, scene, frameOffset) {
  console.log(`\n📸 Scene ${scene.id}/${SCENES.length}: ${scene.label}`);
  const page = await browser.newPage();

  const isMobile = !!scene.mobile;
  if (isMobile) {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  } else {
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  }

  const capturedFrames = [];
  try {
    if (scene.preLogin) {
      await page.goto(scene.url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      await wait(3000);
    } else {
      await loginAsAdmin(page);
      if (scene.url) {
        await page.goto(scene.url, { waitUntil: 'networkidle0', timeout: 20000 }).catch(() => {});
        await page.waitForSelector(scene.waitFor || 'nav', { timeout: 10000 }).catch(() => {});
        await wait(4000);
      }
    }

    for (let f = 0; f < scene.frames; f++) {
      const frameIdx = frameOffset + f;
      const frameName = `frame_${String(frameIdx).padStart(4, '0')}_s${String(scene.id).padStart(2, '0')}_f${f}.png`;
      const framePath = path.join(FRAMES_DIR, frameName);
      await page.screenshot({ path: framePath, type: 'png', fullPage: false });
      const kb = Math.round(fs.statSync(framePath).size / 1024);
      process.stdout.write(`  → ${frameName} [${kb}KB]\n`);
      capturedFrames.push({ path: framePath, holdSec: scene.holdSec / scene.frames, sceneId: scene.id, label: scene.label, subtitle: scene.subtitle });
      if (f < scene.frames - 1) await wait(300);
    }
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    const frameName = `frame_${String(frameOffset).padStart(4, '0')}_s${String(scene.id).padStart(2, '0')}_error.png`;
    const framePath = path.join(FRAMES_DIR, frameName);
    await page.screenshot({ path: framePath }).catch(() => {});
    capturedFrames.push({ path: framePath, holdSec: scene.holdSec, sceneId: scene.id, label: scene.label, subtitle: scene.subtitle });
  } finally {
    await page.close();
  }
  return capturedFrames;
}

// Build concat list for video frames
function buildConcatList(frames) {
  const concatPath = path.join(FRAMES_DIR, 'concat_list.txt');
  const lines = frames.map(f => `file '${f.path.replace(/\\/g, '/')}'\nduration ${f.holdSec.toFixed(4)}`);
  lines.push(`file '${frames[frames.length - 1].path.replace(/\\/g, '/')}'`);
  fs.writeFileSync(concatPath, lines.join('\n'));
  return concatPath;
}

// Build concat list for audio (voiceovers per scene)
function buildAudioConcatList(scenes) {
  const lines = [];
  const concatPath = path.join(FRAMES_DIR, 'audio_concat.txt');
  for (const scene of scenes) {
    const mp3 = path.join(VOICEOVERS, `${scene.voiceover}.mp3`);
    if (fs.existsSync(mp3) && fs.statSync(mp3).size > 1000) {
      lines.push(`file '${mp3.replace(/\\/g, '/')}'`);
    } else {
      // Generate a silent audio for this scene duration using test_pad
      const testPad = path.join(__dirname, 'test_pad.mp3');
      if (fs.existsSync(testPad)) lines.push(`file '${testPad.replace(/\\/g, '/')}'`);
    }
  }
  fs.writeFileSync(concatPath, lines.join('\n'));
  return concatPath;
}

// Build subtitle ASS file from scene info
function buildSubtitles(scenes) {
  const assPath = path.join(FRAMES_DIR, 'subtitles.ass');
  let currentTime = 0;

  const toASS = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.round((sec % 1) * 100);
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  };

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,Arial,52,&H00FFFFFF,&H000000FF,&H00000000,&HAA000000,-1,0,0,0,100,100,0,0,3,2,1,2,30,30,30,1
Style: Subtitle,Arial,34,&H00E8C97A,&H000000FF,&H00000000,&HAA000000,0,0,0,0,100,100,0,0,3,1,1,2,30,30,80,1
Style: Voiceover,Arial,38,&H00FFFFFF,&H000000FF,&H00000000,&HAA000000,0,0,0,0,100,100,0,0,3,2,2,8,60,60,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const voiceoverScripts = {
    scene1: "Idonneous proudly presents RetailEdge Pro, empowering learning and driving performance.",
    scene2: "Secure role-based access provides every stakeholder a personalized learning experience.",
    scene3: "Leadership teams gain enterprise-wide visibility into performance and business impact.",
    scene4: "Manage projects, trainers, schedules, and reporting from a unified interface.",
    scene5: "Regional performance and compliance insights are available in real time.",
    scene6: "Deliver engaging content and drive learner success.",
    scene7: "Track attendance, readiness, and team development.",
    scene8: "Access learning anytime and anywhere to build capability continuously.",
    scene9: "RetailEdge Pro transforms workforce data into actionable insights.",
    scene10: "Interactive learning experiences improve engagement and knowledge retention.",
    scene11: "RetailEdge Pro delivers learning wherever work happens.",
    scene15: "RetailEdge Pro — more than a learning platform. A complete workforce enablement ecosystem.",
  };

  let events = '';
  for (const scene of scenes) {
    const start = currentTime;
    const end = currentTime + scene.holdSec;
    // Removed Title and Subtitle as per user request
    
    // Voiceover text — bottom of screen
    const vo = voiceoverScripts[scene.voiceover];
    if (vo) {
      events += `Dialogue: 0,${toASS(start + 1.0)},${toASS(end - 1.0)},Voiceover,,0,0,0,,${vo}\n`;
    }
    currentTime = end;
  }

  fs.writeFileSync(assPath, header + events);
  console.log(`\n📝 Subtitles written: ${assPath}`);
  return assPath;
}

function escapeFFmpeg(str) {
  return str.replace(/'/g, "\\'").replace(/:/g, "\\:");
}

async function encodeWithOverlays(concatPath, audioConcatPath, subtitlePath, outputPath) {
  console.log('\n🎞  Encoding final video with title cards, voiceover & subtitles...');

  // Copy subtitle file to a temp location with no spaces in path (FFmpeg limitation on Windows)
  const tmpDir = path.join(require('os').tmpdir(), 'retailedge_video');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const tmpSubtitle = path.join(tmpDir, 'subtitles.ass');
  fs.copyFileSync(subtitlePath, tmpSubtitle);

  // FFmpeg on Windows needs forward slashes and escaped colons in the subtitles filter path
  const subPathForFFmpeg = tmpSubtitle.replace(/\\/g, '/').replace(/:/g, '\\:');
  const subtitleFilter = `subtitles='${subPathForFFmpeg}'`;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatPath).inputOptions(['-f concat', '-safe 0'])
      .input(audioConcatPath).inputOptions(['-f concat', '-safe 0'])
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-crf 18',
        '-preset medium',
        '-pix_fmt yuv420p',
        '-movflags +faststart',
        `-vf ${subtitleFilter}`,
        '-af atempo=0.9',
        '-r 30'
      ])
      .output(outputPath)
      .on('start', () => console.log('  ▶ Encoding started...'))
      .on('progress', p => {
        const pct = p.percent ? Math.min(100, Math.round(p.percent)) : 0;
        process.stdout.write(`\r  [${'█'.repeat(Math.round(pct / 2))}${'░'.repeat(50 - Math.round(pct / 2))}] ${pct}%  `);
      })
      .on('end', () => {
        console.log(`\n  ✅ Done → ${outputPath}`);
        const mb = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
        console.log(`  📦 Size: ${mb} MB`);
        // Cleanup temp subtitle
        try { fs.unlinkSync(tmpSubtitle); } catch(e) {}
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
           '--force-color-profile=srgb', '--disable-background-timer-throttling']
  });

  let allFrames = [];
  let frameOffset = 0;

  console.log('\n🎬 RetailEdge Pro — Enhanced Client Pitch Video');
  console.log('═'.repeat(60));
  console.log(`📺 ${SCENES.length} scenes | Title cards | Voiceovers | Subtitles`);
  console.log(`📡 Live app: http://localhost:5173`);
  console.log('═'.repeat(60));

  for (let i = 0; i < SCENES.length; i++) {
    const frames = await captureScene(browser, i, SCENES[i], frameOffset);
    allFrames = allFrames.concat(frames);
    frameOffset += frames.length;
  }

  await browser.close();
  console.log(`\n✅ Captured ${allFrames.length} frames total.`);

  const concatPath = buildConcatList(allFrames);
  const audioConcatPath = buildAudioConcatList(SCENES);
  const subtitlePath = buildSubtitles(SCENES);

  await encodeWithOverlays(concatPath, audioConcatPath, subtitlePath, OUTPUT_VIDEO);

  console.log('\n' + '═'.repeat(60));
  console.log('🎉  COMPLETE — RetailEdge Pro Client Pitch Video');
  console.log('═'.repeat(60));
  console.log(`\n  📁 ${OUTPUT_VIDEO}`);
  console.log(`\n  🌐 http://localhost:5173/RetailEdge_Pro_Client_Pitch.mp4`);
  console.timeEnd('⏱ Total production time');
})();
