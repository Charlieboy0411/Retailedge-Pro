import XLSX from 'xlsx-js-style';
import { downloadWorkbook } from './downloadWorkbook';

/**
 * Generates the strictly 21-Column Master Training Outcome Excel Report.
 * Aligns column 21 as 'Certificate ID & Issue Date'.
 */
export function generateMasterOutcomeExcel(data = [], projectName = 'All Projects') {
  if (!data || data.length === 0) {
    alert('No outcome records found for the selected project scope.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Master Training Outcome (Strictly 21 Columns) ──────────────────
  const headers = [
    'Client',
    'Project',
    'Subproject',
    'Training Session',
    'Participant',
    'Employee ID',
    'Trainer',
    'Session Date',
    'Jitsi Attendance',
    'Join Time',
    'Leave Time',
    'Total Duration',
    'Attendance %',
    'Quizzes Assigned',
    'Quizzes Attempted',
    'Quiz Type',
    'Quiz Score',
    'Pass/Fail',
    'Certification Eligibility',
    'Certificate Status',
    'Certificate ID & Issue Date'
  ];

  const headerStyle = {
    font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E293B' } }, // Slate-800
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '334155' } },
      bottom: { style: 'medium', color: { rgb: '0284C7' } },
      left: { style: 'thin', color: { rgb: '334155' } },
      right: { style: 'thin', color: { rgb: '334155' } }
    }
  };

  const rows = data.map((item, idx) => {
    // Reconcile certificate ID & issue date
    const certField = item.certificateIdAndDate || 
      (item.certificateId && item.certificateId !== 'N/A' 
        ? `${item.certificateId} (${item.certificateIssueDate || 'Issued'})` 
        : 'N/A');

    return [
      item.client || 'RetailEdge Client',
      item.project || 'General Project',
      item.subproject || 'General Subproject',
      item.trainingSession || 'Training Session',
      item.participant || 'Learner',
      item.employeeId || 'N/A',
      item.trainer || 'Trainer',
      item.sessionDate || '',
      item.jitsiAttendance || 'Attended',
      item.joinTime || '',
      item.leaveTime || '',
      item.totalDuration || '0m',
      item.attendancePercentage || '0%',
      item.quizzesAssigned || 1,
      item.quizzesAttempted || 1,
      item.quizType || 'ONLINE',
      item.quizScore || '0%',
      item.passFail || 'Pass',
      item.certificationEligibility || 'PENDING',
      item.certificateStatus || 'IN PROGRESS',
      certField
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths (strictly 21 columns)
  ws['!cols'] = [
    { wch: 18 }, // 1. Client
    { wch: 22 }, // 2. Project
    { wch: 22 }, // 3. Subproject
    { wch: 26 }, // 4. Training Session
    { wch: 22 }, // 5. Participant
    { wch: 14 }, // 6. Employee ID
    { wch: 18 }, // 7. Trainer
    { wch: 14 }, // 8. Session Date
    { wch: 16 }, // 9. Jitsi Attendance
    { wch: 12 }, // 10. Join Time
    { wch: 12 }, // 11. Leave Time
    { wch: 14 }, // 12. Total Duration
    { wch: 14 }, // 13. Attendance %
    { wch: 16 }, // 14. Quizzes Assigned
    { wch: 16 }, // 15. Quizzes Attempted
    { wch: 12 }, // 16. Quiz Type
    { wch: 12 }, // 17. Quiz Score
    { wch: 12 }, // 18. Pass/Fail
    { wch: 22 }, // 19. Certification Eligibility
    { wch: 20 }, // 20. Certificate Status
    { wch: 28 }  // 21. Certificate ID & Issue Date
  ];

  // Apply header styling
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[cellRef]) ws[cellRef].s = headerStyle;
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Training Outcome');

  const cleanProject = projectName.replace(/[^a-z0-9_-]/gi, '_');
  const filename = `RetailEdge_Pro_Master_Training_Outcome_${cleanProject}_${new Date().toISOString().split('T')[0]}.xlsx`;

  downloadWorkbook(XLSX, wb, filename);
}
