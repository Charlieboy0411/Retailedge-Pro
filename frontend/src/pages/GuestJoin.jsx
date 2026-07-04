import React, { useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LogIn, User } from 'lucide-react';

export default function GuestJoin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const trainingId = searchParams.get('id');

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name to join.');
      return;
    }

    if (!trainingId) {
      setError('Invalid meeting link. No meeting ID found.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Assuming backend runs on the same origin in production, or configure properly
      const response = await axios.post(`/api/trainings/${trainingId}/guest-join`, { name });
      
      // Log the user into the LMS context automatically
      login(response.data.token, response.data.user);
      
      // Redirect to the training module with autoJoin flag
      navigate(`/trainings?id=${trainingId}&autoJoin=true`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join meeting. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0F172A', color: 'white', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '40px', backdropFilter: 'blur(10px)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#60A5FA' }}>
            <LogIn size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px' }}>Join Meeting</h1>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>Please enter your full name to join the session and record your attendance.</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.85rem', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '8px' }}>Your Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Charles Smith"
                required
                style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '12px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', fontSize: '1rem', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#3B82F6'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', border: 'none', color: 'white', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.2s', marginTop: '8px' }}
          >
            {loading ? 'Joining...' : 'Join Meeting'}
          </button>
        </form>
      </div>
    </div>
  );
}
