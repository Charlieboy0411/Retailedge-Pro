const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2', timeout: 30000 });
  
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'admin@quizhive.com');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForSelector('nav.sidebar', { timeout: 10000 });
    console.log('Sidebar found');
  } catch (e) {
    console.log('Sidebar NOT found');
  }
  
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 5000));
  
  await page.screenshot({ path: '../scratch/test_admin_dashboard.png' });
  await browser.close();
  console.log('Done');
})();
