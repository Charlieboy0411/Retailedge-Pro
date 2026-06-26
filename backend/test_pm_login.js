const puppeteer = require('puppeteer');

async function check() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'pm@quizhive.com');
  await page.type('input[type="password"]', 'password123');
  
  console.log('Submitting...');
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForSelector('nav.sidebar', { timeout: 10000 });
    console.log('Success! Logged in and found sidebar.');
  } catch (e) {
    console.log('Failed to log in:', e.message);
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Page body text:', bodyText.substring(0, 500));
  }
  
  await browser.close();
}
check();
