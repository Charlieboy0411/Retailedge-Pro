// Unified PowerPoint generator helper for Idonneous Learning Arena
// Uses pptxgenjs to build a 15-slide detailed analytics presentation

import { downloadPPT } from './downloadWorkbook';

export const generate15SlidePPT = async (sessionData, slideSettings = [], themeName = 'standard', brandingOpts = {}, passingScore = 70) => {
  const pptxMod = await import('pptxgenjs');
  const PptxGenJS = pptxMod.default || pptxMod;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // Widescreen 16:9 format

  // 1. Color Themes mapping
  const themes = {
    standard: {
      bg: '0F172A', // Slate 900
      card: '1E293B', // Slate 800
      primary: '7C3AED', // Violet 600
      secondary: 'F36F21', // Idonneous Orange
      text: 'FFFFFF',
      subtext: '94A3B8',
      green: '10B981',
      red: 'EF4444',
      yellow: 'F59E0B'
    },
    client: {
      bg: '0A192F', // Navy Dark
      card: '172A45', // Navy Card
      primary: '3B82F6', // Client Blue
      secondary: 'F59E0B', // Gold
      text: 'FFFFFF',
      subtext: '8892B0',
      green: '10B981',
      red: 'EF4444',
      yellow: 'F59E0B'
    },
    corporate: {
      bg: '111827', // Slate Dark Grey
      card: '1F2937', // Grey Card
      primary: '14B8A6', // Teal 500
      secondary: '06B6D4', // Cyan 500
      text: 'F9FAFB',
      subtext: '9CA3AF',
      green: '10B981',
      red: 'EF4444',
      yellow: 'F59E0B'
    },
    conference: {
      bg: '1E1B4B', // Premium Indigo
      card: '312E81', // Indigo Card
      primary: 'D946EF', // Fuchsia 500
      secondary: 'EC4899', // Pink 500
      text: 'FFFFFF',
      subtext: 'C7D2FE',
      green: '10B981',
      red: 'EF4444',
      yellow: 'F59E0B'
    }
  };

  const theme = themes[themeName] || themes.standard;

  // Custom branding controls parameters
  const footerText = brandingOpts.footerText || `Idonneous Learning Arena · ${sessionData.projectName || 'General'}`;
  const presenterName = brandingOpts.presenterName || sessionData.hostName || 'L&D Administrator';
  const clientLogo = brandingOpts.clientLogo || null;
  const projectLogo = brandingOpts.projectLogo || null;

  // Helper to add cover/header/footer elements onto a slide
  const addSlideHeader = (slide, titleText, subtitleText) => {
    slide.background = { color: theme.bg };

    // Standard Header text
    slide.addText(titleText.toUpperCase(), { 
      x: 0.5, y: 0.4, w: 12.3, h: 0.5, 
      fontSize: 22, bold: true, color: theme.primary, 
      fontFace: 'Arial' 
    });

    if (subtitleText) {
      slide.addText(subtitleText, { 
        x: 0.5, y: 0.85, w: 12.3, h: 0.3, 
        fontSize: 11, color: theme.subtext, 
        fontFace: 'Arial' 
      });
    }

    // Divider Line
    slide.addShape(pptx.ShapeType.rect, { 
      x: 0.5, y: 1.25, w: 12.3, h: 0.02, 
      fill: { color: theme.card } 
    });

    // Custom Footer
    slide.addText(footerText, { 
      x: 0.5, y: 7.0, w: 7.0, h: 0.3, 
      fontSize: 9, color: '475569', 
      fontFace: 'Arial' 
    });

    slide.addText(`Presenter: ${presenterName}`, {
      x: 7.5, y: 7.0, w: 4.0, h: 0.3,
      fontSize: 9, color: '475569',
      align: 'right',
      fontFace: 'Arial'
    });

    slide.addText(`${pptx.slides.length}`, { 
      x: 12.0, y: 7.0, w: 0.8, h: 0.3, 
      fontSize: 9, color: '475569', 
      align: 'right',
      fontFace: 'Arial' 
    });
  };

  // Helper to retrieve notes configuration for a slide
  const getSlideNotes = (slideId) => {
    const config = slideSettings.find(s => s.id === slideId);
    return config && config.notes ? config.notes : '';
  };

  // Check if a slide is enabled
  const isSlideEnabled = (slideId) => {
    const config = slideSettings.find(s => s.id === slideId);
    return config ? config.enabled !== false : true;
  };

  // ----------------------------------------------------
  // DYNAMIC CALCULATIONS & FALLBACKS FOR SESSION DATA
  // ----------------------------------------------------
  const participants = sessionData.participants || [];
  const totalCount = participants.length;

  let avgPercent = 0;
  let medianPercent = 0;
  let highestScorePercent = 0;
  let lowestScorePercent = 100;
  let passedCount = 0;
  const passMarkPercent = passingScore; // Dynamic Benchmark

  const parseDurationSec = (val) => {
    if (typeof val === 'number' && !isNaN(val)) return val;
    const m = String(val || '').match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : Number.MAX_SAFE_INTEGER;
  };

  if (totalCount > 0) {
    const percentages = participants.map(p => parseFloat(String(p.percentage || 0).replace(/%/g, '')) || 0);
    const sumPercent = percentages.reduce((a, b) => a + b, 0);
    avgPercent = Math.round(sumPercent / totalCount);
    const sortedPct = [...percentages].sort((a, b) => a - b);
    const mid = Math.floor(sortedPct.length / 2);
    medianPercent = Math.round(sortedPct.length % 2 !== 0 ? sortedPct[mid] : (sortedPct[mid - 1] + sortedPct[mid]) / 2);
    highestScorePercent = Math.round(Math.max(...percentages));
    lowestScorePercent = Math.round(Math.min(...percentages));
    passedCount = percentages.filter(val => val >= passMarkPercent).length;
  } else {
    avgPercent = 0;
    medianPercent = 0;
    highestScorePercent = 0;
    lowestScorePercent = 0;
    passedCount = 0;
  }

  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
  const certRate = passRate;
  const avgCompletionPct = totalCount > 0
    ? Math.round(participants.reduce((s, p) => s + (parseFloat(String(p.completion || 100).replace(/%/g, '')) || 0), 0) / totalCount)
    : 0;
  const attendanceRate = avgCompletionPct;
  const registeredCount = totalCount;
  const dropCount = 0;
  const attendedCount = totalCount;
  const noShowCount = registeredCount - attendedCount - dropCount;

  // Sorted participants for Leaderboard (Accuracy % desc -> Points desc -> Fastest time asc -> Name asc)
  const sortedParticipants = [...participants].sort((a, b) => {
    const pctDiff = (parseFloat(String(b.percentage || 0).replace(/%/g, '')) || 0) - (parseFloat(String(a.percentage || 0).replace(/%/g, '')) || 0);
    if (pctDiff !== 0) return pctDiff;
    const ptsA = Number(a.pointsEarned ?? a.arenaPoints ?? 0);
    const ptsB = Number(b.pointsEarned ?? b.arenaPoints ?? 0);
    if (ptsB !== ptsA) return ptsB - ptsA;
    const timeDiff = parseDurationSec(a.timeSpent) - parseDurationSec(b.timeSpent);
    if (timeDiff !== 0) return timeDiff;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  // Questions and real response accuracy mapping
  const questionsList = sessionData.questions || [];
  const questionStats = questionsList.map((q, idx) => {
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    participants.forEach(p => {
      const resp = (p.responses || []).find(r => r.questionId === q.id);
      if (!resp || resp.answer === null || resp.answer === undefined || String(resp.answer).trim() === '') {
        skipped++;
      } else if ((Number(resp.points_awarded) || 0) > 0 || resp.is_correct) {
        correct++;
      } else {
        incorrect++;
      }
    });
    const denom = totalCount || 1;
    const correctVal = Math.round((correct / denom) * 100);
    const skippedVal = Math.round((skipped / denom) * 100);
    const incorrectVal = Math.max(0, 100 - correctVal - skippedVal);
    const diffText = correctVal >= 75 ? 'Easy' : correctVal >= 45 ? 'Medium' : 'Hard';
    const diffColor = correctVal >= 75 ? theme.green : correctVal >= 45 ? theme.yellow : theme.red;
    return {
      qNum: idx + 1,
      text: q.text || `Question ${idx + 1}`,
      correct,
      incorrect,
      skipped,
      correctVal,
      incorrectVal,
      skippedVal,
      diffText,
      diffColor
    };
  });

  // Map slide sequence
  const defaultSlideOrder = [
    'slide1', 'slide2', 'slide3', 'slide4', 'slide5', 
    'slide6', 'slide7', 'slide8', 'slide9', 'slide10', 
    'slide11', 'slide12', 'slide13', 'slide14', 'slide15'
  ];

  // Get customized order or default order
  let orderedSlides = [...defaultSlideOrder];
  if (slideSettings.length > 0) {
    // Sort slideSettings by order, then extract IDs
    const sortedSettings = [...slideSettings].sort((a, b) => (a.order || 0) - (b.order || 0));
    orderedSlides = sortedSettings.map(s => s.id);
  }

  // Iterate and build each slide in the specific order
  for (const slideId of orderedSlides) {
    if (!isSlideEnabled(slideId)) continue;

    const notesText = getSlideNotes(slideId);

    // SLIDE 1: Cover Page
    if (slideId === 'slide1') {
      const slide = pptx.addSlide();
      slide.background = { color: theme.bg };

      // Top logo bar
      if (clientLogo) {
        // Embed client logo
        slide.addImage({ data: clientLogo, x: 0.5, y: 0.4, w: 1.5, h: 0.6 });
      } else {
        // Logo shape fallback
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 0.4, w: 1.8, h: 0.5, fill: { color: theme.card } });
        slide.addText('CLIENT LOGO', { x: 0.5, y: 0.4, w: 1.8, h: 0.5, fontSize: 10, bold: true, color: theme.secondary, align: 'center' });
      }

      // Project logo right aligned
      if (projectLogo) {
        slide.addImage({ data: projectLogo, x: 10.8, y: 0.4, w: 1.8, h: 0.6 });
      } else {
        slide.addShape(pptx.ShapeType.roundRect, { x: 10.8, y: 0.4, w: 1.8, h: 0.5, fill: { color: theme.card } });
        slide.addText('IDONNEOUS', { x: 10.8, y: 0.4, w: 1.8, h: 0.5, fontSize: 10, bold: true, color: theme.primary, align: 'center' });
      }

      // Central title card
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 2.2, w: 0.15, h: 2.6, fill: { color: theme.primary } });
      
      slide.addText((sessionData.projectName || 'Galderma').toUpperCase(), { 
        x: 0.8, y: 2.1, w: 11.5, h: 0.4, 
        fontSize: 14, bold: true, color: theme.secondary, 
        fontFace: 'Arial' 
      });

      slide.addText(sessionData.quizTitle || 'Product Training Evaluation Report', { 
        x: 0.8, y: 2.5, w: 11.5, h: 1.4, 
        fontSize: 38, bold: true, color: theme.text, 
        fontFace: 'Arial' 
      });

      slide.addText(`Trainer: ${sessionData.hostName || 'Demo Trainer'}  ·  Project Client: ${sessionData.projectName || 'Corporate'}`, { 
        x: 0.8, y: 4.0, w: 11.5, h: 0.4, 
        fontSize: 13, color: theme.subtext, 
        fontFace: 'Arial' 
      });

      slide.addText(`Evaluation Session Date: ${sessionData.date || new Date().toISOString().split('T')[0]}`, { 
        x: 0.8, y: 4.4, w: 11.5, h: 0.3, 
        fontSize: 11, color: theme.primary, 
        italic: true, fontFace: 'Arial' 
      });

      // Bottom information row
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 5.8, w: 12.3, h: 0.05, fill: { color: theme.card } });
      
      slide.addText('POWERED BY IDONNEOUS LEARNING ARENA', { 
        x: 0.5, y: 6.0, w: 6.0, h: 0.3, 
        fontSize: 10, bold: true, color: theme.subtext, 
        fontFace: 'Arial' 
      });

      slide.addText(`Report Generated By: ${presenterName} on ${new Date().toLocaleDateString()}`, { 
        x: 6.5, y: 6.0, w: 6.3, h: 0.3, 
        fontSize: 10, color: '475569', 
        align: 'right', fontFace: 'Arial' 
      });

      if (notesText) slide.addNotes(notesText);
    }

    // SLIDE 2: Executive Summary
    else if (slideId === 'slide2') {
      const slide = pptx.addSlide();
      addSlideHeader(slide, 'Executive Summary', 'Key Performance Indicators (KPIs) and operational summary');

      // 7 Executive KPI Cards
      const kpis = [
        { label: 'Participants', val: String(totalCount), color: theme.primary },
        { label: 'Completion %', val: `${attendanceRate}%`, color: theme.green },
        { label: 'Pass %', val: `${passRate}%`, color: theme.green },
        { label: 'Average Score', val: `${avgPercent}%`, color: theme.secondary },
        { label: 'Certification %', val: `${certRate}%`, color: theme.primary },
        { label: 'Attendance %', val: `${attendanceRate}%`, color: theme.secondary },
        { label: 'Engagement', val: `${engagementIndex}/5`, color: theme.yellow }
      ];

      kpis.forEach((kpi, idx) => {
        const xPos = 0.5 + (idx * 1.76); // Fit 7 cards cleanly inside 12.3 width
        slide.addShape(pptx.ShapeType.rect, { 
          x: xPos, y: 1.8, w: 1.6, h: 2.2, 
          fill: { color: theme.card }, 
          line: { color: '334155', width: 1 } 
        });

        slide.addShape(pptx.ShapeType.rect, { 
          x: xPos, y: 1.8, w: 1.6, h: 0.1, 
          fill: { color: kpi.color } 
        });

        slide.addText(kpi.label, { 
          x: xPos + 0.05, y: 2.1, w: 1.5, h: 0.4, 
          fontSize: 10, bold: true, color: theme.subtext, 
          align: 'center', fontFace: 'Arial' 
        });

        slide.addText(kpi.val, { 
          x: xPos + 0.05, y: 2.7, w: 1.5, h: 0.8, 
          fontSize: 26, bold: true, color: theme.text, 
          align: 'center', fontFace: 'Arial' 
        });
      });

      // AI Commentary Box at the bottom
      slide.addShape(pptx.ShapeType.rect, { 
        x: 0.5, y: 4.4, w: 12.3, h: 2.1, 
        fill: { color: theme.card }, 
        line: { color: theme.primary, width: 1 } 
      });

      slide.addShape(pptx.ShapeType.rect, { 
        x: 0.5, y: 4.4, w: 0.15, h: 2.1, 
        fill: { color: theme.primary } 
      });

      slide.addText('🤖 AI NARRATIVE OPERATIONAL SUMMARY', { 
        x: 0.8, y: 4.5, w: 11.5, h: 0.4, 
        fontSize: 12, bold: true, color: theme.secondary, 
        fontFace: 'Arial' 
      });

      const commentsText = `The evaluation achieved a completion rate of ${attendanceRate}% with an average score of ${avgPercent}%. Compliance-related categories showed strong overall workforce readiness. Top-tier metrics in certifications (${certRate}%) suggest successful learning retention, while regional analysis highlights solid adoption across multiple territories.`;
      
      slide.addText(commentsText, { 
        x: 0.8, y: 4.9, w: 11.5, h: 1.4, 
        fontSize: 13, color: theme.text, 
        lineSpacing: 22, fontFace: 'Arial' 
      });

      // Auto add speaker notes fallback if empty
      const note = notesText || `Executive Summary: Total participants ${totalCount} reached average score of ${avgPercent}%. Certification readiness stands at ${certRate}%.`;
      slide.addNotes(note);
    }

    // SLIDE 3: Participation Overview
    else if (slideId === 'slide3') {
      const slide = pptx.addSlide();
      addSlideHeader(slide, 'Participation & Funnel Overview', 'Visual mapping of user invitation lifecycle');

      // Draw beautiful horizontal funnel cards
      const funnel = [
        { stage: 'INVITED / ENROLLED', count: registeredCount, rate: '100%', w: 12.0, x: 0.65, fill: theme.card },
        { stage: 'ATTENDED / JOINED', count: attendedCount, rate: `${Math.round((attendedCount / registeredCount) * 100)}%`, w: 9.8, x: 1.75, fill: theme.primary },
        { stage: 'COMPLETED EVALUATION', count: passedCount, rate: `${Math.round((passedCount / registeredCount) * 100)}%`, w: 7.6, x: 2.85, fill: theme.secondary },
        { stage: 'DROPPED / NO-SHOW', count: dropCount + noShowCount, rate: `${Math.round(((dropCount + noShowCount) / registeredCount) * 100)}%`, w: 5.4, x: 3.95, fill: '7F1D1D' }
      ];

      funnel.forEach((f, idx) => {
        const yPos = 1.7 + (idx * 1.25);
        slide.addShape(pptx.ShapeType.roundRect, { 
          x: f.x, y: yPos, w: f.w, h: 1.0, 
          fill: { color: f.fill } 
        });

        slide.addText(`${f.stage}  ·  ${f.count} Learners`, { 
          x: f.x + 0.3, y: yPos + 0.15, w: f.w - 2.0, h: 0.4, 
          fontSize: 12, bold: true, color: theme.text, 
          fontFace: 'Arial' 
        });

        slide.addText(`Conversion Rate: ${f.rate}`, { 
          x: f.x + 0.3, y: yPos + 0.55, w: f.w - 2.0, h: 0.3, 
          fontSize: 10, color: theme.subtext, 
          fontFace: 'Arial' 
        });

        // Giant rate callout on the right of each card
        slide.addText(f.rate, {
          x: f.x + f.w - 1.8, y: yPos + 0.15, w: 1.5, h: 0.7,
          fontSize: 24, bold: true, color: theme.text,
          align: 'right',
          fontFace: 'Arial'
        });
      });

      const note = notesText || `Funnel details: Total registered: ${registeredCount}. Attended count: ${attendedCount}. Drop outs/No Shows count: ${dropCount + noShowCount}.`;
      slide.addNotes(note);
    }

    // SLIDE 4: Quiz Performance Summary
    else if (slideId === 'slide4') {
      const slide = pptx.addSlide();
      addSlideHeader(slide, 'Quiz Performance Summary', 'Key score distribution benchmarks');

      const perfMetrics = [
        { label: 'Average Accuracy', val: `${avgPercent}%`, desc: 'Overall assessment benchmark', color: theme.primary },
        { label: 'Highest Score', val: `${highestScorePercent}%`, desc: 'Top master milestone', color: theme.green },
        { label: 'Lowest Score', val: `${lowestScorePercent}%`, desc: 'Lowest recorded assessment score', color: theme.red },
        { label: 'Median Score', val: `${medianPercent}%`, desc: 'Midpoint user distribution', color: theme.yellow },
        { label: 'Passing Benchmark', val: `${passMarkPercent}%`, desc: 'Required competency threshold', color: theme.secondary }
      ];

      perfMetrics.forEach((m, idx) => {
        const xPos = 0.5 + (idx * 2.5); // Fit 5 cards cleanly inside 12.3
        slide.addShape(pptx.ShapeType.rect, {
          x: xPos, y: 1.8, w: 2.3, h: 3.5,
          fill: { color: theme.card },
          line: { color: '334155', width: 1 }
        });

        slide.addShape(pptx.ShapeType.rect, { 
          x: xPos, y: 1.8, w: 2.3, h: 0.15, 
          fill: { color: m.color } 
        });

        slide.addText(m.label, {
          x: xPos + 0.1, y: 2.1, w: 2.1, h: 0.5,
          fontSize: 12, bold: true, color: theme.subtext,
          align: 'center', fontFace: 'Arial'
        });

        slide.addText(m.val, {
          x: xPos + 0.1, y: 2.8, w: 2.1, h: 1.0,
          fontSize: 34, bold: true, color: theme.text,
          align: 'center', fontFace: 'Arial'
        });

        slide.addText(m.desc, {
          x: xPos + 0.1, y: 4.1, w: 2.1, h: 0.8,
          fontSize: 9, color: '64748B',
          align: 'center', fontFace: 'Arial'
        });
      });

      // Extra note panel
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 5.6, w: 12.3, h: 0.9, fill: { color: theme.card } });
      slide.addText(`Assessment summary: The passing score requirement is set at ${passMarkPercent}%. Overall, ${passedCount} out of ${totalCount} participants successfully crossed this threshold.`, {
        x: 0.8, y: 5.75, w: 11.7, h: 0.6,
        fontSize: 11, color: theme.text,
        fontFace: 'Arial'
      });

      const note = notesText || `Performance statistics: Avg score ${avgPercent}%, max achieved score ${highestScorePercent}%, passing mark set at ${passMarkPercent}%.`;
      slide.addNotes(note);
    }

    // SLIDE 5: Leaderboard
    else if (slideId === 'slide5') {
      const slide = pptx.addSlide();
      addSlideHeader(slide, 'Learner Standings & Leaderboard', 'Recognition of the top-performing associates');

      // Top 3 Podium Highlights
      const top3 = sortedParticipants.slice(0, 3);
      const podiumColors = [theme.secondary, '94A3B8', 'B45309']; // Gold, Silver, Bronze color indicators
      const podiumRanks = ['RANK 1 (GOLD)', 'RANK 2 (SILVER)', 'RANK 3 (BRONZE)'];

      for (let i = 0; i < 3; i++) {
        const xPos = 0.5 + (i * 4.2);
        const p = top3[i] || { name: 'Empty Slot', percentage: '0%', timeSpent: '0s', score: '0/0' };
        
        slide.addShape(pptx.ShapeType.rect, { 
          x: xPos, y: 1.6, w: 3.9, h: 1.8, 
          fill: { color: theme.card }, 
          line: { color: podiumColors[i], width: 1.5 } 
        });

        slide.addText(podiumRanks[i], {
          x: xPos + 0.2, y: 1.7, w: 3.5, h: 0.3,
          fontSize: 10, bold: true, color: podiumColors[i],
          fontFace: 'Arial'
        });

        slide.addText(p.name, {
          x: xPos + 0.2, y: 2.0, w: 3.5, h: 0.4,
          fontSize: 15, bold: true, color: theme.text,
          fontFace: 'Arial'
        });

        slide.addText(`Accuracy: ${p.percentage}  ·  Duration: ${p.timeSpent}`, {
          x: xPos + 0.2, y: 2.5, w: 3.5, h: 0.3,
          fontSize: 10, color: theme.subtext,
          fontFace: 'Arial'
        });

        slide.addText(`Score: ${p.score} (${p.pointsEarned ?? p.arenaPoints ?? 0} pts)`, {
          x: xPos + 0.2, y: 2.9, w: 3.5, h: 0.3,
          fontSize: 10, color: theme.primary,
          fontFace: 'Arial'
        });
      }

      // Standings Grid for remaining top 10
      const remainingTop = sortedParticipants.slice(3, 10);
      const rows = [
        [
          { text: 'Rank', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Employee Name', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'ID', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Score', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Accuracy', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Duration', options: { bold: true, color: theme.text, fill: theme.primary } }
        ],
        ...remainingTop.map((p, idx) => [
          { text: `#${idx + 4}`, options: { fill: idx % 2 === 0 ? theme.card : '151E2E' } },
          { text: p.name, options: { fill: idx % 2 === 0 ? theme.card : '151E2E' } },
          { text: p.employeeId || 'N/A', options: { fill: idx % 2 === 0 ? theme.card : '151E2E' } },
          { text: p.score, options: { fill: idx % 2 === 0 ? theme.card : '151E2E' } },
          { text: p.percentage, options: { fill: idx % 2 === 0 ? theme.card : '151E2E' } },
          { text: p.timeSpent, options: { fill: idx % 2 === 0 ? theme.card : '151E2E' } }
        ])
      ];

      // Fill in defaults if grid empty
      if (rows.length === 1) {
        rows.push(
          [{ text: '-', options: { fill: theme.card } }, { text: 'No Participant Data Available', options: { fill: theme.card } }, { text: '-', options: { fill: theme.card } }, { text: '-', options: { fill: theme.card } }, { text: '-', options: { fill: theme.card } }, { text: '-', options: { fill: theme.card } }]
        );
      }

      slide.addTable(rows, { 
        x: 0.5, y: 3.6, w: 12.3, colW: [1.2, 3.8, 1.8, 1.8, 1.8, 1.9], 
        fontSize: 9, color: theme.text, 
        border: { type: 'solid', color: '334155', pt: 0.5 } 
      });

      const note = notesText || `Podium rankings: 1st ${top3[0]?.name || 'N/A'} at ${top3[0]?.percentage || '0%'}, followed by 2nd ${top3[1]?.name || 'N/A'} and 3rd ${top3[2]?.name || 'N/A'}.`;
      slide.addNotes(note);
    }

    // SLIDE 6: Question Analysis
    else if (slideId === 'slide6') {
      const slide = pptx.addSlide();
      addSlideHeader(slide, 'Question Analysis & Matrix', 'Detailed response correctness metrics per evaluation item');

      const sortedByAcc = [...questionStats].sort((a, b) => a.correctVal - b.correctVal);
      const hardestQ = sortedByAcc[0];
      const easiestQ = sortedByAcc[sortedByAcc.length - 1];
      const displayQuestions = questionStats.slice(0, 10);

      const qRows = [
        [
          { text: 'Q#', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Question Statement', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Correct %', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Incorrect %', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Skipped %', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Difficulty', options: { bold: true, color: theme.text, fill: theme.primary } }
        ],
        ...(displayQuestions.length > 0 ? displayQuestions.map((qs, idx) => [
          { text: `Q${qs.qNum}`, options: { fill: idx % 2 === 0 ? theme.card : '151E2E' } },
          { text: qs.text.length > 68 ? `${qs.text.slice(0, 65)}...` : qs.text, options: { fill: idx % 2 === 0 ? theme.card : '151E2E' } },
          { text: `${qs.correctVal}%`, options: { fill: idx % 2 === 0 ? theme.card : '151E2E', bold: true, color: theme.green } },
          { text: `${qs.incorrectVal}%`, options: { fill: idx % 2 === 0 ? theme.card : '151E2E' } },
          { text: `${qs.skippedVal}%`, options: { fill: idx % 2 === 0 ? theme.card : '151E2E' } },
          { text: qs.diffText, options: { fill: idx % 2 === 0 ? theme.card : '151E2E', bold: true, color: qs.diffColor } }
        ]) : [[
          { text: '-', options: { fill: theme.card } },
          { text: 'No question records available for this session', options: { fill: theme.card } },
          { text: '-', options: { fill: theme.card } },
          { text: '-', options: { fill: theme.card } },
          { text: '-', options: { fill: theme.card } },
          { text: '-', options: { fill: theme.card } }
        ]])
      ];

      slide.addTable(qRows, {
        x: 0.5, y: 1.6, w: 12.3, colW: [0.8, 5.9, 1.4, 1.4, 1.4, 1.4],
        fontSize: 9, color: theme.text,
        border: { type: 'solid', color: '334155', pt: 0.5 }
      });

      const insightText = easiestQ && hardestQ
        ? `💡 Performance Matrix Insights:\n• Highest Accuracy: Q${easiestQ.qNum} (${easiestQ.correctVal}% correct) — strong concept alignment.\n• Lowest Accuracy: Q${hardestQ.qNum} (${hardestQ.correctVal}% correct) — focus area for refresher coaching.`
        : '💡 Performance Matrix Insights: No question response data recorded.';

      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 5.75, w: 12.3, h: 0.9, fill: { color: theme.card } });
      slide.addText(insightText, {
        x: 0.8, y: 5.82, w: 11.7, h: 0.75,
        fontSize: 10.5, color: theme.text,
        fontFace: 'Arial'
      });

      const note = notesText || (easiestQ && hardestQ
        ? `Question Difficulty Summary: Strongest was Q${easiestQ.qNum} (${easiestQ.correctVal}%). Lowest was Q${hardestQ.qNum} (${hardestQ.correctVal}%).`
        : 'Question Difficulty Summary: No question data.');
      slide.addNotes(note);
    }

    // SLIDE 7: Knowledge Gap Analysis
    else if (slideId === 'slide7') {
      const slide = pptx.addSlide();
      addSlideHeader(slide, 'Knowledge Gap Analysis', 'Lowest-scoring questions requiring refresher coaching');

      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.8, w: 5.8, h: 4.6, fill: { color: theme.card }, line: { color: '334155' } });
      slide.addText('FOCUS AREAS BY QUESTION ACCURACY', { x: 0.8, y: 2.0, w: 5.2, h: 0.4, fontSize: 13, bold: true, color: theme.primary });

      const lowestThree = [...questionStats].sort((a, b) => a.correctVal - b.correctVal).slice(0, 3);
      const weakTopics = lowestThree.length > 0
        ? lowestThree.map(q => ({
            topic: `Q${q.qNum}: ${q.text.length > 48 ? `${q.text.slice(0, 45)}...` : q.text}`,
            acc: `${q.correctVal}% Accuracy (${q.correct}/${totalCount})`,
            level: q.correctVal < 60 ? 'Critical Focus' : q.correctVal < 80 ? 'Moderate Gap' : 'Proficient',
            color: q.correctVal < 60 ? theme.red : q.correctVal < 80 ? theme.yellow : theme.green
          }))
        : [{ topic: 'No question gap data available', acc: 'N/A', level: 'N/A', color: theme.subtext }];

      weakTopics.forEach((item, idx) => {
        const yOffset = 2.6 + (idx * 1.15);
        slide.addShape(pptx.ShapeType.rect, { x: 0.8, y: yOffset, w: 5.2, h: 0.95, fill: { color: theme.bg } });
        slide.addShape(pptx.ShapeType.rect, { x: 0.8, y: yOffset, w: 0.1, h: 0.95, fill: { color: item.color } });
        slide.addText(item.topic, { x: 1.0, y: yOffset + 0.08, w: 4.8, h: 0.42, fontSize: 10, bold: true, color: theme.text });
        slide.addText(`${item.acc}  ·  ${item.level}`, { x: 1.0, y: yOffset + 0.55, w: 4.8, h: 0.3, fontSize: 9, color: theme.subtext });
      });

      slide.addShape(pptx.ShapeType.rect, { x: 7.0, y: 1.8, w: 5.8, h: 4.6, fill: { color: theme.card }, line: { color: '334155' } });
      slide.addText('TRAINER REMEDIAL RECOMMENDATIONS', { x: 7.3, y: 2.0, w: 5.2, h: 0.4, fontSize: 13, bold: true, color: theme.secondary });

      const failedCount = Math.max(0, totalCount - passedCount);
      const topWeak = lowestThree[0];
      const recommendations = [
        topWeak
          ? `Review Q${topWeak.qNum} (${topWeak.correctVal}% accuracy) with the cohort during the next huddle.`
          : 'Review lowest-scoring assessment items with the cohort.',
        `Schedule targeted coaching for the ${failedCount} participant(s) below the ${passMarkPercent}% pass benchmark.`,
        `Pair learners needing support with the ${passedCount} participant(s) who met the ${passMarkPercent}% benchmark.`,
        'Re-test participants with partial or below-threshold scores after concept reinforcement.'
      ];

      recommendations.forEach((rec, idx) => {
        const yOffset = 2.6 + (idx * 0.9);
        slide.addText(`📌`, { x: 7.3, y: yOffset, w: 0.4, h: 0.6, fontSize: 14 });
        slide.addText(rec, { x: 7.8, y: yOffset, w: 4.7, h: 0.75, fontSize: 11, color: theme.text, fontFace: 'Arial' });
      });

      const note = notesText || `Knowledge Gap Analysis: ${lowestThree.map(q => `Q${q.qNum} (${q.correctVal}%)`).join(', ')}.`;
      slide.addNotes(note);
    }

    // SLIDE 8: Benchmark vs Cohort Performance
    else if (slideId === 'slide8') {
      const slide = pptx.addSlide();
      addSlideHeader(slide, 'Assessment Benchmark Comparison', 'Cohort average score against passing threshold');

      const stages = [
        { title: 'REQUIRED PASS BENCHMARK', avg: `${passMarkPercent}%`, badge: 'Configured passing score', fill: theme.card, accent: theme.secondary },
        { title: 'COHORT AVERAGE SCORE', avg: `${avgPercent}%`, badge: `${passedCount} of ${totalCount} passed`, fill: theme.card, accent: avgPercent >= passMarkPercent ? theme.green : theme.red }
      ];

      stages.forEach((s, idx) => {
        const xPos = 0.5 + (idx * 6.5);
        slide.addShape(pptx.ShapeType.rect, { x: xPos, y: 1.8, w: 5.8, h: 2.8, fill: { color: s.fill }, line: { color: '334155' } });
        slide.addShape(pptx.ShapeType.rect, { x: xPos, y: 1.8, w: 5.8, h: 0.15, fill: { color: s.accent } });

        slide.addText(s.title, { x: xPos + 0.3, y: 2.2, w: 5.2, h: 0.3, fontSize: 12, bold: true, color: theme.subtext, align: 'center' });
        slide.addText(s.avg, { x: xPos + 0.3, y: 2.6, w: 5.2, h: 1.2, fontSize: 54, bold: true, color: theme.text, align: 'center' });
        slide.addText(s.badge, { x: xPos + 0.3, y: 3.9, w: 5.2, h: 0.3, fontSize: 10, italic: true, color: s.accent, align: 'center' });
      });

      const deltaVal = avgPercent - passMarkPercent;
      const deltaPrefix = deltaVal >= 0 ? '+' : '';
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 4.9, w: 12.3, h: 1.5, fill: { color: theme.card } });
      slide.addText('📚 BENCHMARK VARIANCE', { x: 0.8, y: 5.1, w: 6.0, h: 0.3, fontSize: 13, bold: true, color: theme.primary });

      slide.addText(`${deltaPrefix}${deltaVal}%`, { x: 0.8, y: 5.4, w: 2.2, h: 0.8, fontSize: 36, bold: true, color: deltaVal >= 0 ? theme.green : theme.red });
      slide.addText(`The cohort average of ${avgPercent}% is ${Math.abs(deltaVal)}% ${deltaVal >= 0 ? 'above' : 'below'} the ${passMarkPercent}% passing benchmark, with a ${passRate}% overall pass rate (${passedCount}/${totalCount} participants).`, {
        x: 3.1, y: 5.4, w: 9.2, h: 0.8,
        fontSize: 12, color: theme.text,
        fontFace: 'Arial'
      });

      const note = notesText || `Benchmark comparison: Cohort average ${avgPercent}% vs ${passMarkPercent}% passing mark (${deltaPrefix}${deltaVal}%).`;
      slide.addNotes(note);
    }

    // SLIDE 9: Regional Performance
    else if (slideId === 'slide9') {
      const slide = pptx.addSlide();
      addSlideHeader(slide, 'Zone & Territory Performance', 'Breakdown across zones recorded in this session');

      const zoneMap = {};
      participants.forEach(p => {
        const z = (p.zone && String(p.zone).trim()) || 'Unmapped';
        if (!zoneMap[z]) zoneMap[z] = { zone: z, count: 0, pctSum: 0, passed: 0, compSum: 0 };
        const pct = parseFloat(String(p.percentage || 0).replace(/%/g, '')) || 0;
        const comp = parseFloat(String(p.completion || 100).replace(/%/g, '')) || 0;
        zoneMap[z].count++;
        zoneMap[z].pctSum += pct;
        zoneMap[z].compSum += comp;
        if (pct >= passMarkPercent) zoneMap[z].passed++;
      });

      const zoneEntries = Object.values(zoneMap).sort((a, b) => (b.pctSum / b.count) - (a.pctSum / a.count));
      const regionRows = [
        [
          { text: 'Zone / Territory', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Participants', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Passed', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Avg Completion %', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Pass Rate %', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Average Score', options: { bold: true, color: theme.text, fill: theme.primary } }
        ],
        ...(zoneEntries.length > 0 ? zoneEntries.map((z, idx) => {
          const avgZ = Math.round(z.pctSum / z.count);
          const passZ = Math.round((z.passed / z.count) * 100);
          const compZ = Math.round(z.compSum / z.count);
          const bg = idx % 2 === 0 ? theme.card : '151E2E';
          return [
            { text: z.zone, options: { fill: bg } },
            { text: String(z.count), options: { fill: bg } },
            { text: `${z.passed}/${z.count}`, options: { fill: bg } },
            { text: `${compZ}%`, options: { fill: bg } },
            { text: `${passZ}%`, options: { fill: bg } },
            { text: `${avgZ}%`, options: { fill: bg, bold: true, color: avgZ >= passMarkPercent ? theme.green : theme.yellow } }
          ];
        }) : [[
          { text: 'No zone data', options: { fill: theme.card } },
          { text: '0', options: { fill: theme.card } },
          { text: '0/0', options: { fill: theme.card } },
          { text: '0%', options: { fill: theme.card } },
          { text: '0%', options: { fill: theme.card } },
          { text: '0%', options: { fill: theme.card } }
        ]])
      ];

      slide.addTable(regionRows, {
        x: 0.5, y: 1.8, w: 12.3, colW: [3.3, 1.8, 1.8, 1.8, 1.8, 1.8],
        fontSize: 10, color: theme.text,
        border: { type: 'solid', color: '334155', pt: 0.5 }
      });

      const topZone = zoneEntries[0];
      const lowZone = zoneEntries[zoneEntries.length - 1];
      const zoneSummaryText = topZone
        ? `🌟 Zone Highlights:\n• Leading Zone: ${topZone.zone} with ${Math.round(topZone.pctSum / topZone.count)}% average score (${topZone.passed}/${topZone.count} passed).\n• ${lowZone && lowZone !== topZone ? `Focus Zone: ${lowZone.zone} at ${Math.round(lowZone.pctSum / lowZone.count)}% average score (${Math.round((lowZone.passed / lowZone.count) * 100)}% pass rate).` : 'All active participants are represented in the zone breakdown above.'}`
        : '🌟 Zone Highlights: No participant zone data available.';

      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 5.2, w: 12.3, h: 1.3, fill: { color: theme.card } });
      slide.addText(zoneSummaryText, {
        x: 0.8, y: 5.35, w: 11.7, h: 1.0,
        fontSize: 11, color: theme.text,
        fontFace: 'Arial'
      });

      const note = notesText || `Zone breakdown: ${zoneEntries.map(z => `${z.zone} (${Math.round(z.pctSum / z.count)}%)`).join(', ')}.`;
      slide.addNotes(note);
    }

    // SLIDE 10: Session Delivery Summary
    else if (slideId === 'slide10') {
      const slide = pptx.addSlide();
      addSlideHeader(slide, 'Trainer & Session Delivery Summary', 'Actual session ownership and cohort outcomes');

      const trainerRows = [
        [
          { text: 'Trainer / Host', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Assessment', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Participants', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Average Score', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Pass Rate', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Avg Completion', options: { bold: true, color: theme.text, fill: theme.primary } }
        ],
        [
          { text: presenterName, options: { fill: theme.card, bold: true } },
          { text: sessionData.quizTitle || 'Quiz Assessment', options: { fill: theme.card } },
          { text: String(totalCount), options: { fill: theme.card } },
          { text: `${avgPercent}%`, options: { fill: theme.card, bold: true, color: avgPercent >= passMarkPercent ? theme.green : theme.yellow } },
          { text: `${passRate}%`, options: { fill: theme.card } },
          { text: `${avgCompletionPct}%`, options: { fill: theme.card } }
        ]
      ];

      slide.addTable(trainerRows, {
        x: 0.5, y: 1.8, w: 12.3, colW: [2.4, 3.5, 1.5, 1.6, 1.6, 1.7],
        fontSize: 10, color: theme.text,
        border: { type: 'solid', color: '334155', pt: 0.5 }
      });

      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 4.5, w: 12.3, h: 1.8, fill: { color: theme.card } });
      slide.addText(`📋 Session Delivery Notes:\n• Conducted by ${presenterName} for project ${sessionData.projectName || 'General'}.\n• ${passedCount} of ${totalCount} participants (${passRate}%) met the ${passMarkPercent}% passing threshold.\n• Cohort average score stands at ${avgPercent}% with ${avgCompletionPct}% average question completion.`, {
        x: 0.8, y: 4.65, w: 11.7, h: 1.5,
        fontSize: 11, color: theme.text,
        fontFace: 'Arial'
      });

      const note = notesText || `Session delivery by ${presenterName}: ${totalCount} participants, ${avgPercent}% avg score, ${passRate}% pass rate.`;
      slide.addNotes(note);
    }

    // SLIDE 11: Certification Analysis
    else if (slideId === 'slide11') {
      const slide = pptx.addSlide();
      addSlideHeader(slide, 'Pass & Certification Eligibility Analysis', `Based on ${passMarkPercent}% passing score benchmark`);

      const retestCount = Math.max(0, totalCount - passedCount);
      const retestPct = totalCount > 0 ? Math.round((retestCount / totalCount) * 100) : 0;
      const certData = [
        { label: 'PASSED / ELIGIBLE', count: passedCount, pct: `${certRate}%`, desc: `Scored ≥ ${passMarkPercent}%`, color: theme.green },
        { label: 'RE-TEST REQUIRED', count: retestCount, pct: `${retestPct}%`, desc: `Scored < ${passMarkPercent}%`, color: theme.yellow },
        { label: 'TOTAL EVALUATED', count: totalCount, pct: '100%', desc: 'Session participants', color: theme.primary }
      ];

      certData.forEach((c, idx) => {
        const xPos = 0.5 + (idx * 4.2);
        slide.addShape(pptx.ShapeType.rect, { x: xPos, y: 1.8, w: 3.9, h: 3.0, fill: { color: theme.card }, line: { color: '334155' } });
        slide.addShape(pptx.ShapeType.rect, { x: xPos, y: 1.8, w: 3.9, h: 0.15, fill: { color: c.color } });

        slide.addText(c.label, { x: xPos + 0.2, y: 2.1, w: 3.5, h: 0.4, fontSize: 11, bold: true, color: theme.subtext, align: 'center' });
        slide.addText(c.pct, { x: xPos + 0.2, y: 2.6, w: 3.5, h: 1.0, fontSize: 48, bold: true, color: theme.text, align: 'center' });
        slide.addText(`${c.count} Learners  ·  ${c.desc}`, { x: xPos + 0.2, y: 3.8, w: 3.5, h: 0.6, fontSize: 10, color: '64748B', align: 'center' });
      });

      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 5.1, w: 12.3, h: 1.4, fill: { color: theme.card } });
      slide.addText(`🛡️ Eligibility Summary:\n• ${passedCount} out of ${totalCount} evaluated participants (${certRate}%) meet the ${passMarkPercent}% passing requirement.\n• ${retestCount} participant(s) (${retestPct}%) require coaching and re-assessment before certification.`, {
        x: 0.8, y: 5.25, w: 11.7, h: 1.1,
        fontSize: 11, color: theme.text,
        fontFace: 'Arial'
      });

      const note = notesText || `Eligibility analysis: ${passedCount}/${totalCount} (${certRate}%) passed, ${retestCount} require re-test.`;
      slide.addNotes(note);
    }

    // SLIDE 12: Attendance Analytics
    else if (slideId === 'slide12') {
      const slide = pptx.addSlide();
      addSlideHeader(slide, 'Participation & Completion Analytics', 'Quiz participation and question completion metrics');

      const attList = Array.isArray(sessionData.trainingAttendance) ? sessionData.trainingAttendance : [];
      const fullCompleters = participants.filter(p => (parseFloat(String(p.completion || 100).replace(/%/g, '')) || 0) >= 100).length;
      const fullCompRate = totalCount > 0 ? Math.round((fullCompleters / totalCount) * 100) : 0;
      const partialCount = Math.max(0, totalCount - fullCompleters);

      const attendanceBlocks = [
        { label: 'MEETING ATTENDANCE', val: attList.length > 0 ? String(attList.length) : 'N/A', desc: attList.length > 0 ? 'Logged meeting attendees' : 'No live meeting log', color: theme.primary },
        { label: 'AVG QUESTION COMPLETION', val: `${avgCompletionPct}%`, desc: `${totalCount} participants attempted`, color: theme.secondary },
        { label: 'FULL QUIZ COMPLETERS', val: `${fullCompRate}%`, desc: `${fullCompleters} full · ${partialCount} partial`, color: fullCompRate >= 80 ? theme.green : theme.yellow }
      ];

      attendanceBlocks.forEach((a, idx) => {
        const xPos = 0.5 + (idx * 4.2);
        slide.addShape(pptx.ShapeType.rect, { x: xPos, y: 1.8, w: 3.9, h: 3.0, fill: { color: theme.card }, line: { color: '334155' } });
        slide.addShape(pptx.ShapeType.rect, { x: xPos, y: 1.8, w: 3.9, h: 0.15, fill: { color: a.color } });

        slide.addText(a.label, { x: xPos + 0.2, y: 2.1, w: 3.5, h: 0.4, fontSize: 11, bold: true, color: theme.subtext, align: 'center' });
        slide.addText(a.val, { x: xPos + 0.2, y: 2.6, w: 3.5, h: 1.0, fontSize: 44, bold: true, color: theme.text, align: 'center' });
        slide.addText(a.desc, { x: xPos + 0.2, y: 3.8, w: 3.5, h: 0.6, fontSize: 10, color: '64748B', align: 'center' });
      });

      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 5.1, w: 12.3, h: 1.4, fill: { color: theme.card } });
      slide.addText(`📊 Completion Breakdown:\n• ${fullCompleters} of ${totalCount} participants completed 100% of questions; ${partialCount} submitted partial responses.\n• Follow up with partial respondents to ensure all assessment items are completed.`, {
        x: 0.8, y: 5.25, w: 11.7, h: 1.1,
        fontSize: 11, color: theme.text,
        fontFace: 'Arial'
      });

      const note = notesText || `Participation analytics: ${fullCompleters}/${totalCount} full completion (${avgCompletionPct}% average completion).`;
      slide.addNotes(note);
    }

    // SLIDE 13: Data-Driven Insights & Recommendations
    else if (slideId === 'slide13') {
      const slide = pptx.addSlide();
      addSlideHeader(slide, 'Key Insights & Recommendations', 'Data-driven observations from session responses');

      const sortedQs = [...questionStats].sort((a, b) => a.correctVal - b.correctVal);
      const weakestQ = sortedQs[0];
      const strongestQ = sortedQs[sortedQs.length - 1];
      const failedCount = Math.max(0, totalCount - passedCount);

      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.8, w: 5.8, h: 4.6, fill: { color: theme.card }, line: { color: '334155' } });
      slide.addText('📊 COHORT PERFORMANCE SUMMARY', { x: 0.8, y: 2.0, w: 5.2, h: 0.4, fontSize: 14, bold: true, color: theme.primary });

      const aiCommentary = `Across ${totalCount} participants in ${sessionData.quizTitle || 'this assessment'}, the cohort achieved an average score of ${avgPercent}% (median ${medianPercent}%) and a ${passRate}% pass rate against the ${passMarkPercent}% benchmark. ${passedCount} participant(s) passed and ${failedCount} require follow-up coaching.`;

      slide.addText(aiCommentary, {
        x: 0.8, y: 2.5, w: 5.2, h: 3.6,
        fontSize: 13, color: theme.text,
        lineSpacing: 22, fontFace: 'Arial'
      });

      slide.addShape(pptx.ShapeType.rect, { x: 7.0, y: 1.8, w: 5.8, h: 4.6, fill: { color: theme.card }, line: { color: '334155' } });
      slide.addText('💡 ACTIONABLE HIGHLIGHTS', { x: 7.3, y: 2.0, w: 5.2, h: 0.4, fontSize: 14, bold: true, color: theme.secondary });

      const bulletInsights = [
        {
          label: 'Strongest Question:',
          desc: strongestQ ? `Q${strongestQ.qNum} (${strongestQ.correctVal}%): ${strongestQ.text.slice(0, 55)}` : 'N/A'
        },
        {
          label: 'Weakest Question:',
          desc: weakestQ ? `Q${weakestQ.qNum} (${weakestQ.correctVal}%): ${weakestQ.text.slice(0, 55)}` : 'N/A'
        },
        {
          label: 'Top Scorer:',
          desc: sortedParticipants[0] ? `${sortedParticipants[0].name} (${sortedParticipants[0].percentage}, ${sortedParticipants[0].score})` : 'N/A'
        },
        {
          label: 'Remediation:',
          desc: failedCount > 0 ? `Coach ${failedCount} below-benchmark participant(s) and re-test.` : 'All participants met the passing benchmark.'
        }
      ];

      bulletInsights.forEach((bi, idx) => {
        const yOffset = 2.5 + (idx * 0.95);
        slide.addText(bi.label, { x: 7.3, y: yOffset, w: 5.2, h: 0.3, fontSize: 11, bold: true, color: theme.secondary });
        slide.addText(bi.desc, { x: 7.3, y: yOffset + 0.3, w: 5.2, h: 0.55, fontSize: 11, color: theme.text });
      });

      const note = notesText || `Insights: Avg ${avgPercent}%, Pass Rate ${passRate}%.`;
      slide.addNotes(note);
    }

    // SLIDE 14: Action Plan
    else if (slideId === 'slide14') {
      const slide = pptx.addSlide();
      addSlideHeader(slide, 'Action Plan & Timeline', 'Concrete operational next steps mapping');

      const planRows = [
        [
          { text: 'Key Issue / Gap', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Corrective Action', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Owner', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Timeline', options: { bold: true, color: theme.text, fill: theme.primary } },
          { text: 'Status', options: { bold: true, color: theme.text, fill: theme.primary } }
        ],
        [
          { text: 'Technical Spacing Gap (31%)', options: { fill: theme.card } },
          { text: 'Deploy 5-min microlearning spacing cards', options: { fill: theme.card } },
          { text: 'L&D Team', options: { fill: theme.card } },
          { text: 'June 10, 2026', options: { fill: theme.card } },
          { text: 'Pending', options: { color: theme.yellow, bold: true, fill: theme.card } }
        ],
        [
          { text: 'Hex Code Confusions (48%)', options: { fill: '151E2E' } },
          { text: 'Provide editor validation reference cheat-sheet', options: { fill: '151E2E' } },
          { text: 'Project PM', options: { fill: '151E2E' } },
          { text: 'June 12, 2026', options: { fill: '151E2E' } },
          { text: 'Scheduled', options: { color: theme.primary, bold: true, fill: '151E2E' } }
        ],
        [
          { text: 'Evaluation No-Shows (12%)', options: { fill: theme.card } },
          { text: 'Schedule mandatory 15-minute makeup quiz', options: { fill: theme.card } },
          { text: 'Demo Trainer', options: { fill: theme.card } },
          { text: 'June 15, 2026', options: { fill: theme.card } },
          { text: 'Planning', options: { color: theme.subtext, bold: true, fill: theme.card } }
        ]
      ];

      slide.addTable(planRows, {
        x: 0.5, y: 1.8, w: 12.3, colW: [3.0, 3.8, 1.8, 1.8, 1.9],
        fontSize: 10, color: theme.text,
        border: { type: 'solid', color: '334155', pt: 0.5 }
      });

      // Extra note box
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 4.8, w: 12.3, h: 1.7, fill: { color: theme.card } });
      slide.addText('📌 Action Plan Guidelines:\n• Correction timelines are calculated in compliance with standard L&D client agreement standards.\n• Execution progress will be reviewed during the next Monthly Business Review (MBR).\n• Contact the allocated project coordinators if modifications are required.', {
        x: 0.8, y: 4.95, w: 11.7, h: 1.4,
        fontSize: 11, color: theme.text,
        fontFace: 'Arial'
      });

      const note = notesText || `Action plan checklist: Spacing cards by Jun 10, Hex sheet by Jun 12, makeup quiz by Jun 15.`;
      slide.addNotes(note);
    }

    // SLIDE 16: Meeting Attendance Report (project-grouped)
    else if (slideId === 'slide16') {
      const trainingData = sessionData.trainingAttendance || [];

      // Group records by project
      const projectGroups = {};
      trainingData.forEach(e => {
        const key = e.projectName || 'General';
        if (!projectGroups[key]) projectGroups[key] = [];
        projectGroups[key].push(e);
      });

      const entries = Object.entries(projectGroups);
      if (entries.length === 0) {
        // Fallback: single slide with no data message
        const slide = pptx.addSlide();
        addSlideHeader(slide, 'MEETING ATTENDANCE REPORT', `No meeting attendance data available`);
        slide.addText('No meeting attendance records found for this reporting period.', {
          x: 0.5, y: 2.5, w: 12.0, h: 1.0,
          fontSize: 14, color: theme.subtext, align: 'center', fontFace: 'Arial'
        });
      } else {
        entries.forEach(([proj, records]) => {
          const slide = pptx.addSlide();
          addSlideHeader(slide, 'MEETING ATTENDANCE', `Project: ${proj}`);

          const rows = [
            [
              { text: 'Employee ID', options: { bold: true, color: theme.text, fill: theme.primary } },
              { text: 'Employee Name', options: { bold: true, color: theme.text, fill: theme.primary } },
              { text: 'Zone', options: { bold: true, color: theme.text, fill: theme.primary } },
              { text: 'Date', options: { bold: true, color: theme.text, fill: theme.primary } },
              { text: 'Training Topic', options: { bold: true, color: theme.text, fill: theme.primary } },
              { text: 'Time Spent', options: { bold: true, color: theme.text, fill: theme.primary } },
              { text: 'Status', options: { bold: true, color: theme.text, fill: theme.primary } }
            ],
            ...records.slice(0, 14).map((e, i) => {
              const fill = i % 2 === 0 ? theme.card : theme.bg;
              return [
                { text: e.employeeId || 'N/A', options: { color: theme.text, fill } },
                { text: e.name || '', options: { color: theme.text, fill } },
                { text: e.zone || 'N/A', options: { color: theme.text, fill } },
                { text: e.date || '', options: { color: theme.text, fill } },
                { text: e.topic || '', options: { color: theme.text, fill } },
                { text: e.timeSpent || '', options: { color: theme.green, fill } },
                { text: e.status || '', options: { color: e.status === 'Completed' ? theme.green : theme.yellow, bold: true, fill } }
              ];
            })
          ];

          slide.addTable(rows, {
            x: 0.5, y: 1.3, w: 12.3,
            colW: [1.6, 2.4, 1.3, 1.6, 3.2, 1.4, 1.3],
            fontSize: 10,
            color: theme.text,
            border: { type: 'solid', color: '334155', pt: 0.5 }
          });

          if (records.length > 14) {
            slide.addText(`+ ${records.length - 14} more records — see the full Excel report for complete data`, {
              x: 0.5, y: 6.7, w: 12.0, h: 0.3,
              fontSize: 9, color: theme.subtext, align: 'center', fontFace: 'Arial'
            });
          }

          if (notesText) slide.addNotes(notesText);
        });
      }
    }

    // SLIDE 15: Thank You Slide
    else if (slideId === 'slide15') {
      const slide = pptx.addSlide();
      slide.background = { color: theme.bg };

      // Central divider block
      slide.addShape(pptx.ShapeType.rect, { x: 4.5, y: 2.0, w: 4.0, h: 0.1, fill: { color: theme.secondary } });
      
      slide.addText('THANK YOU', { 
        x: 0.5, y: 2.3, w: 12.0, h: 0.9, 
        fontSize: 44, bold: true, color: theme.text, 
        align: 'center', fontFace: 'Arial' 
      });

      slide.addText('Idonneous Learning Arena', { 
        x: 0.5, y: 3.2, w: 12.0, h: 0.4, 
        fontSize: 18, color: theme.primary, 
        align: 'center', fontFace: 'Arial' 
      });

      slide.addText('Idonneous Marketing Services Pvt Ltd', { 
        x: 0.5, y: 3.65, w: 12.0, h: 0.3, 
        fontSize: 12, color: theme.subtext, 
        align: 'center', fontFace: 'Arial' 
      });

      // Contact Info Card
      slide.addShape(pptx.ShapeType.rect, { 
        x: 3.5, y: 4.3, w: 6.0, h: 1.6, 
        fill: { color: theme.card }, 
        line: { color: '334155', width: 1 } 
      });

      slide.addText('For any queries or customized review reports, please contact our Learning & Development Operations Center.', { 
        x: 3.7, y: 4.5, w: 5.6, h: 0.6, 
        fontSize: 10, color: theme.text, 
        align: 'center', fontFace: 'Arial' 
      });

      slide.addText('✉️ support@idonneous.com  ·  🌐 www.idonneous.com', { 
        x: 3.7, y: 5.2, w: 5.6, h: 0.4, 
        fontSize: 11, bold: true, color: theme.secondary, 
        align: 'center', fontFace: 'Arial' 
      });

      if (notesText) slide.addNotes(notesText);
    }
  }

  // ----------------------------------------------------
  // BUILD & TRIGGER FILE DOWNLOAD
  // ----------------------------------------------------
  const reportNameMap = {
    executive: 'Executive_Summary',
    client: 'Client_QBR_Review',
    learning: 'Trainer_Effectiveness_Report',
    all: 'Complete_Detailed_Analysis_Report'
  };

  const sanitizeFilename = (str) => (str || '').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_');
  const safeProjectName = sanitizeFilename(sessionData.projectName || 'General');
  const safeQuizTitle = sanitizeFilename(sessionData.quizTitle || 'Quiz');
  const fileNameStr = `${safeProjectName}_${safeQuizTitle}_${reportNameMap[sessionData.exportType] || 'Detailed_Report'}_${new Date().toISOString().split('T')[0]}.pptx`;
  
  await downloadPPT(pptx, fileNameStr);
};
