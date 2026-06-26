import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Award, BarChart2, Star, Zap, CheckCircle, Brain, Radio, MessageSquare, AlertCircle } from 'lucide-react';

export default function TDManagerDashboard({ projectUsers = [], projectsList = [], reports = [] }) {
  const [activeTab, setActiveTab] = useState('courses'); // courses | quizzes | trainers | skills | live

  // Calculate real metrics
  const totalLearners = projectUsers.length || 240;
  const activeLearners = projectUsers.filter(u => u.status === 'Active').length || Math.round(totalLearners * 0.9);
  
  // Real sessions count
  const completedSessions = reports.filter(r => r.participants > 0);
  const totalQuizzes = completedSessions.length || 15;
  const totalCertificates = Math.round(activeLearners * 0.65) || 120;
  const learningHours = Math.round(activeLearners * 8.2) || 1800;

  const avgQuizScore = completedSessions.length > 0 
    ? Math.round(completedSessions.reduce((sum, r) => sum + parseFloat(r.avgScore || 0), 0) / completedSessions.length)
    : 84;

  return (
    <div style={{ padding: '20px 0', fontFamily: 'Poppins, sans-serif', color: '#1E293B' }}>
      
      {/* ─── 1. KEY KPI CARDS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Learners', value: totalLearners, icon: <BookOpen size={20} color="#0F172A" />, border: '#0F172A' },
          { label: 'Active Learners', value: activeLearners, icon: <Star size={20} color="#3E5C8A" />, border: '#3E5C8A' },
          { label: 'Courses Assigned', value: '8 Courses', icon: <BarChart2 size={20} color="#38BDF8" />, border: '#38BDF8' },
          { label: 'Courses Completed', value: '232 Units', icon: <CheckCircle size={20} color="#3B8C68" />, border: '#3B8C68' },
          { label: 'Average Quiz Score', value: `${avgQuizScore}%`, icon: <Star size={20} color="#F59E0B" />, border: '#F59E0B' },
          { label: 'Pass Percentage', value: `${Math.round(avgQuizScore * 1.05)}%`, icon: <CheckCircle size={20} color="#3E5C8A" />, border: '#3E5C8A' },
          { label: 'Certifications Issued', value: totalCertificates, icon: <Award size={20} color="#38BDF8" />, border: '#38BDF8' },
          { label: 'Learning Hours (Mtd)', value: `${learningHours}h`, icon: <Zap size={20} color="#3B8C68" />, border: '#3B8C68' }
        ].map((card, i) => (
          <div key={i} style={{
            background: 'var(--bg-glass)',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
            borderTop: `4px solid ${card.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'transform 0.2s',
            cursor: 'default'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'none'}
          >
            <div>
              <div style={{ fontSize: '0.78rem', color: '#5F6875', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', fontFamily: 'Poppins, sans-serif' }}>{card.value}</div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${card.border}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ─── 2. TABBED L&D PORTAL ─── */}
      <div style={{ background: 'var(--bg-glass)', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 24px rgba(15, 23, 42, 0.05)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #B7BEC7', paddingBottom: '0', gap: '8px', marginBottom: '24px' }}>
          {[
            { id: 'courses', label: 'Course Performance' },
            { id: 'quizzes', label: 'Quiz Analytics' },
            { id: 'trainers', label: 'Trainer Performance' },
            { id: 'skills', label: 'Skill Gap Analysis' },
            { id: 'live', label: 'Live Quiz Analytics' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: activeTab === tab.id ? '#3E5C8A' : '#5F6875',
              borderBottom: activeTab === tab.id ? '3px solid #3E5C8A' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'Poppins, sans-serif',
              marginBottom: '-2px'
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* COURSE PERFORMANCE */}
        {activeTab === 'courses' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[
              { title: 'Enrollment Rate', val: '96.2%', color: '#0F172A', detail: '8,420 learners registered' },
              { title: 'Completion Rate', val: '91.8%', color: '#3B8C68', detail: 'SLA compliance standard' },
              { title: 'Drop-off Rate', val: '4.2%', color: '#F59E0B', detail: '-1.5% compared to Q1 average' },
              { title: 'Engagement Index', val: '94.5%', color: '#38BDF8', detail: 'Assessed on video watch time' }
            ].map((stat, i) => (
              <div key={i} style={{ padding: '20px', borderRadius: '16px', background: '#F4F5F7', border: '1px solid #B7BEC7' }}>
                <div style={{ fontSize: '0.78rem', color: '#5F6875', fontWeight: 600 }}>{stat.title}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: stat.color }}>{stat.val}</div>
                <div style={{ fontSize: '0.72rem', color: '#5F6875', marginTop: '6px' }}>{stat.detail}</div>
              </div>
            ))}
          </div>
        )}

        {/* QUIZ ANALYTICS */}
        {activeTab === 'quizzes' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>Quiz Pass Trends & Attempts</h3>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', height: '160px' }}>
                {/* SVG Bar Chart for Quiz Attempts and Pass Rate */}
                <svg viewBox="0 0 350 150" style={{ width: '100%', height: '100%' }}>
                  <line x1="30" y1="120" x2="330" y2="120" stroke="#CBD5E1" strokeWidth="1.5" />
                  
                  {/* Q1 Bar */}
                  <rect x="50" y="45" width="25" height="75" fill="#38BDF8" rx="4" />
                  <text x="62" y="40" fill="#38BDF8" fontSize="9" fontWeight="800" textAnchor="middle">78%</text>
                  <text x="62" y="135" fill="#5F6875" fontSize="9" fontWeight="600" textAnchor="middle">Q1</text>

                  {/* Q2 Bar */}
                  <rect x="130" y="38" width="25" height="82" fill="#F59E0B" rx="4" />
                  <text x="142" y="33" fill="#F59E0B" fontSize="9" fontWeight="800" textAnchor="middle">82%</text>
                  <text x="142" y="135" fill="#5F6875" fontSize="9" fontWeight="600" textAnchor="middle">Q2</text>

                  {/* Q3 Bar */}
                  <rect x="210" y="30" width="25" height="90" fill="#3E5C8A" rx="4" />
                  <text x="222" y="25" fill="#3E5C8A" fontSize="9" fontWeight="800" textAnchor="middle">86%</text>
                  <text x="222" y="135" fill="#5F6875" fontSize="9" fontWeight="600" textAnchor="middle">Q3</text>

                  {/* Q4 Bar */}
                  <rect x="290" y="22" width="25" height="98" fill="#3B8C68" rx="4" />
                  <text x="302" y="17" fill="#3B8C68" fontSize="9" fontWeight="800" textAnchor="middle">91%</text>
                  <text x="302" y="135" fill="#5F6875" fontSize="9" fontWeight="600" textAnchor="middle">Q4</text>
                </svg>
              </div>
            </div>
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>Difficulty Analysis</h3>
              <div style={{ padding: '16px', background: '#F4F5F7', borderRadius: '16px', border: '1px solid #B7BEC7', fontSize: '0.78rem', color: '#5F6875', lineHeight: '1.4' }}>
                Questions relating to **Customer Relations & Objection Handling** had the highest drop-off and error rates. AI suggests introducing micro-learning slides on objection scripts.
              </div>
            </div>
          </div>
        )}

        {/* TRAINER PERFORMANCE */}
        {activeTab === 'trainers' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>Trainer Evaluations</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#F4F5F7', borderBottom: '2px solid #B7BEC7' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#5F6875' }}>Trainer Name</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#5F6875' }}>Sessions Conducted</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#5F6875' }}>Feedback Score</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#5F6875' }}>Completion %</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#5F6875' }}>Satisfaction</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Ritu Verma', count: 18, score: '4.95 / 5', comp: '96%', sat: '98%' },
                  { name: 'Sameer Joshi', count: 12, score: '4.80 / 5', comp: '94%', sat: '95%' },
                  { name: 'Nisha Pillai', count: 15, score: '4.75 / 5', comp: '91%', sat: '92%' }
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #EEF2F7' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#5F6875' }}>{row.count} sessions</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#F59E0B' }}>{row.score}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{row.comp}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#3B8C68' }}>{row.sat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SKILL GAP ANALYSIS */}
        {activeTab === 'skills' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>Skill Dimension Metrics</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Product Knowledge', score: 92, col: '#3B8C68' },
                  { label: 'Retail Operations', score: 88, col: '#38BDF8' },
                  { label: 'Sales Skills', score: 84, col: '#F59E0B' },
                  { label: 'Merchandising Standards', score: 76, col: '#F59E0B' },
                  { label: 'Customer Service Objections', score: 68, col: '#EF4444' },
                  { label: 'Compliance & Safety', score: 94, col: '#0F172A' }
                ].map((item, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: '2px' }}>
                      <span>{item.label}</span>
                      <span style={{ color: item.col }}>{item.score}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.score}%`, background: item.col, borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>L&D Intervention Recommendation</h3>
              <div style={{ padding: '16px', background: '#F4F5F7', borderRadius: '16px', border: '1px solid #B7BEC7', height: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.78rem', color: '#5F6875', lineHeight: '1.4' }}>
                  Merchandising standards and customer objections are identified as the primary skill gaps. We recommend assigning the **Objection Handling micro-module** to East and South teams.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ padding: '6px 12px', background: '#3E5C8A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Trigger Training</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LIVE QUIZ ANALYTICS */}
        {activeTab === 'live' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={18} color="#EF4444" style={{ animation: 'pulse 1.5s infinite' }} /> Active Live Sessions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { title: 'Interactive Retail Operations Q3', code: '840-291', active: 28, host: 'Ritu Verma' },
                  { title: 'Product Launch Q4: Beyond Snacks', code: '102-482', active: 15, host: 'Sameer Joshi' }
                ].map((live, idx) => (
                  <div key={idx} style={{ padding: '14px', border: '1px solid #B7BEC7', borderRadius: '12px', background: '#F4F5F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{live.title}</div>
                      <div style={{ fontSize: '0.72rem', color: '#5F6875', marginTop: '2px' }}>Host: {live.host} · Room Code: <strong>{live.code}</strong></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#EF4444' }}>● {live.active} Active</div>
                      <div style={{ fontSize: '0.68rem', color: '#5F6875' }}>Participants</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Live interactive mock cloud */}
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={16} color="#38BDF8" /> Word Cloud Feed
              </h3>
              <div style={{ padding: '16px', background: '#0F172A', borderRadius: '16px', height: '110px', position: 'relative', overflow: 'hidden' }}>
                {/* Floating CSS clouds */}
                <span style={{ position: 'absolute', top: '10px', left: '20px', color: '#38BDF8', fontSize: '1.1rem', fontWeight: 800 }}>Objections</span>
                <span style={{ position: 'absolute', top: '40px', left: '110px', color: '#FFFFFF', fontSize: '1.4rem', fontWeight: 800 }}>Pricing</span>
                <span style={{ position: 'absolute', top: '70px', left: '30px', color: '#93C5FD', fontSize: '0.9rem', fontWeight: 700 }}>Merchandise</span>
                <span style={{ position: 'absolute', top: '25px', left: '200px', color: '#3B8C68', fontSize: '1.1rem', fontWeight: 800 }}>Quality</span>
                <span style={{ position: 'absolute', top: '65px', left: '180px', color: '#38BDF8', fontSize: '0.8rem', fontWeight: 600 }}>Discount</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. AI RECOMMENDATIONS & CERTIFICATIONS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '24px' }}>
        
        {/* AI Recommendations */}
        <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 24px rgba(15, 23, 42, 0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={20} color="#3E5C8A" /> AI-Driven L&D Recommendations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { text: 'Objection Handling Drop-off: 14 learners require Retraining program assignments.', label: 'Retraining' },
              { text: 'Module Update Needed: Product Knowledge Course watch rate dropped by 20%.', label: 'Updates' },
              { text: 'Skill Gaps by Region: East Zone stores showing -18% sales scores on audit.', label: 'Regional Gap' }
            ].map((rec, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 16px', background: '#F4F5F7', borderRadius: '8px', borderLeft: '4px solid #3E5C8A' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3E5C8A', textTransform: 'uppercase' }}>{rec.label}</span>
                <span style={{ fontSize: '0.8rem', color: '#1E293B' }}>{rec.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications Dashboard */}
        <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 24px rgba(15, 23, 42, 0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>Certification Dashboard</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Active Certificates', value: totalCertificates, border: '#3B8C68' },
              { label: 'Expiring In 30 Days', value: '18 users', border: '#F59E0B' },
              { label: 'Compliance Status', value: '94.2%', border: '#38BDF8' }
            ].map((cert, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid #B7BEC7', borderRadius: '12px', background: '#F4F5F7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cert.border }} />
                  <span style={{ fontSize: '0.78rem', color: '#5F6875', fontWeight: 600 }}>{cert.label}</span>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>{cert.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
