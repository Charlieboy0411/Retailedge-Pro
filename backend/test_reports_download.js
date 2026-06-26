const puppeteer = require('puppeteer');
const fs = require('fs');

async function testReports() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set download behavior
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: 'D:\\Desktop\\quizhive _ lms\\backend\\downloads',
  });

  // Track console errors
  page.on('console', (msg) => {
    console.log(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', (err) => {
    console.error('[Browser Page Error]:', err.stack);
  });

  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'admin@quizhive.com');
  await page.type('input[type="password"]', 'password123');
  
  console.log('Submitting login form...');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0' })
  ]);
  
  console.log('URL after login:', page.url());
  
  console.log('Navigating to /reports...');
  await page.goto('http://localhost:5173/reports', { waitUntil: 'networkidle0' });
  console.log('URL after navigation to reports:', page.url());

  // Wait 2 seconds for reports to load
  await new Promise(r => setTimeout(r, 2000));

  // Click the first "View Analytics" button
  console.log('Clicking "View Analytics" button for first report...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('View Analytics'));
    if (btn) {
      btn.click();
    } else {
      console.error('View Analytics button not found');
    }
  });

  // Wait 2 seconds for modal to open and load
  await new Promise(r => setTimeout(r, 2000));

  const modalButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.innerText);
  });
  console.log('Available buttons after clicking View Analytics:', modalButtons);

  // Download Excel
  console.log('Clicking "Download Session Excel sheet (.xlsx)"...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Excel'));
    if (btn) btn.click();
    else console.error('Excel download button not found in modal');
  });

  // Wait 5 seconds for Excel download
  await new Promise(r => setTimeout(r, 5000));

  // Download complete PPT
  console.log('Clicking "Download Complete Presentation Deck"...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Complete Presentation'));
    if (btn) btn.click();
    else console.error('Complete Presentation PPT button not found in modal');
  });

  // Wait 5 seconds for PPT download
  await new Promise(r => setTimeout(r, 5000));

  // Check downloads directory
  if (fs.existsSync('D:\\Desktop\\quizhive _ lms\\backend\\downloads')) {
    const files = fs.readdirSync('D:\\Desktop\\quizhive _ lms\\backend\\downloads');
    console.log('Downloaded files in downloads directory:', files);
  } else {
    console.log('Downloads directory was not created.');
  }

  await browser.close();
}

testReports();
