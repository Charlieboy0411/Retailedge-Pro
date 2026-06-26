const puppeteer = require('puppeteer');

async function check() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'admin@quizhive.com');
  await page.type('input[type="password"]', 'password123');
  
  console.log('Submitting...');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0' })
  ]);
  
  console.log('URL after submit:', page.url());
  
  console.log('Navigating to pm-dashboard...');
  await page.goto('http://localhost:5173/pm-dashboard', { waitUntil: 'networkidle0' });
  
  console.log('URL after nav to pm-dashboard:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body text sample:', bodyText.substring(0, 300));
  
  await browser.close();
}
check();
