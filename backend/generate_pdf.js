const puppeteer = require('puppeteer');
const path = require('path');

async function main() {
  console.log('Starting PDF generation from HTML slide deck...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const htmlPath = path.resolve(__dirname, '..', 'scratch', 'presentation_deck.html');
  // On Windows, convert backslashes to forward slashes and ensure three slashes for file protocol
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  console.log(`Loading HTML slide deck from: ${fileUrl}`);

  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // Wait extra 3 seconds for image rendering and styling settlement
  await new Promise(r => setTimeout(r, 3000));

  const pdfPath = path.resolve(__dirname, '..', 'frontend', 'public', 'RetailEdge_Executive_Presentation.pdf');
  console.log(`Saving PDF slide deck to: ${pdfPath}`);

  await page.pdf({
    path: pdfPath,
    width: '11in',
    height: '6.1875in',
    printBackground: true,
    margin: {
      top: '0px',
      bottom: '0px',
      left: '0px',
      right: '0px'
    }
  });

  await browser.close();
  console.log('PDF generated successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error('PDF generation failed:', err);
  process.exit(1);
});
