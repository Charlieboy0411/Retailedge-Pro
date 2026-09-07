const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function validateSupervisorCertificatesUI() {
  console.log('================================================================');
  console.log('  SUPERVISOR CERTIFICATE UI & DIRECT ROUTE GUARD VALIDATION');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const ARTIFACT_DIR = 'C:/Users/admin/.gemini/antigravity-ide/brain/31233919-f2a5-47b5-bf0b-f6ecc73ed7d1';

  try {
    // 1. Log in as Supervisor
    console.log('Step 1: Logging in as Supervisor (supervisor@quizhive.com)...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    
    await page.type('input[type="email"], input[name="email"]', 'supervisor@quizhive.com');
    await page.type('input[type="password"], input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('  Landed on:', page.url());

    // 2. Navigate to /certificates
    console.log('\nStep 2: Navigating to /certificates...');
    await page.goto('http://localhost:5173/certificates', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const pageText = await page.evaluate(() => document.body.innerText);

    const hasTeamCertTitle = pageText.includes('Team Certifications');
    const hasTemplatesTab = pageText.includes('Templates & Designer');
    const hasAnalyticsTab = pageText.includes('Certification Analytics');
    const hasBulkTab = pageText.includes('Batch Eligibility & Bulk Generator');
    const hasCreateCertBtn = pageText.includes('Create Certificate');
    const hasGenerateCertBtn = pageText.includes('Generate Certificates');
    const hasTemplateCustomizer = pageText.includes('Template Customizer');

    console.log('  Header "Team Certifications":', hasTeamCertTitle ? '✅ PRESENT' : '❌ MISSING');
    console.log('  Tab "Templates & Designer":', hasTemplatesTab ? '❌ EXPOSED' : '✅ NOT RENDERED');
    console.log('  Tab "Certification Analytics":', hasAnalyticsTab ? '❌ EXPOSED' : '✅ NOT RENDERED');
    console.log('  Tab "Batch Eligibility & Bulk Generator":', hasBulkTab ? '❌ EXPOSED' : '✅ NOT RENDERED');
    console.log('  Button "Create Certificate":', hasCreateCertBtn ? '❌ EXPOSED' : '✅ NOT RENDERED');
    console.log('  Button "Generate Certificates":', hasGenerateCertBtn ? '❌ EXPOSED' : '✅ NOT RENDERED');
    console.log('  "Template Customizer" Component:', hasTemplateCustomizer ? '❌ EXPOSED' : '✅ NOT RENDERED');

    if (!hasTeamCertTitle || hasTemplatesTab || hasAnalyticsTab || hasBulkTab || hasCreateCertBtn || hasTemplateCustomizer) {
      throw new Error('Supervisor /certificates validation failed: Certificate Authority controls exposed!');
    }

    const certScreenshotPath = path.join(ARTIFACT_DIR, 'supervisor_certificates_fixed.png');
    await page.screenshot({ path: certScreenshotPath, fullPage: false });
    console.log('  ✅ Captured screenshot:', certScreenshotPath);

    // 3. Direct Navigation to /certificates/templates
    console.log('\nStep 3: Direct Navigation to /certificates/templates...');
    await page.goto('http://localhost:5173/certificates/templates', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const templatesDirectText = await page.evaluate(() => document.body.innerText);
    const hasAccessDenied = templatesDirectText.includes('Access Denied');
    const hasForbiddenBadge = templatesDirectText.includes('HTTP 403 Forbidden') || templatesDirectText.includes('Forbidden');
    const hasDesignerLoaded = templatesDirectText.includes('Template Customizer');

    console.log('  Access Denied title:', hasAccessDenied ? '✅ PRESENT' : '❌ MISSING');
    console.log('  403 Forbidden status:', hasForbiddenBadge ? '✅ PRESENT' : '❌ MISSING');
    console.log('  Protected Designer component loaded:', hasDesignerLoaded ? '❌ LEAKED' : '✅ BLOCKED');

    if (!hasAccessDenied || hasDesignerLoaded) {
      throw new Error('Direct route guard failed: /certificates/templates did not show Access Denied!');
    }

    const deniedScreenshotPath = path.join(ARTIFACT_DIR, 'supervisor_templates_access_denied.png');
    await page.screenshot({ path: deniedScreenshotPath, fullPage: false });
    console.log('  ✅ Captured screenshot:', deniedScreenshotPath);

    // 4. Direct Navigation to /certificates/analytics
    console.log('\nStep 4: Direct Navigation to /certificates/analytics...');
    await page.goto('http://localhost:5173/certificates/analytics', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    const analyticsDirectText = await page.evaluate(() => document.body.innerText);
    if (!analyticsDirectText.includes('Access Denied')) {
      throw new Error('Direct route guard failed: /certificates/analytics did not show Access Denied!');
    }
    console.log('  ✅ /certificates/analytics correctly blocked with Access Denied screen');

    // 5. Direct Navigation to /certificates/batch-generator
    console.log('\nStep 5: Direct Navigation to /certificates/batch-generator...');
    await page.goto('http://localhost:5173/certificates/batch-generator', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    const bulkDirectText = await page.evaluate(() => document.body.innerText);
    if (!bulkDirectText.includes('Access Denied')) {
      throw new Error('Direct route guard failed: /certificates/batch-generator did not show Access Denied!');
    }
    console.log('  ✅ /certificates/batch-generator correctly blocked with Access Denied screen');

    // 6. Direct Navigation to /signatures-and-seals
    console.log('\nStep 6: Direct Navigation to /signatures-and-seals...');
    await page.goto('http://localhost:5173/signatures-and-seals', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    const sigDirectText = await page.evaluate(() => document.body.innerText);
    if (!sigDirectText.includes('Access Denied')) {
      throw new Error('Direct route guard failed: /signatures-and-seals did not show Access Denied!');
    }
    console.log('  ✅ /signatures-and-seals correctly blocked with Access Denied screen');

    console.log('\n================================================================');
    console.log('  🎉 ALL BROWSER RBAC VALIDATIONS PASSED WITH ZERO FAILURES!');
    console.log('================================================================\n');
  } catch (err) {
    console.error('Validation failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

validateSupervisorCertificatesUI();
