const PptxGenJS = require('d:/Desktop/quizhive _ lms/frontend/node_modules/pptxgenjs');
const fs = require('fs');
const path = require('path');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 16:9

// Colors
const NAVY = '0F172A';
const BLUE = '2563EB';
const SKY_BLUE = '38BDF8';
const ORANGE = 'F97316';
const WHITE = 'FFFFFF';
const LIGHT_BG = 'F8FAFC';

// Helper to add dark slide (Cover / Closing)
function addDarkSlide(title, subtitle, sceneNum, screenshotFile) {
  const slide = pptx.addSlide();
  slide.background = { color: NAVY };

  // Decorative border
  slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.8, w: 0.1, h: 3.5, fill: { color: BLUE } });

  // Scene Tag
  slide.addText(`SCENE ${sceneNum}`, { x: 0.8, y: 0.5, w: 10, h: 0.3, fontSize: 11, bold: true, color: SKY_BLUE, fontFace: 'Arial' });

  // Title
  slide.addText(title, { x: 0.8, y: 1.7, w: 5.5, h: 1.5, fontSize: 32, bold: true, color: WHITE, fontFace: 'Arial' });
  if (subtitle) {
    slide.addText(subtitle, { x: 0.8, y: 3.3, w: 5.5, h: 2.5, fontSize: 11, color: '94A3B8', fontFace: 'Arial', lineSpacing: 16 });
  }

  // Footer
  slide.addText('RetailEdge Pro — Video Presentation Storyboard', { x: 0.8, y: 7.0, w: 6.0, h: 0.3, fontSize: 9, color: '475569' });
  slide.addText(`Page ${pptx.slides.length}`, { x: 11.5, y: 7.0, w: 1.2, h: 0.3, fontSize: 9, color: '475569', align: 'right' });

  // Right column image
  if (screenshotFile) {
    const imgPath = path.join(__dirname, '..', 'scratch', 'screenshots_video', screenshotFile);
    if (fs.existsSync(imgPath)) {
      slide.addShape(pptx.ShapeType.rect, { x: 6.6, y: 1.4, w: 6.0, h: 4.8, fill: { color: NAVY }, line: { color: '334155', width: 1.5 } });
      slide.addImage({ path: imgPath, x: 6.65, y: 1.45, w: 5.9, h: 4.7 });
    } else {
      slide.addShape(pptx.ShapeType.rect, { x: 6.6, y: 1.4, w: 6.0, h: 4.8, fill: { color: '1E293B' }, line: { color: '334155', width: 1.5 } });
      slide.addText(`[Screenshot: ${screenshotFile}]`, { x: 6.6, y: 3.5, w: 6.0, h: 0.8, fontSize: 13, color: '475569', align: 'center' });
    }
  }

  return slide;
}

// Helper to add light content slide
function addContentSlide(title, sceneNum, duration, visual, vo, txt, anim, screenshotFile) {
  const slide = pptx.addSlide();
  slide.background = { color: LIGHT_BG };

  // Header
  slide.addText("RETAILEDGE PRO VIDEO Storyboard", { x: 0.6, y: 0.4, w: 10.0, h: 0.3, fontSize: 10, bold: true, color: BLUE, fontFace: 'Arial' });
  slide.addText(`Scene ${sceneNum}: ${title}`, { x: 0.6, y: 0.7, w: 10.0, h: 0.6, fontSize: 20, bold: true, color: NAVY, fontFace: 'Arial' });

  // Footer
  slide.addText('RetailEdge Pro — Video Presentation Storyboard', { x: 0.6, y: 7.0, w: 6.0, h: 0.3, fontSize: 9, color: '475569' });
  slide.addText(`Page ${pptx.slides.length}`, { x: 11.5, y: 7.0, w: 1.2, h: 0.3, fontSize: 9, color: '475569', align: 'right' });

  // Left column (text content)
  const metaText = 
    `• Duration: ${duration}\n\n` +
    `• Visual Sequence:\n${visual}\n\n` +
    `• Voiceover Script:\n"${vo}"\n\n` +
    `• On-Screen Text:\n${txt}\n\n` +
    `• Animations & Transitions:\n${anim}`;
  
  slide.addText(metaText, { x: 0.6, y: 1.4, w: 5.5, h: 5.0, fontSize: 10, color: '334155', fontFace: 'Arial', lineSpacing: 15 });

  // Right column (image / screenshot)
  if (screenshotFile) {
    const imgPath = path.join(__dirname, '..', 'scratch', 'screenshots_video', screenshotFile);
    if (fs.existsSync(imgPath)) {
      slide.addShape(pptx.ShapeType.rect, { x: 6.4, y: 1.4, w: 6.3, h: 5.0, fill: { color: WHITE }, line: { color: 'CBD5E1', width: 1.5 } });
      slide.addImage({ path: imgPath, x: 6.45, y: 1.45, w: 6.2, h: 4.9 });
    } else {
      slide.addShape(pptx.ShapeType.rect, { x: 6.4, y: 1.4, w: 6.3, h: 5.0, fill: { color: 'E2E8F0' }, line: { color: 'CBD5E1', width: 1.5 } });
      slide.addText(`[Screenshot: ${screenshotFile}]`, { x: 6.4, y: 3.5, w: 6.3, h: 0.8, fontSize: 13, color: '94A3B8', align: 'center' });
    }
  }

  return slide;
}

// 1. Cover / Brand Reveal
addDarkSlide(
  'Opening Brand Reveal',
  '• Duration: 15 seconds\n' +
  '• Visual: Particle glow animation leading to neon logo reveal.\n' +
  '• Voiceover: "Idonneous proudly presents RetailEdge Pro, a next-generation learning and workforce development platform designed specifically for retail..."\n' +
  '• On-Screen Text: IDONNEOUS PRESENTS / RetailEdge Pro / Transforming Retail Workforce Learning...\n' +
  '• Transitions: Particle glow -> Scale up zoom -> Soft fade-in.',
  '1',
  'scene1_brand_reveal.png'
);

// 2. Industry Challenge
addContentSlide(
  'Industry Challenge',
  '2',
  '15 seconds',
  'Illustrative cards highlight traditional workforce pain points on the left, while a red-highlighted User Directory displays uncertified field promoters on the right.',
  'Organizations often struggle with inconsistent training, compliance challenges, and limited visibility into workforce readiness.',
  'THE RETAIL CHALLENGE\n· Training Inconsistency\n· Compliance Gaps\n· Limited Visibility\n· Poor Reporting',
  'Parallax slide left to right, warning borders glow in red around uncertified users.',
  'scene2_industry_challenge.png'
);

// 3. RetailEdge Pro Solution
addContentSlide(
  'RetailEdge Pro Solution',
  '3',
  '15 seconds',
  'A bright blue light wipe sweep reveals the unified solution dashboard. 3D isometric cards for each module spin and lock into place.',
  'RetailEdge Pro unifies learning, assessments, certifications, analytics, and workforce development into one intelligent platform.',
  'THE UNIFIED SYSTEM\n· Learning Hub\n· Assessments Engine\n· Live Quiz Arena\n· Automated Certifications\n· Analytics & AI Insights',
  'High-speed zoom, 3D card rotation lock, blue light wipe.',
  'scene3_solution.png'
);

// 4. Login Experience
addContentSlide(
  'Login Experience',
  '4',
  '15 seconds',
  'Desktop browser shows the Login Page. A cursor moves, types admin credentials with emulated keys, and clicks Sign In.',
  'Secure role-based access ensures every stakeholder experiences a personalized and protected learning environment.',
  'SECURE AUTHENTICATION\n· Role-Based Access\n· SSO Integration\n· OTP Verification',
  'Zoom-in to Login Form -> Click ripple simulation -> Typing cursor animation.',
  'scene4_login.png'
);

// 5. Main Dashboard
addContentSlide(
  'Main Dashboard',
  '5',
  '15 seconds',
  'Main Admin Dashboard loads. Camera sweeps across three primary KPI cards while circular progress bars and charts draw dynamically.',
  'The centralized dashboard provides real-time visibility into learning performance, certifications, workforce readiness, and business outcomes.',
  'CENTRAL CONTROL CENTER\n· Real-Time KPI Cards\n· Global Synchronization\n· Activity Tracking',
  'Slide left to reveal sidebar -> KPI numerical counter animation -> Chart path growth.',
  'scene5_main_dashboard.png'
);

// 6. Managing Director Dashboard
addContentSlide(
  'Managing Director Dashboard',
  '6',
  '15 seconds',
  'Slides down to MD dashboard view. Highlights Strategic ROI panel and regional compliance heatmaps (Green/Orange).',
  'Leadership teams gain complete visibility into organizational capability, training effectiveness, and business impact.',
  'EXECUTIVE OVERSIGHT: MD\n· Training ROI Dashboard\n· Strategic Compliance Maps\n· National Capability Index',
  'Vertical scroll -> Interactive hover overlay highlighting the regional ROI breakdown.',
  'scene6_md_dashboard.png'
);

// 7. COO Dashboard
addContentSlide(
  'COO Dashboard',
  '7',
  '15 seconds',
  'Fades to the COO dashboard. Highlights workforce deployment check-in meters and productivity indexes for campaign launches.',
  'The COO dashboard focuses on operational excellence, workforce utilization, and project execution.',
  'OPERATIONAL EXCELLENCE: COO\n· Workforce Deployment Meters\n· Operational Launch Checklist\n· Field Productivity Trends',
  'Cross-fade -> Slider drag animation showing productivity metrics toggle.',
  'scene7_coo_dashboard.png'
);

// 8. VP Operations Dashboard
addContentSlide(
  'VP Operations Dashboard',
  '8',
  '15 seconds',
  'Lateral slide reveals VP of Operations dashboard. Highlights regional team rankings and supervisor check-in frequency logs.',
  'Regional leaders can monitor performance across locations, teams, and operational programs.',
  'REGIONAL CONTROL: VP OPERATIONS\n· Regional Performance Charts\n· Zone Compliance Tracker\n· Supervisor Check-In Logs',
  'Lateral slide -> Dial rotation check -> Hover glow on top performing zone.',
  'scene8_vp_dashboard.png'
);

// 9. Course Library
addContentSlide(
  'Course Library',
  '9',
  '15 seconds',
  'Transition to Trainings page. Responsive catalog displays retail courses with high-res cover cards and completion parameters.',
  'Learners access a structured library of training content designed to build capability and drive performance.',
  'STRUCTURED LEARNING PATHS\n· Dynamic Course Library\n· Media Support (Video/PDF/PPT)\n· Auto-Assigned Learning Paths',
  'Vertical parallax grid display -> Card hover float animation.',
  'scene9_course_library.png'
);

// 10. Course Player
addContentSlide(
  'Course Player',
  '10',
  '15 seconds',
  'Zoom into active Course Player. Video plays showing retail guidelines, progress bar advances, and sidebar notes are edited.',
  'Interactive learning experiences increase engagement and improve knowledge retention.',
  'INTERACTIVE COURSE PLAYER\n· Multi-Format Video Player\n· Interactive Slide Notes\n· Progress Auto-Save',
  'Zoom-in to video frame -> Progress bar smooth fill from 20% to 45%.',
  'scene10_course_player.png'
);

// 11. Assessment Engine
addContentSlide(
  'Assessment Engine',
  '11',
  '15 seconds',
  'Trainer creates standard MCQ question. Question settings panel shows timer configuration, MCQ type selection, and answer keys.',
  'The assessment engine accurately measures learning outcomes and identifies skill gaps.',
  'ROBUST ASSESSMENT ENGINE\n· Question Builder (MCQ/Poll/TF)\n· Dynamic Timer Settings\n· Scenario-Based Evaluation',
  'Fade-in overlay -> Question input text simulation -> Timer dropdown click.',
  'scene11_assessment_engine.png'
);

// 12. RetailEdge Pro Quiz Experience
addContentSlide(
  'Quiz Experience',
  '12',
  '20 seconds',
  'Transitions to Live Host Room. Active quiz with real-time participation bars updating and live scoreboard moving.',
  'RetailEdge Pro transforms assessments into engaging experiences through real-time participation, live rankings, and interactive learning.',
  'RETAILEDGE PRO QUIZ ARENA\n· Live Multiplayer Quizzing\n· Real-Time Leaderboards\n· Gamification: Badges & Levels',
  'Fast slide transition -> Rapid vertical leaderboard item swap -> Score counter animation.',
  'scene12_live_quiz.png'
);

// 13. Certification Journey
addContentSlide(
  'Certification Journey',
  '13',
  '15 seconds',
  'Sleek golden-bordered certificate of completion is rendered. Pans over verification QR code and signature fields.',
  'Automated certification workflows simplify compliance and validate workforce capability.',
  'AUTOMATED CERTIFICATION\n· Automatic Certificate Issuance\n· Expiry & Renewal Tracking\n· QR Code Validation Links',
  'Radial gradient shine sweep across card -> QR Code zoom indicator.',
  'scene13_certifications.png'
);

// 14. Program Manager Dashboard
addContentSlide(
  'Program Manager Dashboard',
  '14',
  '15 seconds',
  'Focuses on team roster grid, showing enrollment meters, user assignments, and project details (Project Alpha Unilever).',
  'Program Managers oversee projects, users, trainers, schedules, and client reporting from a single control center.',
  'OPERATIONS CONTROL: PM\n· Project & Campaign Creation\n· User/Trainer Assignments\n· Real-Time Roster Verification',
  'Horizontal slide -> Highlight on "Add User to Project" modal.',
  'scene14_pm_dashboard.png'
);

// 15. Training & Development Manager Dashboard
addContentSlide(
  'T&D Manager Dashboard',
  '15',
  '15 seconds',
  'Transitions to T&D dashboard. Displays regional skill gaps bar chart, highlighting drop-off rates on object handling.',
  'Training leaders gain powerful insights into learning effectiveness and workforce development.',
  'SKILL DYNAMICS: T&D MANAGER\n· Strategic Skill Gap Analysis\n· Trainer Effectiveness Indexes\n· Targeted Course Recommendations',
  'Zoom-in to bar chart -> Dotted line indicator highlighting skill drop-offs.',
  'scene15_td_dashboard.png'
);

// 16. Supervisor Dashboard
addContentSlide(
  'Supervisor Dashboard',
  '16',
  '15 seconds',
  'Fades to supervisor panel. Displays store attendance logs, check-in markers, and team completion meters.',
  'Supervisors can monitor team readiness, identify learning gaps, and drive performance improvement.',
  'FIELD AGILITY: SUPERVISOR VIEW\n· On-Store Attendance Tracking\n· Team Completion Meters\n· Certification Expiry Reminders',
  'Swipe-left -> Glowing status badges.',
  'scene16_supervisor_dashboard.png'
);

// 17. Marketing Manager Dashboard
addContentSlide(
  'Marketing Manager Dashboard',
  '17',
  '15 seconds',
  'Comprehensive dashboard highlights campaign readiness gauges, product timelines, and live quiz standings in real-time.',
  'The Marketing Manager dashboard monitors field campaign readiness, product activation coverage, content engagement, and live assessment metrics.',
  'CAMPAIGN VISIBILITY: MARKETING\n· Campaign Readiness Gauges\n· Product Launch Timelines\n· Content Effectiveness Charts\n· Live Quiz Analytics',
  'Fade-in outline -> Gauge progress sweep -> Click tabs toggle.',
  'scene17_marketing_dashboard.png'
);

// 18. Analytics Center
addContentSlide(
  'Analytics Center',
  '18',
  '15 seconds',
  'Cuts to Reports Center. Admin clicks "Export report", showing menu dropdown with Excel, PDF, and PowerPoint options.',
  'Advanced analytics convert learning data into actionable business intelligence.',
  'ANALYTICS CENTER\n· Unified Assessment Metrics\n· Multi-Format Export Options\n· Historic Compliance Logs',
  'Cursor click simulation -> Slide-down export menu -> Pulse effect on Excel button.',
  'scene18_analytics_center.png'
);

// 19. AI Insights
addContentSlide(
  'AI Insights',
  '19',
  '15 seconds',
  'Sparkles AI icon opens the insights section. Shows at-risk learners list, recommended courses, and sales impact prediction.',
  'Artificial intelligence helps organizations proactively identify risks and optimize learning outcomes.',
  'PREDICTIVE AI INSIGHTS\n· At-Risk Learner Flags\n· Automated Learning Suggestions\n· Knowledge Decay Modeling',
  'Sparkle pulse -> Fade-in AI recommendations list -> Dotted risk alert border.',
  'scene19_ai_insights.png'
);

// 20. Mobile Learning Experience
addContentSlide(
  'Mobile Learning Experience',
  '20',
  '15 seconds',
  'Slides to vertical phone mockup. Responsive mobile dashboard emulates student joining live quiz and answering a question.',
  'RetailEdge Pro enables learning anywhere, anytime through a fully responsive mobile experience.',
  'MOBILE LEARNING ECOSYSTEM\n· Fully Responsive Mobile Layouts\n· Direct PIN Live Session Entry\n· Offline Caching & Auto-Sync',
  'Phone mockup slides in -> Screen scrolling simulation -> Swipe action.',
  'scene20_mobile_experience.png'
);

// 21. Business Impact Section
addContentSlide(
  'Business Impact Section',
  '21',
  '15 seconds',
  'Mobile phone fades into a glowing dashboard summary. Displays impact metrics: Faster Onboarding, compliance levels, sales uplift.',
  'Organizations achieve measurable improvements in onboarding speed, compliance, productivity, and workforce performance.',
  'MEASURED BUSINESS ROI\n· 45% Faster Onboarding Speed\n· 94% Standard compliance\n· 18% Store Sales Uplift',
  'Numerical count-up speed-run -> Glowing green success checks next to metrics.',
  'scene21_business_impact.png'
);

// 22. Grand Closing
addDarkSlide(
  'Grand Closing',
  '• Duration: 15 seconds\n' +
  '• Visual: Neon blue glow logo reveal of RetailEdge Pro with tagline.\n' +
  '• Voiceover: "RetailEdge Pro is more than a learning platform. It is a complete workforce enablement ecosystem designed to build capability..."\n' +
  '• On-Screen Text: RetailEdge Pro / Empowering Learning. Driving Performance. / Presented by Idonneous\n' +
  '• Transitions: Iris close-out -> Neon blue glow -> Slow zoom out.',
  '22',
  'scene22_grand_closing.png'
);

const outPath = path.join(__dirname, '..', 'frontend', 'public', 'RetailEdge_Video_Presentation.pptx');
pptx.writeFile({ fileName: outPath })
  .then(() => {
    console.log(`Successfully generated 21-slide video storyboard presentation PPTX at: ${outPath}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to generate PowerPoint file:', err);
    process.exit(1);
  });
