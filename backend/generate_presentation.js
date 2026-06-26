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

// Helper to add dark slide (Cover / Transitions / Summary / Closing)
function addDarkSlide(title, subtitle, category = 'RetailEdge Pro') {
  const slide = pptx.addSlide();
  slide.background = { color: NAVY };

  // Decorative border
  slide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 2.2, w: 0.15, h: 2.8, fill: { color: BLUE } });

  // Title
  slide.addText(title, { x: 1.1, y: 2.1, w: 11.5, h: 1.5, fontSize: 36, bold: true, color: WHITE, fontFace: 'Arial' });
  if (subtitle) {
    slide.addText(subtitle, { x: 1.1, y: 3.8, w: 11.5, h: 0.6, fontSize: 16, color: SKY_BLUE, fontFace: 'Arial' });
  }

  // Header / Footer
  slide.addText(category.toUpperCase(), { x: 0.8, y: 0.5, w: 10, h: 0.3, fontSize: 10, bold: true, color: BLUE, fontFace: 'Arial' });
  slide.addText('RetailEdge Pro — Executive Presentation', { x: 0.8, y: 7.0, w: 6.0, h: 0.3, fontSize: 9, color: '475569' });
  slide.addText(`Page ${pptx.slides.length}`, { x: 11.5, y: 7.0, w: 1.2, h: 0.3, fontSize: 9, color: '475569', align: 'right' });
  
  return slide;
}

// Helper to add light content slide
function addContentSlide(title, category, leftText, rightImageFile) {
  const slide = pptx.addSlide();
  slide.background = { color: LIGHT_BG };

  // Header
  slide.addText(category.toUpperCase(), { x: 0.6, y: 0.4, w: 10.0, h: 0.3, fontSize: 10, bold: true, color: BLUE, fontFace: 'Arial' });
  slide.addText(title, { x: 0.6, y: 0.7, w: 10.0, h: 0.6, fontSize: 24, bold: true, color: NAVY, fontFace: 'Arial' });

  // Footer
  slide.addText('RetailEdge Pro — Executive Presentation', { x: 0.6, y: 7.0, w: 6.0, h: 0.3, fontSize: 9, color: '475569' });
  slide.addText(`Page ${pptx.slides.length}`, { x: 11.5, y: 7.0, w: 1.2, h: 0.3, fontSize: 9, color: '475569', align: 'right' });

  // Left column (text content)
  if (leftText) {
    slide.addText(leftText, { x: 0.6, y: 1.5, w: 5.5, h: 4.8, fontSize: 12, color: '334155', fontFace: 'Arial', lineSpacing: 18 });
  }

  // Right column (image / screenshot)
  if (rightImageFile) {
    const imgPath = path.join(__dirname, '..', 'scratch', 'screenshots', rightImageFile);
    if (fs.existsSync(imgPath)) {
      // Mockup border/shadow
      slide.addShape(pptx.ShapeType.rect, { x: 6.4, y: 1.5, w: 6.3, h: 4.8, fill: { color: WHITE }, line: { color: 'CBD5E1', width: 1.5 } });
      slide.addImage({ path: imgPath, x: 6.45, y: 1.55, w: 6.2, h: 4.7 });
    } else {
      // Placeholder if screenshot doesn't exist
      slide.addShape(pptx.ShapeType.rect, { x: 6.4, y: 1.5, w: 6.3, h: 4.8, fill: { color: 'E2E8F0' }, line: { color: 'CBD5E1', width: 1.5 } });
      slide.addText(`[Screenshot: ${rightImageFile}]`, { x: 6.4, y: 3.5, w: 6.3, h: 0.8, fontSize: 14, color: '94A3B8', align: 'center' });
    }
  }

  return slide;
}

// 1. Cover
addDarkSlide(
  'RetailEdge Pro LMS',
  'Next-Generation Retail Learning Management & Live Assessment Arena',
  'Platform Presentation'
);

// 2. Executive Summary
addDarkSlide(
  'Executive Summary',
  'A strategic overview of RetailEdge Pro LMS and dynamic live sync architecture.',
  'Platform Overview'
);

// 3. Agenda
addContentSlide(
  'Presentation Agenda & Key Themes',
  'Table of Contents',
  'We will cover the complete end-to-end capabilities of RetailEdge Pro:\n\n' +
  '1. Authentication & Role Hierarchy (Slides 5-6)\n' +
  '2. Management & Administration Dashboards (Slides 7-13)\n' +
  '3. Learning & Development Hubs (Slides 14-17)\n' +
  '4. Assessment & Quiz Engine (Slides 18-20)\n' +
  '5. Live Arena & Gamification (Slides 21-23)\n' +
  '6. C-Suite Dashboards (Slides 24-27)\n' +
  '7. Reports & Analytics Center (Slides 28-30)\n' +
  '8. Mobile App Portals (Slides 31-33)\n' +
  '9. Business Benefits, Roadmap & ROI (Slides 34-40)',
  null
);

// 4. Vision
addContentSlide(
  'Brand Vision & Training Objectives',
  'Introduction',
  'Our vision is to bridge the gap between classroom training and on-floor execution.\n\n' +
  '• Align Frontline Staff: Ensure promoters have deep product knowledge and SOP compliance.\n' +
  '• Drive Retail Sales: Increase sales uplift through timely campaigns alignment.\n' +
  '• Monitor Store Compliance: Track real-time training attendance and quiz accuracy metrics.\n' +
  '• Gamify Frontline Work: Motivate teams through badges, levels, and regional leaderboards.',
  null
);

// 5. Roles
addContentSlide(
  'Multi-Tenant Role Hierarchy',
  'Security & Architecture',
  'RetailEdge Pro supports role-based views for every tier of the organization:\n\n' +
  '• Super Admin & Admin: Full platform management, projects control, user setup.\n' +
  '• T&D Manager: Curate training materials, schedule training meetings.\n' +
  '• Trainer: Build quizzes, launch and host live assessment sessions.\n' +
  '• Program Manager: Manage project-specific users and analyze training metrics.\n' +
  '• Client: View external audits, project summaries, and dashboard statistics.\n' +
  '• Marketing Manager: View campaign readiness and live quiz statistics.',
  null
);

// 6. Login UI
addContentSlide(
  'Welcome & Sign-In Interface',
  'Authentication',
  'Screen Name: Login Page\n' +
  'Purpose: Secure entry point for all platform tenants.\n' +
  'Features: Quick Login shortcuts, password reveal, integrated mascot (Shelfy) tips, forgot password wizard.\n' +
  'Benefits: Fast navigation during demo sessions; strong passwords validation.\n' +
  'Role: All Roles\n' +
  'Path: /login\n' +
  'Outcome: Successful authentication and role-based redirect.',
  '01_landing.png'
);

// 7. Admin Dashboard
addContentSlide(
  'Admin Control Center & Global Analytics',
  'Platform Administration',
  'Screen Name: Admin Dashboard\n' +
  'Purpose: Central console for platform-wide metrics and user tracking.\n' +
  'Features: High-level cards (Total users, active quizzes, overall score), recent activity list, global sync button.\n' +
  'Benefits: Real-time overview of the system\'s operational index and user activity.\n' +
  'Role: Super Admin, Admin\n' +
  'Path: /dashboard (Admin Role)\n' +
  'Outcome: Instant platform observability and performance tracking.',
  '06_home_dashboard.png'
);

// 8. Client Portal
addContentSlide(
  'Client Dashboard & Brand Oversight',
  'Client Experience',
  'Screen Name: Client Dashboard\n' +
  'Purpose: Read-only project monitoring for external brand clients (e.g. Unilever).\n' +
  'Features: Project filters, attendance graphs, participant statistics, one-click PPTX and Excel reports exports.\n' +
  'Benefits: High transparency; clients can audit campaign status and score trends independently.\n' +
  'Role: Client\n' +
  'Path: /pm-dashboard (Client Role)\n' +
  'Outcome: Deep client satisfaction and automated business review reporting.',
  '07_client_dashboard.png'
);

// 9. PM Dashboard
addContentSlide(
  'Program Manager Control Room',
  'Operational Control',
  'Screen Name: PM Dashboard\n' +
  'Purpose: Project-specific dashboard for operational control.\n' +
  'Features: Enrolled users grid, quiz statistics, training completion meters, manual metrics override.\n' +
  'Benefits: Enable project managers to oversee target teams and update operational indicators.\n' +
  'Role: Program Manager\n' +
  'Path: /pm-dashboard (PM Role)\n' +
  'Outcome: Targeted management of promoter groups and campaign parameters.',
  '09_pm_dashboard.png'
);

// 10. Projects Panel
addContentSlide(
  'Dynamic Projects Panel & Campaign Setup',
  'Management & Setup',
  'Screen Name: Projects Management Page\n' +
  'Purpose: Setup and configure store-level campaigns and project directories.\n' +
  'Features: Create new project form, parent project mapping, list of existing campaigns, status trackers.\n' +
  'Benefits: Simple hierarchical project creation (e.g. Unilever FMCG -> North Zone -> Store Hubs).\n' +
  'Role: Super Admin, Admin\n' +
  'Path: /projects\n' +
  'Outcome: Dynamic organization of regional stores and campaign directories.',
  '10_create_project.png'
);

// 11. User Management
addContentSlide(
  'User Management & Promoter Setup',
  'Management & Setup',
  'Screen Name: User Directory Page\n' +
  'Purpose: Manage active platform members and promoters.\n' +
  'Features: Add user form, CSV bulk upload modal, role allocation dropdowns, active status toggles.\n' +
  'Benefits: Easily register thousands of frontline promoters and assign them to specific store projects.\n' +
  'Role: Super Admin, Admin, HR Admin\n' +
  'Path: /users\n' +
  'Outcome: Up-to-date user logs and clean role-based authorization.',
  '11_user_directory.png'
);

// 12. T&D Management Hub
addContentSlide(
  'T&D Management Hub & Skill Gaps',
  'Learning & Development',
  'Screen Name: Learning & Development Dashboard\n' +
  'Purpose: Plan capabilities development and identify frontline skill gaps.\n' +
  'Features: Upcoming courses list, capability metrics charts, scheduled meeting logs.\n' +
  'Benefits: Tracks training effectiveness and alerts managers to low accuracy retail parameters.\n' +
  'Role: T&D Manager\n' +
  'Path: /dashboard (T&D Manager Role)\n' +
  'Outcome: Continuous improvement in retail capabilities and promoter readiness.',
  '12_training_dashboard.png'
);

// 13. Training Course Management
addContentSlide(
  'Course & Materials Management',
  'Learning & Development',
  'Screen Name: Trainings Page\n' +
  'Purpose: Curate video, PDF, and PPT course materials for promoters.\n' +
  'Features: Upload materials interface, type categorization (Video/PDF/PPT), duration settings, project assignment.\n' +
  'Benefits: Easily deliver standard operational training directly to promoters\' mobile devices.\n' +
  'Role: Super Admin, Admin, T&D Manager\n' +
  'Path: /trainings\n' +
  'Outcome: Centrally managed training content synced to frontline tablets.',
  '13_course_management.png'
);

// 14. Quiz Builder
addContentSlide(
  'Assessment Builder & Quiz Setup',
  'Learning & Development',
  'Screen Name: Quiz Builder Page\n' +
  'Purpose: Build and edit interactive assessments.\n' +
  'Features: Multi-format questions (MCQ, Poll, True/False), answer keys settings, timer controls, draft/live status.\n' +
  'Benefits: Simple drag-and-drop question editing; instant availability in the live quiz catalog.\n' +
  'Role: Admin, Trainer, T&D Manager\n' +
  'Path: /builder / /builder/:quizId\n' +
  'Outcome: High-quality customized quizzes matching operational training goals.',
  '14_quiz_builder.png'
);

// 15. Question Formats
addContentSlide(
  'Supported Question Formats & Configs',
  'Assessment Engine',
  'Tailor quizzes to evaluate different retail cognitive tasks:\n\n' +
  '• MCQ (Multiple Choice Questions): Assess precise standard guidelines (e.g. checkout SOPs).\n' +
  '• Polls & Surveys: Collect instant feedback on new campaign designs and floor displays.\n' +
  '• True/False: Validate critical compliance questions in under 10 seconds.\n' +
  '• Word Cloud & Open Text: Gather descriptive insights from regional store representatives.',
  null
);

// 16. Live Quiz Arena
addContentSlide(
  'Live Quiz Arena Gameplay',
  'Assessment Engine',
  'Host interactive quiz sessions during regional alignment meetings:\n\n' +
  '• Sync Playback: The host controls the slide projection; questions appear on participants\' phones simultaneously.\n' +
  '• Gamified Competitiveness: Real-time scoreboard updates motivate promoters to answer quickly.\n' +
  '• Immediate Review: The trainer reviews answer distributions and explains correct choices instantly.',
  null
);

// 17. Offline Quizzes
addContentSlide(
  'Offline Assessment Mode',
  'Assessment Engine',
  'Ensure zero data loss even in stores with poor network connections:\n\n' +
  '• Prefetched Quizzes: Promoters load and cache quizzes in stable connectivity zones.\n' +
  '• Local grading: Quizzes are graded locally on device to prevent network delays.\n' +
  '• Background Auto-Sync: Submitted responses are stored locally and auto-pushed to the server when connection is restored.',
  null
);

// 18. Supervisor Control Console
addContentSlide(
  'Supervisor Control Console',
  'Field Operations',
  'Screen Name: Supervisor Dashboard\n' +
  'Purpose: Field supervisor view for regional store performance.\n' +
  'Features: Store teams rosters, attendance indicators, recent live session scoreboards.\n' +
  'Benefits: Supervisors can quickly spot store-level training gaps and coordinate with PMs.\n' +
  'Role: Supervisor\n' +
  'Path: /pm-dashboard (Supervisor Role)\n' +
  'Outcome: Active on-the-ground performance coaching and score optimization.',
  '18_supervisor_dashboard.png'
);

// 19. Attendance Logs
addContentSlide(
  'Attendance Logging & Meeting Integration',
  'Field Operations',
  'Programmatically track employee compliance and attendance:\n\n' +
  '• Integrated Meetings: Attendance for Jitsi/Google Meet video sessions is captured automatically.\n' +
  '• Real-time Attendance Updates: Dynamic synchronization updates logs as users join/leave.\n' +
  '• Exportable Records: Attendance summaries easily export to Microsoft Excel for corporate audits.',
  null
);

// 20. Gamification & Leaderboards
addContentSlide(
  'Gamification & Reward Systems',
  'Learner Experience',
  'Encourage active participation using a structured reward system:\n\n' +
  '• Live Leaderboards: Real-time ranking updates build high competitive energy.\n' +
  '• Skill Badges: Promoters unlock badges for speed (Fastest Finger) and accuracy.\n' +
  '• Compliance Levels: Staff gain experience points (XP) to move from Novice to Sales Champion.',
  null
);

// 21. Learner Portal
addContentSlide(
  'Learner Portal Experience',
  'Learner Experience',
  'Screen Name: Standard User Dashboard\n' +
  'Purpose: Learner portal for course consumption and quiz participation.\n' +
  'Features: Enrolled courses panels, recent achievements, badges catalog, upcoming webinars links.\n' +
  'Benefits: Centralized, intuitive layout designed for retail promoters on smartphones.\n' +
  'Role: Employee / Promoters\n' +
  'Path: /dashboard (Standard Role)\n' +
  'Outcome: Smooth learning path and active skill development.',
  '20_learner_dashboard.png'
);

// 22. MD Dashboard
addContentSlide(
  'Managing Director Dashboard & High-Level KPIs',
  'Executive Oversight',
  'Screen Name: MD Dashboard\n' +
  'Purpose: Enterprise-level overview of retail compliance and ROI.\n' +
  'Features: National performance boards, campaign CSAT trackers, sales impact correlations, regional heatmaps.\n' +
  'Benefits: Provides immediate boardroom visibility into the entire frontline training operation.\n' +
  'Role: Managing Director (MD)\n' +
  'Path: /pm-dashboard (MD Role)\n' +
  'Outcome: Strategic decision making backed by live frontline data.',
  '24_md_dashboard.png'
);

// 23. COO Dashboard
addContentSlide(
  'Chief Operating Officer Dashboard',
  'Executive Oversight',
  'Screen Name: COO Dashboard\n' +
  'Purpose: Operational efficiency and campaign execution tracking.\n' +
  'Features: Store launch checklist compliance, regional attendance comparisons, training completion statistics.\n' +
  'Benefits: COOs can identify operational bottlenecks and re-allocate resources to lagging zones.\n' +
  'Role: Chief Operating Officer (COO)\n' +
  'Path: /pm-dashboard (COO Role)\n' +
  'Outcome: Streamlined store operations and optimized learning deployment.',
  '25_coo_dashboard.png'
);

// 24. VP Operations Dashboard
addContentSlide(
  'VP of Operations Control View',
  'Executive Oversight',
  'Screen Name: VP Operations Dashboard\n' +
  'Purpose: Operational oversight of training campaigns and compliance indices.\n' +
  'Features: Zone performance ratings, active quiz stats, supervisor check-in logs, capability indices.\n' +
  'Benefits: Deep visibility into supervisor-level coaching performance and store readiness.\n' +
  'Role: VP of Operations\n' +
  'Path: /pm-dashboard (VP Operations Role)\n' +
  'Outcome: Enhanced accountability across regional management tiers.',
  '26_vp_dashboard.png'
);

// 24b. Marketing Manager Dashboard
addContentSlide(
  'Marketing Manager Dashboard & Campaign Readiness',
  'Operational Control',
  'Screen Name: Marketing Manager Dashboard\n' +
  'Purpose: Monitor campaign health, timeline progress, and active quiz details.\n' +
  'Features: Executive KPIs, campaign checklists, regional performance indices, live quiz status.\n' +
  'Benefits: Keep marketing teams aligned on active product parameters and promoter readiness.\n' +
  'Role: Marketing Manager\n' +
  'Path: /pm-dashboard\n' +
  'Outcome: Real-time marketing visibility and launch-readiness alignment.',
  '09b_marketing_dashboard.png'
);

// 25. Executive Performance Summary
addContentSlide(
  'Executive Performance Standing',
  'Executive Oversight',
  'Consolidate frontline execution metrics for senior management reviews:\n\n' +
  '• Operations Index: Aggregates attendance, builder activities, and accuracy.\n' +
  '• CSAT Tracker: Live rating feedback from promoters and customers (e.g. 4.8 / 5).\n' +
  '• Sales Uplift: Demonstrates a 14-18% correlation between high quiz accuracy and store sales volume.',
  null
);

// 26. Reports Center
addContentSlide(
  'Reports Center & Dynamic Filters',
  'Reports & Exports',
  'Screen Name: Reports Page\n' +
  'Purpose: Access and filter all training and evaluation logs.\n' +
  'Features: Date range filters, project search, list of session reports, delete double submissions controls.\n' +
  'Benefits: Ensures database records remain clean and provides easy navigation to individual scorecards.\n' +
  'Role: Super Admin, Admin, Trainer, PM\n' +
  'Path: /reports\n' +
  'Outcome: Instant retrieval of historic assessment data and compliance audits.',
  '28_reports_center.png'
);

// 27. Dynamic PDF & PPT Reports
addContentSlide(
  'Dynamic PDF & PowerPoint Reports',
  'Reports & Exports',
  'Generate professional presentation decks and audit reports in one click:\n\n' +
  '• Slide Exports: Generates customized slide decks with KPIs, leaderboard summaries, and action plans.\n' +
  '• PDF Summaries: Programmatically renders clean landscape PDF scorecards for training sign-offs.\n' +
  '• Multi-Device Access: Download links are exposed via Cloudflare tunnel, accessible from any external browser.',
  null
);

// 28. Dynamic Excel Export
addContentSlide(
  'Dynamic Excel Export Engine',
  'Reports & Exports',
  'Download detailed spreadsheets containing raw operational metrics:\n\n' +
  '• Raw Data Sheets: Captures employee IDs, correct answers counts, total response times, store locations.\n' +
  '• Pre-Formatted Tables: Clean layouts with auto-adjusted column widths and color-coded score classifications.\n' +
  '• ERP Integration: Output formats match standard formats for easy upload to SAP/Unilever dashboards.',
  null
);

// 29. Real-Time WebSocket Architecture
addContentSlide(
  'Real-Time WebSocket Architecture',
  'Infrastructure',
  'State-of-the-art background communication keeps the team synchronized:\n\n' +
  '• WebSocket Protocol: Establishes a bidirectional channel between the Express server and React client.\n' +
  '• Background Refresh: Dashboards update silently in the background without affecting screen viewing.\n' +
  '• Event-Driven: Triggers update calls on events like live_session_finished, offline_response_submitted, report_deleted.',
  null
);

// 30. Mobile Interface
addContentSlide(
  'Mobile Interface Design & Sign-In',
  'Mobile UI & Portals',
  'Screen Name: Mobile Login Page\n' +
  'Purpose: Portal access for field staff using mobile devices.\n' +
  'Features: Responsive form fields, quick-tap inputs, low-data asset sizes, MASCOT tips overlay.\n' +
  'Benefits: Smooth user experience on low-end Android smartphones; minimal bandwidth usage.\n' +
  'Role: All Roles\n' +
  'Path: /login (Mobile Viewport)\n' +
  'Outcome: Flawless mobile entry and responsive redirection.',
  '31_mobile_home.png'
);

// 31. Mobile Learner Portal
addContentSlide(
  'Mobile Learner Portal & Quiz Join',
  'Mobile UI & Portals',
  'Screen Name: Mobile Join Page\n' +
  'Purpose: Mobile-first interface for promoters to enter live sessions.\n' +
  'Features: Room code input field, quick-join buttons, latest offline quizzes download center.\n' +
  'Benefits: Simplifies the joining workflow—promoters enter the arena in under 5 seconds.\n' +
  'Role: Employee / Promoters\n' +
  'Path: /join (Mobile Viewport)\n' +
  'Outcome: Direct access to active evaluations on the store floor.',
  '32_mobile_learner_dashboard.png'
);

// 32. Mobile Live Quiz Gameplay
addContentSlide(
  'Mobile Live Quiz Gameplay Interface',
  'Mobile UI & Portals',
  'Screen Name: Live Quiz Gameplay\n' +
  'Purpose: Mobile interface for answering live assessment items.\n' +
  'Features: Large tap-friendly option blocks, real-time timer countdown, immediate correct/incorrect feedback.\n' +
  'Benefits: Minimizes mistaps and provides immediate learning reinforcement on the floor.\n' +
  'Role: Employee / Promoters\n' +
  'Path: /live/:roomCode (Mobile Viewport)\n' +
  'Outcome: Dynamic audience participation and high training engagement.',
  '33_mobile_live_quiz.png'
);

// 33. Retail Campaign ROI
addContentSlide(
  'Retail Campaign Alignment & ROI',
  'Business Value & ROI',
  'Align frontline training with marketing and campaign rollouts:\n\n' +
  '• Speed to Floor: Deploy new product guidelines to 1000+ promoters in under an hour.\n' +
  '• Compliance Auditing: Verify that promoter knowledge matches the target display guidelines.\n' +
  '• ROI Metrics: Proven reduction in training costs by 45% compared to on-site trainer visits.',
  null
);

// 34. Frontline Compliance Verification
addContentSlide(
  'Frontline Compliance Verification',
  'Business Value & ROI',
  'Verify store execution guidelines and SOP adherence:\n\n' +
  '• Audit Logs: Automated timestamps capture when a promoter completes standard training.\n' +
  '• Error Flags: Instantly alerts supervisors when store accuracy falls below the 60% threshold.\n' +
  '• Actionable Insights: Reports detail exact question options selected, identifying specific confusion points.',
  null
);

// 35. Case Study: Unilever FMCG
addContentSlide(
  'Client Success Case Study: Unilever',
  'Business Value & ROI',
  'Real-world impact validated through corporate deployment (e.g. Unilever FMCG):\n\n' +
  '• Challenge: Frontline promoters had poor comprehension of monthly promotional campaigns.\n' +
  '• Solution: Deployed RetailEdge Pro for weekly live quizzes and training audits.\n' +
  '• Results: CSAT rose to 4.85 / 5; frontline compliance reached 94.2%; sales increased by 18.4%.',
  null
);

// 36. LMS Deployment Phases
addContentSlide(
  'LMS Deployment & Launch Phases',
  'Deployment Roadmap',
  'Structured plan to deploy the platform across retail zones:\n\n' +
  '• Phase 1: Database Setup and Administrator Seeding (Completed).\n' +
  '• Phase 2: Pilot Rollout to Selected Store Hubs (Week 1-2).\n' +
  '• Phase 3: Regional Training for Trainers and Supervisors (Week 3).\n' +
  '• Phase 4: Full Promoter Network Launch and Live Arena Activation (Week 4).',
  null
);

// 37. Technical Integration Roadmap
addContentSlide(
  'Technical Integration Roadmap',
  'Deployment Roadmap',
  'Simple integration path with existing corporate directories and tools:\n\n' +
  '• Single Sign-On (SSO): Integrates with Active Directory and Okta (Future phase).\n' +
  '• Video Tools: Out-of-the-box Jitsi Meet integration for remote training sessions.\n' +
  '• API Services: RESTful endpoints export attendance logs to SAP or Oracle HR MS.',
  null
);

// 38. Security & Data Protection
addContentSlide(
  'Security & Data Integrity',
  'Technical Specifications',
  'Enterprise-grade security controls protect sensitive company data:\n\n' +
  '• Secure Storage: PostgreSQL backend with Sequelize ORM validation layers.\n' +
  '• Password Protection: All passwords hashed using industry-standard bcrypt.\n' +
  '• Secure Sessions: Stateless JWT authentication tokens with auto-expire controls.\n' +
  '• Access Auditing: Only authorized roles can download XLS and PPTX summaries.',
  null
);

// 39. Platform Scalability & AI Features
addContentSlide(
  'Platform Scalability & Future Outlook',
  'Technical Specifications',
  'Designed to scale with growing promoter networks and store locations:\n\n' +
  '• Infrastructure: Light node backend handles thousands of concurrent socket events.\n' +
  '• Native Apps: Upcoming iOS and Android wrapper launch to support native notifications.\n' +
  '• AI Analytics: Future predictive reports to identify high-turnover stores ahead of time.',
  null
);

// 40. Summary & Call to Action
addDarkSlide(
  'RetailEdge Pro — Summary & Call to Action',
  'Transforming retail capability development from a cost center into a sales driver.\n\n' +
  '• Access presentation over Cloudflare tunnel at: https://film-javascript-spice-naval.trycloudflare.com',
  'Closing Summary'
);

const outPath = path.join(__dirname, '..', 'frontend', 'public', 'RetailEdge_Executive_Presentation.pptx');
pptx.writeFile({ fileName: outPath })
  .then(() => {
    console.log(`Successfully generated 40-slide corporate presentation PPTX at: ${outPath}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to generate PowerPoint file:', err);
    process.exit(1);
  });
