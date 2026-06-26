'use strict';
// Quick test: capture 5 frames to verify the pipeline works
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'scratch', 'video_animation.html');
const testDir = path.join(__dirname, '..', 'scratch', 'video_test_frames');

if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

(async () => {
  console.log('🧪 Test capture — 5 frames across video timeline...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--disable-web-security',
      '--allow-file-access-from-files',
      '--force-color-profile=srgb',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  console.log('Loading:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // Total duration 320000ms, capture frames at 0%, 20%, 40%, 60%, 80% of video
  const DURATIONS = [15000,15000,15000,15000,15000,15000,15000,15000,15000,15000,15000,20000,15000,15000,15000,15000,15000,15000,15000,15000,15000];
  const TOTAL = DURATIONS.reduce((a, b) => a + b, 0);
  const testPoints = [0, 0.2, 0.4, 0.6, 0.8].map(pct => Math.floor(pct * TOTAL));

  for (let i = 0; i < testPoints.length; i++) {
    const targetTimeMs = testPoints[i];
    
    await page.evaluate((targetTimeMs, durations) => {
      let accumulated = 0;
      let targetScene = 1;
      for (let j = 0; j < durations.length; j++) {
        if (accumulated + durations[j] > targetTimeMs) { targetScene = j + 1; break; }
        accumulated += durations[j];
        if (j === durations.length - 1) targetScene = durations.length;
      }
      // Deactivate all scenes, activate target
      for (let s = 1; s <= 21; s++) {
        const el = document.getElementById(`scene${s}`);
        if (el) el.classList.remove('active');
      }
      const target = document.getElementById(`scene${targetScene}`);
      if (target) target.classList.add('active');
      window.__currentSceneOverride = targetScene;
      
      const pct = Math.min(100, (targetTimeMs / durations.reduce((a,b)=>a+b,0)) * 100);
      const pb = document.getElementById('progress-bar');
      if (pb) pb.style.width = pct + '%';
      const sc = document.getElementById('scene-counter');
      if (sc) sc.textContent = `${String(targetScene).padStart(2,'0')} / 21`;
    }, targetTimeMs, DURATIONS);

    await new Promise(r => setTimeout(r, 500)); // Let CSS transitions settle

    const framePath = path.join(testDir, `test_frame_${i+1}_t${Math.round(targetTimeMs/1000)}s.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    
    const scene = await page.evaluate(() => window.__currentSceneOverride || 1);
    console.log(`✅ Test frame ${i+1}: t=${Math.round(targetTimeMs/1000)}s → Scene ${scene} → ${path.basename(framePath)}`);
  }

  await browser.close();
  console.log('\n🎉 Test complete! Check: ' + testDir);
  console.log('\nTest frames saved:');
  fs.readdirSync(testDir).forEach(f => {
    const stats = fs.statSync(path.join(testDir, f));
    console.log(`  ${f} (${Math.round(stats.size/1024)}KB)`);
  });
})().catch(console.error);
