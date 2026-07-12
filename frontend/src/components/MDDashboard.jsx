import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, Bell, FileText, ChevronRight, Download, Share2, TrendingUp, Users, Target, Shield, Star, Play, MoreVertical, Eye, Map, AlertTriangle, CheckCircle, BarChart2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Bar, Line, CartesianGrid, Legend
} from 'recharts';

export default function MDDashboard({ 
  onExportExcel, 
  onExportPPT,
  reports = [],
  selectedProjectId = 'all',
  projectsList = []
}) {
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedModalItem, setSelectedModalItem] = useState(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleDownloadReport = (reportName) => {
    setToastMessage(`Downloading ${reportName}...`);
    const csvContent = "data:text/csv;charset=utf-8,Report Name,Status\n" + reportName + ",Generated\nMetric 1, 95%\nMetric 2, 88%\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleViewDetails = (itemTitle, detailsObj) => {
    setSelectedModalItem({ title: itemTitle, details: detailsObj });
  };

  const theme = {
    bg: 'transparent',
    card: 'var(--bg-glass)',
    textMain: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    border: 'var(--border-glass)',
    primary: 'var(--primary)',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6'
  };

  // Dynamic calculations to sync with selected project
  const modifier = reports.length > 0 ? (reports.length % 5) + 1 : 1;
  const isAll = selectedProjectId === 'all' || !selectedProjectId;
  const dynActiveClients = isAll ? 12 : Math.max(1, Math.floor(12 / modifier));
  const dynRevImpact = isAll ? '2.8 Cr' : `${(2.8 / modifier).toFixed(1)} Cr`;
  const dynReadiness = isAll ? 94 : 94 - modifier;
  const dynCertification = isAll ? 91 : 91 - modifier;

  // Recharts Data
  const roiData = [
    { name: 'Jan', val: 1.6 }, { name: 'Feb', val: 1.8 }, { name: 'Mar', val: 2.1 },
    { name: 'Apr', val: 2.3 }, { name: 'May', val: 2.3 }, { name: 'Jun', val: 2.4 }
  ];

  const pieData = [
    { name: 'Training Delivery', value: 40, color: '#3B82F6' },
    { name: 'Assessments', value: 25, color: '#10B981' },
    { name: 'Technology', value: 20, color: '#F59E0B' },
    { name: 'Certification', value: 15, color: '#EF4444' },
  ];

  const escalationData = [
    { name: 'Critical', value: 1, color: '#EF4444' },
    { name: 'Medium', value: 3, color: '#F59E0B' },
    { name: 'Low', value: 7, color: '#10B981' },
  ];

  const businessImpactData = [
    { name: 'Jan', completion: 65, sales: 1.2 },
    { name: 'Feb', completion: 72, sales: 1.5 },
    { name: 'Mar', completion: 78, sales: 1.9 },
    { name: 'Apr', completion: 85, sales: 2.3 },
    { name: 'May', completion: 92, sales: 2.8 },
    { name: 'Jun', completion: 96, sales: 3.4 },
  ];


  return (
    <div style={{ background: theme.bg, minHeight: '100vh', padding: '24px', fontFamily: '"Inter", "Segoe UI", sans-serif', color: theme.textMain }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', background: theme.primary, color: 'var(--text-primary)', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 1000, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={20} /> {toastMessage}
        </div>
      )}

      {/* Details Modal */}
      {selectedModalItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }}>
          <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: theme.textMain }}>{selectedModalItem.title}</h3>
              <button onClick={() => setSelectedModalItem(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: theme.textSecondary }}>&times;</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(selectedModalItem.details).map(([k, v]) => (
                <div key={k} style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</span>
                  <div style={{ fontSize: '1rem', fontWeight: 500, color: theme.textMain, marginTop: '6px' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => handleDownloadReport(selectedModalItem.title)} style={{ padding: '10px 20px', background: theme.primary, border: 'none', borderRadius: '8px', color: 'white', fontWeight: 500, cursor: 'pointer' }}>Download CSV</button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} color={theme.textSecondary} style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input type="text" placeholder="Search clients, projects, reports..." style={{ padding: '10px 10px 10px 36px', borderRadius: '8px', border: `1px solid ${theme.border}`, width: '280px', fontSize: '0.875rem', outline: 'none' }} />
          </div>
          <button style={{ background: 'var(--bg-tertiary)', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={18} color={theme.textSecondary} />
          </button>
          <button style={{ background: 'var(--bg-tertiary)', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Bell size={18} color={theme.textSecondary} />
            <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', background: theme.danger, borderRadius: '50%', border: '2px solid #FFF' }}></div>
          </button>
          <button onClick={() => { if(onExportExcel) { onExportExcel() } else { handleDownloadReport('Board Report') } }} style={{ background: theme.primary, color: 'var(--text-primary)', border: 'none', borderRadius: '8px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer' }}>
            <FileText size={18} /> Generate Board Report <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* INSIGHTS BANNER */}
      <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', fontSize: '0.875rem', fontWeight: 500 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} color={theme.danger} /> 2 clients require immediate attention</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={16} color={theme.success} /> Workforce readiness improved by 4%</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Target size={16} color={theme.primary} /> West region exceeded certification targets</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} color={theme.warning} /> 1 critical escalation remains unresolved</div>
        </div>
        <button onClick={() => handleViewDetails('Executive Summary', { title: 'Executive Summary', data: 'AI Executive Summary: Workforce readiness improved by 4.2% across major regions. We have observed a strong correlation between recent certification drives and positive client SLA scores. However, early predictive indicators suggest that if intervention is not applied in the Western district, compliance targets may be missed by Q3.' })} style={{ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: '20px', padding: '6px 16px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: theme.textMain }}>
          View Executive Summary <ChevronRight size={14} />
        </button>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
        {/* Card 1 */}
        <div style={{ flex: 1, background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.primary, fontWeight: 'bold' }}>₹</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Revenue Impact</div>
            </div>
            <MoreVertical size={16} color={theme.textSecondary} />
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>₹ {dynRevImpact}</div>
              <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '4px' }}>vs last month</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: theme.success, marginBottom: '8px' }}>▲ 12%</div>
              <svg width="60" height="20" viewBox="0 0 60 20">
                <path d="M0,15 L10,12 L20,18 L30,8 L40,10 L50,2 L60,5" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div style={{ flex: 1, background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={18} color={theme.success} /></div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Active Clients</div>
            </div>
            <MoreVertical size={16} color={theme.textSecondary} />
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{dynActiveClients}</div>
              <div style={{ fontSize: '0.75rem', color: theme.danger, fontWeight: 600, marginTop: '4px' }}>▲ 2 at risk</div>
            </div>
            <div>
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="var(--bg-tertiary)" strokeWidth="6" />
                <circle cx="20" cy="20" r="16" fill="none" stroke={theme.success} strokeWidth="6" strokeDasharray="100" strokeDashoffset="25" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div style={{ flex: 1, background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Target size={18} color={theme.purple} /></div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Workforce Readiness</div>
            </div>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{dynReadiness}%</div>
              <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '4px' }}>Target: 95%</div>
            </div>
            <div style={{ width: '80px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px' }}>
              <div style={{ width: `${dynReadiness}%`, height: '100%', background: theme.purple, borderRadius: '3px' }}></div>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div style={{ flex: 1, background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={18} color="#3B82F6" /></div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Certification Coverage</div>
            </div>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{dynCertification}%</div>
              <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '4px' }}>1,286 Certified</div>
            </div>
            <div style={{ width: '80px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px' }}>
              <div style={{ width: `${dynCertification}%`, height: '100%', background: '#3B82F6', borderRadius: '3px' }}></div>
            </div>
          </div>
        </div>

        {/* Card 5 */}
        <div style={{ flex: 1, background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={18} color={theme.warning} /></div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Client Satisfaction (NPS)</div>
            </div>
            <MoreVertical size={16} color={theme.textSecondary} />
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>4.8 <span style={{ fontSize: '1rem', color: theme.textSecondary }}>/ 5</span></div>
              <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '4px' }}>vs last month</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: theme.success, marginBottom: '8px' }}>▲ 0.2</div>
              <svg width="60" height="20" viewBox="0 0 60 20">
                <path d="M0,15 L10,12 L20,18 L30,10 L40,12 L50,2 L60,5" fill="none" stroke={theme.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW (3 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* Strategic Alerts */}
        <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Strategic Alerts</h3>
            <span onClick={() => handleViewDetails('Strategic Alerts', { title: 'Strategic Alerts', data: 'All strategic alerts are currently being monitored by the AI.' })} style={{ fontSize: '0.75rem', color: theme.primary, fontWeight: 600, cursor: 'pointer' }}>View All</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { type: 'Critical', text: 'Galderma compliance dropped below 90%', sub: 'Compliance score is 87%', color: theme.danger, bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' },
              { type: 'Warning', text: 'Royal Canin certifications due for renewal', sub: '256 certificates expiring in 15 days', color: theme.warning, bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
              { type: 'Success', text: 'Unilever exceeded training targets', sub: 'Targets achieved 120% this month', color: theme.success, bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' },
              { type: 'Info', text: 'West region achieved highest productivity', sub: 'Productivity improved by 18%', color: theme.primary, bg: 'rgba(0, 240, 255, 0.1)', border: 'rgba(0, 240, 255, 0.3)' }
            ].map((al, i) => (
              <div key={i} style={{ padding: '12px', background: al.bg, border: `1px solid ${al.border}`, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ marginTop: '2px' }}><AlertTriangle size={14} color={al.color} /></div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: theme.textMain }}>{al.text}</div>
                    <div style={{ fontSize: '0.7rem', color: theme.textSecondary, marginTop: '2px' }}>{al.sub}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: al.color, background: 'var(--bg-tertiary)', border: `1px solid ${al.border}`, padding: '2px 8px', borderRadius: '12px' }}>{al.type}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Client Health Matrix */}
        <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Client Health Matrix</h3>
            <span onClick={() => handleViewDetails('Client Health Matrix', { title: 'Client Health Matrix', data: 'Loading full matrix...' })} style={{ fontSize: '0.75rem', color: theme.primary, fontWeight: 600, cursor: 'pointer' }}>View All Clients</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}`, color: theme.textSecondary }}>
                <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600 }}>Client</th>
                <th style={{ padding: '8px 0', textAlign: 'center', fontWeight: 600 }}>Projects</th>
                <th style={{ padding: '8px 0', textAlign: 'center', fontWeight: 600 }}>Completion %</th>
                <th style={{ padding: '8px 0', textAlign: 'center', fontWeight: 600 }}>Certification %</th>
                <th style={{ padding: '8px 0', textAlign: 'center', fontWeight: 600 }}>SLA Score</th>
                <th style={{ padding: '8px 0', textAlign: 'center', fontWeight: 600 }}>Risk Status</th>
                <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Unilever International', icon: 'U', cbg: 'rgba(59, 130, 246, 0.2)', cCol: theme.primary, p: 8, comp: 98, cert: 96, sla: 98, risk: 'Low', rCol: theme.success },
                { name: 'Galderma', icon: 'G', cBg: '#F3F4F6', cCol: theme.textMain, p: 6, comp: 82, cert: 87, sla: 92, risk: 'Medium', rCol: theme.warning },
                { name: 'Royal Canin', icon: 'R', cbg: 'rgba(239, 68, 68, 0.2)', cCol: theme.danger, p: 5, comp: 74, cert: 75, sla: 88, risk: 'High', rCol: theme.danger },
                { name: 'Emami Limited', icon: 'E', cbg: 'rgba(99, 102, 241, 0.15)', cCol: theme.primary, p: 4, comp: 91, cert: 92, sla: 95, risk: 'Low', rCol: theme.success },
                { name: 'The Face Shop India', icon: 'F', cBg: 'var(--text-primary)', cCol: '#FFF', p: 3, comp: 88, cert: 90, sla: 94, risk: 'Low', rCol: theme.success }
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: i === 4 ? 'none' : `1px solid #F3F4F6` }}>
                  <td style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: row.cBg, color: row.cCol, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>{row.icon}</div>
                    {row.name}
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'center', fontWeight: 500 }}>{row.p}</td>
                  <td style={{ padding: '12px 0', textAlign: 'center', fontWeight: 500 }}>{row.comp}%</td>
                  <td style={{ padding: '12px 0', textAlign: 'center', fontWeight: 500 }}>{row.cert}%</td>
                  <td style={{ padding: '12px 0', textAlign: 'center', fontWeight: 500 }}>{row.sla}%</td>
                  <td style={{ padding: '12px 0', textAlign: 'center' }}>
                    <span style={{ color: row.rCol, fontWeight: 600, fontSize: '0.75rem' }}>{row.risk}</span>
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>
                    <Eye size={14} color={theme.textSecondary} style={{ cursor: 'pointer', marginRight: '8px' }} onClick={() => handleViewDetails(row.name, row)} />
                    <MoreVertical size={14} color={theme.textSecondary} style={{ cursor: 'pointer' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Training ROI Overview */}
        <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Training ROI Overview</h3>
            <span style={{ fontSize: '0.75rem', color: theme.textSecondary, border: `1px solid ${theme.border}`, padding: '4px 8px', borderRadius: '6px' }}>This Month ▼</span>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
            {/* Metrics List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '120px' }}>
              {[
                { label: 'Total Investment', val: '₹ 74.5 L', icon: Users, color: theme.purple },
                { label: 'Cost Per Learner', val: '₹ 1,250', icon: Users, color: theme.purple },
                { label: 'Productivity Improvement', val: '+18%', icon: TrendingUp, color: theme.primary },
                { label: 'Sales Uplift', val: '+11%', icon: BarChart2, color: theme.primary },
                { label: 'ROI', val: '2.4 X', icon: Target, color: theme.purple },
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <m.icon size={14} color={m.color} style={{ marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '0.65rem', color: theme.textSecondary }}>{m.label}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.textMain }}>{m.val}</div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Charts Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ height: '120px', width: '100%' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px' }}>ROI Trend (Last 6 Months)</div>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={roiData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRoi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={theme.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}X`} />
                    <Tooltip cursor={false} />
                    <Area type="monotone" dataKey="val" stroke={theme.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorRoi)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: 'auto' }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: '100px', position: 'relative' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', textAlign: 'center' }}>Investment Breakdown</div>
                    <PieChart width={100} height={100}>
                      <Pie data={pieData} cx={50} cy={50} innerRadius={30} outerRadius={45} paddingAngle={2} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </div>
                </div>
                <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {pieData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: d.color }}></span> {d.name}
                      </span>
                      <span style={{ color: theme.textSecondary }}>{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      

      {/* STRATEGIC & FINANCIAL GOVERNANCE ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* Business Impact Correlation */}
        <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Business Impact Correlation</h3>
            <span style={{ fontSize: '0.7rem', color: theme.textSecondary }}>Training vs Sales Growth (Cr)</span>
          </div>
          <div style={{ flex: 1, minHeight: '220px', width: '100%', marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={businessImpactData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme.textSecondary }} dy={5} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme.textSecondary }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme.textSecondary }} tickFormatter={(v) => `${v}%`} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'var(--bg-tertiary)', border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.textMain }} />
                <Bar yAxisId="left" dataKey="sales" name="Sales Uplift (Cr)" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Line yAxisId="right" type="monotone" dataKey="completion" name="Training %" stroke={theme.purple} strokeWidth={3} dot={{ r: 4, fill: theme.purple }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Utilization */}
        <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Budget Utilization</h3>
            <MoreVertical size={16} color={theme.textSecondary} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, marginTop: '10px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: theme.textSecondary, marginBottom: '4px' }}>YTD Spend</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: theme.textMain }}>₹ 1.8 <span style={{ fontSize: '1.2rem' }}>Cr</span></div>
              <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>of ₹ 2.5 Cr Annual Budget</div>
            </div>
            
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '8px', fontWeight: 600 }}>
                <span style={{ color: theme.primary }}>72% Utilized</span>
                <span style={{ color: theme.textSecondary }}>Target: 60% by Q3</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-glass)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '72%', height: '100%', background: theme.primary, borderRadius: '4px' }}></div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', background: 'var(--bg-tertiary)', border: `1px solid ${theme.warning}50`, padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertTriangle size={20} color={theme.warning} style={{ marginTop: '2px' }} />
              <div style={{ fontSize: '0.8rem', color: theme.textMain }}>
                Run rate implies <span style={{ fontWeight: 700, color: theme.warning }}>₹ 40L overspend</span> by EOY. Reallocation recommended.
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Risk Deficit */}
        <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Compliance Risk Deficit</h3>
            <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', color: theme.danger, padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>High Priority</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', borderLeft: `3px solid ${theme.danger}` }}>
              <Shield size={24} color={theme.danger} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: theme.textMain }}>FDA Safety Regs</div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '2px' }}>Galderma • 145 at risk</div>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.danger }}>Critical</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', borderLeft: `3px solid ${theme.warning}` }}>
              <FileText size={24} color={theme.warning} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: theme.textMain }}>Data Privacy (GDPR)</div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '2px' }}>Unilever • 89 missing</div>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.warning }}>Medium</div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', borderLeft: `3px solid ${theme.primary}` }}>
              <AlertTriangle size={24} color={theme.primary} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: theme.textMain }}>Store Operations</div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '2px' }}>Face Shop • 42 pending</div>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.primary }}>Low</div>
            </div>

          </div>
        </div>

      </div>

      {/* BOTTOM ROW (3 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* Heat Map */}
        <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Region Performance Heat Map</h3>
            <span style={{ fontSize: '0.75rem', color: theme.textSecondary, border: `1px solid ${theme.border}`, padding: '4px 8px', borderRadius: '6px' }}>This Month ▼</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* SVG India Map Approximation */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <svg viewBox="0 0 400 400" width="100%" height="160" style={{ maxWidth: '140px', overflow: 'visible' }}>
                <path d="M 160 40 L 180 10 L 210 20 L 220 50 L 250 80 L 270 90 L 320 90 L 340 100 L 360 120 L 350 140 L 320 150 L 300 140 L 290 160 L 270 190 L 250 240 L 220 300 L 200 360 L 180 360 L 150 280 L 120 220 L 100 190 L 60 170 L 50 150 L 70 130 L 100 140 L 120 110 L 130 80 L 140 50 Z" 
                  fill="var(--bg-tertiary)" stroke={theme.border} strokeWidth="3" strokeLinejoin="round" 
                />
                <circle cx="200" cy="80" r="45" fill={theme.success} opacity="0.85" />
                <circle cx="120" cy="160" r="45" fill={theme.success} opacity="0.85" />
                <circle cx="200" cy="180" r="45" fill={theme.warning} opacity="0.85" />
                <circle cx="280" cy="160" r="45" fill={theme.success} opacity="0.85" />
                <circle cx="200" cy="280" r="45" fill={theme.success} opacity="0.85" />

                <text x="200" y="85" fill='var(--bg-primary)' fontSize="20" fontWeight="bold" textAnchor="middle">N</text>
                <text x="120" y="165" fill='var(--bg-primary)' fontSize="20" fontWeight="bold" textAnchor="middle">W</text>
                <text x="200" y="185" fill='var(--bg-primary)' fontSize="20" fontWeight="bold" textAnchor="middle">C</text>
                <text x="280" y="165" fill='var(--bg-primary)' fontSize="20" fontWeight="bold" textAnchor="middle">E</text>
                <text x="200" y="285" fill='var(--bg-primary)' fontSize="20" fontWeight="bold" textAnchor="middle">S</text>
              </svg>
            </div>
            {/* Mini Table */}
            <div style={{ flex: 1.5 }}>
              <table style={{ width: '100%', fontSize: '0.65rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: theme.textSecondary }}>
                    <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Region</th>
                    <th style={{ textAlign: 'center', paddingBottom: '8px' }}>Readiness</th>
                    <th style={{ textAlign: 'center', paddingBottom: '8px' }}>Completion</th>
                    <th style={{ textAlign: 'center', paddingBottom: '8px' }}>Certification</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { r: 'West', vals: ['96%', '93%', '94%'], c: theme.success },
                    { r: 'South', vals: ['93%', '90%', '91%'], c: theme.success },
                    { r: 'North', vals: ['88%', '85%', '87%'], c: theme.success },
                    { r: 'Central', vals: ['84%', '82%', '83%'], c: theme.warning },
                    { r: 'East', vals: ['76%', '76%', '75%'], c: theme.danger }
                  ].map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 0', fontWeight: 600 }}>{row.r}</td>
                      {row.vals.map((v, j) => <td key={j} style={{ padding: '6px 0', textAlign: 'center', fontWeight: 600, color: row.c }}>{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '0.65rem', color: theme.textSecondary, marginTop: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.success }}></span> Excellent (90-100%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.warning }}></span> Moderate (70-89%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.danger }}></span> Critical (&lt;70%)</span>
          </div>
        </div>

        {/* Escalation Radar */}
        <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Escalation Radar</h3>
            <span onClick={() => handleViewDetails('Escalations', { title: 'Escalation Radar', data: 'Loading all escalations...' })} style={{ fontSize: '0.75rem', color: theme.primary, fontWeight: 600, cursor: 'pointer' }}>View All Escalations</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '140px' }}>
            <div style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', justifyContent: 'center' }}>
              <PieChart width={140} height={140}>
                <Pie data={escalationData} cx={70} cy={70} innerRadius={50} outerRadius={65} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                  {escalationData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
              </PieChart>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>11</div>
                <div style={{ fontSize: '0.6rem', color: theme.textSecondary, fontWeight: 600 }}>Total Escalations</div>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {escalationData.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }}></span> {d.name}</span>
                  <span>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${theme.border}`, paddingTop: '16px', marginTop: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: theme.textSecondary }}>Avg. Resolution Time</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>18.4 hrs</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: theme.textSecondary }}>Resolution Rate</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>92%</div>
            </div>
          </div>
        </div>

        {/* Strategic Projects Requiring Attention */}
        <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Strategic Projects Requiring Attention</h3>
            <span onClick={() => handleViewDetails('Strategic Projects', { title: 'Strategic Projects', data: 'Loading projects...' })} style={{ fontSize: '0.75rem', color: theme.primary, fontWeight: 600, cursor: 'pointer' }}>View All Projects</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
            {[
              { title: 'Galderma Beauty Program', client: 'Galderma', comp: 82, risk: 'Medium', milestone: 'Assessment Phase', rCol: theme.warning, action: 'Review Project' },
              { title: 'Royal Canin Field Training', client: 'Royal Canin', comp: 74, risk: 'High', milestone: 'Certification Drive', rCol: theme.danger, action: 'Intervene Now' },
              { title: 'Unilever Retail Excellence', client: 'Unilever International', comp: 96, risk: 'Low', milestone: 'Project Closure', rCol: theme.success, action: 'Celebrate Success' }
            ].map((p, i) => (
              <div key={i} style={{ flex: 1, background: 'var(--bg-tertiary)', border: `1px solid ${p.rCol}50`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '12px' }}>{p.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: theme.textSecondary, marginBottom: '16px' }}>
                  <span>Client</span><span style={{ color: theme.textMain, fontWeight: 600 }}>{p.client}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: theme.textSecondary, marginBottom: '6px' }}>
                  <span>Completion</span><span style={{ color: theme.textMain, fontWeight: 600 }}>{p.comp}%</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'var(--border-glass)', borderRadius: '2px', marginBottom: '16px' }}>
                  <div style={{ width: `${p.comp}%`, height: '100%', background: p.rCol, borderRadius: '2px' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: theme.textSecondary, marginBottom: '16px' }}>
                  <span>Risk</span><span style={{ color: p.rCol, fontWeight: 700 }}>{p.risk}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: theme.textSecondary, marginBottom: 'auto' }}>
                  <span>Next Milestone</span><span style={{ color: theme.textMain, fontWeight: 600, textAlign: 'right', width: '60%' }}>{p.milestone}</span>
                </div>
                <button style={{ width: '100%', padding: '8px', marginTop: '16px', background: 'var(--bg-tertiary)', border: `1px solid ${p.rCol}50`, borderRadius: '6px', color: p.rCol, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>{p.action}</button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* BOTTOM AI BANNER */}
      <div style={{ background: theme.card, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '48px', height: '48px', background: '#6D28D9', borderRadius: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>AI</div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: theme.textMain }}>AI Executive Insight</div>
            <div style={{ fontSize: '0.8rem', color: theme.textSecondary, marginTop: '2px' }}>Overall workforce readiness improved this month. However, <span style={{ color: theme.textMain, fontWeight: 600 }}>Galderma</span> and <span style={{ color: theme.textMain, fontWeight: 600 }}>Royal Canin</span> require immediate intervention to maintain compliance and certification goals.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => handleDownloadReport('AI Board Report')} style={{ background: theme.purple, color: 'var(--text-primary)', border: 'none', borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, fontSize: '0.8rem', cursor: 'pointer' }}>
            <FileText size={14} /> Generate Board Report
          </button>
          <button onClick={() => { if(onExportPPT) { onExportPPT() } else { setToastMessage('PPT feature connecting...') } }} style={{ background: 'var(--bg-tertiary)', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
            <Download size={14} /> Download PPT
          </button>
          <button style={{ background: 'var(--bg-tertiary)', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
            <Share2 size={14} /> Share Summary
          </button>
        </div>
      </div>

    </div>
  );
}
