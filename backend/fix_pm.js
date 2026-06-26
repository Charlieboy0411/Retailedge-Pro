const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'scratch', 'cinematic_screenshots');

async function fixCapture() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    
    // Use admin to get the PM dashboard to avoid missing selector issue
    await page.waitForSelector('button');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Admin');
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('nav.sidebar', { timeout: 30000 });
    await page.goto('http://localhost:5173/pm-dashboard', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 5000));
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pm_dashboard.png') });
    console.log('Fixed pm_dashboard.png captured successfully.');
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

fixCapture();
