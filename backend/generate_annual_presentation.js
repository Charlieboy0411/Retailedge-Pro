'use strict';

let PptxGenJS;
try {
  PptxGenJS = require('pptxgenjs');
} catch (e) {
  PptxGenJS = require('d:/Desktop/quizhive _ lms/frontend/node_modules/pptxgenjs');
}

const fs = require('fs');
const path = require('path');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 16:9

// Colors
const BLACK = '000000';
const DARK_GRAY = '111111';
const GOLD_PRIMARY = 'D4AF37';
const GOLD_HIGHLIGHT = 'FFD700';
const WHITE = 'FFFFFF';
const LIGHT_GRAY = 'A0A0A0';

const FONTS = {
  head: 'Cinzel',
  body: 'Montserrat'
};

// --- HELPER FUNCTIONS --- //

function addTitleSlide(title, subtitle = null, isBrandReveal = false) {
  const slide = pptx.addSlide();
  slide.background = { color: BLACK };

  if (isBrandReveal) {
    // Cinematic Spotlight Effect / Center alignment
    slide.addText(title, { 
      x: 1.0, y: 3.0, w: 11.33, h: 1.5, 
      fontSize: 64, bold: true, color: GOLD_HIGHLIGHT, 
      fontFace: FONTS.head, align: 'center' 
    });
    if (subtitle) {
      slide.addText(subtitle, { 
        x: 1.0, y: 4.8, w: 11.33, h: 1.0, 
        fontSize: 28, color: WHITE, fontFace: FONTS.body, align: 'center' 
      });
    }
  } else {
    // Left-aligned standard title
    slide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 2.2, w: 0.15, h: 3.0, fill: { color: GOLD_PRIMARY } });
    slide.addText(title, { 
      x: 1.2, y: 2.2, w: 11.0, h: 1.5, 
      fontSize: 48, bold: true, color: WHITE, fontFace: FONTS.head 
    });
    if (subtitle) {
      slide.addText(subtitle, { 
        x: 1.2, y: 4.0, w: 11.0, h: 1.0, 
        fontSize: 24, color: GOLD_PRIMARY, fontFace: FONTS.body 
      });
    }
  }

  // Footer
  slide.addText('RetailEdge Pro', { x: 0.5, y: 7.0, w: 3.0, h: 0.3, fontSize: 10, color: LIGHT_GRAY, fontFace: FONTS.body });
  slide.addText(`Slide ${pptx.slides.length}`, { x: 12.0, y: 7.0, w: 1.0, h: 0.3, fontSize: 10, color: LIGHT_GRAY, align: 'right', fontFace: FONTS.body });
  return slide;
}

function addContentSlide(title, bulletPoints, imagePath = null) {
  const slide = pptx.addSlide();
  slide.background = { color: DARK_GRAY };

  // Header Line
  slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.2, w: 12.33, h: 0.05, fill: { color: GOLD_PRIMARY } });
  
  // Title
  slide.addText(title, { x: 0.5, y: 0.4, w: 12.0, h: 0.8, fontSize: 32, bold: true, color: GOLD_HIGHLIGHT, fontFace: FONTS.head });

  let textWidth = 11.0;
  if (imagePath && fs.existsSync(imagePath)) {
    textWidth = 5.5;
    slide.addShape(pptx.ShapeType.rect, { x: 6.8, y: 1.8, w: 6.0, h: 4.5, fill: { color: BLACK }, line: { color: GOLD_PRIMARY, width: 1.5 } });
    slide.addImage({ path: imagePath, x: 6.9, y: 1.9, w: 5.8, h: 4.3 });
  }

  if (bulletPoints && bulletPoints.length > 0) {
    const formattedBullets = bulletPoints.map(bp => ({ text: bp, options: { bullet: { code: '2022' }, color: WHITE, fontFace: FONTS.body, fontSize: 20, breakLine: true } }));
    slide.addText(formattedBullets, { x: 0.5, y: 1.8, w: textWidth, h: 4.5, valign: 'top', margin: 10 });
  }

  // Footer
  slide.addText('RetailEdge Pro', { x: 0.5, y: 7.0, w: 3.0, h: 0.3, fontSize: 10, color: LIGHT_GRAY, fontFace: FONTS.body });
  slide.addText(`Slide ${pptx.slides.length}`, { x: 12.0, y: 7.0, w: 1.0, h: 0.3, fontSize: 10, color: LIGHT_GRAY, align: 'right', fontFace: FONTS.body });

  return slide;
}

// --- SLIDE GENERATION --- //

// Section 1 – Brand Reveal
addTitleSlide('IDONNEOUS', null, true); // Slide 1
addTitleSlide('PRESENTS', null, true); // Slide 2
addTitleSlide('RETAILEDGE PRO', null, true); // Slide 3
addTitleSlide('The Future of Retail Learning', 'Empowering Learning. Driving Performance.', true); // Slide 4

// Section 2 – Business Challenge
addContentSlide('Retail Training Challenges', ['Training inconsistency', 'Compliance risks', 'Low visibility', 'Skill gaps']); // Slide 5
addTitleSlide('Why Traditional LMS Platforms Fail', 'Disconnected from operations. Low engagement. Delayed reporting.'); // Slide 6
addTitleSlide('The Need for Workforce Intelligence', 'Real-time data to drive real-time results.'); // Slide 7

// Section 3 – Product Vision
addTitleSlide('Introducing RetailEdge Pro', 'A next-generation workforce ecosystem.'); // Slide 8
addContentSlide('Platform Architecture', ['React Frontend', 'Flutter Mobile App', 'Node.js Backend', 'Real-time WebSocket Sync']); // Slide 9
addContentSlide('One Platform. Multiple Stakeholders.', ['Managing Director (MD)', 'Chief Operating Officer (COO)', 'VP of Operations', 'Program Manager', 'Trainer', 'Supervisor', 'Learner']); // Slide 10

// Section 4 – Role Based Intelligence
const screenDir = path.join(__dirname, '..', 'scratch', 'cinematic_screenshots');
addContentSlide('Managing Director Dashboard', ['Enterprise-wide visibility', 'Business impact metrics', 'National performance overview'], path.join(screenDir, 'md_dashboard.png')); // 11
addContentSlide('COO Dashboard', ['Execution excellence', 'Workforce productivity', 'Operational tracking'], path.join(screenDir, 'coo_dashboard.png')); // 12
addContentSlide('VP Operations Dashboard', ['Regional performance', 'Compliance insights', 'Zone control'], path.join(screenDir, 'vp_dashboard.png')); // 13
addContentSlide('Program Manager Dashboard', ['Project management', 'Trainer scheduling', 'Reporting interfaces'], path.join(screenDir, 'pm_dashboard.png')); // 14
addContentSlide('Trainer Dashboard', ['Content delivery', 'Learner success tracking', 'Quiz deployment'], path.join(screenDir, 'trainer_dashboard.png')); // 15
addContentSlide('Supervisor Dashboard', ['Attendance tracking', 'Readiness monitoring', 'Team development'], path.join(screenDir, 'supervisor_dashboard.png')); // 16
addContentSlide('Learner Dashboard', ['Personalized learning paths', 'Anytime, anywhere access', 'Gamified experience'], path.join(screenDir, 'learner_login.png')); // 17

// Section 5 – Learning Ecosystem
addContentSlide('Course Library', ['Comprehensive multimedia content', 'Video, PDF, PPT support', 'Instant synchronization'], path.join(screenDir, 'course_library.png')); // 18
addContentSlide('Interactive Learning Experience', ['Gamified interface', 'Real-time feedback', 'Engaging micro-learning modules'], path.join(screenDir, 'course_player.png')); // 19
addContentSlide('Assessment Engine', ['MCQ, True/False, Polls', 'Word Clouds & Open Text', 'Survey formats'], path.join(screenDir, 'assessments.png')); // 20
addContentSlide('Live Quiz Arena', ['Synchronized gameplay', 'Real-time leaderboards', 'Interactive Q&A'], path.join(screenDir, 'live_quiz.png')); // 21
addContentSlide('Certification Engine', ['Automated grading', 'Digital certificates', 'Compliance verification'], path.join(screenDir, 'certificates.png')); // 22

// Section 6 – Intelligence Layer
addContentSlide('Analytics & Reporting', ['KPI Monitoring', 'Completion Metrics', 'Compliance Tracking', 'Export Center (PDF/XLS/PPT)'], path.join(screenDir, 'admin_dashboard.png')); // 23
addContentSlide('AI Insights', ['Skill Gap Detection', 'Learning Recommendations', 'Risk Alerts', 'Predictive Analytics'], path.join(screenDir, 'ai_insights.png')); // 24

// Section 7 – Business Impact
addTitleSlide('RetailEdge Pro', 'Empowering Learning.\nDriving Performance.\n\nMetrics: Faster Onboarding | Higher Compliance | Better Productivity\n\nPresented By Idonneous', true); // Slide 25

// --- EXPORT --- //
const outPath = path.join(__dirname, '..', 'frontend', 'public', 'RetailEdge_Annual_Conference_2026.pptx');
pptx.writeFile({ fileName: outPath })
  .then(() => {
    console.log(`✅ Successfully generated 25-slide Annual Conference Presentation PPTX at: ${outPath}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Failed to generate PowerPoint file:', err);
    process.exit(1);
  });
