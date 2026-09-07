const { generate14SlideManagementPPT } = require('../utils/reportPPTGenerator');
const JSZip = require('jszip');

async function runChartVerification() {
  console.log('🚀 [RETAILEDGE PRO] Verifying Executive Native Charts in PowerPoint Deck...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, msg) => {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  };

  try {
    // 1. Prepare realistic report snapshot payload matching ReportAnalyticsEngine output
    const reportSnapshot = {
      level: 'LEVEL_2_PROJECT_MONTHLY',
      reportCode: 'REP-MO-202608-GALDERMA',
      title: 'Galderma — Retail Certification Monthly Intelligence (2026-08)',
      period: '2026-08',
      format: 'ALL',
      comparisonPeriod: '2026-07',
      summaryKPIs: {
        totalAssigned: 120,
        quizAssignments: 120,
        quizAttempts: 110,
        quizCompletions: 104,
        completed: 104,
        completionRate: '87%',
        passRate: '83%',
        averageScore: '78%',
        attendanceRate: '88%',
        totalSessions: 6,
        totalAttendees: 106,
        highestScore: '100%',
        lowestScore: '45%',
        certificatesIssued: 86
      },
      onlineVsOffline: {
        online: {
          sessions: 4,
          assigned: 70,
          attempted: 66,
          completed: 63,
          passed: 54,
          failed: 9,
          pending: 7,
          completionRate: '90%',
          passRate: '86%',
          averageScore: '81%'
        },
        offline: {
          sessions: 2,
          assigned: 50,
          attempted: 44,
          completed: 41,
          passed: 32,
          failed: 9,
          pending: 9,
          completionRate: '82%',
          passRate: '78%',
          averageScore: '74%'
        }
      },
      monthOverMonthComparison: {
        currentPeriod: '2026-08',
        priorPeriod: '2026-07',
        deltas: {
          attendanceRateDelta: { delta: 4, trend: 'UP', formatted: '+4%' },
          completionRateDelta: { delta: 6, trend: 'UP', formatted: '+6%' },
          passRateDelta: { delta: 3, trend: 'UP', formatted: '+3%' },
          averageScoreDelta: { delta: 2, trend: 'UP', formatted: '+2%' },
          totalAssignedDelta: { delta: 12, trend: 'UP', formatted: '+12%' }
        },
        priorStats: {
          attendanceRate: 84,
          completionRate: 81,
          passRate: 80,
          averageScore: 76
        }
      },
      projectSummary: [
        { projectName: 'Galderma Flagship', totalAssigned: 45, completed: 41, passRate: '88%', health: '🟢 Healthy', healthCode: 'GREEN' },
        { projectName: 'Galderma Regional East', totalAssigned: 35, completed: 30, passRate: '80%', health: '🟢 Healthy', healthCode: 'GREEN' },
        { projectName: 'Galderma Regional West', totalAssigned: 40, completed: 33, passRate: '72%', health: '🟠 Needs Attention', healthCode: 'YELLOW' }
      ],
      participantPerformance: [
        { participantName: 'Aarav Patel', score: 98, status: 'PASSED' },
        { participantName: 'Priya Sharma', score: 95, status: 'PASSED' },
        { participantName: 'Rohan Gupta', score: 92, status: 'PASSED' },
        { participantName: 'Ananya Iyer', score: 88, status: 'PASSED' }
      ],
      questionAnalytics: [
        { questionText: 'Skin Barrier Repair & Ceramide Formulations', accuracy: 92 },
        { questionText: 'Cetaphil Hydration Technology & Usage SOP', accuracy: 87 },
        { questionText: 'Product Interaction & Retail Counseling', accuracy: 78 },
        { questionText: 'POS Billing & Promotional Discount Workflows', accuracy: 66 },
        { questionText: 'Return & Damage Escalation Compliance', accuracy: 54 }
      ],
      actionRequired: [
        { participantName: 'Rahul Verma', projectName: 'Galderma Regional West', reason: 'Score < 60% (Requires 1-on-1 coaching)' },
        { participantName: 'Neha Sen', projectName: 'Galderma Regional West', reason: 'Pending final quiz attempt' }
      ]
    };

    console.log('--- TEST 1: PowerPoint Buffer Generation ---');
    const pptBuffer = await generate14SlideManagementPPT(reportSnapshot);
    assert(Buffer.isBuffer(pptBuffer), 'PPT generator returns valid Node.js Buffer');
    assert(pptBuffer.length > 100000, `PPT Buffer size is substantial (${pptBuffer.length} bytes)`);

    console.log('\n--- TEST 2: OpenXML Structure & Presentation Canvas Inspection ---');
    const zip = await JSZip.loadAsync(pptBuffer);
    const fileNames = Object.keys(zip.files);

    const presXml = await zip.file('ppt/presentation.xml').async('string');
    assert(presXml.includes('p:sldSz'), 'Presentation contains slide size definition (<p:sldSz>)');
    
    // Canvas should be 16:9 widescreen (width 12192000 EMU, height 6858000 EMU = 13.333" x 7.5")
    const hasWidescreen = presXml.includes('12192000') || presXml.includes('12191695');
    assert(hasWidescreen && presXml.includes('6858000'), 'Slide canvas strictly conforms to 16:9 Widescreen (13.333" x 7.5")');

    console.log('\n--- TEST 3: Slide Count Verification ---');
    const slideFiles = fileNames.filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    assert(slideFiles.length === 14, `Exact 14-slide executive story deck generated (Found: ${slideFiles.length})`);

    console.log('\n--- TEST 4: Native Chart XML Parts Inspection (Safeguard 1) ---');
    const chartFiles = fileNames.filter(f => /^ppt\/charts\/chart\d+\.xml$/.test(f));
    console.log(`  ℹ️ Discovered ${chartFiles.length} native chart XML parts in deck:`, chartFiles.join(', '));
    assert(chartFiles.length >= 10, `Presentation contains native OpenXML charts (Found: ${chartFiles.length} charts, required ≥ 10)`);

    // Verify each chart part is non-empty and contains valid chart XML
    for (const cf of chartFiles) {
      const cXml = await zip.file(cf).async('string');
      const hasChartRoot = cXml.includes('c:chart') || cXml.includes('c:plotArea');
      assert(hasChartRoot, `Chart part ${cf} contains valid vector OpenXML chart plot definition`);
    }

    console.log('\n--- TEST 5: Chart Relationships Mapped to Slides ---');
    const relFiles = fileNames.filter(f => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(f));
    let slidesWithCharts = 0;
    for (const rf of relFiles) {
      const relXml = await zip.file(rf).async('string');
      if (relXml.includes('http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart')) {
        slidesWithCharts++;
      }
    }
    console.log(`  ℹ️ Number of slides linking to native charts: ${slidesWithCharts}`);
    assert(slidesWithCharts >= 10, `At least 10 slides link to native chart relationships (Found: ${slidesWithCharts})`);

    console.log('\n--- TEST 6: Formatting Sanitization & Percentage Hygiene ---');
    let hasDoublePct = false;
    for (const sf of slideFiles) {
      const sXml = await zip.file(sf).async('string');
      if (sXml.includes('%%')) {
        hasDoublePct = true;
        console.error(`  ❌ Found double percent '%%' in ${sf}`);
      }
    }
    assert(!hasDoublePct, 'Zero double-percent ("%%") strings found across all 14 slides');

    console.log('\n--- TEST 7: Intentional Fallback for Narrow Scope (Safeguard 4) ---');
    // Test a Level 1 single-quiz report with no projectSummary
    const level1Snapshot = {
      level: 'LEVEL_1_QUIZ',
      reportCode: 'REP-QZ-20260904-001',
      title: 'Galderma — Skin Science Assessment',
      period: '2026-09-04',
      format: 'ONLINE',
      summaryKPIs: {
        totalAssigned: 30,
        quizCompletions: 28,
        completionRate: '93%',
        passRate: '89%',
        averageScore: '82%'
      },
      projectSummary: [] // Empty multi-project summary
    };

    const l1Buffer = await generate14SlideManagementPPT(level1Snapshot);
    const l1Zip = await JSZip.loadAsync(l1Buffer);
    const slide6Xml = await l1Zip.file('ppt/slides/slide6.xml').async('string');
    assert(
      slide6Xml.includes('not applicable') || slide6Xml.includes('DATA SCOPE NOTICE'),
      'Slide 6 renders clean intentional fallback when multi-project matrix is not in scope'
    );

    console.log(`\n======================================================`);
    console.log(`PPT NATIVE CHARTS TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log(`======================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Unhandled test error:', err);
    process.exit(1);
  }
}

runChartVerification();
