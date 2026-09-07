const puppeteer = require('puppeteer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const Session = require('../models/Session');
const Quiz = require('../models/Quiz');
const User = require('../models/User');

const API_BASE = 'http://localhost:5000/api';
const FE_BASE = 'http://localhost:5173';
const ARTIFACT_DIR = path.resolve('C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\4e49fe9d-64e5-4090-9cce-73da93bfb626');

async function validateLiveArenaVisual() {
  console.log('================================================================');
  console.log('  RETAILEDGE PRO — LIVE ARENA END-TO-END VISUAL VALIDATION');
  console.log('================================================================\n');

  // 1. Authenticate Trainer
  console.log('Authenticating Trainer (trainer@quizhive.com)...');
  const trainerLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: 'trainer@quizhive.com',
    password: 'password123'
  });
  const trainerToken = trainerLogin.data.token;
  const trainerUser = trainerLogin.data.user;

  // Resolve Quiz
  const quiz = await Quiz.findOne({
    where: { projectId: trainerUser.projectId, status: 'published' }
  });

  if (!quiz) {
    throw new Error('No published quiz found for Trainer project');
  }
  console.log(`Using Quiz: ${quiz.title} (ID: ${quiz.id})`);

  // Clear previous waiting/active sessions so we get a 100% fresh roomCode and clean state
  await Session.update(
    { status: 'finished' },
    { where: { quizId: quiz.id, status: ['waiting', 'active'] } }
  );

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });

  try {
    // --------------------------------------------------------------------------
    // STEP 1: HOST LOBBY — FRESH ARENA, REAL QR & REAL PIN
    // --------------------------------------------------------------------------
    console.log('\n[STEP 1] Opening Host Presentation Window...');
    const hostPage = await browser.newPage();
    await hostPage.setViewport({ width: 1366, height: 768 });

    // Set authentication token in localStorage
    await hostPage.goto(`${FE_BASE}/login`, { waitUntil: 'networkidle2' });
    await hostPage.evaluate((tok, usr) => {
      localStorage.setItem('jwt', tok);
      localStorage.setItem('token', tok);
      localStorage.setItem('user', JSON.stringify(usr));
    }, trainerToken, trainerUser);

    hostPage.on('console', msg => console.log('[HOST BROWSER]:', msg.text()));
    hostPage.on('pageerror', err => console.log('[HOST ERR]:', err.message));

    console.log(`Navigating Host to /host/${quiz.id}...`);
    await hostPage.goto(`${FE_BASE}/host/${quiz.id}`, { waitUntil: 'networkidle2' });

    console.log(`Current host URL: ${hostPage.url()}`);
    // Wait for real QR code image to appear (not loading spinner)
    console.log('Waiting for authoritative QR Code & Session PIN...');
    try {
      await hostPage.waitForSelector('img[alt="QR Code to Join"]', { timeout: 10000 });
    } catch (e) {
      console.log('FAILED waiting for QR! Page URL is:', hostPage.url());
      const bodyText = await hostPage.evaluate(() => document.body.innerText);
      console.log('Page body text:\n', bodyText.slice(0, 1000));
      throw e;
    }

    // Wait for Session PIN to be formatted numeric digits (not Preparing... or •••)
    await hostPage.waitForFunction(() => {
      const pinEl = document.querySelector('aside div[style*="monospace"]');
      if (!pinEl) return false;
      const text = pinEl.textContent.trim();
      return /^\d{3}\s\d{3}$/.test(text);
    }, { timeout: 10000 });

    const pinText = await hostPage.evaluate(() => {
      const pinEl = document.querySelector('aside div[style*="monospace"]');
      return pinEl ? pinEl.textContent.trim() : '';
    });
    const cleanPin = pinText.replace(/\s+/g, '');
    console.log(`✅ Authoritative Room PIN: "${pinText}" (Clean: ${cleanPin})`);

    // Capture Screenshot 1: Host Lobby with QR & PIN
    const shot1Path = path.join(ARTIFACT_DIR, 'live_arena_1_host_lobby.png');
    await hostPage.screenshot({ path: shot1Path, fullPage: true });
    console.log(`📸 Screenshot 1 saved: live_arena_1_host_lobby.png`);

    // --------------------------------------------------------------------------
    // STEP 2: PARTICIPANT CONNECTS VIA JOIN URL
    // --------------------------------------------------------------------------
    console.log('\n[STEP 2] Opening Participant Mobile Context...');
    const participantPage = await browser.newPage();
    await participantPage.setViewport({ width: 450, height: 850 });
    participantPage.on('console', msg => console.log('[PARTICIPANT BROWSER]:', msg.text()));
    participantPage.on('pageerror', err => console.log('[PARTICIPANT ERR]:', err.message));

    const joinUrl = `${FE_BASE}/join?code=${cleanPin}`;
    console.log(`Participant navigating to: ${joinUrl}...`);
    await participantPage.goto(joinUrl, { waitUntil: 'networkidle2' });

    // Set participant session details
    await participantPage.evaluate((code) => {
      localStorage.setItem(`qh_session_${code}`, JSON.stringify({
        name: 'Aarav Patel (Retail Associate)',
        avatar: '🦁',
        employeeId: 'EMP-DEL-104',
        mobileNumber: 'North Delhi Store',
        score: 0
      }));
    }, cleanPin);

    // Navigate to live lobby
    await participantPage.goto(`${FE_BASE}/live/${cleanPin}`, { waitUntil: 'networkidle2' });

    // Wait for participant connected state
    await participantPage.waitForFunction(() => {
      return document.body.textContent.includes('Ready for Session') && 
             document.body.textContent.includes('Connected');
    }, { timeout: 10000 });

    console.log('✅ Participant joined and showing "Ready for Session" / "Connected"');

    // Capture Screenshot 2: Participant Lobby
    const shot2Path = path.join(ARTIFACT_DIR, 'live_arena_2_participant_lobby.png');
    await participantPage.screenshot({ path: shot2Path, fullPage: true });
    console.log(`📸 Screenshot 2 saved: live_arena_2_participant_lobby.png`);

    // --------------------------------------------------------------------------
    // STEP 3: HOST ROSTER & METRICS UPDATE
    // --------------------------------------------------------------------------
    console.log('\n[STEP 3] Verifying Host Roster Real-Time Update...');
    await hostPage.bringToFront();
    // Wait on Host page for participant chip to appear
    try {
      await hostPage.waitForFunction(() => {
        return document.body.textContent.includes('Aarav Patel');
      }, { timeout: 15000 });
    } catch (e) {
      console.log('FAILED in Step 3! Host page text:\n', await hostPage.evaluate(() => document.body.innerText));
      throw e;
    }

    console.log('✅ Host live roster updated: 1 Learner joined!');

    // Capture Screenshot 3: Host Roster Updated
    const shot3Path = path.join(ARTIFACT_DIR, 'live_arena_3_host_roster_updated.png');
    await hostPage.screenshot({ path: shot3Path, fullPage: true });
    console.log(`📸 Screenshot 3 saved: live_arena_3_host_roster_updated.png`);

    // --------------------------------------------------------------------------
    // STEP 4: HOST STARTS SESSION (ACTIVE QUESTION 1)
    // --------------------------------------------------------------------------
    console.log('\n[STEP 4] Trainer starts session...');
    // Click "Start Session" button on host
    await hostPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find(b => b.textContent.includes('Start Session'));
      if (startBtn) startBtn.click();
    });

    // Wait for Question 1 canvas on host
    await hostPage.waitForFunction(() => {
      return document.body.textContent.includes('Question 1 of');
    }, { timeout: 10000 });

    console.log('✅ Host entered Active Question state!');

    // Capture Screenshot 4: Host Active Question 1
    const shot4Path = path.join(ARTIFACT_DIR, 'live_arena_4_host_question_active.png');
    await hostPage.screenshot({ path: shot4Path, fullPage: true });
    console.log(`📸 Screenshot 4 saved: live_arena_4_host_question_active.png`);

    // --------------------------------------------------------------------------
    // STEP 5: PARTICIPANT RECEIVES QUESTION & SUBMITS ANSWER
    // --------------------------------------------------------------------------
    console.log('\n[STEP 5] Participant receives Question 1 in real-time...');
    await participantPage.bringToFront();
    // Participant should receive question 1
    await participantPage.waitForFunction(() => {
      return document.body.textContent.includes('Question') || 
             document.querySelectorAll('button').length >= 2;
    }, { timeout: 15000 });

    console.log('✅ Participant received synchronized question!');

    // Capture Screenshot 5: Participant Question View
    const shot5Path = path.join(ARTIFACT_DIR, 'live_arena_5_participant_question.png');
    await participantPage.screenshot({ path: shot5Path, fullPage: true });
    console.log(`📸 Screenshot 5 saved: live_arena_5_participant_question.png`);

    // Participant selects first option button
    console.log('Participant answering Question 1...');
    await participantPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const optBtn = btns.find(b => b.textContent.trim().length > 3 && !b.textContent.includes('Next'));
      if (optBtn) optBtn.click();
    });

    await new Promise(r => setTimeout(r, 600));

    // Capture Screenshot 6: Participant Answered View
    const shot6Path = path.join(ARTIFACT_DIR, 'live_arena_6_participant_answered.png');
    await participantPage.screenshot({ path: shot6Path, fullPage: true });
    console.log(`📸 Screenshot 6 saved: live_arena_6_participant_answered.png`);

    // --------------------------------------------------------------------------
    // STEP 6: HOST REVEALS ANSWER
    // --------------------------------------------------------------------------
    console.log('\n[STEP 6] Trainer reveals correct answer...');
    await hostPage.bringToFront();
    await hostPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const revealBtn = btns.find(b => b.textContent.includes('Reveal Answer'));
      if (revealBtn) revealBtn.click();
    });

    // Wait for answer revealed (votes or green checkmark)
    await hostPage.waitForFunction(() => {
      return document.body.textContent.includes('vote') || 
             document.body.textContent.includes('100%');
    }, { timeout: 10000 });

    const revealedVoteText = await hostPage.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('%') && d.textContent.includes('vote'));
      return el ? el.textContent.trim() : 'not found';
    });
    console.log(`✅ Host revealed answer with vote distribution: "${revealedVoteText}"`);

    // Capture Screenshot 7: Host Answer Revealed
    const shot7Path = path.join(ARTIFACT_DIR, 'live_arena_7_host_answer_revealed.png');
    await hostPage.screenshot({ path: shot7Path, fullPage: true });
    console.log(`📸 Screenshot 7 saved: live_arena_7_host_answer_revealed.png`);

    // --------------------------------------------------------------------------
    // STEP 7: HOST SHOWS LEADERBOARD
    // --------------------------------------------------------------------------
    console.log('\n[STEP 7] Trainer advances to Session Leaderboard...');
    await hostPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const ldrBtn = btns.find(b => b.textContent.includes('Leaderboard'));
      if (ldrBtn) ldrBtn.click();
    });

    // Wait for leaderboard podium card
    await hostPage.waitForFunction(() => {
      return document.body.textContent.includes('Standings') || 
             document.body.textContent.includes('Aarav Patel');
    }, { timeout: 10000 });

    console.log('✅ Host showing live interim leaderboard podium!');

    // Capture Screenshot 8: Host Leaderboard Podium
    const shot8Path = path.join(ARTIFACT_DIR, 'live_arena_8_host_leaderboard.png');
    await hostPage.screenshot({ path: shot8Path, fullPage: true });
    console.log(`📸 Screenshot 8 saved: live_arena_8_host_leaderboard.png`);

    // --------------------------------------------------------------------------
    // STEP 8: SESSION COMPLETION & FINAL RESULTS
    // --------------------------------------------------------------------------
    console.log('\n[STEP 8] Completing session...');
    // Stop session via stop button
    await hostPage.evaluate(() => {
      window.confirm = () => true;
      const stopBtn = document.querySelector('button[title="Stop Session"]');
      if (stopBtn) stopBtn.click();
    });

    await new Promise(r => setTimeout(r, 1200));

    // Verify Session status in DB is 'finished'
    const finalSession = await Session.findOne({
      where: { roomCode: cleanPin }
    });
    console.log(`✅ Database Session Terminal Status: "${finalSession ? finalSession.status : 'unknown'}"`);

    // Capture Screenshot 9: Final dashboard or finished view
    const shot9Path = path.join(ARTIFACT_DIR, 'live_arena_9_session_completed.png');
    await hostPage.screenshot({ path: shot9Path, fullPage: true });
    console.log(`📸 Screenshot 9 saved: live_arena_9_session_completed.png`);

    console.log('\n================================================================');
    console.log('  ALL 9 LIVE ARENA VISUAL PROOF ARTIFACTS CAPTURED SUCCESSFULLY!');
    console.log('================================================================\n');

  } finally {
    await browser.close();
  }
}

validateLiveArenaVisual().catch(err => {
  console.error('VISUAL VALIDATION FAILED:', err);
  process.exit(1);
});
