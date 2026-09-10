import React, { useState, useEffect } from 'react';
import { 
  X, Check, ChevronRight, ChevronLeft, Award, Users, 
  Settings, Eye, CheckCircle2, AlertCircle, Building, 
  Sparkles, QrCode, FileText, Download, ShieldCheck, Sliders
} from 'lucide-react';
import axios from 'axios';

export default function CertificateCreationWizard({ isOpen, onClose, token, user, onSuccess, projects = [], clients = [] }) {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [trainings, setTrainings] = useState([]);
  const [trainers, setTrainers] = useState([]);

  // Step 1: Context State
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [selectedTrainingId, setSelectedTrainingId] = useState('');
  const [batchName, setBatchName] = useState('UI Mumbai Promoter Batch 04');
  const [selectedTrainerId, setSelectedTrainerId] = useState(user?.id || '');
  const [trainerName, setTrainerName] = useState(user?.name || 'Aakash Verma');

  // Step 2: Participants & Rules State
  const [minAttendance, setMinAttendance] = useState(80);
  const [minScore, setMinScore] = useState(60);
  const [minCompletion, setMinCompletion] = useState(100);
  const [evaluatedParticipants, setEvaluatedParticipants] = useState([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [evaluating, setEvaluating] = useState(false);

  // Step 3: Template & Signatures
  const [selectedTemplate, setSelectedTemplate] = useState('corporate');
  const [signatoryName, setSignatoryName] = useState('Mohit Tiku');
  const [signatoryDesignation, setSignatoryDesignation] = useState('Managing Director');
  const [includeTrainerSignature, setIncludeTrainerSignature] = useState(true);
  const [includeCompanySeal, setIncludeCompanySeal] = useState(true);
  const [sealPosition, setSealPosition] = useState('bottom-right');

  // Ensure project selection when projects prop updates
  useEffect(() => {
    if (projects.length > 0 && (!selectedProjectId || !projects.some(p => p.id === selectedProjectId))) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  // Fetch trainings & trainers on open
  useEffect(() => {
    if (isOpen && token) {
      fetchTrainings();
      fetchTrainers();
    }
  }, [isOpen, token, selectedProjectId]);

  const fetchTrainings = async () => {
    try {
      const res = await axios.get(`/api/trainings${selectedProjectId ? `?projectId=${selectedProjectId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrainings(res.data);
      if (res.data.length > 0 && !selectedTrainingId) {
        setSelectedTrainingId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch trainings', err);
    }
  };

  const fetchTrainers = async () => {
    if (user?.role === 'Trainer') {
      setSelectedTrainerId(user.id);
      setTrainerName(user.name);
      return;
    }
    try {
      const res = await axios.get('/api/users?role=Trainer', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrainers(res.data);
      if (res.data.length > 0) {
        setSelectedTrainerId(res.data[0].id);
        setTrainerName(res.data[0].name);
      }
    } catch (err) {
      console.error('Failed to fetch trainers', err);
    }
  };

  // Evaluate eligibility when stepping into Step 2 or adjusting rules
  const handleEvaluateEligibility = async () => {
    setEvaluating(true);
    try {
      const res = await axios.post('/api/certificates/eligibility', {
        projectId: selectedProjectId,
        trainingId: selectedTrainingId,
        batchName,
        minAttendance: Number(minAttendance),
        minScore: Number(minScore),
        minCompletion: Number(minCompletion)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEvaluatedParticipants(res.data.participants || []);
      const eligibleIds = (res.data.participants || []).filter(p => p.isEligible).map(p => p.id);
      setSelectedParticipantIds(eligibleIds);
    } catch (err) {
      console.error('Failed to evaluate eligibility', err);
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    if (step === 2) {
      handleEvaluateEligibility();
    }
  }, [step, selectedProjectId, minAttendance, minScore, minCompletion]);

  const handleSelectAllEligible = () => {
    const eligibleIds = evaluatedParticipants.filter(p => p.isEligible).map(p => p.id);
    setSelectedParticipantIds(eligibleIds);
  };

  const handleToggleParticipant = (id) => {
    if (selectedParticipantIds.includes(id)) {
      setSelectedParticipantIds(selectedParticipantIds.filter(item => item !== id));
    } else {
      setSelectedParticipantIds([...selectedParticipantIds, id]);
    }
  };

  const handleIssueCertificates = async () => {
    if (selectedParticipantIds.length === 0) return;
    setLoading(true);
    try {
      await axios.post('/api/certificates/bulk-generate', {
        participantIds: selectedParticipantIds,
        projectId: selectedProjectId,
        clientId: selectedClientId,
        trainingId: selectedTrainingId,
        batchName,
        templateId: selectedTemplate,
        signatoryName,
        signatoryDesignation,
        trainerName,
        includeTrainerSignature,
        includeCompanySeal,
        sealPosition
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to issue certificates', err);
      alert('Failed to issue certificates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper labels
  const selectedProjectObj = projects.find(p => p.id === selectedProjectId);
  const selectedTrainingObj = trainings.find(t => t.id === selectedTrainingId);
  const sampleParticipant = evaluatedParticipants.find(p => selectedParticipantIds.includes(p.id)) || evaluatedParticipants[0] || { name: 'Raj Kumar', attendancePercentage: 95, assessmentScore: 88 };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11,18,32,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, backdropFilter: 'blur(6px)' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', width: '94%', maxWidth: '880px', height: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
              Certificate Creation & Issuance Wizard
            </h3>
            <p style={{ margin: '2px 0 0 0', color: '#64748B', fontSize: '0.78rem' }}>
              Automated, data-driven credentialing for trained participants
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
          {[
            { num: 1, label: 'Training Context', icon: <Building size={14} /> },
            { num: 2, label: 'Participants & Eligibility', icon: <Users size={14} /> },
            { num: 3, label: 'Template & Signatures', icon: <Settings size={14} /> },
            { num: 4, label: 'Review & Issue', icon: <Eye size={14} /> }
          ].map((s) => (
            <div 
              key={s.num} 
              onClick={() => { if (s.num < step) setStep(s.num); }}
              style={{
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: `2.5px solid ${step === s.num ? '#2563EB' : step > s.num ? '#10B981' : 'transparent'}`,
                background: step === s.num ? '#FFFFFF' : 'transparent',
                color: step === s.num ? '#2563EB' : step > s.num ? '#10B981' : '#64748B',
                fontWeight: step === s.num ? 700 : 600,
                fontSize: '0.78rem',
                cursor: s.num < step ? 'pointer' : 'default'
              }}
            >
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: step === s.num ? '#2563EB' : step > s.num ? '#10B981' : '#CBD5E1',
                color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800
              }}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Step Content Arena */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#FFFFFF' }}>
          
          {/* ─── STEP 1: TRAINING CONTEXT ─── */}
          {step === 1 && (
            <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', padding: '12px 16px', borderRadius: '10px', fontSize: '0.82rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#2563EB" /> Select the training program and batch. All participant attendance and quiz metrics will automatically link.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Project</label>
                <select 
                  value={selectedProjectId} 
                  onChange={e => setSelectedProjectId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '0.88rem', fontWeight: 600 }}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.client_name ? `(${p.client_name})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Client</label>
                <select 
                  value={selectedClientId} 
                  onChange={e => setSelectedClientId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '0.88rem', fontWeight: 600 }}
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  {clients.length === 0 && <option value="unilever">Unilever International</option>}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Training Program</label>
                <select 
                  value={selectedTrainingId} 
                  onChange={e => setSelectedTrainingId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '0.88rem', fontWeight: 600 }}
                >
                  {trainings.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.type})</option>
                  ))}
                  {trainings.length === 0 && <option value="default">Retail Excellence & Promoter Mastery</option>}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Training Batch Name</label>
                  <input 
                    type="text" 
                    value={batchName} 
                    onChange={e => setBatchName(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Trainer</label>
                  <input 
                    type="text" 
                    value={trainerName} 
                    onChange={e => setTrainerName(e.target.value)}
                    placeholder="Trainer Name"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: PARTICIPANTS & ELIGIBILITY ─── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Configurable Rules Bar */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={16} color="#2563EB" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Eligibility Criteria:</span>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '0.78rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#334155' }}>
                    Min Attendance:
                    <input 
                      type="number" 
                      min="0" max="100" 
                      value={minAttendance} 
                      onChange={e => setMinAttendance(e.target.value)}
                      style={{ width: '54px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #CBD5E1', textAlign: 'center', fontWeight: 700 }}
                    />%
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#334155' }}>
                    Min Score:
                    <input 
                      type="number" 
                      min="0" max="100" 
                      value={minScore} 
                      onChange={e => setMinScore(e.target.value)}
                      style={{ width: '54px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #CBD5E1', textAlign: 'center', fontWeight: 700 }}
                    />%
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#334155' }}>
                    Completion:
                    <input 
                      type="number" 
                      min="0" max="100" 
                      value={minCompletion} 
                      onChange={e => setMinCompletion(e.target.value)}
                      style={{ width: '54px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #CBD5E1', textAlign: 'center', fontWeight: 700 }}
                    />%
                  </label>
                </div>

                <button 
                  onClick={handleSelectAllEligible}
                  style={{ padding: '6px 14px', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <CheckCircle2 size={14} /> Select All Eligible ({evaluatedParticipants.filter(p => p.isEligible).length})
                </button>
              </div>

              {/* Participants Roster Table */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                      <th style={{ padding: '10px 14px', width: '40px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedParticipantIds.length > 0 && selectedParticipantIds.length === evaluatedParticipants.filter(p => p.isEligible).length}
                          onChange={e => {
                            if (e.target.checked) handleSelectAllEligible();
                            else setSelectedParticipantIds([]);
                          }}
                        />
                      </th>
                      <th style={{ padding: '10px 14px' }}>Participant</th>
                      <th style={{ padding: '10px 14px' }}>Employee ID</th>
                      <th style={{ padding: '10px 14px' }}>Attendance</th>
                      <th style={{ padding: '10px 14px' }}>Assessment Score</th>
                      <th style={{ padding: '10px 14px' }}>Completion</th>
                      <th style={{ padding: '10px 14px' }}>Eligibility Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluatedParticipants.map(p => {
                      const isSelected = selectedParticipantIds.includes(p.id);
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9', background: isSelected ? 'rgba(37,99,235,0.04)' : '#FFFFFF' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <input 
                              type="checkbox" 
                              disabled={!p.isEligible}
                              checked={isSelected}
                              onChange={() => handleToggleParticipant(p.id)}
                            />
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>
                            {p.name}
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', fontWeight: 500 }}>{p.designation}</span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>{p.employee_id}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: p.attendancePercentage >= minAttendance ? '#10B981' : '#EF4444' }}>
                            {p.attendancePercentage}%
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: p.assessmentScore >= minScore ? '#10B981' : '#EF4444' }}>
                            {p.assessmentScore}%
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: p.completionPercentage >= minCompletion ? '#10B981' : '#EF4444' }}>
                            {p.completionPercentage}%
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {p.isEligible ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.12)', color: '#065F46', border: '1px solid #10B981', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800 }}>
                                🟢 Eligible
                              </span>
                            ) : (
                              <span title={p.ineligibilityReason} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239,68,68,0.12)', color: '#991B1B', border: '1px solid #EF4444', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, cursor: 'help' }}>
                                🔴 Below Threshold
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748B', padding: '0 4px' }}>
                <span>Selected: <strong style={{ color: '#2563EB' }}>{selectedParticipantIds.length}</strong> of {evaluatedParticipants.length} total participants</span>
                <span>{evaluatedParticipants.filter(p => !p.isEligible).length} ineligible participants excluded</span>
              </div>

            </div>
          )}

          {/* ─── STEP 3: TEMPLATE & SIGNATURES ─── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
                  Select Corporate Certificate Template
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  
                  {/* Template 1 */}
                  <div 
                    onClick={() => setSelectedTemplate('corporate')}
                    style={{
                      border: `2px solid ${selectedTemplate === 'corporate' ? '#2563EB' : '#E2E8F0'}`,
                      borderRadius: '12px', padding: '16px', cursor: 'pointer',
                      background: selectedTemplate === 'corporate' ? 'rgba(37,99,235,0.04)' : '#FFFFFF',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ height: '70px', background: '#FFFFFF', border: '1.5px solid #0B1220', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#0B1220', letterSpacing: '1px' }}>CORPORATE EXCELLENCE</span>
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>Corporate Excellence</h4>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>White/Ivory canvas with Midnight Navy & Gold accents.</p>
                  </div>

                  {/* Template 2 */}
                  <div 
                    onClick={() => setSelectedTemplate('retail_excellence')}
                    style={{
                      border: `2px solid ${selectedTemplate === 'retail_excellence' ? '#2563EB' : '#E2E8F0'}`,
                      borderRadius: '12px', padding: '16px', cursor: 'pointer',
                      background: selectedTemplate === 'retail_excellence' ? 'rgba(37,99,235,0.04)' : '#FFFFFF',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ height: '70px', background: '#EFF6FF', border: '2px solid #1D4ED8', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#1D4ED8', letterSpacing: '1px' }}>RETAIL EXCELLENCE</span>
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>Retail Excellence</h4>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>Royal Blue modern styling for store promoters & advisors.</p>
                  </div>

                  {/* Template 3 */}
                  <div 
                    onClick={() => setSelectedTemplate('premium_achievement')}
                    style={{
                      border: `2px solid ${selectedTemplate === 'premium_achievement' ? '#2563EB' : '#E2E8F0'}`,
                      borderRadius: '12px', padding: '16px', cursor: 'pointer',
                      background: selectedTemplate === 'premium_achievement' ? 'rgba(37,99,235,0.04)' : '#FFFFFF',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ height: '70px', background: '#0B1220', border: '1.5px solid #F59E0B', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#F59E0B', letterSpacing: '1px' }}>PREMIUM ACHIEVEMENT</span>
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>Premium Achievement</h4>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>Dark Navy & Gold distinction for supervisor & trainer tracks.</p>
                  </div>

                </div>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
                  Authorized Signatories & Seal Configuration
                </label>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '14px', fontSize: '0.82rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={includeTrainerSignature} 
                      onChange={e => setIncludeTrainerSignature(e.target.checked)} 
                    />
                    <span style={{ fontWeight: 600 }}>Include Trainer Signature Block</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={includeCompanySeal} 
                      onChange={e => setIncludeCompanySeal(e.target.checked)} 
                    />
                    <span style={{ fontWeight: 600 }}>Include Official Idonneous Seal</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>Primary Lead Assessor / Trainer Name</label>
                    <input 
                      type="text" 
                      value={trainerName} 
                      onChange={e => setTrainerName(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>Executive Signatory Name & Title</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={signatoryName} 
                        onChange={e => setSignatoryName(e.target.value)}
                        placeholder="Name"
                        style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '0.85rem' }}
                      />
                      <input 
                        type="text" 
                        value={signatoryDesignation} 
                        onChange={e => setSignatoryDesignation(e.target.value)}
                        placeholder="Designation"
                        style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 4: REVIEW & ISSUE ─── */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Summary Stats Banner */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Issuing Batch</span>
                  <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>{batchName}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Certificates to Generate</span>
                  <strong style={{ fontSize: '1.1rem', color: '#2563EB' }}>{selectedParticipantIds.length} Verified Credentials</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Template</span>
                  <strong style={{ fontSize: '0.95rem', color: '#0F172A', textTransform: 'capitalize' }}>{selectedTemplate.replace('_', ' ')}</strong>
                </div>
              </div>

              {/* Certificate Live Mockup Preview (Exact Reference Design) */}
              <div style={{ background: '#0B132B', padding: '16px', borderRadius: '14px', display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: '100%', maxWidth: '720px', aspectRatio: '1.414 / 1',
                  background: '#081226', padding: '8px', borderRadius: '12px', position: 'relative', overflow: 'hidden',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}>
                  {/* Inner White Canvas with Gold Border */}
                  <div style={{
                    width: '100%', height: '100%', background: '#FFFFFF', borderRadius: '8px',
                    border: '1.5px solid #C5A059', position: 'relative', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}>
                    
                    {/* Top-Right Polygon Geometry */}
                    <svg viewBox="0 0 300 300" style={{ position: 'absolute', top: 0, right: 0, width: '220px', height: '220px', pointerEvents: 'none', zIndex: 1 }} fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M 80 0 L 300 0 L 300 220 Z" fill="#0B1A38" opacity="0.95"/>
                      <path d="M 140 0 L 300 0 L 300 160 Z" fill="#142C54" opacity="0.85"/>
                      <path d="M 200 0 L 300 0 L 300 100 Z" fill="#1E3A8A" opacity="0.75"/>
                      <line x1="80" y1="0" x2="300" y2="220" stroke="#C5A059" strokeWidth="2"/>
                    </svg>

                    {/* 3D Gold Ribbon Medallion Seal Badge */}
                    {includeCompanySeal && (
                      <div style={{ position: 'absolute', top: '14px', right: '44px', width: '80px', height: '96px', zIndex: 10, filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.35))' }}>
                        <img 
                          src="/assets/seals/retailedge_pro_gold_seal.svg" 
                          alt="Gold Seal Medallion" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={e => { e.target.src = '/assets/seals/idonneous_official_seal.svg'; }}
                        />
                      </div>
                    )}

                    {/* Canvas Body Content */}
                    <div style={{ padding: '16px 20px 6px 20px', position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      
                      {/* Top Bar: Brand & Certificate ID */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '5px', background: 'linear-gradient(135deg, #00D2FF 0%, #0072FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 900, fontSize: '13px' }}>
                            R
                          </div>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#081226', lineHeight: 1.1 }}>
                              RetailEdge <span style={{ color: '#0072FF', fontWeight: 900 }}>PRO</span>
                            </div>
                            <div style={{ fontSize: '0.52rem', fontWeight: 700, color: '#64748B' }}>
                              Trainer-Led Learning & Performance Platform
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', marginRight: '95px' }}>
                          <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.8px' }}>CERTIFICATE ID</div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#081226' }}>RETP-2025-05-000245</div>
                          <div style={{ width: '20px', height: '2px', background: '#0072FF', marginLeft: 'auto', marginTop: '2px' }}></div>
                        </div>
                      </div>

                      {/* Center Title Block */}
                      <div style={{ textAlign: 'center', margin: '1px 0' }}>
                        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', fontWeight: 900, color: '#081226', letterSpacing: '2px', margin: 0, textTransform: 'uppercase' }}>
                          CERTIFICATE
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '1px 0 0 0' }}>
                          <div style={{ width: '30px', height: '1px', background: '#C5A059' }}></div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#C5A059', letterSpacing: '1.5px' }}>OF COMPLETION</div>
                          <div style={{ width: '30px', height: '1px', background: '#C5A059' }}></div>
                        </div>
                      </div>

                      {/* Recipient Block */}
                      <div style={{ textAlign: 'left', marginTop: '1px' }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.8px' }}>THIS IS TO CERTIFY THAT</div>
                        <div style={{ fontFamily: 'cursive', fontSize: '1.65rem', color: '#081226', lineHeight: 1.15, margin: '1px 0' }}>
                          {sampleParticipant.name}
                        </div>
                        <div style={{ width: '240px', height: '1.5px', background: 'linear-gradient(90deg, #C5A059 0%, #E5C07B 60%, transparent 100%)', marginBottom: '4px' }}></div>
                      </div>

                      {/* Mid Section: Statement & Side Details Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#475569', lineHeight: 1.35 }}>
                          <div>has successfully completed the training program</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1D4ED8', margin: '2px 0 3px 0' }}>
                            {selectedTrainingObj?.title || 'Product Knowledge – Cetaphil'}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#64748B' }}>
                            and has demonstrated the required knowledge and skills through training, assessment and evaluation.
                          </div>
                        </div>

                        {/* Right-Side Metrics Stack */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderLeft: '1px solid #E2E8F0', paddingLeft: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#081226', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px' }}>📖</div>
                            <div>
                              <div style={{ fontSize: '0.48rem', fontWeight: 800, color: '#64748B' }}>PROGRAM</div>
                              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#081226' }}>{selectedTrainingObj?.type || 'Product Knowledge'}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#081226', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px' }}>📅</div>
                            <div>
                              <div style={{ fontSize: '0.48rem', fontWeight: 800, color: '#64748B' }}>COMPLETION DATE</div>
                              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#081226' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#081226', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px' }}>🏆</div>
                            <div>
                              <div style={{ fontSize: '0.48rem', fontWeight: 800, color: '#64748B' }}>SCORE / GRADE</div>
                              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#081226' }}>92% (Excellent)</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Lower Section: Signatures & QR Code */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
                        
                        {/* Authorized Signatory Block */}
                        <div style={{ width: '150px' }}>
                          <div style={{ height: '28px', display: 'flex', alignItems: 'center' }}>
                            <img 
                              src="/assets/signatures/amit_kumar_signature.svg" 
                              alt="Signature" 
                              style={{ maxHeight: '26px', maxWidth: '110px', objectFit: 'contain' }}
                              onError={e => { e.target.src = '/assets/signatures/mohit_tiku_signature.svg'; }}
                            />
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#081226', margin: '1px 0 0 0' }}>{signatoryName || 'Amit Kumar'}</div>
                          <div style={{ fontSize: '0.56rem', fontWeight: 600, color: '#475569' }}>{signatoryDesignation || 'Program Manager'}</div>
                          <div style={{ fontSize: '0.52rem', color: '#64748B' }}>Idonneous Marketing Services Pvt. Ltd.</div>
                        </div>

                        {/* QR Code Block */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '42px', height: '42px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '5px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <QrCode size={34} color="#081226" />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#081226' }}>VERIFY CERTIFICATE</div>
                            <div style={{ fontSize: '0.48rem', color: '#64748B' }}>Scan QR code or visit</div>
                            <div style={{ fontSize: '0.52rem', fontWeight: 700, color: '#0072FF' }}>retailedgepro.com/verify</div>
                          </div>
                        </div>

                      </div>

                    </div>

                    {/* Bottom Ribbon Footer Bar */}
                    <div style={{ width: '100%', height: '26px', background: '#081226', borderTop: '1px solid #C5A059', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px' }}>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.46rem', fontWeight: 700, color: '#E2E8F0', textTransform: 'uppercase' }}>
                        <span>👥 TRAINER CONTROLLED</span>
                        <span>▶️ LIVE TRAINING</span>
                        <span>📋 ASSESSMENTS</span>
                        <span>🎖️ CERTIFICATION</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.5px' }}>IDONNEOUS</div>
                        <div style={{ fontSize: '0.44rem', color: '#00D2FF' }}>www.idonneous.com</div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Wizard Footer Navigation */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
          {step > 1 ? (
            <button 
              onClick={() => setStep(step - 1)}
              style={{ padding: '8px 18px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', color: '#334155', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={onClose}
              style={{ padding: '8px 18px', background: 'transparent', border: '1px solid #CBD5E1', borderRadius: '8px', color: '#64748B', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>

            {step < 4 ? (
              <button 
                onClick={() => setStep(step + 1)}
                disabled={step === 2 && selectedParticipantIds.length === 0}
                style={{ padding: '8px 22px', background: '#2563EB', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 700, cursor: (step === 2 && selectedParticipantIds.length === 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button 
                onClick={handleIssueCertificates}
                disabled={loading || selectedParticipantIds.length === 0}
                style={{ padding: '8px 24px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
              >
                <ShieldCheck size={16} /> {loading ? 'Issuing...' : `Issue ${selectedParticipantIds.length} Certificates`}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
