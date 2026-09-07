import React, { useState, useEffect, useContext, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  Globe, Building2, Palette, Users, Shield, BookOpen, Radio, Bell,
  Award, BarChart2, Network, Lock, CreditCard, ClipboardList, Settings2,
  Save, Check, RefreshCw, Upload, Eye, EyeOff, ChevronRight, Zap,
  Server, Database, Wifi, AlertTriangle, Info, Download, Plus, Trash2,
  PenTool, Image, FileText, X
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const load = (key, def) => {
  try { return JSON.parse(localStorage.getItem(`qh_${key}`)) ?? def; }
  catch { return def; }
};
const save = (key, val) => localStorage.setItem(`qh_${key}`, JSON.stringify(val));

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ value, onChange, id }) {
  return (
    <label htmlFor={id} style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer', flexShrink: 0 }}>
      <input id={id} type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '12px', transition: 'all 0.2s',
        background: value ? 'linear-gradient(135deg,#2563EB,#60A5FA)' : 'var(--bg-tertiary)',
        border: `1.5px solid ${value ? 'var(--primary)' : 'var(--border-glass)'}`,
      }}>
        <span style={{
          position: 'absolute', left: value ? '22px' : '2px', top: '2px',
          width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-tertiary)',
          transition: 'left 0.2s', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)',
        }} />
      </span>
    </label>
  );
}

// ─── Setting Row ──────────────────────────────────────────────────────────────
function SettingRow({ label, desc, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-glass)' }}>
      <div style={{ flex: 1, paddingRight: '24px' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</div>
        {desc && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, desc }) {
  return (
    <div style={{ marginBottom: '28px', paddingBottom: '20px', borderBottom: '2px solid var(--border-glass)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,rgba(37,99,235,0.2),rgba(96,165,250,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
          {icon}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, fontFamily: 'Poppins,sans-serif', color: 'var(--text-primary)' }}>{title}</h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px' }}>{desc}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px',
  border: '1.5px solid var(--border-glass)', background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none',
  transition: 'border-color 0.2s', boxSizing: 'border-box',
};

// ─── Save Button ──────────────────────────────────────────────────────────────
function SaveBtn({ onClick, saved }) {
  return (
    <button onClick={onClick} style={{
      marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px',
      padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer',
      background: saved ? 'linear-gradient(135deg,#22C55E,#16A34A)' : 'linear-gradient(135deg,#2563EB,#60A5FA)',
      color: 'white', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'Poppins,sans-serif',
      boxShadow: saved ? '0 4px 14px rgba(34,197,94,0.3)' : '0 4px 14px rgba(37,99,235,0.3)',
      transition: 'all 0.3s',
    }}>
      {saved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
    </button>
  );
}

// ─── SECTIONS ─────────────────────────────────────────────────────────────────

function GeneralSettings() {
  const [form, setForm] = useState(load('general', {
    platformName: 'RetailEdge Pro', companyName: 'QuizHive LMS', supportEmail: 'support@quizhive.com',
    supportContact: '+91 98765 43210', websiteUrl: 'https://quizhive.com',
    timezone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY', language: 'English',
  }));
  const [saved, setSaved] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSave = () => { save('general', form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const field = (label, key, type = 'text') => (
    <div style={{ marginBottom: '18px' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <input type={type} value={form[key]} onChange={set(key)} style={inputStyle} />
    </div>
  );

  return (
    <div>
      <SectionHeader icon={<Globe size={22} />} title="General Settings" desc="Configure core platform information and regional preferences." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        {field('Platform Name', 'platformName')}
        {field('Company Name', 'companyName')}
        {field('Support Email', 'supportEmail', 'email')}
        {field('Support Contact', 'supportContact')}
        {field('Website URL', 'websiteUrl', 'url')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
        {['Timezone', 'Date Format', 'Language'].map((label, i) => {
          const key = ['timezone', 'dateFormat', 'language'][i];
          const opts = [
            ['Asia/Kolkata', 'Asia/Dubai', 'UTC', 'Europe/London', 'America/New_York'],
            ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
            ['English', 'Hindi', 'Arabic', 'French', 'Spanish'],
          ][i];
          return (
            <div key={key} style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
              <select value={form[key]} onChange={set(key)} style={{ ...inputStyle }}>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          );
        })}
      </div>
      <SaveBtn onClick={handleSave} saved={saved} />
    </div>
  );
}

function OrganizationSettings() {
  const [form, setForm] = useState(load('org', {
    orgName: 'RetailEdge Group', clientName: 'Unilever International',
    industry: 'FMCG / Retail', businessUnit: 'Sales & Distribution',
    deptStructure: 'Regional → Zone → Store', regionStructure: 'North, South, East, West',
    storeHierarchy: 'Region → City → Store',
  }));
  const [saved, setSaved] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSave = () => { save('org', form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div>
      <SectionHeader icon={<Building2 size={22} />} title="Organization Settings" desc="Manage client structure, hierarchy, and organizational mapping." />
      {[
        ['Organization Name', 'orgName'], ['Client Name', 'clientName'],
        ['Industry', 'industry'], ['Business Unit', 'businessUnit'],
        ['Department Structure', 'deptStructure'], ['Region Structure', 'regionStructure'],
        ['Store Hierarchy', 'storeHierarchy'],
      ].map(([label, key]) => (
        <div key={key} style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
          <input value={form[key]} onChange={set(key)} style={inputStyle} />
        </div>
      ))}
      <div style={{ padding: '16px', background: 'rgba(0,140,255,0.06)', borderRadius: '10px', border: '1px solid rgba(0,140,255,0.15)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <Info size={16} color="#2EA8FF" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Multi-client support is <strong style={{ color: '#2EA8FF' }}>enabled</strong>. Each client has isolated data, project allocation, and organizational mapping.
          </div>
        </div>
      </div>
      <SaveBtn onClick={handleSave} saved={saved} />
    </div>
  );
}

function BrandingSettings() {
  const [form, setForm] = useState(load('branding', {
    primaryColor: 'var(--primary)', secondaryColor: '#93C5FD',
    fontStyle: 'Poppins', welcomeMsg: 'Welcome to RetailEdge Pro Training Arena!',
    footerText: '© 2025 RetailEdge Pro · Powered by QuizHive LMS',
  }));
  const [saved, setSaved] = useState(false);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));
  const setE = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSave = () => { save('branding', form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div>
      <SectionHeader icon={<Palette size={22} />} title="Branding Settings" desc="Customize platform appearance, colors, and white-label branding." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {[
          { label: 'Company Logo', sub: '200×60px · PNG/SVG', icon: '🏢' },
          { label: 'Favicon', sub: '32×32px · ICO/PNG', icon: '🔖' },
          { label: 'Login Background', sub: '1920×1080px · JPG', icon: '🖼️' },
        ].map(({ label, sub, icon }) => (
          <div key={label} style={{ border: '2px dashed var(--border-glass)', borderRadius: '12px', padding: '28px 16px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-glass)'}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{icon}</div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>{sub}</div>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: '1.5px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
              <Upload size={13} /> Upload
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {[['Primary Color', 'primaryColor'], ['Secondary Color', 'secondaryColor']].map(([label, key]) => (
          <div key={key}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="color" value={form[key]} onChange={setE(key)} style={{ width: '44px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'none', padding: 0 }} />
              <input value={form[key]} onChange={setE(key)} style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }} />
            </div>
          </div>
        ))}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Font Style</label>
          <select value={form.fontStyle} onChange={setE('fontStyle')} style={inputStyle}>
            {['Poppins', 'Inter', 'Roboto', 'Outfit', 'Nunito', 'Open Sans'].map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Custom Welcome Message</label>
        <input value={form.welcomeMsg} onChange={setE('welcomeMsg')} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Custom Footer Text</label>
        <input value={form.footerText} onChange={setE('footerText')} style={inputStyle} />
      </div>

      <div style={{ padding: '16px 20px', background: `${form.primaryColor}12`, borderRadius: '12px', border: `1.5px solid ${form.primaryColor}40`, marginBottom: '20px' }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Live Preview</div>
        <div style={{ fontFamily: form.fontStyle + ', sans-serif', color: form.primaryColor, fontWeight: 800, fontSize: '1.1rem' }}>{form.welcomeMsg}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>{form.footerText}</div>
      </div>
      <SaveBtn onClick={handleSave} saved={saved} />
    </div>
  );
}

function UserManagementSettings() {
  const [form, setForm] = useState(load('usermgmt', {
    selfReg: false, otpLogin: true, emailLogin: true,
    mobileLogin: false, socialLogin: false,
  }));
  const [saved, setSaved] = useState(false);
  const toggle = k => v => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => { save('usermgmt', form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div>
      <SectionHeader icon={<Users size={22} />} title="User Management Settings" desc="Control user onboarding, authentication methods, and bulk upload options." />
      {[
        ['Self Registration', 'selfReg', 'Allow users to register without admin invite'],
        ['OTP Login', 'otpLogin', 'Enable one-time password login via SMS/Email'],
        ['Email Login', 'emailLogin', 'Allow users to log in with email & password'],
        ['Mobile Number Login', 'mobileLogin', 'Allow login via mobile number'],
        ['Social Login', 'socialLogin', 'Enable Google / Microsoft SSO login'],
      ].map(([label, key, desc]) => (
        <SettingRow key={key} label={label} desc={desc}>
          <Toggle value={form[key]} onChange={toggle(key)} id={`toggle-${key}`} />
        </SettingRow>
      ))}

      <div style={{ marginTop: '24px', marginBottom: '8px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={18} color='var(--primary)' /> Bulk User Upload
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {['Excel Upload (.xlsx)', 'CSV Upload (.csv)'].map(label => (
            <button key={label} style={{
              padding: '16px 20px', borderRadius: '12px', border: '2px dashed var(--border-glass)',
              background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              color: 'var(--text-secondary)',
            }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Download template → Fill → Upload</div>
            </button>
          ))}
        </div>
      </div>
      <SaveBtn onClick={handleSave} saved={saved} />
    </div>
  );
}

function RolesPermissions() {
  const modules = ['Users', 'Training', 'Quiz', 'Reports', 'Projects', 'Certificates', 'Settings'];
  const roles = ['Super Admin', 'Admin', 'Program Manager', 'Trainer', 'Client', 'Supervisor', 'T&D Manager'];
  const perms = ['View', 'Create', 'Edit', 'Delete'];


  const defaultMatrix = () => {
    const m = {};
    roles.forEach(r => {
      m[r] = {};
      modules.forEach(mod => {
        m[r][mod] = {
          View: true,
          Create: ['Super Admin', 'Admin', 'Program Manager', 'Trainer'].includes(r),
          Edit: ['Super Admin', 'Admin', 'Program Manager'].includes(r),
          Delete: ['Super Admin', 'Admin'].includes(r),
        };
      });
    });
    return m;
  };

  const [matrix, setMatrix] = useState(load('roles', defaultMatrix()));
  const [activeRole, setActiveRole] = useState('Super Admin');
  const [saved, setSaved] = useState(false);

  const toggle = (mod, perm) => {
    setMatrix(m => ({ ...m, [activeRole]: { ...m[activeRole], [mod]: { ...m[activeRole][mod], [perm]: !m[activeRole][mod]?.[perm] } } }));
  };
  const handleSave = () => { save('roles', matrix); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const roleColors = { 'Super Admin': 'var(--primary)', 'Admin': '#93C5FD', 'Program Manager': '#22C55E', 'Trainer': '#F59E0B', 'Client': 'var(--text-primary)', 'Supervisor': '#93C5FD', 'T&D Manager': '#F59E0B' };


  return (
    <div>
      <SectionHeader icon={<Shield size={22} />} title="Roles & Permissions" desc="Configure module-level access controls for each user role." />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {roles.map(r => (
          <button key={r} onClick={() => setActiveRole(r)} style={{
            padding: '8px 18px', borderRadius: '20px', border: `1.5px solid ${activeRole === r ? roleColors[r] : 'var(--border-glass)'}`,
            background: activeRole === r ? `${roleColors[r]}18` : 'transparent',
            color: activeRole === r ? roleColors[r] : 'var(--text-secondary)',
            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
          }}>{r}</button>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--border-glass)' }}>Module</th>
              {perms.map(p => (
                <th key={p} style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--border-glass)' }}>{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((mod, i) => (
              <tr key={mod} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,140,255,0.02)' }}>
                <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-glass)' }}>{mod}</td>
                {perms.map(perm => {
                  const checked = matrix[activeRole]?.[mod]?.[perm] ?? false;
                  return (
                    <td key={perm} style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid var(--border-glass)' }}>
                      <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', border: `2px solid ${checked ? roleColors[activeRole] : 'var(--border-glass)'}`, background: checked ? `${roleColors[activeRole]}20` : 'transparent', transition: 'all 0.15s' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(mod, perm)} style={{ display: 'none' }} />
                        {checked && <Check size={15} color={roleColors[activeRole]} strokeWidth={3} />}
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SaveBtn onClick={handleSave} saved={saved} />
    </div>
  );
}

function TrainingSettings() {
  const [form, setForm] = useState(load('training', {
    passingPct: 70, videoWatchPct: 80, retakeLimit: 3,
    mandatory: true, autoEnroll: false, recurring: false,
    completionCriteria: 'Quiz + Video',
  }));
  const [saved, setSaved] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggle = k => v => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => { save('training', form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div>
      <SectionHeader icon={<BookOpen size={22} />} title="Training Settings" desc="Configure learning parameters, completion criteria, and enrollment rules." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {[['Passing Percentage (%)', 'passingPct', 0, 100], ['Video Watch Threshold (%)', 'videoWatchPct', 0, 100], ['Max Retake Limit', 'retakeLimit', 0, 10]].map(([label, key, min, max]) => (
          <div key={key}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="range" min={min} max={max} value={form[key]} onChange={set(key)} style={{ flex: 1, accentColor: 'var(--primary)' }} />
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', minWidth: '40px', textAlign: 'right', fontFamily: 'Poppins,sans-serif' }}>{form[key]}{key !== 'retakeLimit' ? '%' : 'x'}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course Completion Criteria</label>
        <select value={form.completionCriteria} onChange={set('completionCriteria')} style={inputStyle}>
          {['Quiz + Video', 'Quiz Only', 'Video Only', 'All Modules'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      {[['Mandatory Courses', 'mandatory', 'Force-enroll all users to required courses'], ['Auto Enrollment', 'autoEnroll', 'Automatically enroll new users in default courses'], ['Recurring Training', 'recurring', 'Re-assign completed courses at a set frequency']].map(([label, key, desc]) => (
        <SettingRow key={key} label={label} desc={desc}>
          <Toggle value={form[key]} onChange={toggle(key)} id={`tr-${key}`} />
        </SettingRow>
      ))}
      <SaveBtn onClick={handleSave} saved={saved} />
    </div>
  );
}

function QuizSettings() {
  const [form, setForm] = useState(load('quiz', {
    timer: true, randomQ: true, randomOpts: false, negativeMark: false, autoSubmit: true,
    leaderboard: 'realtime', maxParticipants: 100, sessionDuration: 60, rejoin: true, waitingRoom: false,
    polls: true, wordCloud: false, qa: true,
  }));
  const [saved, setSaved] = useState(false);
  const toggle = k => v => setForm(f => ({ ...f, [k]: v }));
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSave = () => { save('quiz', form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div>
      <SectionHeader icon={<Radio size={22} />} title="Quiz & Live Session Settings" desc="Configure quiz behaviour, live session controls, and interactive features." />

      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Zap size={16} color='var(--primary)' /> Quiz Configuration
      </div>
      {[
        ['Timer', 'timer', 'Show countdown timer during quiz'], ['Random Questions', 'randomQ', 'Shuffle question order per participant'],
        ['Random Options', 'randomOpts', 'Shuffle answer options'], ['Negative Marking', 'negativeMark', 'Deduct points for wrong answers'],
        ['Auto Submit', 'autoSubmit', 'Automatically submit when timer ends'],
      ].map(([label, key, desc]) => (
        <SettingRow key={key} label={label} desc={desc}>
          <Toggle value={form[key]} onChange={toggle(key)} id={`q-${key}`} />
        </SettingRow>
      ))}

      <div style={{ marginTop: '24px', marginBottom: '12px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🏆 Leaderboard Mode
      </div>
      {[['realtime', 'Real-time Leaderboard', 'Updates live after each question'], ['final', 'Final Leaderboard Only', 'Show ranking only at session end'], ['anonymous', 'Anonymous Leaderboard', 'Hide participant names']].map(([val, label, desc]) => (
        <div key={val} onClick={() => setForm(f => ({ ...f, leaderboard: val }))} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '10px', border: `1.5px solid ${form.leaderboard === val ? 'var(--primary)' : 'var(--border-glass)'}`, marginBottom: '8px', cursor: 'pointer', background: form.leaderboard === val ? 'rgba(37,99,235,0.06)' : 'transparent', transition: 'all 0.2s' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${form.leaderboard === val ? 'var(--primary)' : 'var(--border-glass)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {form.leaderboard === val && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{label}</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{desc}</div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: '24px', marginBottom: '12px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🎮 Live Session Controls
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
        {[['Max Participants', 'maxParticipants'], ['Session Duration (min)', 'sessionDuration']].map(([label, key]) => (
          <div key={key}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
            <input type="number" value={form[key]} onChange={set(key)} style={inputStyle} />
          </div>
        ))}
      </div>
      {[['Rejoin Allowed', 'rejoin', 'Participants can rejoin if disconnected'], ['Waiting Room', 'waitingRoom', 'Hold participants before session starts'], ['Live Polls', 'polls', 'Enable real-time poll slides'], ['Word Cloud', 'wordCloud', 'Enable word cloud responses'], ['Q&A Feature', 'qa', 'Allow participants to submit questions']].map(([label, key, desc]) => (
        <SettingRow key={key} label={label} desc={desc}>
          <Toggle value={form[key]} onChange={toggle(key)} id={`qs-${key}`} />
        </SettingRow>
      ))}
      <SaveBtn onClick={handleSave} saved={saved} />
    </div>
  );
}

function NotificationSettings() {
  const [form, setForm] = useState(load('notif', {
    email: true, sms: false, whatsapp: false, push: true,
    newAssignment: true, quizReminder: true, trainingReminder: true,
    certIssued: true, passwordReset: true, loginAlert: false,
  }));
  const [saved, setSaved] = useState(false);
  const toggle = k => v => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => { save('notif', form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div>
      <SectionHeader icon={<Bell size={22} />} title="Notification Settings" desc="Configure delivery channels and trigger events for system notifications." />
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '12px' }}>📡 Delivery Channels</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
        {[['Email', 'email', '📧'], ['SMS', 'sms', '📱'], ['WhatsApp', 'whatsapp', '💬'], ['Push Notification', 'push', '🔔']].map(([label, key, icon]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderRadius: '12px', border: `1.5px solid ${form[key] ? 'var(--primary)' : 'var(--border-glass)'}`, background: form[key] ? 'rgba(37,99,235,0.05)' : 'transparent', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>{icon}</span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</span>
            </div>
            <Toggle value={form[key]} onChange={toggle(key)} id={`nc-${key}`} />
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '12px' }}>⚡ Notification Triggers</div>
      {[
        ['New Assignment', 'newAssignment', 'Send when a new course or quiz is assigned'],
        ['Quiz Reminder', 'quizReminder', 'Remind 24h before a scheduled quiz'],
        ['Training Reminder', 'trainingReminder', 'Remind about incomplete training modules'],
        ['Certificate Issued', 'certIssued', 'Notify when a certificate is generated'],
        ['Password Reset', 'passwordReset', 'Trigger on password change request'],
        ['Login Alert', 'loginAlert', 'Alert on new device login'],
      ].map(([label, key, desc]) => (
        <SettingRow key={key} label={label} desc={desc}>
          <Toggle value={form[key]} onChange={toggle(key)} id={`nt-${key}`} />
        </SettingRow>
      ))}
      <SaveBtn onClick={handleSave} saved={saved} />
    </div>
  );
}

function CertificateSettings() {
  const { token, user } = useContext(AuthContext);
  const isAdmin = ['Admin', 'Super Admin'].includes(user?.role);
  const [activeSubTab, setActiveSubTab] = useState('library'); // 'library' | 'automation'
  const [assets, setAssets] = useState([
    {
      id: 'sig-1',
      type: 'authorized_signatory',
      name: 'Mohit Tiku',
      designation: 'Managing Director',
      organization: 'Idonneous Marketing Services Pvt. Ltd.',
      assetPath: '/assets/signatures/mohit_tiku_signature.svg',
      version: 'V1',
      isDefault: true,
      status: 'Active',
      effectiveDate: '2026-01-01'
    },
    {
      id: 'sig-2',
      type: 'trainer_signature',
      name: 'Aakash Verma',
      designation: 'Lead Trainer & Facilitator',
      organization: 'RetailEdge Pro',
      assetPath: '/assets/signatures/aakash_verma_signature.svg',
      version: 'V1',
      isDefault: true,
      status: 'Active',
      effectiveDate: '2026-01-01'
    },
    {
      id: 'seal-1',
      type: 'company_seal',
      name: 'Idonneous Official Corporate Seal',
      designation: 'Official Seal of Certification',
      organization: 'Idonneous Marketing Services Pvt. Ltd.',
      assetPath: '/assets/seals/idonneous_official_seal.svg',
      version: 'V1',
      isDefault: true,
      status: 'Active',
      effectiveDate: '2026-01-01'
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(load('certs', { 
    autoGen: true, 
    emailDelivery: true, 
    pdfDownload: true, 
    qrVerify: true,
    requireTrainerSig: true,
    requireCompanySeal: true
  }));
  const [saved, setSaved] = useState(false);

  // Modals state
  const [previewAsset, setPreviewAsset] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { action, asset, onConfirm }
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState('upload'); // 'upload' | 'draw' | 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [newAsset, setNewAsset] = useState({
    type: 'authorized_signatory',
    name: 'Amit Kumar',
    designation: 'Program Manager',
    organization: 'Idonneous Marketing Services Pvt. Ltd.',
    version: 'V1',
    assetPath: '',
    isDefault: false
  });

  const fetchAssets = async () => {
    try {
      const res = await axios.get('/api/certificates/signatures-and-seals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.length > 0) {
        setAssets(res.data);
      }
    } catch (err) {
      console.warn('Using local default signatures & seal assets:', err.message);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [token]);

  const toggle = k => v => setForm(f => ({ ...f, [k]: v }));
  const handleSaveAutomation = () => { 
    save('certs', form); 
    setSaved(true); 
    setTimeout(() => setSaved(false), 2500); 
  };

  // Canvas Drawing Pad handlers
  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.strokeStyle = '#081226';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewImage(dataUrl);
      setNewAsset(prev => ({ ...prev, assetPath: dataUrl }));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setPreviewImage('');
      setNewAsset(prev => ({ ...prev, assetPath: '' }));
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!/\.(png|svg|jpg|jpeg|webp)$/i.test(file.name)) {
      alert('Please upload a valid image file (PNG, SVG, JPG, WEBP). Transparent PNG or SVG is recommended.');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target.result);
      setNewAsset(prev => ({ ...prev, assetPath: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSetDefault = (asset) => {
    setConfirmModal({
      title: `Set Default ${asset.type === 'company_seal' ? 'Company Seal' : 'Signature'}`,
      message: `Activate "${asset.name}" (${asset.version || 'V1'}) as the new default ${asset.type === 'company_seal' ? 'seal' : 'signature'}?`,
      note: 'CRITICAL: This update will apply ONLY to newly generated certificates. Previously issued certificates will remain strictly unchanged and retain their historical visual snapshot.',
      onConfirm: async () => {
        try {
          await axios.put(`/api/certificates/signatures-and-seals/${asset.id}/default`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          fetchAssets();
        } catch (e) {
          // Local fallback
          setAssets(prev => prev.map(a => a.type === asset.type ? { ...a, isDefault: a.id === asset.id } : a));
        }
        setConfirmModal(null);
      }
    });
  };

  const handleToggleStatus = (asset) => {
    setConfirmModal({
      title: `${asset.status === 'Active' ? 'Deactivate' : 'Activate'} Asset`,
      message: `Are you sure you want to ${asset.status === 'Active' ? 'deactivate' : 'activate'} "${asset.name}"?`,
      note: 'Previously issued certificates that used this asset will continue to display normally in audits.',
      onConfirm: async () => {
        try {
          await axios.put(`/api/certificates/signatures-and-seals/${asset.id}/status`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          fetchAssets();
        } catch (e) {
          setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, status: a.status === 'Active' ? 'Inactive' : 'Active' } : a));
        }
        setConfirmModal(null);
      }
    });
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    if (!newAsset.name) {
      alert('Please enter a Name for this signature or seal.');
      return;
    }
    if (!selectedFile && !newAsset.assetPath) {
      alert('Please upload an image file, draw a signature, or enter an asset path.');
      return;
    }

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('type', newAsset.type);
        formData.append('name', newAsset.name);
        formData.append('designation', newAsset.designation);
        formData.append('organization', newAsset.organization);
        formData.append('version', newAsset.version || 'V1');
        formData.append('isDefault', newAsset.isDefault);

        await axios.post('/api/certificates/signatures-and-seals', formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await axios.post('/api/certificates/signatures-and-seals', newAsset, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      await fetchAssets();
      setUploadModalOpen(false);
      setSelectedFile(null);
      setPreviewImage('');
      setNewAsset({
        type: 'authorized_signatory',
        name: 'Amit Kumar',
        designation: 'Program Manager',
        organization: 'Idonneous Marketing Services Pvt. Ltd.',
        version: 'V1',
        assetPath: '',
        isDefault: false
      });
    } catch (err) {
      console.error('Failed to create signature asset:', err);
      // Local fallback
      setAssets(prev => [...prev, { 
        ...newAsset, 
        id: `asset-${Date.now()}`, 
        status: 'Active', 
        effectiveDate: new Date().toISOString().slice(0, 10),
        assetPath: previewImage || newAsset.assetPath 
      }]);
      setUploadModalOpen(false);
    }
  };

  const authSignatories = assets.filter(a => a.type === 'authorized_signatory');
  const trainerSignatures = assets.filter(a => a.type === 'trainer_signature');
  const companySeals = assets.filter(a => a.type === 'company_seal');

  return (
    <div>
      <SectionHeader 
        icon={<Award size={22} />} 
        title="Certification, Signatures & Seals" 
        desc="Manage authorized signatories, trainer signatures, official company seal, and automated credentialing rules." 
      />

      {/* Sub-Tab Switcher */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveSubTab('library')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
            background: activeSubTab === 'library' ? 'linear-gradient(135deg,#2563EB,#60A5FA)' : 'var(--bg-tertiary)',
            color: activeSubTab === 'library' ? '#FFFFFF' : 'var(--text-secondary)',
            transition: 'all 0.2s'
          }}
        >
          ✍️ Signatures & Seals Library
        </button>
        <button
          onClick={() => setActiveSubTab('automation')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
            background: activeSubTab === 'automation' ? 'linear-gradient(135deg,#2563EB,#60A5FA)' : 'var(--bg-tertiary)',
            color: activeSubTab === 'automation' ? '#FFFFFF' : 'var(--text-secondary)',
            transition: 'all 0.2s'
          }}
        >
          ⚙️ Issuance & Automation Rules
        </button>
      </div>

      {activeSubTab === 'library' ? (
        <div>
          {/* Header Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Official Credential Assets
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Approved digital assets snapshot into certificate records at the time of issuance.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setUploadModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg,#2563EB,#06B6D4)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
                }}
              >
                <Plus size={15} /> Add Signature / Seal
              </button>
            )}
          </div>

          {/* 1. Authorized Signatories Section */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>👔</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>Authorized Company Signatories</h4>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Required on all official corporate certification credentials</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {authSignatories.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', background: 'var(--bg-tertiary)', border: `1.5px solid ${item.isDefault ? 'var(--primary)' : 'var(--border-glass)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '90px', height: '36px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}>
                      <img src={item.assetPath} alt={item.name} style={{ maxHeight: '30px', maxWidth: '80px', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.name}
                        {item.isDefault && <span style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>★ DEFAULT</span>}
                        <span style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700 }}>{item.version || 'V1'}</span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {item.designation} · <span style={{ color: 'var(--text-muted)' }}>{item.organization}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setPreviewAsset(item)}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.76rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={13} /> Preview
                    </button>
                    {isAdmin && !item.isDefault && (
                      <button
                        onClick={() => handleSetDefault(item)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--primary)', background: 'rgba(37,99,235,0.08)', color: 'var(--primary)', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Trainer Signatures Section */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎓</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>Trainer & Facilitator Signatures</h4>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Rendered alongside lead trainer name when configured in template</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {trainerSignatures.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', background: 'var(--bg-tertiary)', border: `1.5px solid ${item.isDefault ? 'var(--primary)' : 'var(--border-glass)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '90px', height: '36px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}>
                      <img src={item.assetPath} alt={item.name} style={{ maxHeight: '30px', maxWidth: '80px', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.name}
                        {item.isDefault && <span style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>★ DEFAULT</span>}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {item.designation} · <span style={{ color: 'var(--text-muted)' }}>{item.organization}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setPreviewAsset(item)}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.76rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={13} /> Preview
                    </button>
                    {isAdmin && !item.isDefault && (
                      <button
                        onClick={() => handleSetDefault(item)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--primary)', background: 'rgba(37,99,235,0.08)', color: 'var(--primary)', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Official Company Seal Section */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>Official Idonneous Company Seal</h4>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Official circular embossed certification seal of Idonneous Marketing Services Pvt. Ltd.</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {companySeals.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '10px', background: 'var(--bg-tertiary)', border: `1.5px solid ${item.isDefault ? 'var(--primary)' : 'var(--border-glass)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '60px', height: '60px', background: '#FFFFFF', borderRadius: '50%', border: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                      <img src={item.assetPath} alt={item.name} style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.name}
                        <span style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>★ OFFICIAL SEAL</span>
                        <span style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700 }}>{item.version || 'V1'}</span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        Issued by <strong style={{ color: 'var(--text-primary)' }}>{item.organization}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setPreviewAsset(item)}
                      style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.76rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={13} /> View High-Res
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Automation & Issuance Rules */
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              ⚡ Automated Issuance & Dispatch Rules
            </h4>
            {[
              ['Auto Certificate Generation', 'autoGen', 'Automatically issue certificates upon successful course completion & passing quiz score'],
              ['Email Delivery with PDF', 'emailDelivery', 'Automatically dispatch congratulatory email with attached print-ready PDF certificate'],
              ['Participant PDF Download', 'pdfDownload', 'Allow participants to download high-resolution vector PDF from their portal'],
              ['QR Code Live Verification', 'qrVerify', 'Embed public verification QR code pointing to /verify/:certificateId'],
              ['Trainer Signature Inclusion', 'requireTrainerSig', 'Include designated Lead Trainer signature block on certificates'],
              ['Official Company Seal Inclusion', 'requireCompanySeal', 'Stamp official circular Idonneous seal on generated credentials']
            ].map(([label, key, desc]) => (
              <SettingRow key={key} label={label} desc={desc}>
                <Toggle value={form[key]} onChange={toggle(key)} id={`cert-${key}`} />
              </SettingRow>
            ))}
          </div>

          <SaveBtn onClick={handleSaveAutomation} saved={saved} />
        </div>
      )}

      {/* ─── MODALS ───────────────────────────────────────────────────────────── */}

      {/* 1. Asset High-Res Preview Modal */}
      {previewAsset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,32,0.7)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {previewAsset.name}
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {previewAsset.designation} · {previewAsset.organization} ({previewAsset.version || 'V1'})
            </div>

            <div style={{ background: '#FFFFFF', padding: '30px 20px', borderRadius: '12px', border: '1.5px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '160px', marginBottom: '20px' }}>
              <img 
                src={previewAsset.assetPath} 
                alt={previewAsset.name} 
                style={{ 
                  maxHeight: previewAsset.type === 'company_seal' ? '130px' : '90px', 
                  maxWidth: '100%', 
                  objectFit: 'contain' 
                }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setPreviewAsset(null)}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Approval Protection Confirmation Modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,32,0.75)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '26px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(234,179,8,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EAB308', flexShrink: 0 }}>
                <AlertTriangle size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {confirmModal.title}
              </h3>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {confirmModal.message}
            </p>

            <div style={{ padding: '12px 14px', background: 'rgba(37,99,235,0.06)', borderLeft: '3px solid var(--primary)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '22px' }}>
              {confirmModal.note}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{ padding: '8px 22px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#2563EB,#60A5FA)', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Confirm & Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Upload / Create Asset Modal */}
      {uploadModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,32,0.8)', backdropFilter: 'blur(6px)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Upload size={20} color="var(--primary)" /> Upload Signature / Seal Asset
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Add transparent signatures, facilitator signatures, or official corporate seals.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setUploadModalOpen(false)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAsset}>
              {/* Asset Type Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>ASSET TYPE</label>
                  <select
                    value={newAsset.type}
                    onChange={e => {
                      const t = e.target.value;
                      setNewAsset(a => ({ 
                        ...a, 
                        type: t,
                        name: t === 'company_seal' ? 'RetailEdge PRO 3D Gold Ribbon Seal' : (t === 'trainer_signature' ? 'Aakash Verma' : 'Amit Kumar'),
                        designation: t === 'company_seal' ? 'Official Seal of Certification' : (t === 'trainer_signature' ? 'Lead Trainer & Facilitator' : 'Program Manager')
                      }));
                    }}
                    style={inputStyle}
                  >
                    <option value="authorized_signatory">Authorized Signatory</option>
                    <option value="trainer_signature">Trainer Signature</option>
                    <option value="company_seal">Company Seal</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>VERSION TAG</label>
                  <input
                    type="text"
                    value={newAsset.version}
                    onChange={e => setNewAsset(a => ({ ...a, version: e.target.value }))}
                    style={inputStyle}
                    placeholder="e.g. V1, V2"
                  />
                </div>
              </div>

              {/* Upload Mode Switcher */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>INPUT METHOD</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setUploadMode('upload')}
                    style={{
                      padding: '8px', borderRadius: '8px', border: `1.5px solid ${uploadMode === 'upload' ? 'var(--primary)' : 'var(--border-glass)'}`,
                      background: uploadMode === 'upload' ? 'rgba(37,99,235,0.1)' : 'var(--bg-tertiary)',
                      color: uploadMode === 'upload' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <Upload size={14} /> Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('draw')}
                    style={{
                      padding: '8px', borderRadius: '8px', border: `1.5px solid ${uploadMode === 'draw' ? 'var(--primary)' : 'var(--border-glass)'}`,
                      background: uploadMode === 'draw' ? 'rgba(37,99,235,0.1)' : 'var(--bg-tertiary)',
                      color: uploadMode === 'draw' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <PenTool size={14} /> Draw Signature
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('url')}
                    style={{
                      padding: '8px', borderRadius: '8px', border: `1.5px solid ${uploadMode === 'url' ? 'var(--primary)' : 'var(--border-glass)'}`,
                      background: uploadMode === 'url' ? 'rgba(37,99,235,0.1)' : 'var(--bg-tertiary)',
                      color: uploadMode === 'url' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <Globe size={14} /> Asset Path
                  </button>
                </div>
              </div>

              {/* Mode 1: Drag & Drop File Upload */}
              {uploadMode === 'upload' && (
                <div style={{ marginBottom: '18px' }}>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileSelect(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    style={{
                      border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border-glass)'}`,
                      borderRadius: '12px', padding: '24px 16px', textAlign: 'center', cursor: 'pointer',
                      background: dragOver ? 'rgba(37,99,235,0.08)' : 'var(--bg-tertiary)', transition: 'all 0.2s'
                    }}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} 
                      accept=".png,.svg,.jpg,.jpeg,.webp" 
                      style={{ display: 'none' }} 
                    />
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(37,99,235,0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                      <Upload size={20} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {selectedFile ? selectedFile.name : 'Drag and drop your signature / seal image'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Supports PNG (with transparency), SVG, JPG, WEBP (Max 10MB)
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 2: Interactive Signature Drawing Pad */}
              {uploadMode === 'draw' && (
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Sign inside the box below:
                    </span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      style={{ padding: '3px 10px', borderRadius: '4px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.72rem', cursor: 'pointer' }}
                    >
                      Clear Pad
                    </button>
                  </div>
                  <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1.5px solid #CBD5E1', padding: '6px', textAlign: 'center', cursor: 'crosshair', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={130}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      style={{ width: '100%', height: '130px', display: 'block', touchAction: 'none' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
                    ✍️ Mouse, touchpad, stylus or touchscreen supported. Stroke converts to transparent PNG.
                  </div>
                </div>
              )}

              {/* Mode 3: Asset URL / Server Path */}
              {uploadMode === 'url' && (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>ASSET PATH OR URL</label>
                  <input
                    type="text"
                    value={newAsset.assetPath}
                    onChange={e => {
                      setNewAsset(a => ({ ...a, assetPath: e.target.value }));
                      setPreviewImage(e.target.value);
                    }}
                    style={inputStyle}
                    placeholder="/assets/signatures/amit_kumar_signature.svg"
                  />
                </div>
              )}

              {/* Live Preview of Uploaded / Drawn Asset with Transparent Checkerboard */}
              {previewImage && (
                <div style={{ marginBottom: '18px', background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>ASSET PREVIEW</div>
                  <div style={{
                    background: '#FFFFFF',
                    backgroundImage: 'linear-gradient(45deg, #F1F5F9 25%, transparent 25%), linear-gradient(-45deg, #F1F5F9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #F1F5F9 75%), linear-gradient(-45deg, transparent 75%, #F1F5F9 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90px', border: '1px solid #CBD5E1'
                  }}>
                    <img 
                      src={previewImage} 
                      alt="Preview" 
                      style={{ maxHeight: newAsset.type === 'company_seal' ? '90px' : '65px', maxWidth: '100%', objectFit: 'contain' }} 
                    />
                  </div>
                </div>
              )}

              {/* Metadata Fields */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>SIGNATORY / SEAL NAME</label>
                <input
                  type="text"
                  value={newAsset.name}
                  onChange={e => setNewAsset(a => ({ ...a, name: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. Amit Kumar / RetailEdge PRO Gold Seal"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>DESIGNATION / TITLE</label>
                  <input
                    type="text"
                    value={newAsset.designation}
                    onChange={e => setNewAsset(a => ({ ...a, designation: e.target.value }))}
                    style={inputStyle}
                    placeholder="e.g. Program Manager"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>ORGANIZATION</label>
                  <input
                    type="text"
                    value={newAsset.organization}
                    onChange={e => setNewAsset(a => ({ ...a, organization: e.target.value }))}
                    style={inputStyle}
                    placeholder="Idonneous Marketing Services Pvt. Ltd."
                  />
                </div>
              </div>

              {/* Set as Active Default */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <input 
                  type="checkbox" 
                  id="assetDefault" 
                  checked={newAsset.isDefault} 
                  onChange={e => setNewAsset(a => ({ ...a, isDefault: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="assetDefault" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Set as active default for newly generated certificates
                </label>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setUploadModalOpen(false);
                    setSelectedFile(null);
                    setPreviewImage('');
                  }}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#2563EB,#06B6D4)', color: 'white', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
                >
                  Upload & Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsSettings() {
  const [form, setForm] = useState(load('reports_cfg', { pdf: true, excel: true, ppt: true, csv: false, schedDaily: false, schedWeekly: true, schedMonthly: true, schedQuarterly: false }));
  const [saved, setSaved] = useState(false);
  const toggle = k => v => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => { save('reports_cfg', form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div>
      <SectionHeader icon={<BarChart2 size={22} />} title="Reports Settings" desc="Configure export formats, scheduled reports, and dashboard widget visibility." />
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '14px' }}>📤 Export Formats</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[['PDF', 'pdf', '📄'], ['Excel', 'excel', '📊'], ['PowerPoint', 'ppt', '📑'], ['CSV', 'csv', '📋']].map(([label, key, icon]) => (
          <div key={key} onClick={() => toggle(key)(!form[key])} style={{ padding: '18px 14px', borderRadius: '12px', border: `1.5px solid ${form[key] ? 'var(--primary)' : 'var(--border-glass)'}`, background: form[key] ? 'rgba(37,99,235,0.08)' : 'transparent', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: form[key] ? 'var(--primary)' : 'var(--text-primary)' }}>{label}</div>
            <div style={{ fontSize: '0.72rem', color: form[key] ? 'var(--primary)' : 'var(--text-muted)', marginTop: '4px' }}>{form[key] ? 'Enabled' : 'Disabled'}</div>
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '14px' }}>📅 Scheduled Reports</div>
      {[['Daily Report', 'schedDaily', 'Auto-generate and email daily summary'], ['Weekly Report', 'schedWeekly', 'Auto-send every Monday morning'], ['Monthly Report', 'schedMonthly', 'Send on 1st of each month'], ['Quarterly Report', 'schedQuarterly', 'Send at end of each quarter']].map(([label, key, desc]) => (
        <SettingRow key={key} label={label} desc={desc}>
          <Toggle value={form[key]} onChange={toggle(key)} id={`rpt-${key}`} />
        </SettingRow>
      ))}
      <SaveBtn onClick={handleSave} saved={saved} />
    </div>
  );
}

function IntegrationsSettings() {
  const [form, setForm] = useState(load('integrations', { jitsi: true, zoom: false, meet: false, teams: false, whatsapp: false, sms: false, smtp: true, analytics: false, powerbi: false }));
  const toggle = k => v => setForm(f => ({ ...f, [k]: v }));
  const [saved, setSaved] = useState(false);
  const handleSave = () => { save('integrations', form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const IntCard = ({ label, key, icon, category }) => (
    <div style={{ padding: '18px 20px', borderRadius: '14px', border: `1.5px solid ${form[key] ? '#00C896' : 'var(--border-glass)'}`, background: form[key] ? 'rgba(0,200,150,0.05)' : 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.6rem' }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</div>
          <div style={{ fontSize: '0.74rem', color: form[key] ? '#00C896' : 'var(--text-muted)' }}>{form[key] ? '✓ Connected' : 'Not Connected'}</div>
        </div>
      </div>
      <Toggle value={form[key]} onChange={toggle(key)} id={`int-${key}`} />
    </div>
  );

  return (
    <div>
      <SectionHeader icon={<Network size={22} />} title="Integration Settings" desc="Connect third-party video, communication, and analytics platforms." />
      {[
        { title: '🎥 Video Platforms', items: [['Jitsi', 'jitsi', '🟦'], ['Zoom', 'zoom', '🔵'], ['Google Meet', 'meet', '🟢'], ['Microsoft Teams', 'teams', '🟣']] },
        { title: '💬 Communication', items: [['WhatsApp API', 'whatsapp', '💚'], ['SMS Gateway', 'sms', '📱'], ['Email SMTP', 'smtp', '📧']] },
        { title: '📊 Analytics', items: [['Google Analytics', 'analytics', '📈'], ['Power BI', 'powerbi', '⚡']] },
      ].map(({ title, items }) => (
        <div key={title} style={{ marginBottom: '28px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '12px' }}>{title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {items.map(([label, key, icon]) => <IntCard key={key} label={label} keyN={key} icon={icon} />)}
          </div>
        </div>
      ))}
      <SaveBtn onClick={handleSave} saved={saved} />
    </div>
  );
}

function SecuritySettings() {
  const { token } = useContext(AuthContext);

  // ── Change Password state ────────────────────────────────────────────────
  const [cpForm, setCpForm] = useState({ current: '', newPw: '', confirm: '' });
  const [cpShow, setCpShow] = useState({ current: false, newPw: false, confirm: false });
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState(false);

  const cpSet = k => e => setCpForm(f => ({ ...f, [k]: e.target.value }));
  const cpToggle = k => () => setCpShow(s => ({ ...s, [k]: !s[k] }));

  const pwStrength = (pw) => {
    if (!pw) return { score: 0, label: '', color: '#E2E8F0' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#E2E8F0', '#EF4444', '#F59E0B', '#2EA8FF', '#00C896'];
    return { score, label: labels[score], color: colors[score] };
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setCpError('');
    if (cpForm.newPw !== cpForm.confirm) {
      setCpError('New passwords do not match.'); return;
    }
    if (cpForm.newPw.length < 6) {
      setCpError('New password must be at least 6 characters.'); return;
    }
    setCpLoading(true);
    try {
      await axios.post('/api/auth/change-password',
        { currentPassword: cpForm.current, newPassword: cpForm.newPw },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCpSuccess(true);
      setCpForm({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setCpSuccess(false), 4000);
    } catch (err) {
      setCpError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setCpLoading(false);
    }
  };

  const strength = pwStrength(cpForm.newPw);
  const { user } = useContext(AuthContext);
  const isEmployee = user?.role === 'Employee';

  // ── Policy / auth settings ───────────────────────────────────────────────
  const [form, setForm] = useState(load('security', {
    minLength: 8, upperRequired: true, lowerRequired: true, numberRequired: true, specialRequired: false,
    twoFA: false, otpVerify: true, sessionTimeout: 30, autoLogout: true, concurrentLogin: false,
  }));
  const [saved, setSaved] = useState(false);
  const toggle = k => v => setForm(f => ({ ...f, [k]: v }));
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSave = () => { save('security', form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const pwFieldStyle = {
    width: '100%', padding: '11px 44px 11px 14px', borderRadius: '8px',
    border: '1.5px solid var(--border-glass)', background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none',
    transition: 'border-color 0.2s', boxSizing: 'border-box',
  };

  return (
    <div>
      <SectionHeader 
        icon={<Lock size={22} />} 
        title={isEmployee ? "Account Security" : "Security Settings"} 
        desc={isEmployee ? "Update your account password and credentials." : "Change your password and configure platform-wide security policies."} 
      />

      {/* ── CHANGE PASSWORD ──────────────────────────────────────────── */}
      <div style={{ marginBottom: '32px', padding: '24px', background: 'var(--bg-tertiary)', borderRadius: '16px', border: '1.5px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🔐</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Change Your Password</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Update your account password. You'll need your current password to proceed.</div>
          </div>
        </div>

        {/* Success */}
        {cpSuccess && (
          <div style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.25)', color: '#00C896', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.88rem', fontWeight: 600 }}>
            ✓ Password changed successfully!
          </div>
        )}

        {/* Error */}
        {cpError && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.88rem' }}>
            {cpError}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Current Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Password</label>
            <div style={{ position: 'relative' }}>
              <input type={cpShow.current ? 'text' : 'password'} value={cpForm.current} onChange={cpSet('current')}
                placeholder="Enter current password" required style={pwFieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-glass)'} />
              <button type="button" onClick={cpToggle('current')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                {cpShow.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input type={cpShow.newPw ? 'text' : 'password'} value={cpForm.newPw} onChange={cpSet('newPw')}
                placeholder="Enter new password (min 6 characters)" required style={pwFieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-glass)'} />
              <button type="button" onClick={cpToggle('newPw')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                {cpShow.newPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Strength bar */}
            {cpForm.newPw && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= strength.score ? strength.color : 'var(--border-glass)', transition: 'background 0.3s' }} />
                  ))}
                </div>
                <div style={{ fontSize: '0.74rem', color: strength.color, fontWeight: 600 }}>{strength.label}</div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <input type={cpShow.confirm ? 'text' : 'password'} value={cpForm.confirm} onChange={cpSet('confirm')}
                placeholder="Re-enter new password" required style={{
                  ...pwFieldStyle,
                  borderColor: cpForm.confirm && cpForm.newPw !== cpForm.confirm ? '#EF4444' : 'var(--border-glass)'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = cpForm.confirm && cpForm.newPw !== cpForm.confirm ? '#EF4444' : 'var(--border-glass)'} />
              <button type="button" onClick={cpToggle('confirm')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                {cpShow.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {cpForm.confirm && cpForm.newPw !== cpForm.confirm && (
              <div style={{ fontSize: '0.76rem', color: '#EF4444', marginTop: '4px' }}>Passwords do not match</div>
            )}
          </div>

          <button type="submit" disabled={cpLoading} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '11px 28px', borderRadius: '10px', border: 'none', cursor: cpLoading ? 'not-allowed' : 'pointer',
            background: cpLoading ? 'var(--bg-tertiary)' : 'linear-gradient(135deg,#2563EB,#60A5FA)',
            color: cpLoading ? 'var(--text-muted)' : 'white',
            fontWeight: 700, fontSize: '0.9rem', fontFamily: 'Poppins,sans-serif',
            boxShadow: cpLoading ? 'none' : '0 4px 14px rgba(37,99,235,0.3)',
            transition: 'all 0.2s', marginTop: '6px', alignSelf: 'flex-start',
          }}>
            {cpLoading ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Changing...</> : <><Lock size={15} /> Change Password</>}
          </button>
        </form>
      </div>

      {!isEmployee && (
        <>
          {/* ── PASSWORD POLICY ─────────────────────────────────────────── */}
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>🔑 Password Policy</div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>🛡️ Authentication</div>
      {[['Two-Factor Authentication (2FA)', 'twoFA', 'Require OTP at login in addition to password'], ['OTP Verification', 'otpVerify', 'Send OTP for sensitive actions'], ['Auto Logout', 'autoLogout', 'Automatically log out inactive users'], ['Restrict Concurrent Login', 'concurrentLogin', 'Prevent simultaneous login from multiple devices']].map(([label, key, desc]) => (
        <SettingRow key={key} label={label} desc={desc}>
          <Toggle value={form[key]} onChange={toggle(key)} id={`auth-${key}`} />
        </SettingRow>
      ))}

      <div style={{ marginTop: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Session Timeout (minutes)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <input type="range" min="5" max="120" step="5" value={form.sessionTimeout} onChange={set('sessionTimeout')} style={{ flex: 1, accentColor: 'var(--primary)' }} />
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', minWidth: '48px', fontFamily: 'Poppins,sans-serif' }}>{form.sessionTimeout}m</span>
        </div>
      </div>
      <SaveBtn onClick={handleSave} saved={saved} />
        </>
      )}
    </div>
  );
}

function BillingSettings() {
  const plan = { name: 'Enterprise', expiry: '31 Dec 2025', users: 247, maxUsers: 500, storage: 68, addons: ['AI Analytics', 'WhatsApp Credits'] };
  const used = Math.round((plan.users / plan.maxUsers) * 100);

  return (
    <div>
      <SectionHeader icon={<CreditCard size={22} />} title="Billing & Subscription" desc="View your current plan, usage metrics, and manage add-ons." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {[['Plan Name', plan.name, 'var(--primary)'], ['Expiry Date', plan.expiry, '#F59E0B'], ['Active Users', `${plan.users} / ${plan.maxUsers}`, '#38BDF8'], ['Storage Used', `${plan.storage}%`, '#22C55E']].map(([label, val, color]) => (
          <div key={label} style={{ padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '8px' }}>{label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color, fontFamily: 'Poppins,sans-serif' }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>User Seats Used</span>
          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{used}%</span>
        </div>
        <div style={{ height: '12px', background: 'var(--bg-primary)', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${used}%`, background: `linear-gradient(90deg,#2563EB,#60A5FA)`, borderRadius: '6px', transition: 'width 1s ease' }} />
        </div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '6px' }}>{plan.users} of {plan.maxUsers} seats used</div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '14px' }}>🔌 Active Add-ons</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {['AI Analytics', 'WhatsApp Credits', 'Additional Storage'].map(addon => (
            <div key={addon} style={{ padding: '10px 18px', borderRadius: '20px', border: `1.5px solid ${plan.addons.includes(addon) ? '#00C896' : 'var(--border-glass)'}`, background: plan.addons.includes(addon) ? 'rgba(0,200,150,0.08)' : 'transparent', color: plan.addons.includes(addon) ? '#00C896' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>
              {plan.addons.includes(addon) ? '✓ ' : '+ '}{addon}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <AlertTriangle size={18} color="#F59E0B" />
        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          Your plan expires on <strong style={{ color: '#F59E0B' }}>{plan.expiry}</strong>. Contact your account manager to renew.
        </div>
      </div>
    </div>
  );
}

function AuditLogs() {
  const logs = [
    { user: 'admin@quizhive.com', activity: 'User Created', detail: 'Created user: john.doe@retailedge.com', ip: '192.168.1.12', time: '2025-12-01 09:14:22', status: 'Success' },
    { user: 'trainer@quizhive.com', activity: 'Quiz Created', detail: 'Quiz: "Product Knowledge Q4"', ip: '192.168.1.45', time: '2025-12-01 09:32:01', status: 'Success' },
    { user: 'admin@quizhive.com', activity: 'Login', detail: 'Browser: Chrome 120, Windows 11', ip: '192.168.1.12', time: '2025-12-01 08:58:44', status: 'Success' },
    { user: 'unknown@test.com', activity: 'Login Failed', detail: 'Invalid credentials attempt', ip: '103.45.22.198', time: '2025-12-01 08:12:03', status: 'Failed' },
    { user: 'pm@quizhive.com', activity: 'Report Download', detail: 'Downloaded: Executive_Summary_PPT', ip: '192.168.1.78', time: '2025-11-30 17:44:11', status: 'Success' },
    { user: 'admin@quizhive.com', activity: 'User Edited', detail: 'Updated role for: jane.doe@retailedge.com', ip: '192.168.1.12', time: '2025-11-30 16:20:55', status: 'Success' },
    { user: 'trainer@quizhive.com', activity: 'Logout', detail: 'Session ended after 45 mins', ip: '192.168.1.45', time: '2025-11-30 15:11:09', status: 'Success' },
  ];

  const thS = { padding: '11px 14px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--border-glass)', textAlign: 'left', whiteSpace: 'nowrap' };
  const tdS = { padding: '13px 14px', borderBottom: '1px solid var(--border-glass)', fontSize: '0.84rem', color: 'var(--text-primary)', verticalAlign: 'middle' };

  const handleExportCSV = () => {
    const headers = "User,Activity,Detail,IP Address,Timestamp,Status";
    const rows = logs.map(l => `"${l.user}","${l.activity}","${l.detail}","${l.ip}","${l.time}","${l.status}"`);
    const csvContent = headers + "\n" + rows.join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quizhive_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", `quizhive_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  return (
    <div>
      <SectionHeader icon={<ClipboardList size={22} />} title="Audit Logs" desc="Track all platform activities — logins, creations, edits, and downloads." />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Showing last <strong>100</strong> events</div>
        <button onClick={handleExportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1.5px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>
          <Download size={14} /> Export CSV
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {['User', 'Activity', 'Detail', 'IP Address', 'Timestamp', 'Status'].map(h => <th key={h} style={thS}>{h}</th>)}
          </tr></thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                <td style={{ ...tdS, fontWeight: 600, fontSize: '0.82rem' }}>{l.user}</td>
                <td style={tdS}><span style={{ fontWeight: 600, color: l.activity.includes('Failed') ? '#EF4444' : 'var(--text-primary)' }}>{l.activity}</span></td>
                <td style={{ ...tdS, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{l.detail}</td>
                <td style={{ ...tdS, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.ip}</td>
                <td style={{ ...tdS, color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{l.time}</td>
                <td style={tdS}><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: l.status === 'Success' ? 'rgba(0,200,150,0.12)' : 'rgba(239,68,68,0.12)', color: l.status === 'Success' ? '#00C896' : '#EF4444' }}>{l.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SystemPreferences() {
  const [form, setForm] = useState(load('syspref', {
    cacheRefresh: 'hourly', backupSchedule: 'daily', dataSyncFreq: '15min',
    dailyBackup: true, weeklyBackup: true, monthlyBackup: false,
  }));
  const [saved, setSaved] = useState(false);
  const toggle = k => v => setForm(f => ({ ...f, [k]: v }));
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSave = () => { save('syspref', form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div>
      <SectionHeader icon={<Settings2 size={22} />} title="System Preferences" desc="Manage caching, backups, and data synchronization schedules." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {[['Cache Refresh Interval', 'cacheRefresh', ['5min', '15min', '30min', 'hourly', 'daily']], ['Backup Schedule', 'backupSchedule', ['hourly', 'daily', 'weekly', 'monthly']], ['Data Sync Frequency', 'dataSyncFreq', ['5min', '15min', '30min', 'hourly']]].map(([label, key, opts]) => (
          <div key={key}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
            <select value={form[key]} onChange={set(key)} style={inputStyle}>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Database size={16} color='var(--primary)' /> Backup Configuration</div>
      {[['Daily Backup', 'dailyBackup', 'Automatic backup every day at midnight'], ['Weekly Backup', 'weeklyBackup', 'Full backup every Sunday at 2 AM'], ['Monthly Backup', 'monthlyBackup', 'Archive backup on 1st of each month']].map(([label, key, desc]) => (
        <SettingRow key={key} label={label} desc={desc}>
          <Toggle value={form[key]} onChange={toggle(key)} id={`sp-${key}`} />
        </SettingRow>
      ))}

      <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        {[['💾 Storage', '68.4 GB / 100 GB', 'var(--primary)', 68], ['⚡ Server Health', '99.7% uptime', '#22C55E', 99.7], ['📡 API Usage', '12,840 req/day', '#38BDF8', 43]].map(([label, val, color, pct]) => (
          <div key={label} style={{ padding: '18px', background: 'var(--bg-tertiary)', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>{label}</div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color, marginBottom: '10px', fontFamily: 'Poppins,sans-serif' }}>{val}</div>
            <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px' }} />
            </div>
          </div>
        ))}
      </div>
      <SaveBtn onClick={handleSave} saved={saved} />
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'general',     label: 'General',          icon: <Globe size={17} />,         component: GeneralSettings },
  { id: 'org',         label: 'Organization',      icon: <Building2 size={17} />,     component: OrganizationSettings },
  { id: 'branding',    label: 'Branding',          icon: <Palette size={17} />,       component: BrandingSettings },
  { id: 'users',       label: 'User Management',   icon: <Users size={17} />,         component: UserManagementSettings },
  { id: 'roles',       label: 'Roles & Permissions', icon: <Shield size={17} />,      component: RolesPermissions },
  { id: 'training',    label: 'Training Settings', icon: <BookOpen size={17} />,      component: TrainingSettings },
  { id: 'quiz',        label: 'Quiz Settings',     icon: <Radio size={17} />,         component: QuizSettings },
  { id: 'notif',       label: 'Notifications',     icon: <Bell size={17} />,          component: NotificationSettings },
  { id: 'certs',       label: 'Certificates',      icon: <Award size={17} />,         component: CertificateSettings },
  { id: 'reports',     label: 'Reports',           icon: <BarChart2 size={17} />,     component: ReportsSettings },
  { id: 'integrations',label: 'Integrations',      icon: <Network size={17} />,       component: IntegrationsSettings },
  { id: 'security',    label: 'Security',          icon: <Lock size={17} />,          component: SecuritySettings },
  { id: 'billing',     label: 'Billing',           icon: <CreditCard size={17} />,    component: BillingSettings },
  { id: 'audit',       label: 'Audit Logs',        icon: <ClipboardList size={17} />, component: AuditLogs },
  { id: 'system',      label: 'System Preferences',icon: <Settings2 size={17} />,     component: SystemPreferences },
];

// Sections accessible to non-admin roles
const LIMITED_SECTIONS = ['notif', 'security', 'quiz', 'training'];
const EMPLOYEE_SECTIONS = ['security', 'notif'];

export default function Settings() {
  const { user } = useContext(AuthContext);

  const isAdmin = ['Admin', 'Super Admin'].includes(user?.role);
  const isEmployee = user?.role === 'Employee';
  const [active, setActive] = useState(isEmployee ? 'security' : 'general');

  const visibleNav = isAdmin 
    ? NAV_ITEMS 
    : isEmployee
      ? NAV_ITEMS.filter(n => EMPLOYEE_SECTIONS.includes(n.id)).map(n => n.id === 'security' ? { ...n, label: 'Password & Security' } : n)
      : NAV_ITEMS.filter(n => LIMITED_SECTIONS.includes(n.id));

  useEffect(() => {
    if (isEmployee) {
      if (!EMPLOYEE_SECTIONS.includes(active)) setActive('security');
    } else if (!isAdmin && !LIMITED_SECTIONS.includes(active)) {
      setActive('notif');
    }
  }, [isAdmin, isEmployee, active]);

  const ActiveComp = NAV_ITEMS.find(n => n.id === active)?.component || GeneralSettings;

  if (user && !['Admin', 'Super Admin', 'Trainer', 'T&D Manager', 'Employee'].includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="view-section active" style={{ padding: 0 }}>
      {/* Page Title */}
      <div style={{ padding: '28px 28px 0', marginBottom: '0' }}>
        <h2 style={{ margin: 0, fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#2563EB,#93C5FD)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings2 size={20} color="white" />
          </span>
          {isEmployee ? 'My Preferences & Security' : (isAdmin ? 'Admin Settings' : 'Settings')}
        </h2>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {isEmployee 
            ? 'Manage your personal account credentials and notification preferences.' 
            : (isAdmin ? 'Full platform configuration · All settings are saved to your session.' : 'Manage your personal preferences and account settings.')}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 0, marginTop: '24px', minHeight: '600px' }}>
        {/* Left Sidebar Nav */}
        <div style={{ width: '230px', flexShrink: 0, borderRight: '1px solid var(--border-glass)', paddingRight: '0', paddingTop: '4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '12px' }}>
            {visibleNav.map(item => (
              <button key={item.id} onClick={() => setActive(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                borderRadius: '10px', border: 'none', cursor: 'pointer', textAlign: 'left',
                 background: active === item.id ? 'linear-gradient(135deg,rgba(37,99,235,0.15),rgba(147,197,253,0.08))' : 'transparent',
                color: active === item.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: active === item.id ? 700 : 500, fontSize: '0.85rem',
                transition: 'all 0.18s', borderLeft: `3px solid ${active === item.id ? 'var(--primary)' : 'transparent'}`,
              }}
                onMouseOver={e => { if (active !== item.id) { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                onMouseOut={e => { if (active !== item.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
              >
                <span style={{ opacity: active === item.id ? 1 : 0.65, flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Panel */}
        <div style={{ flex: 1, padding: '8px 28px 40px', overflowY: 'auto', maxWidth: 'calc(100% - 230px)' }}>
          <div style={{ maxWidth: '800px' }}>
            <ActiveComp />
          </div>
        </div>
      </div>
    </div>
  );
}
