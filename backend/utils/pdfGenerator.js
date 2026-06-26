const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const generateCertificateHtml = (cert) => {
  let logoBase64 = '';
  try {
    const logoPath = path.join(__dirname, '../../frontend/public/logo.png');
    const logoData = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
  } catch (e) {
    console.error('Failed to load logo.png', e);
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificate</title>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800;900&family=Sacramento&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 landscape; margin: 0; }
        body { margin: 0; padding: 0; background: #FFFFFF; font-family: 'Montserrat', sans-serif; width: 1123px; height: 794px; overflow: hidden; }
        .certificate-print-area {
          background: #FFFFFF;
          padding: 24px;
          color: #1F2328;
          font-family: 'Montserrat', sans-serif;
          position: relative;
          text-align: center;
          overflow: hidden;
          width: 1123px;
          height: 794px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .swoosh-tr { position: absolute; top: -150px; right: -150px; width: 350px; height: 350px; background: radial-gradient(circle, #D71920 40%, #1F2328 41%, #1F2328 50%, transparent 51%); border-radius: 50%; opacity: 0.9; }
        .swoosh-bl { position: absolute; bottom: -150px; left: -150px; width: 350px; height: 350px; background: radial-gradient(circle, #D71920 40%, #1F2328 41%, #1F2328 50%, transparent 51%); border-radius: 50%; opacity: 0.9; }
        .inner-border {
          border: 2px solid #1F2328;
          outline: 1px solid #D71920;
          outline-offset: -6px;
          padding: 40px 24px;
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 1;
          background: rgba(255,255,255,0.95);
        }
        .corner-tl { position: absolute; top: -1px; left: -1px; width: 30px; height: 30px; border-top: 4px solid #D71920; border-left: 4px solid #D71920; }
        .corner-tr { position: absolute; top: -1px; right: -1px; width: 30px; height: 30px; border-top: 4px solid #D71920; border-right: 4px solid #D71920; }
        .corner-bl { position: absolute; bottom: -1px; left: -1px; width: 30px; height: 30px; border-bottom: 4px solid #D71920; border-left: 4px solid #D71920; }
        .corner-br { position: absolute; bottom: -1px; right: -1px; width: 30px; height: 30px; border-bottom: 4px solid #D71920; border-right: 4px solid #D71920; }
        .seal { position: absolute; top: 20px; left: 20px; width: 90px; height: 90px; background: #D71920; border-radius: 50%; border: 4px solid #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #FFFFFF; box-shadow: 0 4px 10px rgba(215, 25, 32, 0.3); }
        .seal-text { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; text-align: center; line-height: 1.2; margin-top: 15px;}
        .ribbon-l { position: absolute; bottom: -20px; left: 10px; width: 20px; height: 30px; background: #1F2328; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); z-index: -1; }
        .ribbon-r { position: absolute; bottom: -20px; right: 10px; width: 20px; height: 30px; background: #1F2328; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); z-index: -1; }
        .brand { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin-bottom: 16px; }
        .brand-text { letter-spacing: 3px; font-size: 1rem; font-weight: 800; color: #1F2328; text-transform: uppercase; }
        .title { font-size: 3.5rem; font-weight: 900; margin: 0 0 4px 0; color: #D71920; letter-spacing: 2px; text-transform: uppercase; }
        .subtitle { font-size: 1.4rem; letter-spacing: 4px; color: #1F2328; margin-bottom: 40px; font-weight: 700; }
        .presented { font-size: 1rem; color: #5F6875; margin: 0 0 24px 0; font-weight: 500; }
        .name { font-family: 'Sacramento', cursive; font-size: 4.5rem; font-weight: bold; margin: 0 0 16px 0; color: #1F2328; border-bottom: 2px solid #D71920; padding-bottom: 8px; min-width: 500px; display: inline-block; }
        .description { font-size: 1.1rem; line-height: 1.6; color: #5F6875; max-width: 650px; margin: 16px auto 50px auto; }
        .project { font-size: 1.25rem; color: #D71920; display: block; margin-top: 12px; font-weight: 800; }
        .signatures { display: flex; justify-content: space-between; align-items: flex-end; width: 100%; padding: 0 50px; margin-top: auto; }
        .sig-block { text-align: center; min-width: 200px; }
        .sig-name { font-family: 'Sacramento', cursive; font-size: 2.5rem; color: #1F2328; font-weight: bold; margin-bottom: 8px; }
        .sig-line { height: 2px; background: #D71920; margin: 4px 0; }
        .sig-title { font-size: 0.85rem; color: #5F6875; font-weight: 600; }
        .flourish { color: #D71920; font-size: 1.5rem; padding-bottom: 20px; }
        .date { font-size: 1.2rem; color: #1F2328; padding-bottom: 6px; margin-bottom: 8px; padding-top: 10px; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="certificate-print-area">
        <div class="swoosh-tr"></div>
        <div class="swoosh-bl"></div>
        
        <div class="inner-border">
          <div class="corner-tl"></div>
          <div class="corner-tr"></div>
          <div class="corner-bl"></div>
          <div class="corner-br"></div>
          
          <div class="seal">
            <span class="seal-text">OFFICIAL<br/>CERT</span>
            <div class="ribbon-l"></div>
            <div class="ribbon-r"></div>
          </div>
          
          <div class="brand">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Idonneous Logo" style="height: 64px;" />` : ''}
            <div class="brand-text">RetailEdge Pro</div>
          </div>
          
          <h1 class="title">CERTIFICATE</h1>
          <div class="subtitle">OF COMPLETION</div>
          
          <p class="presented">This certificate is proudly presented to</p>
          
          <h2 class="name">${cert.User?.name || 'Student'}</h2>
          
          <p class="description">
            For successfully completing the rigorous program requirements, live interactive training sessions, and achieving superior performance benchmarks in:<br>
            <strong class="project">${cert.Project?.name || 'Training Program'}</strong>
          </p>
          
          <div class="signatures">
            <div class="sig-block">
              <div class="sig-name">Mohit Tiku</div>
              <div class="sig-line"></div>
              <div class="sig-title">Managing Director<br/>RetailEdge Pro</div>
            </div>
            
            <div class="flourish">♦</div>
            
            <div class="sig-block">
              <div class="date">${cert.issueDate || new Date().toISOString().split('T')[0]}</div>
              <div class="sig-line"></div>
              <div class="sig-title">Date of Issue<br/>Verified Credential</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

async function generatePDFBuffer(cert) {
  const html = generateCertificateHtml(cert);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  // Set viewport to A4 landscape size explicitly
  await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  // Wait a bit to ensure fonts are fully loaded
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  
  await browser.close();
  return pdfBuffer;
}

module.exports = { generatePDFBuffer };
