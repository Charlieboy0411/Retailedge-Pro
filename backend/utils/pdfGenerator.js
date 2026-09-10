const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

function getVerificationBaseUrl() {
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim() !== '') {
    return process.env.FRONTEND_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.PUBLIC_URL && process.env.PUBLIC_URL.trim() !== '') {
    return process.env.PUBLIC_URL.trim().replace(/\/+$/, '');
  }
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return `http://${iface.address}:5173`;
        }
      }
    }
  } catch (e) {
    // fallback
  }
  return 'http://localhost:5173';
}

async function generateQRCodeDataUrl(text) {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 180,
      color: {
        dark: '#081226',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR data URL', err);
    return '';
  }
}

function getAssetBase64(relativeOrAbsPath, fallbackType = 'image/svg+xml') {
  if (!relativeOrAbsPath) return '';
  try {
    if (relativeOrAbsPath.startsWith('data:image/')) {
      return relativeOrAbsPath;
    }
    let targetPath = relativeOrAbsPath;
    if (relativeOrAbsPath.startsWith('/')) {
      targetPath = path.join(__dirname, '../../frontend/public', relativeOrAbsPath);
    }
    if (!fs.existsSync(targetPath)) {
      targetPath = path.join(__dirname, '../public', relativeOrAbsPath);
    }
    if (fs.existsSync(targetPath)) {
      const data = fs.readFileSync(targetPath);
      const isSvg = targetPath.endsWith('.svg');
      const isPng = targetPath.endsWith('.png');
      const isJpg = targetPath.endsWith('.jpg') || targetPath.endsWith('.jpeg');
      const mime = isSvg ? 'image/svg+xml' : (isPng ? 'image/png' : (isJpg ? 'image/jpeg' : 'image/png'));
      return `data:${mime};base64,${data.toString('base64')}`;
    }
  } catch (e) {
    console.error('Failed to load asset:', relativeOrAbsPath, e.message);
  }
  return '';
}

const generateCertificateHtml = async (cert, qrDataUrl) => {
  // Snapshot or fallback data
  const snapshot = cert.certificateSnapshot || {};
  const trainerSnap = snapshot.trainer || {};
  const authSnap = snapshot.authorizedSignatory || {};
  const sealSnap = snapshot.companySeal || {};

  const showTrainerSig = cert.includeTrainerSignature !== false && trainerSnap.enabled !== false;
  const showAuthSig = authSnap.enabled !== false;
  const showSeal = cert.includeCompanySeal !== false && sealSnap.enabled !== false;

  const trainerName = trainerSnap.name || cert.trainerName || cert.Trainer?.name || 'Aakash Verma';
  const trainerRole = trainerSnap.designation || 'Lead Trainer & Facilitator';
  const trainerOrg = trainerSnap.organization || 'RetailEdge Pro';

  const signatoryName = authSnap.name || cert.signatoryName || 'Amit Kumar';
  const signatoryDesignation = authSnap.designation || cert.signatoryDesignation || 'Program Manager';
  const signatoryOrg = authSnap.organization || 'Idonneous Marketing Services Pvt. Ltd.';

  // Signatures and Seal Base64 / Data URIs
  const authSigDataUri = getAssetBase64(authSnap.signatureAsset || cert.authorizedSignatureUrl || '/assets/signatures/amit_kumar_signature.svg');
  const trainerSigDataUri = getAssetBase64(trainerSnap.signatureAsset || cert.trainerSignatureUrl || '/assets/signatures/aakash_verma_signature.svg');
  const sealDataUri = getAssetBase64(sealSnap.asset || cert.companySealUrl || '/assets/seals/retailedge_pro_gold_seal.svg');
  const logoBase64 = getAssetBase64('/logo.png');

  // Manual seal placement extraction
  const sealPos = sealSnap.position || cert.sealPosition || snapshot.sealPosition || (typeof cert.sealPosition === 'string' ? { preset: cert.sealPosition } : { preset: 'top-right', x: 84, y: 6, scale: 100 });
  const sealScale = (typeof sealPos.scale === 'number' ? sealPos.scale : 100) / 100;
  const sealW = Math.round(142 * sealScale);
  const sealH = Math.round(172 * sealScale);

  let sealPositionStyle = `top: 38px; right: 88px; width: ${sealW}px; height: ${sealH}px;`;
  if (sealPos.preset === 'bottom-right') {
    sealPositionStyle = `bottom: 58px; right: 88px; width: ${sealW}px; height: ${sealH}px;`;
  } else if (sealPos.preset === 'bottom-center') {
    sealPositionStyle = `bottom: 58px; left: 50%; transform: translateX(-50%); width: ${sealW}px; height: ${sealH}px;`;
  } else if (sealPos.preset === 'bottom-left') {
    sealPositionStyle = `bottom: 58px; left: 88px; width: ${sealW}px; height: ${sealH}px;`;
  } else if (sealPos.preset === 'top-left') {
    sealPositionStyle = `top: 38px; left: 88px; width: ${sealW}px; height: ${sealH}px;`;
  } else if (sealPos.preset === 'custom' || (sealPos.x !== undefined && sealPos.y !== undefined)) {
    sealPositionStyle = `left: ${sealPos.x}%; top: ${sealPos.y}%; transform: translate(-50%, -50%); width: ${sealW}px; height: ${sealH}px;`;
  }

  const participantName = cert.User?.name || cert.participantName || 'Rahul Sharma';
  const programName = cert.Training?.title || cert.trainingTitle || cert.Project?.name || 'Product Knowledge – Cetaphil';
  const programCategory = cert.Training?.category || 'Product Knowledge';
  const projectName = cert.Project?.name || 'Retail Training Initiative';
  const clientName = cert.Client?.name || (cert.Project?.Client ? cert.Project.Client.name : 'Enterprise Client');
  const issueDateFormatted = cert.issueDate 
    ? new Date(cert.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'May 31, 2025';
  const certId = cert.certificate_id || cert.id || 'RETP-2025-05-000245';
  
  const scoreNum = parseFloat(cert.assessmentScore) || 92;
  const score = `${scoreNum}%`;
  const grade = scoreNum >= 90 ? 'Excellent' : (scoreNum >= 75 ? 'Distinction' : 'Passed');
  const duration = cert.duration || '2 Hours 15 Minutes';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>RetailEdge Pro Certificate</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Great+Vibes&family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 landscape; margin: 0; }
        * { box-sizing: border-box; }
        body {
          margin: 0; padding: 0; background: #081226; font-family: 'Inter', sans-serif;
          width: 1123px; height: 794px; overflow: hidden; display: flex; align-items: center; justify-content: center;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .cert-outer-wrapper {
          width: 1123px; height: 794px; background: #081226; padding: 14px; position: relative;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .cert-canvas {
          width: 100%; height: 100%; background: #FFFFFF; border-radius: 12px;
          border: 1.5px solid #C5A059; position: relative; overflow: hidden;
          display: flex; flex-direction: column; justify-content: space-between;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        /* ── Top-Right Polygon Geometric Layer ── */
        .top-right-decor {
          position: absolute; top: 0; right: 0; width: 440px; height: 440px; pointer-events: none; z-index: 1;
        }

        /* ── 3D Gold Ribbon Medallion Seal ── */
        .seal-medallion-badge {
          position: absolute; top: 38px; right: 88px; width: 142px; height: 172px; z-index: 10;
          filter: drop-shadow(0 8px 16px rgba(0,0,0,0.35));
        }

        /* ── Inner Content Container ── */
        .cert-body-content {
          padding: 34px 44px 10px 44px; position: relative; z-index: 2; height: 100%;
          display: flex; flex-direction: column; justify-content: space-between;
        }

        /* ── Top Bar: Logo & Certificate ID ── */
        .cert-header {
          display: flex; justify-content: space-between; align-items: flex-start;
        }
        .brand-logo-wrap {
          display: flex; align-items: center; gap: 10px;
        }
        .brand-logo-icon {
          width: 38px; height: 38px; border-radius: 8px; background: linear-gradient(135deg, #00D2FF 0%, #0072FF 100%);
          display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 900; font-size: 22px;
          font-family: 'Montserrat', sans-serif; box-shadow: 0 4px 10px rgba(0,114,255,0.3);
        }
        .brand-text-block {
          display: flex; flex-direction: column;
        }
        .brand-main-title {
          font-family: 'Inter', sans-serif; font-size: 23px; font-weight: 800; color: #081226; letter-spacing: -0.5px;
          line-height: 1.1;
        }
        .brand-main-title span {
          color: #0072FF; font-weight: 900;
        }
        .brand-subtitle {
          font-size: 9.5px; font-weight: 700; color: #64748B; letter-spacing: 0.2px; margin-top: 2px;
        }

        .cert-id-block {
          text-align: right; margin-right: 180px; /* offset from gold medallion */
        }
        .cert-id-label {
          font-size: 8.5px; font-weight: 700; color: #64748B; letter-spacing: 1px; text-transform: uppercase;
        }
        .cert-id-val {
          font-size: 12.5px; font-weight: 800; color: #081226; letter-spacing: 0.5px; margin-top: 1px;
        }
        .cert-id-bar {
          width: 32px; height: 2.5px; background: #0072FF; margin-left: auto; margin-top: 3px; border-radius: 2px;
        }

        /* ── Main Titles & Recipient ── */
        .title-block {
          text-align: center; margin-top: 8px; margin-bottom: 2px;
        }
        .main-heading {
          font-family: 'Cinzel', serif; font-size: 42px; font-weight: 900; color: #081226; letter-spacing: 3.5px;
          margin: 0; line-height: 1; text-transform: uppercase;
        }
        .divider-row {
          display: flex; align-items: center; justify-content: center; gap: 14px; margin: 4px 0 0 0;
        }
        .gold-line {
          width: 80px; height: 1.5px; background: linear-gradient(90deg, transparent, #C5A059, #D4AF37);
        }
        .gold-line.right {
          background: linear-gradient(90deg, #D4AF37, #C5A059, transparent);
        }
        .gold-diamond {
          width: 5px; height: 5px; background: #C5A059; transform: rotate(45deg); display: inline-block;
        }
        .sub-heading {
          font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 700; color: #C5A059;
          letter-spacing: 4px; text-transform: uppercase;
        }

        /* ── Recipient Presentation ── */
        .presentation-block {
          margin-top: 8px; text-align: left;
        }
        .certify-label {
          font-size: 10.5px; font-weight: 800; color: #64748B; letter-spacing: 1.5px; text-transform: uppercase;
          margin-bottom: 2px;
        }
        .recipient-name {
          font-family: 'Great Vibes', cursive; font-size: 46px; color: #081226; margin: 0; line-height: 1.15;
          letter-spacing: 0.5px;
        }
        .gold-name-underline {
          width: 440px; height: 1.5px; background: linear-gradient(90deg, #C5A059 0%, #E5C07B 60%, transparent 100%);
          margin-top: 2px; margin-bottom: 12px;
        }

        /* ── Mid Section: Statement & Side Metrics ── */
        .mid-section-layout {
          display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 24px; align-items: center; margin-top: 2px;
        }
        .statement-box {
          font-size: 12.5px; color: #475569; line-height: 1.5;
        }
        .program-title {
          font-size: 21px; font-weight: 800; color: #1D4ED8; margin: 4px 0 6px 0; line-height: 1.25;
        }

        /* ── Right-Side Details / Metric Stack ── */
        .metric-stack {
          display: flex; flex-direction: column; gap: 8px; padding-left: 20px;
        }
        .metric-item {
          display: flex; align-items: center; gap: 12px;
        }
        .metric-icon-circle {
          width: 28px; height: 28px; border-radius: 50%; background: #081226; color: #FFFFFF;
          display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(8,18,38,0.25);
        }
        .metric-text-group {
          display: flex; flex-direction: column;
        }
        .metric-title {
          font-size: 8px; font-weight: 800; color: #64748B; letter-spacing: 0.8px; text-transform: uppercase;
        }
        .metric-value {
          font-size: 11px; font-weight: 800; color: #081226; line-height: 1.2;
        }

        /* ── Lower Section: Signatures & QR Code ── */
        .lower-section {
          display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; padding-bottom: 8px;
        }
        .signatory-column {
          width: 250px;
        }
        .signature-img-wrap {
          height: 52px; display: flex; align-items: center; margin-bottom: 2px;
        }
        .signature-img-wrap img {
          max-height: 48px; max-width: 170px; object-fit: contain;
        }
        .signatory-name {
          font-size: 14px; font-weight: 800; color: #081226; margin: 0; line-height: 1.2;
        }
        .signatory-role {
          font-size: 10.5px; font-weight: 600; color: #475569; margin: 2px 0 0 0;
        }
        .signatory-org {
          font-size: 10px; color: #64748B; margin: 1px 0 0 0;
        }

        /* QR Code Block */
        .qr-verification-box {
          display: flex; align-items: center; gap: 14px;
        }
        .qr-img-frame {
          width: 82px; height: 82px; background: #FFFFFF; border: 1.5px solid #CBD5E1; border-radius: 8px;
          padding: 3px; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.06);
        }
        .qr-img-frame img {
          width: 100%; height: 100%; object-fit: contain;
        }
        .qr-text-group {
          display: flex; flex-direction: column;
        }
        .qr-verify-heading {
          font-size: 9.5px; font-weight: 800; color: #081226; letter-spacing: 0.8px; text-transform: uppercase;
        }
        .qr-scan-text {
          font-size: 8px; color: #64748B; margin-top: 2px;
        }
        .qr-verify-url {
          font-size: 9px; font-weight: 700; color: #0072FF; margin-top: 2px; text-decoration: none;
        }

        /* ── Bottom Dark Navy Ribbon Footer Bar ── */
        .bottom-ribbon-footer {
          width: 100%; height: 50px; background: #081226; border-top: 1.5px solid #C5A059;
          display: flex; justify-content: space-between; align-items: center; padding: 0 24px;
          position: relative; z-index: 5;
        }
        .footer-features-list {
          display: flex; align-items: center; gap: 18px;
        }
        .feature-pill {
          display: flex; align-items: center; gap: 6px; color: #E2E8F0; font-size: 8px; font-weight: 700;
          letter-spacing: 0.6px; text-transform: uppercase;
        }
        .feature-pill-icon {
          color: #00D2FF; font-size: 11px;
        }

        .footer-idonneous-logo-wrap {
          display: flex; align-items: center; gap: 10px; border-left: 1px solid rgba(255,255,255,0.15);
          padding-left: 18px;
        }
        .idonneous-triangle-icon {
          width: 22px; height: 22px;
        }
        .idonneous-text-wrap {
          display: flex; flex-direction: column;
        }
        .idonneous-name {
          font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 900; color: #FFFFFF; letter-spacing: 1px;
          line-height: 1;
        }
        .idonneous-sub {
          font-size: 6.5px; font-weight: 700; color: #94A3B8; letter-spacing: 0.5px; margin-top: 1px;
        }
        .idonneous-url {
          font-size: 7.5px; color: #00D2FF; margin-top: 1px; font-weight: 600; text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="cert-outer-wrapper">
        <div class="cert-canvas">
          
          <!-- Top-Right Geometric Polygon Layers -->
          <svg class="top-right-decor" viewBox="0 0 440 440" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 120 0 L 440 0 L 440 320 Z" fill="#0B1A38" opacity="0.95"/>
            <path d="M 210 0 L 440 0 L 440 230 Z" fill="#142C54" opacity="0.85"/>
            <path d="M 290 0 L 440 0 L 440 150 Z" fill="#1E3A8A" opacity="0.75"/>
            <line x1="120" y1="0" x2="440" y2="320" stroke="#C5A059" stroke-width="2"/>
            <line x1="210" y1="0" x2="440" y2="230" stroke="#E5C07B" stroke-width="1.5" stroke-dasharray="4,4"/>
          </svg>

          <!-- 3D Gold Ribbon Medallion Seal Badge with dynamic manual placement -->
          ${showSeal && sealDataUri ? `
            <div class="seal-medallion-badge" style="position: absolute; ${sealPositionStyle} z-index: 10; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.35));">
              <img src="${sealDataUri}" style="width: 100%; height: 100%; object-fit: contain;" alt="Official Seal" />
            </div>
          ` : ''}

          <!-- Certificate Content Canvas -->
          <div class="cert-body-content">
            
            <!-- Top Row: Logo and Certificate ID -->
            <div class="cert-header">
              <div class="brand-logo-wrap">
                <div class="brand-logo-icon">R</div>
                <div class="brand-text-block">
                  <div class="brand-main-title">RetailEdge <span>PRO</span></div>
                  <div class="brand-subtitle">Trainer-Led Learning & Performance Platform</div>
                </div>
              </div>

              <div class="cert-id-block">
                <div class="cert-id-label">CERTIFICATE ID</div>
                <div class="cert-id-val">${certId}</div>
                <div class="cert-id-bar"></div>
              </div>
            </div>

            <!-- Title: CERTIFICATE OF COMPLETION -->
            <div class="title-block">
              <h1 class="main-heading">CERTIFICATE</h1>
              <div class="divider-row">
                <div class="gold-line"></div>
                <div class="gold-diamond"></div>
                <div class="sub-heading">OF COMPLETION</div>
                <div class="gold-diamond"></div>
                <div class="gold-line right"></div>
              </div>
            </div>

            <!-- Recipient Name Block -->
            <div class="presentation-block">
              <div class="certify-label">THIS IS TO CERTIFY THAT</div>
              <h2 class="recipient-name">${participantName}</h2>
              <div class="gold-name-underline"></div>
            </div>

            <!-- Mid Section: Statement & Side Details -->
            <div class="mid-section-layout">
              <div class="statement-box">
                <div>has successfully completed the training program</div>
                <div class="program-title">${programName}</div>
                <div>and has demonstrated the required knowledge and skills through training, assessment and evaluation.</div>
              </div>

              <!-- Right-Side Details & Metrics Stack -->
              <div class="metric-stack">
                <div class="metric-item">
                  <div class="metric-icon-circle">📖</div>
                  <div class="metric-text-group">
                    <div class="metric-title">PROGRAM</div>
                    <div class="metric-value">${programCategory}</div>
                  </div>
                </div>

                <div class="metric-item">
                  <div class="metric-icon-circle">📅</div>
                  <div class="metric-text-group">
                    <div class="metric-title">COMPLETION DATE</div>
                    <div class="metric-value">${issueDateFormatted}</div>
                  </div>
                </div>

                <div class="metric-item">
                  <div class="metric-icon-circle">🏆</div>
                  <div class="metric-text-group">
                    <div class="metric-title">SCORE</div>
                    <div class="metric-value">${score}</div>
                  </div>
                </div>

                <div class="metric-item">
                  <div class="metric-icon-circle">🏅</div>
                  <div class="metric-text-group">
                    <div class="metric-title">GRADE</div>
                    <div class="metric-value">${grade}</div>
                  </div>
                </div>

                <div class="metric-item">
                  <div class="metric-icon-circle">⏱️</div>
                  <div class="metric-text-group">
                    <div class="metric-title">DURATION</div>
                    <div class="metric-value">${duration}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Lower Section: Signatures & QR Code -->
            <div class="lower-section">
              <!-- Authorized Signatory Block -->
              <div class="signatory-column" style="visibility: ${showAuthSig ? 'visible' : 'hidden'};">
                <div class="signature-img-wrap">
                  ${authSigDataUri ? `<img src="${authSigDataUri}" alt="Signature" />` : ''}
                </div>
                <div class="signatory-name">${signatoryName}</div>
                <div class="signatory-role">${signatoryDesignation}</div>
                <div class="signatory-org">${signatoryOrg}</div>
              </div>

              <!-- Trainer Signature Block (if enabled) -->
              ${showTrainerSig && trainerName !== signatoryName ? `
                <div class="signatory-column">
                  <div class="signature-img-wrap">
                    ${trainerSigDataUri ? `<img src="${trainerSigDataUri}" alt="Trainer Signature" />` : ''}
                  </div>
                  <div class="signatory-name">${trainerName}</div>
                  <div class="signatory-role">${trainerRole}</div>
                  <div class="signatory-org">${trainerOrg}</div>
                </div>
              ` : ''}

              <!-- QR Code Verification Box -->
              <div class="qr-verification-box">
                <div class="qr-img-frame">
                  ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : ''}
                </div>
                <div class="qr-text-group">
                  <div class="qr-verify-heading">VERIFY CERTIFICATE</div>
                  <div class="qr-scan-text">Scan QR code or visit</div>
                  <a href="${getVerificationBaseUrl()}/verify/${certId}" class="qr-verify-url">${getVerificationBaseUrl().replace(/^https?:\/\//, '')}/verify</a>
                </div>
              </div>
            </div>

          </div>

          <!-- Bottom Navy Ribbon Footer Bar -->
          <div class="bottom-ribbon-footer">
            <div class="footer-features-list">
              <div class="feature-pill"><span class="feature-pill-icon">👥</span> TRAINER CONTROLLED</div>
              <div class="feature-pill"><span class="feature-pill-icon">▶️</span> LIVE TRAINING</div>
              <div class="feature-pill"><span class="feature-pill-icon">📋</span> ASSESSMENTS & QUIZ</div>
              <div class="feature-pill"><span class="feature-pill-icon">🎖️</span> CERTIFICATION MANAGEMENT</div>
              <div class="feature-pill"><span class="feature-pill-icon">📊</span> ADVANCED ANALYTICS</div>
              <div class="feature-pill"><span class="feature-pill-icon">👁️</span> CLIENT VISIBILITY</div>
            </div>

            <div class="footer-idonneous-logo-wrap">
              <svg class="idonneous-triangle-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="20,4 36,34 4,34" stroke="#00D2FF" stroke-width="3.5" fill="none"/>
                <polygon points="20,13 30,31 10,31" stroke="#0072FF" stroke-width="2.5" fill="none"/>
              </svg>
              <div class="idonneous-text-wrap">
                <div class="idonneous-name">IDONNEOUS</div>
                <div class="idonneous-sub">MARKETING SERVICES</div>
                <a href="https://www.idonneous.com" class="idonneous-url">www.idonneous.com</a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
};

async function generatePDFBuffer(cert) {
  let browser = null;
  try {
    const certId = cert.certificate_id || cert.id || 'REP-2026-000184';
    const baseUrl = getVerificationBaseUrl();
    const verifyUrl = `${baseUrl}/verify/${certId}`;
    const qrDataUrl = await generateQRCodeDataUrl(verifyUrl);

    const htmlContent = await generateCertificateHtml(cert, qrDataUrl);

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 2 });
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 15000 });
    try {
      await page.evaluateHandle('document.fonts.ready');
    } catch (_) {}

    const pdfBuffer = await page.pdf({
      width: '1123px',
      height: '794px',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      pageRanges: '1'
    });

    return pdfBuffer;
  } catch (error) {
    console.error('Failed to generate certificate PDF buffer:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  generatePDFBuffer,
  generateQRCodeDataUrl,
  generateCertificateHtml
};
