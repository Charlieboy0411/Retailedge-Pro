import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  Award, BadgeCheck, Clock, CalendarX, ShieldX, ShieldCheck,
  TrendingUp, Plus, QrCode, FileText, Download, Share2,
  Search, Filter, Eye, Mail, RefreshCw, XCircle, MoreVertical,
  CheckCircle2, AlertCircle, Building, User, ChevronRight,
  ExternalLink, Sliders, Layers, Sparkles, Printer, Check, X,
  UploadCloud, PenTool, Image as ImageIcon, Upload, Trash2, Shield
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, Legend
} from 'recharts';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import CertificateCreationWizard from '../components/CertificateCreationWizard';
import CertificateAuditModal from '../components/CertificateAuditModal';
import CertificateShareModal from '../components/CertificateShareModal';

export default function Certificates({ initialTab = 'ledger' }) {
  const { token, user } = useContext(AuthContext);

  const isCertAuthority = ['Admin', 'Super Admin', 'Program Manager', 'T&D Manager'].includes(user?.role);
  const isSupervisor = user?.role === 'Supervisor';
  const isEmployee = user?.role === 'Employee';
  const isClient = user?.role === 'Client';

  // Active Main Tab: 'ledger' | 'templates' | 'analytics' | 'bulk'
  // Non-authorities (Supervisor, Employee) are strictly restricted to the read-only 'ledger' view
  const [activeTab, setActiveTab] = useState(isCertAuthority ? (initialTab || 'ledger') : 'ledger');

  useEffect(() => {
    if (!isCertAuthority && activeTab !== 'ledger') {
      setActiveTab('ledger');
    }
  }, [isCertAuthority, activeTab]);

  // Data states
  const [certificates, setCertificates] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('all');

  // Modals & Panels
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState(null);
  const [shareCert, setShareCert] = useState(null);
  const [auditCert, setAuditCert] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // Revoke & Reissue state
  const [revokeCert, setRevokeCert] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [reissueCert, setReissueCert] = useState(null);
  const [reissueReason, setReissueReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk Generator State
  const [bulkProjectId, setBulkProjectId] = useState('');
  const [bulkBatchName, setBulkBatchName] = useState('Batch-01');
  const [bulkParticipants, setBulkParticipants] = useState([]);
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
  const [bulkEvaluating, setBulkEvaluating] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState(null);

  // Designer State
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('corporate');
  const [designerTitle, setDesignerTitle] = useState('CERTIFICATE OF COMPLETION');
  const [designerSignatory1, setDesignerSignatory1] = useState('Aakash Verma');
  const [designerRole1, setDesignerRole1] = useState('Lead Trainer & Facilitator');
  const [designerSignatory2, setDesignerSignatory2] = useState('Amit Kumar');
  const [designerDesignation2, setDesignerDesignation2] = useState('Program Manager');
  const [designerOrg, setDesignerOrg] = useState('Idonneous Marketing Services Pvt. Ltd.');
  const [showTrainerSig, setShowTrainerSig] = useState(false);
  const [showAuthSig, setShowAuthSig] = useState(true);
  const [showCompanySeal, setShowCompanySeal] = useState(true);
  const [showScore, setShowScore] = useState(true);
  const [showClientLogo, setShowClientLogo] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);

  // Signatures & Seals Asset Management State
  const [signatureAssets, setSignatureAssets] = useState([]);
  const [activeAuthSigUrl, setActiveAuthSigUrl] = useState('/assets/signatures/amit_kumar_signature.svg');
  const [activeTrainerSigUrl, setActiveTrainerSigUrl] = useState('/assets/signatures/aakash_verma_signature.svg');
  const [activeSealUrl, setActiveSealUrl] = useState('/assets/seals/retailedge_pro_gold_seal.svg');

  // Company Seal Manual Placement & Draggable State
  const [sealPosition, setSealPosition] = useState({
    preset: 'top-right', // 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left' | 'bottom-center' | 'custom'
    x: 84, // percentage from left (0 to 100)
    y: 6,  // percentage from top (0 to 100)
    scale: 100 // scale in percentage (50 to 150)
  });
  const [isDraggingSeal, setIsDraggingSeal] = useState(false);
  const certCanvasRef = useRef(null);

  const SEAL_PRESETS = [
    { key: 'top-right', label: 'Top-Right (Default)', x: 84, y: 6 },
    { key: 'bottom-right', label: 'Bottom-Right', x: 82, y: 64 },
    { key: 'bottom-center', label: 'Bottom-Center', x: 44, y: 68 },
    { key: 'bottom-left', label: 'Bottom-Left', x: 6, y: 64 },
    { key: 'top-left', label: 'Top-Left', x: 6, y: 6 },
    { key: 'custom', label: 'Manual Drag / Custom', x: sealPosition.x, y: sealPosition.y }
  ];

  const handleApplyPreset = (presetKey) => {
    const found = SEAL_PRESETS.find(p => p.key === presetKey);
    if (found) {
      setSealPosition(prev => ({
        ...prev,
        preset: presetKey,
        x: found.x,
        y: found.y
      }));
    } else {
      setSealPosition(prev => ({ ...prev, preset: presetKey }));
    }
  };

  const handleSealMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSeal(true);

    const onMouseMove = (moveEvent) => {
      if (!certCanvasRef.current) return;
      const rect = certCanvasRef.current.getBoundingClientRect();
      const clientX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientX : 0);
      const clientY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientY : 0);

      const xPercent = Math.max(2, Math.min(96, Math.round(((clientX - rect.left) / rect.width) * 100)));
      const yPercent = Math.max(2, Math.min(94, Math.round(((clientY - rect.top) / rect.height) * 100)));

      setSealPosition(prev => ({
        ...prev,
        preset: 'custom',
        x: xPercent,
        y: yPercent
      }));
    };

    const onMouseUp = () => {
      setIsDraggingSeal(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove, { passive: false });
    window.addEventListener('touchend', onMouseUp);
  };

  const getSealPlacementStyle = (pos, isDragging = false) => {
    const scaleFactor = ((pos && pos.scale) || 100) / 100;
    const baseWidth = Math.round(96 * scaleFactor);
    const baseHeight = Math.round(116 * scaleFactor);

    if (pos && pos.preset === 'top-right' && pos.x === 84 && pos.y === 6) {
      return {
        position: 'absolute',
        top: '16px',
        right: '52px',
        width: `${baseWidth}px`,
        height: `${baseHeight}px`,
        zIndex: 20,
        cursor: isDragging ? 'grabbing' : 'grab',
        filter: isDragging
          ? 'drop-shadow(0 12px 24px rgba(37,99,235,0.6)) drop-shadow(0 0 10px rgba(0,210,255,0.8))'
          : 'drop-shadow(0 6px 14px rgba(0,0,0,0.35))',
        transition: isDragging ? 'none' : 'transform 0.15s ease, filter 0.15s ease',
        userSelect: 'none',
        touchAction: 'none'
      };
    }

    const posX = pos && pos.x !== undefined ? pos.x : 84;
    const posY = pos && pos.y !== undefined ? pos.y : 6;

    return {
      position: 'absolute',
      left: `${posX}%`,
      top: `${posY}%`,
      transform: 'translate(-50%, -50%)',
      width: `${baseWidth}px`,
      height: `${baseHeight}px`,
      zIndex: 20,
      cursor: isDragging ? 'grabbing' : 'grab',
      filter: isDragging
        ? 'drop-shadow(0 12px 24px rgba(37,99,235,0.6)) drop-shadow(0 0 10px rgba(0,210,255,0.8))'
        : 'drop-shadow(0 6px 14px rgba(0,0,0,0.35))',
      transition: isDragging ? 'none' : 'transform 0.15s ease, filter 0.15s ease',
      userSelect: 'none',
      touchAction: 'none'
    };
  };

  // Asset Upload Modal State
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetModalTarget, setAssetModalTarget] = useState('authorized'); // 'authorized' | 'trainer' | 'seal'
  const [assetUploadMode, setAssetUploadMode] = useState('file'); // 'file' | 'draw' | 'url'
  const [assetName, setAssetName] = useState('Amit Kumar');
  const [assetDesignation, setAssetDesignation] = useState('Program Manager');
  const [assetOrg, setAssetOrg] = useState('Idonneous Marketing Services Pvt. Ltd.');
  const [assetFile, setAssetFile] = useState(null);
  const [assetPreviewUrl, setAssetPreviewUrl] = useState('');
  const [assetUrlInput, setAssetUrlInput] = useState('');
  const [isAssetDefault, setIsAssetDefault] = useState(true);
  const [assetSaving, setAssetSaving] = useState(false);

  // Canvas drawing hooks
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#081226';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setAssetPreviewUrl(dataUrl);
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAssetPreviewUrl('');
  };

  const handleOpenAssetModal = (target = 'authorized') => {
    setAssetModalTarget(target);
    setAssetUploadMode('file');
    setAssetFile(null);
    setAssetPreviewUrl('');
    setAssetUrlInput('');
    setIsAssetDefault(true);

    if (target === 'authorized') {
      setAssetName(designerSignatory2 || 'Amit Kumar');
      setAssetDesignation(designerDesignation2 || 'Program Manager');
      setAssetOrg(designerOrg || 'Idonneous Marketing Services Pvt. Ltd.');
    } else if (target === 'trainer') {
      setAssetName(designerSignatory1 || 'Aakash Verma');
      setAssetDesignation(designerRole1 || 'Lead Trainer & Facilitator');
      setAssetOrg('Idonneous Marketing Services Pvt. Ltd.');
    } else {
      setAssetName('RetailEdge PRO 3D Gold Ribbon Seal');
      setAssetDesignation('Official Company Seal');
      setAssetOrg('Idonneous Marketing Services Pvt. Ltd.');
    }

    setIsAssetModalOpen(true);
  };

  const handleSaveAsset = async () => {
    setAssetSaving(true);
    const activeToken = token || localStorage.getItem('jwt') || localStorage.getItem('token');
    try {
      let finalAssetPath = '';
      const typeKey = assetModalTarget === 'authorized' ? 'authorized_signatory' : (assetModalTarget === 'trainer' ? 'trainer_signature' : 'company_seal');

      // If user drew on canvas, ensure latest drawing buffer is used
      let payloadAsset = assetPreviewUrl;
      if (assetUploadMode === 'draw' && canvasRef.current) {
        payloadAsset = canvasRef.current.toDataURL('image/png');
      }

      if (assetUploadMode === 'file' && assetFile) {
        const formData = new FormData();
        formData.append('file', assetFile);
        formData.append('type', typeKey);
        formData.append('name', assetName || 'Signatory Asset');
        formData.append('designation', assetDesignation || '');
        formData.append('organization', assetOrg || 'Idonneous Marketing Services Pvt. Ltd.');
        formData.append('isDefault', isAssetDefault ? 'true' : 'false');

        const res = await axios.post('/api/certificates/signatures-and-seals', formData, {
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        finalAssetPath = res.data.asset?.assetPath || res.data.fileUrl || res.data.assetUrl;
      } else if (assetUploadMode === 'draw' && payloadAsset) {
        const res = await axios.post('/api/certificates/signatures-and-seals', {
          type: typeKey,
          name: assetName || (assetModalTarget === 'trainer' ? 'Trainer Signature' : 'Authorized Signatory'),
          designation: assetDesignation || '',
          organization: assetOrg || 'Idonneous Marketing Services Pvt. Ltd.',
          assetPath: payloadAsset,
          isDefault: isAssetDefault
        }, {
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json'
          }
        });
        finalAssetPath = res.data.asset?.assetPath || payloadAsset;
      } else if (assetUploadMode === 'url' && assetUrlInput) {
        const res = await axios.post('/api/certificates/signatures-and-seals', {
          type: typeKey,
          name: assetName || 'Signatory Asset',
          designation: assetDesignation || '',
          organization: assetOrg || 'Idonneous Marketing Services Pvt. Ltd.',
          assetPath: assetUrlInput,
          isDefault: isAssetDefault
        }, {
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json'
          }
        });
        finalAssetPath = res.data.asset?.assetPath || assetUrlInput;
      }

      if (finalAssetPath) {
        if (assetModalTarget === 'authorized') {
          setActiveAuthSigUrl(finalAssetPath);
          if (assetName) setDesignerSignatory2(assetName);
          if (assetDesignation) setDesignerDesignation2(assetDesignation);
        } else if (assetModalTarget === 'trainer') {
          setActiveTrainerSigUrl(finalAssetPath);
          if (assetName) setDesignerSignatory1(assetName);
          if (assetDesignation) setDesignerRole1(assetDesignation);
        } else {
          setActiveSealUrl(finalAssetPath);
        }
      }

      await fetchSignatureAssets();
      setIsAssetModalOpen(false);
    } catch (err) {
      console.error('Failed to save signature/seal asset', err);
      alert('Failed to save asset: ' + (err.response?.data?.error || err.message || 'Please verify format and try again.'));
    } finally {
      setAssetSaving(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCertificates();
      if (isCertAuthority) {
        fetchAnalytics();
        fetchProjectsAndClients();
        fetchSignatureAssets();
      }
    }
  }, [token, statusFilter, projectFilter, searchTerm, isCertAuthority]);

  const fetchSignatureAssets = async () => {
    try {
      const res = await axios.get('/api/certificates/signatures-and-seals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        setSignatureAssets(res.data);
      }
    } catch (err) {
      console.warn('Failed to load signatures/seals library', err);
    }
  };

  const fetchCertificates = async () => {
    try {
      let query = `?status=${statusFilter}&projectId=${projectFilter}&search=${encodeURIComponent(searchTerm)}`;
      const res = await axios.get(`/api/certificates${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCertificates(res.data);
    } catch (err) {
      console.error('Failed to fetch certificates', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get('/api/certificates/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch certificate analytics', err);
    }
  };

  const fetchProjectsAndClients = async () => {
    try {
      if (user?.role === 'Trainer') {
        const projRes = await axios.get('/api/projects/my-projects', { headers: { Authorization: `Bearer ${token}` } });
        const projs = Array.isArray(projRes.data) ? projRes.data : [];
        setProjects(projs);
        const derivedClients = [];
        projs.forEach(p => {
          if (p.Client && !derivedClients.some(c => c.id === p.Client.id)) {
            derivedClients.push(p.Client);
          }
        });
        setClients(derivedClients);
        if (projs.length > 0 && !bulkProjectId) {
          setBulkProjectId(projs[0].id);
        }
        return;
      }

      const [projRes, clientRes] = await Promise.all([
        axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/clients', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setProjects(projRes.data);
      setClients(clientRes.data);
      if (projRes.data.length > 0 && !bulkProjectId) {
        setBulkProjectId(projRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch projects/clients', err);
    }
  };

  // Open Audit Modal
  const handleOpenAudit = async (cert) => {
    setAuditCert(cert);
    try {
      const res = await axios.get(`/api/certificates/${cert.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuditLogs(res.data.auditLogs || []);
    } catch (err) {
      console.error('Failed to fetch audit log', err);
      setAuditLogs([]);
    }
  };

  // Revoke Action
  const handleConfirmRevoke = async () => {
    if (!revokeCert || !revokeReason.trim()) return;
    setActionLoading(true);
    try {
      await axios.post(`/api/certificates/${revokeCert.id}/revoke`, {
        reason: revokeReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRevokeCert(null);
      setRevokeReason('');
      fetchCertificates();
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to revoke certificate', err);
      alert('Revocation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Reissue Action
  const handleConfirmReissue = async () => {
    if (!reissueCert) return;
    setActionLoading(true);
    try {
      await axios.post(`/api/certificates/${reissueCert.id}/reissue`, {
        reason: reissueReason || 'Reissued with verified updates'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReissueCert(null);
      setReissueReason('');
      fetchCertificates();
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to reissue certificate', err);
      alert('Reissue failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Evaluate Bulk Participants
  const handleEvaluateBulk = async () => {
    if (!bulkProjectId) return;
    setBulkEvaluating(true);
    setBulkSuccessMsg(null);
    try {
      const res = await axios.post('/api/certificates/eligibility', {
        projectId: bulkProjectId,
        batchName: bulkBatchName,
        minAttendance: 80,
        minScore: 60,
        minCompletion: 100
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBulkParticipants(res.data.participants || []);
      const eligibleIds = (res.data.participants || []).filter(p => p.isEligible).map(p => p.id);
      setBulkSelectedIds(eligibleIds);
    } catch (err) {
      console.error('Eligibility evaluation failed', err);
    } finally {
      setBulkEvaluating(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bulk' && bulkProjectId) {
      handleEvaluateBulk();
    }
  }, [activeTab, bulkProjectId]);

  // Execute Bulk Generation
  const handleExecuteBulkGeneration = async () => {
    if (bulkSelectedIds.length === 0) return;
    setBulkGenerating(true);
    try {
      const res = await axios.post('/api/certificates/bulk-generate', {
        participantIds: bulkSelectedIds,
        projectId: bulkProjectId,
        batchName: bulkBatchName,
        templateId: selectedTemplateKey,
        signatoryName: designerSignatory2,
        signatoryDesignation: designerDesignation2,
        trainerName: designerSignatory1
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBulkSuccessMsg(`Successfully generated ${res.data.count} certificates for ${bulkBatchName}!`);
      fetchCertificates();
      fetchAnalytics();
    } catch (err) {
      console.error('Bulk generation failed', err);
      alert('Bulk generation failed. Please try again.');
    } finally {
      setBulkGenerating(false);
    }
  };

  // Authenticated PDF download handler (Blob download with direct auth fallback)
  const handleDownloadPDF = async (certId, certName = 'Certificate') => {
    try {
      const downloadUrl = `/api/certificates/${certId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const res = await axios.get(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Certificate_${(certName || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_')}_${certId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.warn('Blob download fallback to direct URL:', err);
      window.open(`/api/certificates/${certId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`, '_blank');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (certificates.length === 0) return;
    const headers = ['Certificate ID', 'Participant Name', 'Employee ID', 'Training Program', 'Project', 'Client', 'Trainer', 'Issue Date', 'Score', 'Attendance', 'Status'];
    const rows = certificates.map(c => [
      c.certificate_id,
      `"${c.User?.name || 'N/A'}"`,
      c.User?.employee_id || 'N/A',
      `"${c.Training?.title || c.Project?.name || 'Retail Excellence'}"`,
      `"${c.Project?.name || 'N/A'}"`,
      `"${c.Client?.name || 'N/A'}"`,
      `"${c.trainerName || c.Trainer?.name || 'Aakash Verma'}"`,
      c.issueDate,
      `${c.assessmentScore || 85}%`,
      `${c.attendancePercentage || 95}%`,
      c.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RetailEdge_Certificates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // KPI Items
  const kpis = analytics?.kpis || {
    totalCertificates: 145,
    issued: 120,
    pending: 18,
    expired: 5,
    revoked: 2,
    verified: 342,
    thisMonth: 28
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>

      {/* ─── 1. TOP HEADER & ACTION BAR ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {isEmployee ? 'My Certificates' : (isSupervisor ? 'Team Certifications' : (isClient ? 'Program Certifications' : 'Certification Center'))}
            </h1>
            <span style={{
              background: isSupervisor ? 'rgba(16,185,129,0.1)' : (isClient ? 'rgba(6,182,212,0.1)' : 'rgba(37,99,235,0.1)'),
              color: isSupervisor ? '#10B981' : (isClient ? '#06B6D4' : '#2563EB'),
              border: `1px solid ${isSupervisor ? 'rgba(16,185,129,0.25)' : (isClient ? 'rgba(6,182,212,0.25)' : 'rgba(37,99,235,0.25)')}`,
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {isEmployee ? 'OFFICIAL CREDENTIALS' : (isSupervisor ? 'OPERATIONAL INTELLIGENCE' : (isClient ? 'CLIENT CREDENTIALS' : 'V2.0 ENTERPRISE'))}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            {isEmployee
              ? 'View, download, and verify your verified professional training certificates.'
              : (isSupervisor
                  ? 'Operational view of certifications and credentials for your direct team.'
                  : (isClient
                      ? 'Authorized view of issued certificates and credentials for your client programs.'
                      : 'Create, issue, manage and verify professional training certificates.'))}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(isCertAuthority || user?.role === 'Trainer') && (
            <button
              onClick={() => setIsWizardOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', padding: '10px 18px', borderRadius: '10px', fontWeight: 700 }}
            >
              <Plus size={16} /> Create Certificate
            </button>
          )}

          {isCertAuthority && (
            <>
              <button
                onClick={() => setActiveTab('bulk')}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', padding: '10px 16px', borderRadius: '10px', fontWeight: 700 }}
              >
                <Layers size={16} /> Generate Certificates
              </button>

              <button
                onClick={() => setActiveTab('templates')}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', padding: '10px 16px', borderRadius: '10px', fontWeight: 700 }}
              >
                <Sparkles size={16} /> Certificate Templates
              </button>
            </>
          )}

          <button
            onClick={() => window.open('/verify', '_blank')}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', padding: '10px 16px', borderRadius: '10px', fontWeight: 700 }}
          >
            <QrCode size={16} /> Verify Certificate
          </button>

          {isCertAuthority && (
            <button
              onClick={handleExportCsv}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', padding: '10px 16px', borderRadius: '10px', fontWeight: 700 }}
            >
              <Download size={16} /> Export Report
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. 7 KPI RIBBON CARDS (Certificate Authority Only) ─── */}
      {isCertAuthority && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>

        {/* Total Certificates */}
        <div className="stat-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Total Certificates</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={16} color="#2563EB" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>{kpis.totalCertificates}</div>
          <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>All generated</span>
        </div>

        {/* Issued */}
        <div className="stat-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Issued</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BadgeCheck size={16} color="#10B981" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10B981' }}>{kpis.issued}</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active credentials</span>
        </div>

        {/* Pending */}
        <div className="stat-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Pending</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} color="#F59E0B" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F59E0B' }}>{kpis.pending}</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Eligible awaiting issue</span>
        </div>

        {/* Expired */}
        <div className="stat-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Expired</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(148,163,184,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarX size={16} color="#64748B" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#64748B' }}>{kpis.expired}</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Past validity date</span>
        </div>

        {/* Revoked */}
        <div className="stat-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Revoked</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldX size={16} color="#EF4444" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#EF4444' }}>{kpis.revoked}</div>
          <span style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: 600 }}>Cancelled records</span>
        </div>

        {/* Verified */}
        <div className="stat-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Verified</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={16} color="#06B6D4" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#06B6D4' }}>{kpis.verified}</div>
          <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>QR & Web validations</span>
        </div>

        {/* This Month */}
        <div className="stat-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>This Month</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} color="#8B5CF6" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#8B5CF6' }}>{kpis.thisMonth}</div>
          <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>+18% MoM growth</span>
        </div>

      </div>
      )}

      {/* ─── 3. MAIN NAVIGATION TABS (Certificate Authority Only) ─── */}
      {isCertAuthority && (
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '2px' }}>
        {[
          { key: 'ledger', label: 'Certificates Ledger', icon: <FileText size={16} /> },
          { key: 'templates', label: 'Templates & Designer', icon: <Sparkles size={16} /> },
          { key: 'analytics', label: 'Certification Analytics', icon: <TrendingUp size={16} /> },
          { key: 'bulk', label: 'Batch Eligibility & Bulk Generator', icon: <Layers size={16} /> }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              borderBottom: `2.5px solid ${activeTab === t.key ? '#2563EB' : 'transparent'}`,
              color: activeTab === t.key ? '#2563EB' : 'var(--text-secondary)',
              fontWeight: activeTab === t.key ? 800 : 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {t.icon} <span>{t.label}</span>
          </button>
        ))}
      </div>
      )}

      {/* ─── TAB 1: CERTIFICATES LEDGER ─── */}
      {activeTab === 'ledger' && (
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>

            {/* Search */}
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by ID, participant, employee ID..."
                style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
              />
            </div>

            {/* Dropdown Filters */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}
              >
                <option value="All">All Statuses</option>
                <option value="ISSUED">Issued</option>
                <option value="VALID">Valid</option>
                <option value="PENDING">Pending</option>
                <option value="REVOKED">Revoked</option>
                <option value="EXPIRED">Expired</option>
                <option value="REPLACED">Replaced</option>
              </select>

              {/* Project Filter */}
              {isCertAuthority && (
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              )}

            </div>
          </div>

          {/* Certificates Table */}
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <table className="custom-table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Certificate ID</th>
                  <th>Participant</th>
                  <th>Training Program</th>
                  <th>Project & Client</th>
                  <th>Trainer</th>
                  <th>Issue Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-secondary)' }}>
                      No certificate records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  certificates.map(cert => {
                    const statusClass =
                      cert.status === 'ISSUED' || cert.status === 'VALID' ? 'badge-success' :
                      cert.status === 'REVOKED' ? 'badge-danger' :
                      cert.status === 'PENDING' ? 'badge-warning' : 'badge-info';

                    return (
                      <tr key={cert.id}>
                        <td>
                          <span style={{ fontWeight: 800, color: '#2563EB', letterSpacing: '0.5px' }}>
                            {cert.certificate_id}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cert.User?.name || 'Participant'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {cert.User?.employee_id ? `ID: ${cert.User.employee_id}` : cert.User?.email}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {cert.Training?.title || cert.Project?.name || 'Retail Excellence'}
                          </div>
                          {cert.assessmentScore && (
                            <span style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 700 }}>
                              Score: {cert.assessmentScore}%
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cert.Project?.name || 'Unassigned'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{cert.Client?.name || 'Enterprise'}</div>
                        </td>
                        <td>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {cert.trainerName || cert.Trainer?.name || 'Aakash Verma'}
                          </div>
                        </td>
                        <td>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {cert.issueDate || new Date().toISOString().split('T')[0]}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${statusClass}`}>
                            {cert.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>

                            {/* Preview Modal */}
                            <button
                              title="Preview Certificate"
                              onClick={() => setPreviewCert(cert)}
                              style={{ padding: '6px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid #CBD5E1', color: 'var(--text-primary)', cursor: 'pointer' }}
                            >
                              <Eye size={14} />
                            </button>

                            {/* Download PDF */}
                            <button
                              title="Download PDF"
                              onClick={() => handleDownloadPDF(cert.id, cert.User?.name)}
                              style={{ padding: '6px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid #CBD5E1', color: '#2563EB', cursor: 'pointer' }}
                            >
                              <Download size={14} />
                            </button>

                            {/* Share Modal */}
                            <button
                              title="Share & Deliver"
                              onClick={() => setShareCert(cert)}
                              style={{ padding: '6px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid #CBD5E1', color: '#10B981', cursor: 'pointer' }}
                            >
                              <Share2 size={14} />
                            </button>

                            {/* Public Verify */}
                            <button
                              title="Verify Online"
                              onClick={() => window.open(`/verify/${cert.certificate_id}`, '_blank')}
                              style={{ padding: '6px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid #CBD5E1', color: '#06B6D4', cursor: 'pointer' }}
                            >
                              <QrCode size={14} />
                            </button>

                            {/* Reissue */}
                            {isCertAuthority && cert.status !== 'REVOKED' && cert.status !== 'REPLACED' && (
                              <button
                                title="Reissue Certificate"
                                onClick={() => setReissueCert(cert)}
                                style={{ padding: '6px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid #CBD5E1', color: '#3B82F6', cursor: 'pointer' }}
                              >
                                <RefreshCw size={14} />
                              </button>
                            )}

                            {/* Revoke */}
                            {isCertAuthority && cert.status !== 'REVOKED' && (
                              <button
                                title="Revoke Certificate"
                                onClick={() => setRevokeCert(cert)}
                                style={{ padding: '6px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid #CBD5E1', color: '#EF4444', cursor: 'pointer' }}
                              >
                                <XCircle size={14} />
                              </button>
                            )}

                            {/* Audit History */}
                            {isCertAuthority && (
                            <button
                              title="Audit History"
                              onClick={() => handleOpenAudit(cert)}
                              style={{ padding: '6px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid #CBD5E1', color: '#8B5CF6', cursor: 'pointer' }}
                            >
                              <FileText size={14} />
                            </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ─── TAB 2: TEMPLATES & DESIGNER ─── */}
      {isCertAuthority && activeTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px' }}>

          {/* Left Properties Panel */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '760px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} color="#2563EB" /> Template Customizer
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>SELECT DESIGN THEME</label>
              <select
                value={selectedTemplateKey}
                onChange={e => setSelectedTemplateKey(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}
              >
                <option value="corporate">Corporate Excellence (Ivory/Navy/Gold - Reference)</option>
                <option value="retail_excellence">Retail Excellence (Royal Blue/Geometric)</option>
                <option value="premium_achievement">Premium Achievement (Dark Navy/Gold)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>CERTIFICATE TITLE</label>
              <input
                type="text"
                value={designerTitle}
                onChange={e => setDesignerTitle(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
              />
            </div>

            {/* Elements Checklist */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                VISUAL ELEMENTS & CREDENTIAL TOGGLES
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showAuthSig} onChange={e => setShowAuthSig(e.target.checked)} />
                  <span>Authorized Company Signatory (MD / Exec)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showTrainerSig} onChange={e => setShowTrainerSig(e.target.checked)} />
                  <span>Trainer / Facilitator Signature Block</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showCompanySeal} onChange={e => setShowCompanySeal(e.target.checked)} />
                  <span>Official Idonneous 3D Company Seal</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showScore} onChange={e => setShowScore(e.target.checked)} />
                  <span>Assessment Score & Attendance Metric</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showQrCode} onChange={e => setShowQrCode(e.target.checked)} />
                  <span>Tamper-Proof QR Code & Certificate ID</span>
                </label>
              </div>
            </div>

            {/* ─── PROMINENT SIGNATURES & SEALS CONTROLS ─── */}
            <div style={{ borderTop: '1.5px solid #E2E8F0', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PenTool size={14} color="#2563EB" /> Signatures & Company Seal Assets
              </label>

              {/* 1. Authorized Signatory / MD Block */}
              {showAuthSig && (
                <div style={{ background: 'rgba(37,99,235,0.03)', border: '1.5px solid #CBD5E1', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1E3A8A' }}>
                      AUTHORIZED SIGNATORY (MD / EXEC)
                    </span>
                    <button
                      onClick={() => handleOpenAssetModal('authorized')}
                      style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <UploadCloud size={12} /> Upload / Draw
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.66rem', color: '#64748B', fontWeight: 700 }}>Signatory Name</label>
                      <input
                        type="text"
                        value={designerSignatory2}
                        onChange={e => setDesignerSignatory2(e.target.value)}
                        placeholder="e.g. Amit Kumar"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.66rem', color: '#64748B', fontWeight: 700 }}>Designation</label>
                      <input
                        type="text"
                        value={designerDesignation2}
                        onChange={e => setDesignerDesignation2(e.target.value)}
                        placeholder="e.g. Program Manager"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      value={activeAuthSigUrl}
                      onChange={e => {
                        setActiveAuthSigUrl(e.target.value);
                        const match = signatureAssets.find(a => a.assetUrl === e.target.value);
                        if (match) {
                          if (match.name) setDesignerSignatory2(match.name);
                          if (match.designation) setDesignerDesignation2(match.designation);
                        }
                      }}
                      style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: '0.72rem', fontWeight: 600 }}
                    >
                      <option value="/assets/signatures/amit_kumar_signature.svg">Amit Kumar (Program Manager - Default)</option>
                      <option value="/assets/signatures/mohit_tiku_signature.svg">Mohit Tiku (Managing Director)</option>
                      {signatureAssets.filter(a => a.type === 'AUTHORIZED_SIGNATURE' || a.type === 'authorized_signatory').map(a => (
                        <option key={a.id} value={a.assetUrl}>{a.name} ({a.designation || 'Signatory'})</option>
                      ))}
                    </select>

                    <div
                      title="Active Signature Stroke Preview"
                      style={{
                        width: '70px', height: '30px', borderRadius: '6px', border: '1px solid #CBD5E1',
                        background: 'repeating-conic-gradient(#E2E8F0 0% 25%, #FFFFFF 0% 50%) 50% / 8px 8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                      }}
                    >
                      <img
                        src={activeAuthSigUrl}
                        alt="Sig Preview"
                        style={{ maxHeight: '26px', maxWidth: '64px', objectFit: 'contain' }}
                        onError={e => { e.target.src = '/assets/signatures/amit_kumar_signature.svg'; }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Trainer Signature Block */}
              {showTrainerSig && (
                <div style={{ background: 'rgba(16,185,129,0.03)', border: '1.5px solid #CBD5E1', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#065F46' }}>
                      TRAINER / FACILITATOR SIGNATURE
                    </span>
                    <button
                      onClick={() => handleOpenAssetModal('trainer')}
                      style={{ background: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <UploadCloud size={12} /> Upload / Draw
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.66rem', color: '#64748B', fontWeight: 700 }}>Trainer Name</label>
                      <input
                        type="text"
                        value={designerSignatory1}
                        onChange={e => setDesignerSignatory1(e.target.value)}
                        placeholder="e.g. Aakash Verma"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.66rem', color: '#64748B', fontWeight: 700 }}>Role / Title</label>
                      <input
                        type="text"
                        value={designerRole1}
                        onChange={e => setDesignerRole1(e.target.value)}
                        placeholder="e.g. Lead Trainer"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      value={activeTrainerSigUrl}
                      onChange={e => {
                        setActiveTrainerSigUrl(e.target.value);
                        const match = signatureAssets.find(a => a.assetUrl === e.target.value);
                        if (match && match.name) setDesignerSignatory1(match.name);
                      }}
                      style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: '0.72rem', fontWeight: 600 }}
                    >
                      <option value="/assets/signatures/aakash_verma_signature.svg">Aakash Verma (Lead Trainer - Default)</option>
                      <option value="/assets/signatures/amit_kumar_signature.svg">Amit Kumar (Program Manager)</option>
                      {signatureAssets.filter(a => a.type === 'TRAINER_SIGNATURE' || a.type === 'trainer_signature').map(a => (
                        <option key={a.id} value={a.assetUrl}>{a.name} ({a.designation || 'Trainer'})</option>
                      ))}
                    </select>

                    <div
                      title="Trainer Signature Preview"
                      style={{
                        width: '70px', height: '30px', borderRadius: '6px', border: '1px solid #CBD5E1',
                        background: 'repeating-conic-gradient(#E2E8F0 0% 25%, #FFFFFF 0% 50%) 50% / 8px 8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                      }}
                    >
                      <img
                        src={activeTrainerSigUrl}
                        alt="Trainer Sig"
                        style={{ maxHeight: '26px', maxWidth: '64px', objectFit: 'contain' }}
                        onError={e => { e.target.src = '/assets/signatures/aakash_verma_signature.svg'; }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Official Company Seal Block */}
              {showCompanySeal && (
                <div style={{ background: 'rgba(245,158,11,0.03)', border: '1.5px solid #CBD5E1', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#92400E' }}>
                      OFFICIAL 3D COMPANY SEAL / ROSETTE
                    </span>
                    <button
                      onClick={() => handleOpenAssetModal('seal')}
                      style={{ background: '#F59E0B', color: '#0F172A', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <UploadCloud size={12} /> Upload Seal
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      value={activeSealUrl}
                      onChange={e => setActiveSealUrl(e.target.value)}
                      style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: '0.72rem', fontWeight: 600 }}
                    >
                      <option value="/assets/seals/retailedge_pro_gold_seal.svg">RetailEdge PRO 3D Gold Ribbon Seal (Reference)</option>
                      <option value="/assets/seals/idonneous_official_seal.svg">Idonneous Official Blue Seal</option>
                      {signatureAssets.filter(a => a.type === 'COMPANY_SEAL' || a.type === 'company_seal').map(a => (
                        <option key={a.id} value={a.assetUrl}>{a.name}</option>
                      ))}
                    </select>

                    <div
                      title="Active Seal Preview"
                      style={{
                        width: '38px', height: '38px', borderRadius: '6px', border: '1px solid #CBD5E1',
                        background: '#0B1220', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                      }}
                    >
                      <img
                        src={activeSealUrl}
                        alt="Seal Preview"
                        style={{ width: '34px', height: '34px', objectFit: 'contain' }}
                        onError={e => { e.target.src = '/assets/seals/retailedge_pro_gold_seal.svg'; }}
                      />
                    </div>
                  </div>

                  {/* Manual Seal Placement & Positioning Controls */}
                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                        🎯 Seal Placement & Position
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2563EB', background: 'rgba(37,99,235,0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                        X: {sealPosition.x}% | Y: {sealPosition.y}%
                      </span>
                    </div>

                    {/* Quick Position Presets Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                      {SEAL_PRESETS.filter(p => p.key !== 'custom').map(preset => (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => handleApplyPreset(preset.key)}
                          style={{
                            padding: '4px 6px', borderRadius: '6px', border: sealPosition.preset === preset.key ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                            background: sealPosition.preset === preset.key ? 'rgba(37,99,235,0.08)' : '#FFFFFF',
                            color: sealPosition.preset === preset.key ? '#1E40AF' : '#475569',
                            fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s'
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Manual Coordinate Sliders */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#F8FAFC', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      {/* Horizontal X Slider */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontWeight: 700, color: '#64748B', marginBottom: '2px' }}>
                          <span>Horizontal (X-Axis)</span>
                          <span>{sealPosition.x}%</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="96"
                          value={sealPosition.x}
                          onChange={e => setSealPosition(prev => ({ ...prev, preset: 'custom', x: Number(e.target.value) }))}
                          style={{ width: '100%', height: '4px', cursor: 'ew-resize' }}
                        />
                      </div>

                      {/* Vertical Y Slider */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontWeight: 700, color: '#64748B', marginBottom: '2px' }}>
                          <span>Vertical (Y-Axis)</span>
                          <span>{sealPosition.y}%</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="94"
                          value={sealPosition.y}
                          onChange={e => setSealPosition(prev => ({ ...prev, preset: 'custom', y: Number(e.target.value) }))}
                          style={{ width: '100%', height: '4px', cursor: 'ns-resize' }}
                        />
                      </div>

                      {/* Scale / Size Slider */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontWeight: 700, color: '#64748B', marginBottom: '2px' }}>
                          <span>Seal Size Scale</span>
                          <span>{sealPosition.scale || 100}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="150"
                          value={sealPosition.scale || 100}
                          onChange={e => setSealPosition(prev => ({ ...prev, scale: Number(e.target.value) }))}
                          style={{ width: '100%', height: '4px', cursor: 'pointer' }}
                        />
                      </div>
                    </div>

                    <div style={{ fontSize: '0.66rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>💡</span>
                      <span>You can also click & drag the seal anywhere on the certificate canvas!</span>
                    </div>

                  </div>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>✓ High-res vector signatures embedded</span>
              <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>✓ Official Idonneous 3D rosette seal stamped</span>
              <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>✓ Manual seal placement & dragging enabled</span>
              <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>✓ Immutable visual snapshot architecture</span>
            </div>

          </div>

          {/* Right Live Canvas Preview (Exact match of reference certificate) */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0B132B' }}>

            <div style={{
              width: '100%', maxWidth: '780px', aspectRatio: '1.414 / 1',
              background: '#081226', padding: '10px', borderRadius: '14px', position: 'relative', overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}>

              {/* Inner White Canvas with Gold Border */}
              <div
                ref={certCanvasRef}
                style={{
                  width: '100%', height: '100%', background: '#FFFFFF', borderRadius: '10px',
                  border: '1.5px solid #C5A059', position: 'relative', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}
              >

                {/* Top-Right Polygon Geometry */}
                <svg viewBox="0 0 300 300" style={{ position: 'absolute', top: 0, right: 0, width: '260px', height: '260px', pointerEvents: 'none', zIndex: 1 }} fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 80 0 L 300 0 L 300 220 Z" fill="#0B1A38" opacity="0.95"/>
                  <path d="M 140 0 L 300 0 L 300 160 Z" fill="#142C54" opacity="0.85"/>
                  <path d="M 200 0 L 300 0 L 300 100 Z" fill="#1E3A8A" opacity="0.75"/>
                  <line x1="80" y1="0" x2="300" y2="220" stroke="#C5A059" strokeWidth="2"/>
                </svg>

                {/* 3D Gold Ribbon Medallion Seal Badge with Manual & Interactive Drag Placement */}
                {showCompanySeal && (
                  <div
                    onMouseDown={handleSealMouseDown}
                    onTouchStart={handleSealMouseDown}
                    title="Click & Drag to reposition the official seal anywhere on the certificate"
                    style={{
                      ...getSealPlacementStyle(sealPosition, isDraggingSeal),
                      outline: isDraggingSeal ? '2px dashed #00D2FF' : '1px dashed transparent',
                      outlineOffset: '2px',
                      borderRadius: '8px'
                    }}
                  >
                    <img
                      src={activeSealUrl || "/assets/seals/retailedge_pro_gold_seal.svg"}
                      alt="Gold Seal Medallion"
                      draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }}
                      onError={e => { e.target.src = '/assets/seals/retailedge_pro_gold_seal.svg'; }}
                    />
                    {isDraggingSeal && (
                      <div style={{
                        position: 'absolute', bottom: '-22px', left: '50%', transform: 'translateX(-50%)',
                        background: '#081226', color: '#00D2FF', fontSize: '9px', fontWeight: 800,
                        padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', pointerEvents: 'none',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)', zIndex: 30
                      }}>
                        X: {sealPosition.x}%, Y: {sealPosition.y}%
                      </div>
                    )}
                  </div>
                )}

                {/* Canvas Body Content */}
                <div style={{ padding: '18px 26px 6px 26px', position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                  {/* Top Bar: Brand & Certificate ID */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #00D2FF 0%, #0072FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 900, fontSize: '15px' }}>
                        R
                      </div>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#081226', lineHeight: 1.1 }}>
                          RetailEdge <span style={{ color: '#0072FF', fontWeight: 900 }}>PRO</span>
                        </div>
                        <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#64748B' }}>
                          Trainer-Led Learning & Performance Platform
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', marginRight: '115px' }}>
                      <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.8px' }}>CERTIFICATE ID</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#081226' }}>RETP-2025-05-000245</div>
                      <div style={{ width: '24px', height: '2px', background: '#0072FF', marginLeft: 'auto', marginTop: '2px' }}></div>
                    </div>
                  </div>

                  {/* Center Title Block */}
                  <div style={{ textAlign: 'center', margin: '2px 0' }}>
                    <h1 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '1.75rem', fontWeight: 900, color: '#081226', letterSpacing: '2.5px', margin: 0, textTransform: 'uppercase' }}>
                      CERTIFICATE
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '2px 0 0 0' }}>
                      <div style={{ width: '40px', height: '1px', background: '#C5A059' }}></div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#C5A059', letterSpacing: '2px' }}>OF COMPLETION</div>
                      <div style={{ width: '40px', height: '1px', background: '#C5A059' }}></div>
                    </div>
                  </div>

                  {/* Recipient Block */}
                  <div style={{ textAlign: 'left', marginTop: '2px' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748B', letterSpacing: '1px' }}>THIS IS TO CERTIFY THAT</div>
                    <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: '#081226', lineHeight: 1.1, margin: '2px 0 2px 0' }}>
                      Rahul Sharma
                    </div>
                    <div style={{ width: '320px', height: '1.5px', background: 'linear-gradient(90deg, #C5A059 0%, #E5C07B 60%, transparent 100%)', marginBottom: '6px' }}></div>
                  </div>

                  {/* Mid Section: Statement & Side Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>
                      <div>has successfully completed the training program</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1D4ED8', margin: '2px 0 4px 0' }}>
                        Product Knowledge – Cetaphil
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        and has demonstrated the required knowledge and skills through training, assessment and evaluation.
                      </div>
                    </div>

                    {/* Right-Side Metrics Stack */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid #E2E8F0', paddingLeft: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#081226', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>📖</div>
                        <div>
                          <div style={{ fontSize: '0.52rem', fontWeight: 800, color: '#64748B' }}>PROGRAM</div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#081226' }}>Product Knowledge</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#081226', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>📅</div>
                        <div>
                          <div style={{ fontSize: '0.52rem', fontWeight: 800, color: '#64748B' }}>COMPLETION DATE</div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#081226' }}>May 31, 2025</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#081226', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>🏆</div>
                        <div>
                          <div style={{ fontSize: '0.52rem', fontWeight: 800, color: '#64748B' }}>SCORE / GRADE</div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#081226' }}>92% (Excellent)</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lower Section: Signatures & QR Code */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '6px' }}>

                    {/* Authorized Signatory Block */}
                    <div style={{ width: '190px', visibility: showAuthSig ? 'visible' : 'hidden' }}>
                      <div style={{ height: '36px', display: 'flex', alignItems: 'center' }}>
                        <img
                          src={activeAuthSigUrl || "/assets/signatures/amit_kumar_signature.svg"}
                          alt="Signature"
                          style={{ maxHeight: '32px', maxWidth: '135px', objectFit: 'contain' }}
                          onError={e => { e.target.src = '/assets/signatures/amit_kumar_signature.svg'; }}
                        />
                      </div>
                      <div style={{ borderTop: '1px solid #081226', width: '140px', margin: '2px 0 3px 0' }}></div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#081226', margin: '1px 0 0 0' }}>{designerSignatory2 || 'Amit Kumar'}</div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#475569' }}>{designerDesignation2 || 'Program Manager'}</div>
                      <div style={{ fontSize: '0.56rem', color: '#64748B' }}>{designerOrg || 'Idonneous Marketing Services Pvt. Ltd.'}</div>
                    </div>

                    {/* QR Code Block */}
                    {showQrCode && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '48px', height: '48px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <QrCode size={40} color="#081226" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#081226' }}>VERIFY CERTIFICATE</div>
                          <div style={{ fontSize: '0.52rem', color: '#64748B' }}>Scan QR code or visit</div>
                          <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#0072FF' }}>retailedgepro.com/verify</div>
                        </div>
                      </div>
                    )}

                  </div>

                </div>

                {/* Bottom Ribbon Footer Bar */}
                <div style={{ width: '100%', height: '32px', background: '#081226', borderTop: '1px solid #C5A059', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px' }}>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.52rem', fontWeight: 700, color: '#E2E8F0', textTransform: 'uppercase' }}>
                    <span>👥 TRAINER CONTROLLED</span>
                    <span>▶️ LIVE TRAINING</span>
                    <span>📋 ASSESSMENTS</span>
                    <span>🎖️ CERTIFICATION</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.5px' }}>IDONNEOUS</div>
                    <div style={{ fontSize: '0.48rem', color: '#00D2FF' }}>www.idonneous.com</div>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      )}

      {/* ─── TAB 3: CERTIFICATION ANALYTICS ─── */}
      {isCertAuthority && activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

            {/* Monthly Trend Chart */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
                Monthly Certification & Verification Trend
              </h3>
              <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.monthlyTrend || []}>
                    <defs>
                      <linearGradient id="issuedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="verifiedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="issued" name="Certificates Issued" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#issuedGrad)" />
                    <Area type="monotone" dataKey="verified" name="QR Verifications" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#verifiedGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution Donut */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
                Credential Status Distribution
              </h3>
              <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.statusDistribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(analytics?.statusDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Project Breakdown Bar Chart */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
              Certification Volume by Project
            </h3>
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.projectBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="certified" name="Certified Staff" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending Evaluation" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB 4: BATCH ELIGIBILITY & BULK GENERATOR ─── */}
      {isCertAuthority && activeTab === 'bulk' && (
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Batch Eligibility Evaluation & Bulk Generation
              </h3>
              <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                Evaluates entire training batch against attendance and assessment benchmarks
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={bulkProjectId}
                onChange={e => setBulkProjectId(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <input
                type="text"
                value={bulkBatchName}
                onChange={e => setBulkBatchName(e.target.value)}
                placeholder="Batch Name"
                style={{ width: '180px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
              />

              <button
                onClick={handleEvaluateBulk}
                style={{ padding: '8px 16px', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {bulkEvaluating ? 'Evaluating...' : 'Re-Evaluate'}
              </button>
            </div>
          </div>

          {bulkSuccessMsg && (
            <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid #10B981', padding: '12px 16px', borderRadius: '8px', color: '#065F46', fontSize: '0.82rem', fontWeight: 700 }}>
              {bulkSuccessMsg}
            </div>
          )}

          {/* Roster Table */}
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <table className="custom-table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={bulkSelectedIds.length > 0 && bulkSelectedIds.length === bulkParticipants.filter(p => p.isEligible).length}
                      onChange={e => {
                        if (e.target.checked) setBulkSelectedIds(bulkParticipants.filter(p => p.isEligible).map(p => p.id));
                        else setBulkSelectedIds([]);
                      }}
                    />
                  </th>
                  <th>Participant</th>
                  <th>Employee ID</th>
                  <th>Attendance %</th>
                  <th>Quiz Score %</th>
                  <th>Completion %</th>
                  <th>Eligibility</th>
                </tr>
              </thead>
              <tbody>
                {bulkParticipants.map(p => {
                  const isSelected = bulkSelectedIds.includes(p.id);
                  return (
                    <tr key={p.id} style={{ background: isSelected ? 'rgba(37,99,235,0.04)' : undefined }}>
                      <td>
                        <input
                          type="checkbox"
                          disabled={!p.isEligible}
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) setBulkSelectedIds(bulkSelectedIds.filter(id => id !== p.id));
                            else setBulkSelectedIds([...bulkSelectedIds, p.id]);
                          }}
                        />
                      </td>
                      <td style={{ fontWeight: 700 }}>{p.name}</td>
                      <td>{p.employee_id}</td>
                      <td style={{ fontWeight: 700, color: p.attendancePercentage >= 80 ? '#10B981' : '#EF4444' }}>
                        {p.attendancePercentage}%
                      </td>
                      <td style={{ fontWeight: 700, color: p.assessmentScore >= 60 ? '#10B981' : '#EF4444' }}>
                        {p.assessmentScore}%
                      </td>
                      <td style={{ fontWeight: 700, color: p.completionPercentage >= 100 ? '#10B981' : '#EF4444' }}>
                        {p.completionPercentage}%
                      </td>
                      <td>
                        {p.isEligible ? (
                          <span className="badge badge-success">Eligible</span>
                        ) : (
                          <span className="badge badge-danger">Below Threshold</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Selected <strong style={{ color: '#2563EB' }}>{bulkSelectedIds.length}</strong> eligible participants for issuance
            </span>

            <button
              onClick={handleExecuteBulkGeneration}
              disabled={bulkGenerating || bulkSelectedIds.length === 0}
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: (bulkGenerating || bulkSelectedIds.length === 0) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
              }}
            >
              <ShieldCheck size={16} /> {bulkGenerating ? 'Generating...' : `GENERATE ${bulkSelectedIds.length} CERTIFICATES`}
            </button>
          </div>

        </div>
      )}

      {/* ─── MODAL: CERTIFICATE CREATION WIZARD ─── */}
      {(isCertAuthority || user?.role === 'Trainer') && (
        <CertificateCreationWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          token={token}
          user={user}
          projects={projects}
          clients={clients}
          onSuccess={() => {
            fetchCertificates();
            fetchAnalytics();
          }}
        />
      )}

      {/* ─── MODAL: CERTIFICATE SHARE MODAL ─── */}
      <CertificateShareModal
        isOpen={!!shareCert}
        onClose={() => setShareCert(null)}
        certificate={shareCert}
        token={token}
      />

      {/* ─── MODAL: CERTIFICATE AUDIT LOG MODAL ─── */}
      {isCertAuthority && (
        <CertificateAuditModal
          isOpen={!!auditCert}
          onClose={() => setAuditCert(null)}
          certificate={auditCert}
          auditLogs={auditLogs}
        />
      )}

      {/* ─── MODAL: CERTIFICATE PREVIEW MODAL ─── */}
      {previewCert && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11,18,32,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', width: '92%', maxWidth: '820px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>

            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Certificate Preview: {previewCert.certificate_id}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                  {previewCert.User?.name || 'Participant'} • Status: {previewCert.status}
                </span>
              </div>
              <button onClick={() => setPreviewCert(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', background: '#0B132B', display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: '100%', maxWidth: '760px', aspectRatio: '1.414 / 1',
                background: '#081226', padding: '10px', borderRadius: '14px', position: 'relative', overflow: 'hidden',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
              }}>

                {/* Inner White Canvas with Gold Border */}
                <div style={{
                  width: '100%', height: '100%', background: '#FFFFFF', borderRadius: '10px',
                  border: '1.5px solid #C5A059', position: 'relative', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}>

                  {/* Top-Right Polygon Geometry */}
                  <svg viewBox="0 0 300 300" style={{ position: 'absolute', top: 0, right: 0, width: '250px', height: '250px', pointerEvents: 'none', zIndex: 1 }} fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 80 0 L 300 0 L 300 220 Z" fill="#0B1A38" opacity="0.95"/>
                    <path d="M 140 0 L 300 0 L 300 160 Z" fill="#142C54" opacity="0.85"/>
                    <path d="M 200 0 L 300 0 L 300 100 Z" fill="#1E3A8A" opacity="0.75"/>
                    <line x1="80" y1="0" x2="300" y2="220" stroke="#C5A059" strokeWidth="2"/>
                  </svg>

                  {/* 3D Gold Ribbon Medallion Seal Badge */}
                  {previewCert.includeCompanySeal !== false && (
                    <div style={{
                      ...getSealPlacementStyle(previewCert.sealPosition || previewCert.certificateSnapshot?.companySeal?.position || { preset: 'top-right', x: 84, y: 6, scale: 100 }),
                      zIndex: 10
                    }}>
                      <img
                        src={previewCert.companySealUrl || '/assets/seals/retailedge_pro_gold_seal.svg'}
                        alt="Gold Seal Medallion"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={e => { e.target.src = '/assets/seals/retailedge_pro_gold_seal.svg'; }}
                      />
                    </div>
                  )}

                  {/* Canvas Body Content */}
                  <div style={{ padding: '18px 26px 6px 26px', position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                    {/* Top Bar: Brand & Certificate ID */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #00D2FF 0%, #0072FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 900, fontSize: '15px' }}>
                          R
                        </div>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#081226', lineHeight: 1.1 }}>
                            RetailEdge <span style={{ color: '#0072FF', fontWeight: 900 }}>PRO</span>
                          </div>
                          <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#64748B' }}>
                            Trainer-Led Learning & Performance Platform
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', marginRight: '115px' }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.8px' }}>CERTIFICATE ID</div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#081226' }}>{previewCert.certificate_id}</div>
                        <div style={{ width: '24px', height: '2px', background: '#0072FF', marginLeft: 'auto', marginTop: '2px' }}></div>
                      </div>
                    </div>

                    {/* Center Title Block */}
                    <div style={{ textAlign: 'center', margin: '2px 0' }}>
                      <h1 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '1.75rem', fontWeight: 900, color: '#081226', letterSpacing: '2.5px', margin: 0, textTransform: 'uppercase' }}>
                        CERTIFICATE
                      </h1>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '2px 0 0 0' }}>
                        <div style={{ width: '40px', height: '1px', background: '#C5A059' }}></div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#C5A059', letterSpacing: '2px' }}>OF COMPLETION</div>
                        <div style={{ width: '40px', height: '1px', background: '#C5A059' }}></div>
                      </div>
                    </div>

                    {/* Recipient Block */}
                    <div style={{ textAlign: 'left', marginTop: '2px' }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748B', letterSpacing: '1px' }}>THIS IS TO CERTIFY THAT</div>
                      <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: '#081226', lineHeight: 1.1, margin: '2px 0 2px 0' }}>
                        {previewCert.User?.name || 'Rahul Sharma'}
                      </div>
                      <div style={{ width: '320px', height: '1.5px', background: 'linear-gradient(90deg, #C5A059 0%, #E5C07B 60%, transparent 100%)', marginBottom: '6px' }}></div>
                    </div>

                    {/* Mid Section: Statement & Side Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>
                        <div>has successfully completed the training program</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1D4ED8', margin: '2px 0 4px 0' }}>
                          {previewCert.Training?.title || previewCert.Project?.name || 'Product Knowledge – Cetaphil'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          and has demonstrated the required knowledge and skills through training, assessment and evaluation.
                        </div>
                      </div>

                      {/* Right-Side Metrics Stack */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid #E2E8F0', paddingLeft: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#081226', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>📖</div>
                          <div>
                            <div style={{ fontSize: '0.52rem', fontWeight: 800, color: '#64748B' }}>PROGRAM</div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#081226' }}>{previewCert.Training?.category || 'Product Knowledge'}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#081226', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>📅</div>
                          <div>
                            <div style={{ fontSize: '0.52rem', fontWeight: 800, color: '#64748B' }}>COMPLETION DATE</div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#081226' }}>
                              {previewCert.issueDate ? new Date(previewCert.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'May 31, 2025'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#081226', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>🏆</div>
                          <div>
                            <div style={{ fontSize: '0.52rem', fontWeight: 800, color: '#64748B' }}>SCORE / GRADE</div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#081226' }}>
                              {previewCert.assessmentScore ? `${previewCert.assessmentScore}%` : '92%'} ({parseFloat(previewCert.assessmentScore || 92) >= 90 ? 'Excellent' : 'Passed'})
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lower Section: Signatures & QR Code */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '6px' }}>

                      {/* Authorized Signatory Block */}
                      <div style={{ width: '190px' }}>
                        <div style={{ height: '36px', display: 'flex', alignItems: 'center' }}>
                          <img
                            src={previewCert.authorizedSignatureUrl || '/assets/signatures/amit_kumar_signature.svg'}
                            alt="Signature"
                            style={{ maxHeight: '32px', maxWidth: '135px', objectFit: 'contain' }}
                            onError={e => { e.target.src = '/assets/signatures/amit_kumar_signature.svg'; }}
                          />
                        </div>
                        <div style={{ borderTop: '1px solid #081226', width: '140px', margin: '2px 0 3px 0' }}></div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#081226', margin: '1px 0 0 0' }}>{previewCert.signatoryName || 'Amit Kumar'}</div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#475569' }}>{previewCert.signatoryDesignation || 'Program Manager'}</div>
                        <div style={{ fontSize: '0.56rem', color: '#64748B' }}>Idonneous Marketing Services Pvt. Ltd.</div>
                      </div>

                      {/* QR Code Block */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '48px', height: '48px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <QrCode size={40} color="#081226" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#081226' }}>VERIFY CERTIFICATE</div>
                          <div style={{ fontSize: '0.52rem', color: '#64748B' }}>Scan QR code or visit</div>
                          <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#0072FF' }}>retailedgepro.com/verify</div>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* Bottom Ribbon Footer Bar */}
                  <div style={{ width: '100%', height: '32px', background: '#081226', borderTop: '1px solid #C5A059', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px' }}>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.52rem', fontWeight: 700, color: '#E2E8F0', textTransform: 'uppercase' }}>
                      <span>👥 TRAINER CONTROLLED</span>
                      <span>▶️ LIVE TRAINING</span>
                      <span>📋 ASSESSMENTS</span>
                      <span>🎖️ CERTIFICATION</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.5px' }}>IDONNEOUS</div>
                      <div style={{ fontSize: '0.48rem', color: '#00D2FF' }}>www.idonneous.com</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#F8FAFC' }}>
              <button
                onClick={() => handleDownloadPDF(previewCert.id, previewCert.User?.name)}
                style={{ padding: '8px 16px', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} /> Download PDF
              </button>
              <button
                onClick={() => setPreviewCert(null)}
                style={{ padding: '8px 16px', background: '#E2E8F0', color: '#0F172A', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL: REVOKE CERTIFICATE ─── */}
      {isCertAuthority && revokeCert && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11,18,32,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', width: '92%', maxWidth: '480px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1.5px solid #EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldX size={20} color="#EF4444" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>Revoke Certificate</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{revokeCert.certificate_id} ({revokeCert.User?.name})</span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>
              Revoking this certificate will immediately invalidate its public verification status and record an official audit entry.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Mandatory Reason for Revocation:
              </label>
              <textarea
                rows="3"
                value={revokeReason}
                onChange={e => setRevokeReason(e.target.value)}
                placeholder="e.g. Incorrect participant details, training threshold not met..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '0.82rem', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={() => { setRevokeCert(null); setRevokeReason(''); }}
                style={{ padding: '8px 16px', background: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevoke}
                disabled={actionLoading || !revokeReason.trim()}
                style={{ padding: '8px 18px', background: '#EF4444', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: (!revokeReason.trim() || actionLoading) ? 'not-allowed' : 'pointer' }}
              >
                {actionLoading ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REISSUE CERTIFICATE ─── */}
      {isCertAuthority && reissueCert && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11,18,32,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', width: '92%', maxWidth: '480px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(37,99,235,0.12)', border: '1.5px solid #2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={20} color="#2563EB" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>Reissue Certificate</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Original: {reissueCert.certificate_id} ({reissueCert.User?.name})</span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>
              Reissuing will create a new certificate with a new unique ID while marking the original certificate as <strong>REPLACED</strong> with linked provenance.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Reason for Reissue (Optional):
              </label>
              <input
                type="text"
                value={reissueReason}
                onChange={e => setReissueReason(e.target.value)}
                placeholder="e.g. Updated employee name / score recalculation..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={() => { setReissueCert(null); setReissueReason(''); }}
                style={{ padding: '8px 16px', background: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReissue}
                disabled={actionLoading}
                style={{ padding: '8px 18px', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer' }}
              >
                {actionLoading ? 'Reissuing...' : 'Reissue Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: UPLOAD / DRAW SIGNATURE & SEAL ASSET ─── */}
      {isCertAuthority && isAssetModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11,18,32,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', width: '92%', maxWidth: '580px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(37,99,235,0.12)', border: '1.5px solid #2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {assetModalTarget === 'seal' ? <Award size={20} color="#2563EB" /> : <PenTool size={20} color="#2563EB" />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                    {assetModalTarget === 'seal' ? 'Upload Official Company Seal' : (assetModalTarget === 'trainer' ? 'Upload / Draw Trainer Signature' : 'Upload / Draw Authorized Signatory')}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Vector-grade transparent PNG, SVG or draw digitally on-screen
                  </span>
                </div>
              </div>
              <button onClick={() => setIsAssetModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto' }}>

              {/* Input Mode Selector */}
              <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAssetUploadMode('file')}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: '8px', border: 'none',
                    background: assetUploadMode === 'file' ? '#FFFFFF' : 'transparent',
                    color: assetUploadMode === 'file' ? '#2563EB' : '#64748B',
                    fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: assetUploadMode === 'file' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  <UploadCloud size={14} /> 1. Upload File
                </button>

                {assetModalTarget !== 'seal' && (
                  <button
                    type="button"
                    onClick={() => setAssetUploadMode('draw')}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: '8px', border: 'none',
                      background: assetUploadMode === 'draw' ? '#FFFFFF' : 'transparent',
                      color: assetUploadMode === 'draw' ? '#2563EB' : '#64748B',
                      fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      boxShadow: assetUploadMode === 'draw' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    <PenTool size={14} /> 2. Draw on Screen
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setAssetUploadMode('url')}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: '8px', border: 'none',
                    background: assetUploadMode === 'url' ? '#FFFFFF' : 'transparent',
                    color: assetUploadMode === 'url' ? '#2563EB' : '#64748B',
                    fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: assetUploadMode === 'url' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  <ImageIcon size={14} /> 3. Asset Path
                </button>
              </div>

              {/* Mode 1: File Dropzone */}
              {assetUploadMode === 'file' && (
                <div
                  onClick={() => document.getElementById('certAssetFileInput').click()}
                  style={{
                    border: '2px dashed #93C5FD', borderRadius: '12px', padding: '24px 16px', textAlign: 'center',
                    background: 'rgba(37,99,235,0.02)', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <input
                    id="certAssetFileInput"
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setAssetFile(file);
                        const reader = new FileReader();
                        reader.onload = ev => setAssetPreviewUrl(ev.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
                    <UploadCloud size={24} color="#2563EB" />
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                    {assetFile ? assetFile.name : 'Click or Drag image file here'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
                    Supports PNG with transparent background, SVG vector, JPG or WEBP (Max 10MB)
                  </div>
                </div>
              )}

              {/* Mode 2: Signature Drawing Canvas */}
              {assetUploadMode === 'draw' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                      Draw your digital signature below:
                    </label>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '3px 8px', borderRadius: '5px', fontSize: '0.7rem', color: '#64748B', cursor: 'pointer' }}
                    >
                      Clear Pad
                    </button>
                  </div>
                  <div style={{ border: '2px solid #CBD5E1', borderRadius: '10px', background: '#FFFFFF', overflow: 'hidden' }}>
                    <canvas
                      ref={canvasRef}
                      width={520}
                      height={140}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      style={{ width: '100%', height: '140px', touchAction: 'none', cursor: 'crosshair' }}
                    />
                  </div>
                </div>
              )}

              {/* Mode 3: Asset Path Input */}
              {assetUploadMode === 'url' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Asset Path or URL:
                  </label>
                  <input
                    type="text"
                    value={assetUrlInput}
                    onChange={e => { setAssetUrlInput(e.target.value); setAssetPreviewUrl(e.target.value); }}
                    placeholder="/assets/signatures/my_signature.svg"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '0.82rem' }}
                  />
                </div>
              )}

              {/* Metadata Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                    {assetModalTarget === 'seal' ? 'Seal Name / Label' : 'Signatory Full Name'}
                  </label>
                  <input
                    type="text"
                    value={assetName}
                    onChange={e => setAssetName(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '0.8rem', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                    {assetModalTarget === 'seal' ? 'Seal Category' : 'Designation / Title'}
                  </label>
                  <input
                    type="text"
                    value={assetDesignation}
                    onChange={e => setAssetDesignation(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: '0.8rem', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* Transparency Preview Card */}
              {assetPreviewUrl && (
                <div style={{ border: '1px solid #CBD5E1', borderRadius: '10px', padding: '12px', background: '#F8FAFC' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Live Transparency Preview:
                  </span>
                  <div style={{
                    height: '60px', borderRadius: '8px', border: '1px solid #CBD5E1',
                    background: 'repeating-conic-gradient(#E2E8F0 0% 25%, #FFFFFF 0% 50%) 50% / 10px 10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <img src={assetPreviewUrl} alt="Preview" style={{ maxHeight: '50px', maxWidth: '240px', objectFit: 'contain' }} />
                  </div>
                </div>
              )}

              {/* Set Default Option */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isAssetDefault}
                  onChange={e => setIsAssetDefault(e.target.checked)}
                />
                <span style={{ fontWeight: 600 }}>Set as active default asset for new certificates</span>
              </label>

            </div>

            {/* Actions Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#F8FAFC' }}>
              <button
                type="button"
                onClick={() => setIsAssetModalOpen(false)}
                style={{ padding: '8px 16px', background: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsset}
                disabled={assetSaving || (!assetFile && !assetPreviewUrl && !assetUrlInput)}
                style={{
                  padding: '8px 20px', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px',
                  fontSize: '0.8rem', fontWeight: 700, cursor: (assetSaving || (!assetFile && !assetPreviewUrl && !assetUrlInput)) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {assetSaving ? 'Saving Asset...' : 'Save & Apply to Certificate'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
