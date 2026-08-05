# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\demo-automation.spec.js >> RetailEdge Pro Trainer Workflow Demo
- Location: tests\demo-automation.spec.js:44:1

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: page.waitForTimeout: Target page, context or browser has been closed
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - img "Idonneous Logo" [ref=e7]
      - generic [ref=e8]:
        - generic [ref=e9]: RetailEdge Pro
        - generic [ref=e10]: Training Arena
    - generic [ref=e11]:
      - link "Dashboard" [ref=e12] [cursor=pointer]:
        - /url: /dashboard
        - img [ref=e13]
        - text: Dashboard
      - link "Schedule" [ref=e18] [cursor=pointer]:
        - /url: /schedule
        - img [ref=e19]
        - text: Schedule
      - link "Trainings" [ref=e21] [cursor=pointer]:
        - /url: /trainings
        - img [ref=e22]
        - text: Trainings
      - link "Live Arena" [ref=e24] [cursor=pointer]:
        - /url: /join
        - img [ref=e25]
        - text: Live Arena
      - link "Attendance" [ref=e31] [cursor=pointer]:
        - /url: /attendance
        - img [ref=e32]
        - text: Attendance
      - link "Create Quiz" [ref=e35] [cursor=pointer]:
        - /url: /builder
        - img [ref=e36]
        - text: Create Quiz
      - link "Certificates" [ref=e41] [cursor=pointer]:
        - /url: /certificates
        - img [ref=e42]
        - text: Certificates
      - link "Reports" [ref=e45] [cursor=pointer]:
        - /url: /reports
        - img [ref=e46]
        - text: Reports
      - link "Arena Stats" [ref=e48] [cursor=pointer]:
        - /url: /gamification
        - img [ref=e49]
        - text: Arena Stats
      - link "Settings" [ref=e55] [cursor=pointer]:
        - /url: /settings
        - img [ref=e56]
        - text: Settings
    - generic [ref=e59]:
      - generic [ref=e60]:
        - generic [ref=e61]: DE
        - generic "Online" [ref=e62]
      - generic [ref=e63]:
        - generic [ref=e64]: Demo Trainer
        - generic [ref=e65]: Trainer
      - button "Log Out" [ref=e66] [cursor=pointer]:
        - img [ref=e67]
  - main [ref=e70]:
    - generic [ref=e71]:
      - generic [ref=e72]:
        - img [ref=e73]
        - textbox "Search sessions, supervisors, trainings..." [ref=e76]
      - generic [ref=e77]:
        - button "Raise Query" [ref=e78] [cursor=pointer]:
          - img [ref=e79]
          - generic [ref=e81]: Raise Query
        - button [ref=e82] [cursor=pointer]:
          - img [ref=e83]
        - generic [ref=e87]: RetailEdge Pro
    - generic [ref=e91]:
      - generic [ref=e92]:
        - generic [ref=e93]:
          - heading "Welcome back, Demo Trainer! 👋" [level=2] [ref=e94]
          - paragraph [ref=e95]: Here's what's happening in your training arena today.
        - generic [ref=e96]:
          - generic [ref=e97]:
            - button "Last 7 Days" [active] [ref=e98] [cursor=pointer]:
              - img [ref=e99]
              - generic [ref=e101]: Last 7 Days
              - img [ref=e102]
            - generic [ref=e104]:
              - generic [ref=e105] [cursor=pointer]: Today
              - generic [ref=e106] [cursor=pointer]: Last 7 Days
              - generic [ref=e107] [cursor=pointer]: Last 30 Days
              - generic [ref=e108] [cursor=pointer]: Custom Range
          - button "Create Quiz" [ref=e110] [cursor=pointer]:
            - generic [ref=e111]: Create Quiz
            - img [ref=e113]
      - generic [ref=e115]:
        - generic [ref=e116]:
          - generic [ref=e117]:
            - generic [ref=e118]:
              - text: Total Participants
              - heading "18" [level=3] [ref=e119]
            - img [ref=e121]
          - generic [ref=e126]:
            - generic [ref=e127]:
              - text: ↑ +12%
              - generic [ref=e128]: vs last 7 days
            - img [ref=e129]
        - generic [ref=e132]:
          - generic [ref=e133]:
            - generic [ref=e134]:
              - text: Avg Quiz Completion
              - heading "91%" [level=3] [ref=e135]
            - img [ref=e137]
          - generic [ref=e140]:
            - generic [ref=e141]:
              - text: ↑ +8%
              - generic [ref=e142]: vs last 7 days
            - img [ref=e143]
        - generic [ref=e146]:
          - generic [ref=e147]:
            - generic [ref=e148]:
              - text: Total Quizzes Hosted
              - heading "5" [level=3] [ref=e149]
            - img [ref=e151]
          - generic [ref=e152]:
            - generic [ref=e153]:
              - text: ↑ +1
              - generic [ref=e154]: vs last 7 days
            - img [ref=e155]
        - generic [ref=e158]:
          - generic [ref=e159]:
            - generic [ref=e160]:
              - text: Average Score
              - heading "74%" [level=3] [ref=e161]
            - img [ref=e163]
          - generic [ref=e165]:
            - generic [ref=e166]:
              - text: ↑ +9%
              - generic [ref=e167]: vs last 7 days
            - img [ref=e168]
      - generic [ref=e171]:
        - generic [ref=e172]:
          - generic [ref=e173]:
            - generic [ref=e174]:
              - heading "Performance Overview" [level=3] [ref=e175]
              - paragraph [ref=e176]: Training effectiveness & participation trends
            - generic [ref=e177]:
              - button "Daily" [ref=e178] [cursor=pointer]
              - button "Weekly" [ref=e179] [cursor=pointer]
              - button "Monthly" [ref=e180] [cursor=pointer]
          - generic [ref=e181]:
            - generic [ref=e182]: Participants
            - generic [ref=e184]: Completion %
            - generic [ref=e186]: Avg Score
          - img [ref=e189]:
            - generic [ref=e190]: "82"
            - generic [ref=e191]: "54"
            - generic [ref=e192]: "27"
            - generic [ref=e193]: "14"
            - generic [ref=e194]: "0"
            - generic [ref=e195]: 100%
            - generic [ref=e196]: 50%
            - generic [ref=e197]: 0%
            - generic [ref=e198]: Week 20
            - generic [ref=e199]: Week 21
            - generic [ref=e200]: Week 22
            - generic [ref=e201]: Week 23
            - generic [ref=e202]: Week 24
            - generic [ref=e205]: "35"
            - generic [ref=e208]: "48"
            - generic [ref=e211]: "42"
            - generic [ref=e214]: "55"
            - generic [ref=e217]: "68"
        - generic [ref=e232]:
          - generic [ref=e233]:
            - heading "Recent Activity" [level=3] [ref=e234]
            - generic [ref=e235] [cursor=pointer]: View All
          - generic [ref=e236]:
            - generic [ref=e237]:
              - img [ref=e239]
              - generic [ref=e242]:
                - generic [ref=e243]: Test Quiz Offline
                - generic [ref=e244]: Hosted for Idonneous
              - generic [ref=e245]: 2 mins ago
            - generic [ref=e246]:
              - img [ref=e248]
              - generic [ref=e250]:
                - generic [ref=e251]: Galderma Launchpad Quiz
                - generic [ref=e252]: Hosted for Galderma
              - generic [ref=e253]: 1 hour ago
            - generic [ref=e254]:
              - img [ref=e256]
              - generic [ref=e261]:
                - generic [ref=e262]: 13 participants completed
                - generic [ref=e263]: Test Quiz Offline
              - generic [ref=e264]: 2 hours ago
            - generic [ref=e265]:
              - img [ref=e267]
              - generic [ref=e270]:
                - generic [ref=e271]: Certificates issued
                - generic [ref=e272]: 12 certificates generated
              - generic [ref=e273]: 3 hours ago
      - generic [ref=e274]:
        - generic [ref=e275]:
          - generic [ref=e276]:
            - heading "Top Quiz Performance" [level=3] [ref=e277]
            - generic [ref=e278] [cursor=pointer]: View All
          - generic [ref=e279]:
            - generic [ref=e280]:
              - generic [ref=e281]: "1"
              - generic [ref=e282]:
                - generic [ref=e283]: Galderma Launchpad Quiz
                - generic [ref=e284]: Galderma
              - generic [ref=e285]: 92%
            - generic [ref=e286]:
              - generic [ref=e287]: "2"
              - generic [ref=e288]:
                - generic [ref=e289]: Test Quiz Offline
                - generic [ref=e290]: Idonneous
              - generic [ref=e291]: 85%
            - generic [ref=e292]:
              - generic [ref=e293]: "3"
              - generic [ref=e294]:
                - generic [ref=e295]: Product Knowledge Quiz
                - generic [ref=e296]: Idonneous
              - generic [ref=e297]: 78%
        - generic [ref=e298]:
          - heading "Participants by Project" [level=3] [ref=e299]
          - generic [ref=e300]:
            - generic [ref=e301]:
              - img [ref=e302]
              - generic [ref=e306]:
                - generic [ref=e307]: "18"
                - generic [ref=e308]: Total
            - generic [ref=e309]:
              - generic [ref=e310] [cursor=pointer]:
                - generic [ref=e311]: Idonneous
                - strong [ref=e313]: 12 (66.7%)
              - generic [ref=e314] [cursor=pointer]:
                - generic [ref=e315]: Galderma
                - strong [ref=e317]: 4 (22.2%)
              - generic [ref=e318] [cursor=pointer]:
                - generic [ref=e319]: Others
                - strong [ref=e321]: 2 (11.1%)
        - generic [ref=e322]:
          - heading "Quick Actions" [level=3] [ref=e323]
          - generic [ref=e324]:
            - generic [ref=e325] [cursor=pointer]:
              - img [ref=e327]
              - generic [ref=e328]: Create Quiz
              - generic [ref=e329]: Add new quiz
            - generic [ref=e330] [cursor=pointer]:
              - img [ref=e332]
              - generic [ref=e333]: View Reports
              - generic [ref=e334]: Analytics & insights
            - generic [ref=e335] [cursor=pointer]:
              - img [ref=e337]
              - generic [ref=e339]: Manage Trainings
              - generic [ref=e340]: Training modules
            - generic [ref=e341] [cursor=pointer]:
              - img [ref=e343]
              - generic [ref=e346]: Issue Certificate
              - generic [ref=e347]: Generate certificates
      - generic [ref=e348]:
        - heading "🎯 Live Arena — My Quizzes" [level=3] [ref=e349]
        - generic [ref=e350]:
          - generic [ref=e351]:
            - generic [ref=e352]:
              - heading "General Knowledge" [level=4] [ref=e353]
              - generic [ref=e355]: 5 Questions • Idonneous
            - generic [ref=e356]:
              - button "Offline Mode" [ref=e357] [cursor=pointer]:
                - img [ref=e358]
                - generic [ref=e365]: Offline Mode
              - button "Host Live" [ref=e366] [cursor=pointer]:
                - img [ref=e367]
                - text: Host Live
              - button "Edit Quiz" [ref=e369] [cursor=pointer]:
                - img [ref=e370]
              - button "Delete Quiz Room" [ref=e372] [cursor=pointer]:
                - img [ref=e373]
          - generic [ref=e376]:
            - generic [ref=e377]:
              - heading "test" [level=4] [ref=e378]
              - generic [ref=e380]: 3 Questions • Beyond Snacks
            - generic [ref=e381]:
              - button "Offline Mode" [ref=e382] [cursor=pointer]:
                - img [ref=e383]
                - generic [ref=e390]: Offline Mode
              - button "Host Live" [ref=e391] [cursor=pointer]:
                - img [ref=e392]
                - text: Host Live
              - button "Edit Quiz" [ref=e394] [cursor=pointer]:
                - img [ref=e395]
              - button "Delete Quiz Room" [ref=e397] [cursor=pointer]:
                - img [ref=e398]
          - generic [ref=e401]:
            - generic [ref=e402]:
              - heading "Project Launchpad Quiz" [level=4] [ref=e403]
              - generic [ref=e404]:
                - generic [ref=e405]: 20 Questions • Galderma
                - generic [ref=e406]:
                  - generic [ref=e407]: 🚫 Expired
                  - link "🔗 Open Quiz" [ref=e408] [cursor=pointer]:
                    - /url: https://retailedge-pro-1igh3.loca.lt/offline-quiz/9e43a747-9cca-470c-85eb-06f0d8d6e9ff
            - generic [ref=e409]:
              - button "Offline Mode" [ref=e410] [cursor=pointer]:
                - img [ref=e411]
                - generic [ref=e418]: Offline Mode
              - button "Host Live" [ref=e419] [cursor=pointer]:
                - img [ref=e420]
                - text: Host Live
              - button "Edit Quiz" [ref=e422] [cursor=pointer]:
                - img [ref=e423]
              - button "Delete Quiz Room" [ref=e425] [cursor=pointer]:
                - img [ref=e426]
          - generic [ref=e429]:
            - generic [ref=e430]:
              - heading "Test Quiz Offline" [level=4] [ref=e431]
              - generic [ref=e432]:
                - generic [ref=e433]: 5 Questions • Idonneous
                - generic [ref=e434]:
                  - generic [ref=e435]: 🚫 Expired
                  - link "🔗 Open Quiz" [ref=e436] [cursor=pointer]:
                    - /url: https://retailedge-pro-1igh3.loca.lt/offline-quiz/5844179b-8f7f-435b-9043-a1907cb4452e
            - generic [ref=e437]:
              - button "Offline Mode" [ref=e438] [cursor=pointer]:
                - img [ref=e439]
                - generic [ref=e446]: Offline Mode
              - button "Host Live" [ref=e447] [cursor=pointer]:
                - img [ref=e448]
                - text: Host Live
              - button "Edit Quiz" [ref=e450] [cursor=pointer]:
                - img [ref=e451]
              - button "Delete Quiz Room" [ref=e453] [cursor=pointer]:
                - img [ref=e454]
          - generic [ref=e457]:
            - generic [ref=e458]:
              - heading "Galderma Launchpad Quiz" [level=4] [ref=e459]
              - generic [ref=e460]:
                - generic [ref=e461]: 10 Questions • Galderma
                - generic [ref=e462]:
                  - generic [ref=e463]: 🚫 Expired
                  - link "🔗 Open Quiz" [ref=e464] [cursor=pointer]:
                    - /url: https://retailedge-pro-1igh3.loca.lt/offline-quiz/ee59c62a-2149-4f30-9bc5-ecd582f4d15f
            - generic [ref=e465]:
              - button "Offline Mode" [ref=e466] [cursor=pointer]:
                - img [ref=e467]
                - generic [ref=e474]: Offline Mode
              - button "Host Live" [ref=e475] [cursor=pointer]:
                - img [ref=e476]
                - text: Host Live
              - button "Edit Quiz" [ref=e478] [cursor=pointer]:
                - img [ref=e479]
              - button "Delete Quiz Room" [ref=e481] [cursor=pointer]:
                - img [ref=e482]
      - generic [ref=e485]:
        - generic [ref=e486]:
          - generic [ref=e487]: 💡
          - generic [ref=e488]:
            - strong [ref=e489]: "Pro Tip:"
            - text: Adding an image or diagram to a question increases correct response rates by 22%.
        - button [ref=e490] [cursor=pointer]:
          - img [ref=e491]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // Configuration for cinematic recording
  4   | test.use({
  5   |   viewport: { width: 1920, height: 1080 },
  6   |   actionTimeout: 10000,
  7   |   video: 'on',
  8   | });
  9   | 
  10  | // Helper for smooth mouse movement
  11  | async function cinematicMoveAndClick(page, selector, click = true, delayAfter = 1000, exact = false) {
  12  |   const element = page.locator(selector).first();
  13  |   await element.scrollIntoViewIfNeeded().catch(() => {});
  14  |   
  15  |   let box = null;
  16  |   try {
  17  |     box = await element.boundingBox();
  18  |   } catch (e) {
  19  |     console.log(`Could not find box for ${selector}`);
  20  |   }
  21  | 
  22  |   if (box) {
  23  |     const targetX = box.x + box.width / 2;
  24  |     const targetY = box.y + box.height / 2;
  25  |     
  26  |     // Smooth move over 25 steps for 60fps feel
  27  |     await page.mouse.move(targetX, targetY, { steps: 25 });
  28  |     await page.waitForTimeout(400); // Dramatic pause on hover
  29  |     
  30  |     if (click) {
  31  |       await page.mouse.down();
  32  |       await page.waitForTimeout(150);
  33  |       await page.mouse.up();
  34  |     }
  35  |   } else if (click) {
  36  |     // Fallback if bounding box fails
  37  |     await element.click({ force: true }).catch(() => {});
  38  |   }
  39  |   
> 40  |   await page.waitForTimeout(delayAfter);
      |              ^ Error: page.waitForTimeout: Target page, context or browser has been closed
  41  | }
  42  | 
  43  | // Cinematic 90-second Trainer Workflow Demo
  44  | test('RetailEdge Pro Trainer Workflow Demo', async ({ page }) => {
  45  |   test.setTimeout(120000); // 120 seconds timeout
  46  |   
  47  |   // --- SCENE 1: Login (5 sec) ---
  48  |   // Wait for page load
  49  |   await page.goto('http://localhost:5173/login');
  50  |   await page.waitForTimeout(1000);
  51  |   
  52  |   // Use quick fill for Trainer
  53  |   await cinematicMoveAndClick(page, 'button:has-text("Trainer")', true, 500);
  54  |   await cinematicMoveAndClick(page, 'button[type="submit"]', true, 2000);
  55  |   await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
  56  |   await page.waitForTimeout(1000); // Wait until dashboard loads
  57  | 
  58  |   // --- SCENE 2: Trainer Dashboard (8 sec) ---
  59  |   // Hover naturally over KPI cards
  60  |   await cinematicMoveAndClick(page, '.glass-card:nth-of-type(1)', false, 800);
  61  |   await cinematicMoveAndClick(page, '.glass-card:nth-of-type(2)', false, 800);
  62  |   await cinematicMoveAndClick(page, '.glass-card:nth-of-type(3)', false, 1500);
  63  | 
  64  |   // --- SCENE 3: Create Batch / Schedule Session (10 sec) ---
  65  |   // Click Quick Action Dropdown
  66  |   await cinematicMoveAndClick(page, 'button:has(.lucide-chevron-down)', true, 1000);
  67  |   // Click Schedule Training
  68  |   await cinematicMoveAndClick(page, 'div:has-text("Schedule Training")', true, 1000);
  69  |   
  70  |   // Fill form (simulate typing)
  71  |   await page.fill('input[placeholder*="Product Knowledge" i]', 'Morning Product Knowledge Batch').catch(() => {});
  72  |   await page.waitForTimeout(300);
  73  |   await page.fill('input[type="datetime-local"]', '2026-07-25T10:00').catch(() => {});
  74  |   
  75  |   // --- SCENE 4: Add Participants (8 sec) ---
  76  |   await page.fill('input[placeholder*="Search members" i]', 'EMP').catch(() => {});
  77  |   await page.waitForTimeout(500);
  78  |   // Select a user from the checklist
  79  |   await cinematicMoveAndClick(page, 'input[type="checkbox"]', true, 500);
  80  |   // Submit
  81  |   await cinematicMoveAndClick(page, 'button:has-text("Schedule & Send")', true, 2000);
  82  | 
  83  |   // --- SCENE 5: Launch Live Session (8 sec) ---
  84  |   // Wait for success screen
  85  |   await page.waitForTimeout(1000);
  86  |   // Click Close/Cancel to return to dashboard
  87  |   await cinematicMoveAndClick(page, 'button:has-text("Close"), button:has-text("Cancel")', true, 2000);
  88  | 
  89  |   // --- SCENE 6: Create Quiz (12 sec) ---
  90  |   await cinematicMoveAndClick(page, 'button:has-text("Create Quiz")', true, 1000);
  91  |   await cinematicMoveAndClick(page, 'button:has-text("Save Quiz")', true, 2000);
  92  |   await page.waitForTimeout(1000);
  93  |   await cinematicMoveAndClick(page, 'div:has-text("Create Quiz")', true, 1500); // Opens Builder
  94  |   await page.fill('textarea[placeholder*="type your question" i]', 'Which of the following is a key feature of RetailEdge Pro?').catch(() => {});
  95  |   await page.waitForTimeout(500);
  96  |   
  97  |   // Select multiple choice from dropdown
  98  |   await page.selectOption('select:has-text("Add Question")', 'mcq').catch(() => {});
  99  |   await page.waitForTimeout(1000);
  100 |   
  101 |   // Fill question
  102 |   await page.fill('textarea[placeholder*="Question" i], input[placeholder*="Question" i]', 'Which product has the highest margin?').catch(() => {});
  103 |   await cinematicMoveAndClick(page, 'button:has-text("Save & Publish")', true, 2500);
  104 | 
  105 |   // --- SCENE 7: Start Live Quiz (10 sec) ---
  106 |   // Redirected back to dashboard, click Host Live for the first quiz
  107 |   await cinematicMoveAndClick(page, 'button:has-text("Host Live")', true, 2000);
  108 |   // Hover over live participants count
  109 |   await page.mouse.move(300, 300, { steps: 20 });
  110 |   await page.waitForTimeout(1000);
  111 |   // Click Next Question
  112 |   await cinematicMoveAndClick(page, 'button:has-text("Next"), button:has-text("Start")', true, 2500);
  113 |   // Wait for animation
  114 |   await page.waitForTimeout(2000);
  115 | 
  116 |   // --- SCENE 8: Leaderboard (8 sec) ---
  117 |   await cinematicMoveAndClick(page, 'button:has-text("Leaderboard"), a[href="/gamification"]', true, 2000);
  118 |   // Hover top participant
  119 |   await cinematicMoveAndClick(page, '.leaderboard-entry:nth-of-type(1), .sales-board-top', false, 2500);
  120 | 
  121 |   // --- SCENE 9: Generate Certificates (6 sec) ---
  122 |   await cinematicMoveAndClick(page, 'a[href="/certificates"]', true, 1500);
  123 |   await cinematicMoveAndClick(page, 'button:has-text("Generate"), button:has-text("View")', true, 2500);
  124 | 
  125 |   // --- SCENE 10: Reports (8 sec) ---
  126 |   await cinematicMoveAndClick(page, 'a[href="/reports"]', true, 1500);
  127 |   // Hover over PDF export
  128 |   await cinematicMoveAndClick(page, 'button:has-text("PDF"), button:has-text("Export")', false, 2000);
  129 | 
  130 |   // --- SCENE 11: Analytics Dashboard (10 sec) ---
  131 |   await cinematicMoveAndClick(page, 'a[href="/pm-dashboard"], a[href="/dashboard"]', true, 1500);
  132 |   // Smoothly pan across the charts
  133 |   await page.mouse.move(500, 500, { steps: 30 });
  134 |   await page.waitForTimeout(1500);
  135 |   await page.mouse.move(900, 600, { steps: 30 });
  136 |   await page.waitForTimeout(1500);
  137 | 
  138 |   // --- SCENE 12: Return to Dashboard (5 sec) ---
  139 |   await cinematicMoveAndClick(page, 'a[href="/dashboard"]', true, 1500);
  140 |   await page.mouse.move(960, 540, { steps: 20 });
```