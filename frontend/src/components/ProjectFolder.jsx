import React, { useState } from 'react';
import {
  Folder, FolderOpen, ChevronDown, ChevronRight, Play, Edit3,
  Trash2, WifiOff, Clock, Users, CheckCircle2, AlertCircle, ExternalLink,
  Layers, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Reusable ProjectFolder Component
 * Provides authoritative ID-based grouping (Project -> Quizzes / Sessions)
 * Eliminates flat lists and name-string matching.
 */
export default function ProjectFolder({
  project,
  items = [],
  type = 'quizzes', // 'quizzes' | 'sessions'
  defaultExpanded = false,
  offlineBaseUrl = '',
  onOpenOfflineModal,
  onDeleteQuiz,
  onHostQuiz,
  onLaunchSession
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const navigate = useNavigate();

  const projectName = project?.name || 'General Projects';
  const clientName = project?.Client?.name || project?.clientName || null;
  const subprojectCount = project?.subprojects?.length || (project?.subProjects ? project.subProjects.length : 0);
  const itemCount = items.length;

  return (
    <div
      style={{
        background: 'var(--bg-glass)',
        border: isExpanded ? '1px solid #2563EB' : '1px solid #B7BEC7',
        borderRadius: '14px',
        marginBottom: '14px',
        overflow: 'hidden',
        boxShadow: isExpanded ? '0 6px 20px rgba(37,99,235,0.08)' : '0 2px 6px rgba(0,0,0,0.02)',
        transition: 'all 0.2s ease'
      }}
    >
      {/* ─── FOLDER HEADER (CLICKABLE ACCORDION) ─── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: isExpanded ? 'rgba(37,99,235,0.04)' : 'transparent',
          cursor: 'pointer',
          userSelect: 'none',
          gap: '12px',
          transition: 'background 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: isExpanded ? 'rgba(37,99,235,0.12)' : 'rgba(100,116,139,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isExpanded ? '#2563EB' : 'var(--text-secondary)',
              flexShrink: 0
            }}
          >
            {isExpanded ? <FolderOpen size={20} /> : <Folder size={20} />}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: '0.96rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.2px'
                }}
              >
                {projectName}
              </h4>
              {clientName && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(6,182,212,0.1)',
                    color: '#0891B2',
                    border: '1px solid rgba(6,182,212,0.2)'
                  }}
                >
                  {clientName}
                </span>
              )}
              {subprojectCount > 0 && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {subprojectCount} Subprojects
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {project?.code ? `Code: ${project.code} • ` : ''}
              <span>{itemCount} {type === 'quizzes' ? (itemCount === 1 ? 'Quiz' : 'Quizzes') : (itemCount === 1 ? 'Session' : 'Sessions')}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.74rem',
              fontWeight: 700,
              background: itemCount > 0 ? 'rgba(37,99,235,0.1)' : 'var(--bg-tertiary)',
              color: itemCount > 0 ? '#2563EB' : 'var(--text-secondary)'
            }}
          >
            {itemCount}
          </span>
          <div style={{ color: 'var(--text-secondary)' }}>
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
        </div>
      </div>

      {/* ─── EXPANDED FOLDER CONTENT ─── */}
      {isExpanded && (
        <div style={{ padding: '8px 16px 16px 16px', borderTop: '1px solid rgba(183,190,199,0.25)' }}>
          {items.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '8px',
                marginTop: '8px'
              }}
            >
              No {type === 'quizzes' ? 'quizzes' : 'training sessions'} configured under <strong>{projectName}</strong> yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {type === 'quizzes' ? (
                // ─── QUIZZES LISTING ───
                items.map(quiz => {
                  const now = new Date();
                  const start = quiz.config?.offlineStartTime ? new Date(quiz.config.offlineStartTime) : null;
                  const end = quiz.config?.offlineEndTime ? new Date(quiz.config.offlineEndTime) : null;
                  const linkUrl = `${offlineBaseUrl || window.location.origin}/offline-quiz/${quiz.id}`;

                  let offlineBadge = null;
                  if (quiz.config?.isOffline) {
                    if (start && now < start) {
                      offlineBadge = (
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '4px', fontWeight: 700 }}>
                          ⏰ Scheduled Offline
                        </span>
                      );
                    } else if (end && now > end) {
                      offlineBadge = (
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '4px', fontWeight: 700 }}>
                          🚫 Expired
                        </span>
                      );
                    } else {
                      offlineBadge = (
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', fontWeight: 700 }}>
                          🟢 Offline Active
                        </span>
                      );
                    }
                  }

                  return (
                    <div
                      key={quiz.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '10px',
                        border: '1px solid #B7BEC7',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {quiz.title}
                          </h5>
                          {quiz.subProjectName && (
                            <span style={{ fontSize: '0.68rem', background: 'rgba(59,130,246,0.1)', color: '#2563EB', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {quiz.subProjectName}
                            </span>
                          )}
                          {offlineBadge}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          <span>{quiz.questions ? quiz.questions.length : 0} Questions</span>
                          {quiz.config?.isOffline && (
                            <a
                              href={linkUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#2563EB', textDecoration: 'underline', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              🔗 Open Quiz Link
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {onOpenOfflineModal && (
                          <button
                            onClick={() => onOpenOfflineModal(quiz)}
                            style={{
                              padding: '5px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.76rem',
                              borderRadius: '6px',
                              border: '1px solid #B7BEC7',
                              background: 'var(--bg-glass)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                            title="Configure Offline Mode"
                          >
                            <WifiOff size={13} /> Offline
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (onHostQuiz) onHostQuiz(quiz);
                            else navigate(`/host/${quiz.id}`);
                          }}
                          style={{
                            padding: '6px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                            border: 'none',
                            color: 'white',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Play size={13} fill="white" /> Host Live
                        </button>

                        <button
                          onClick={() => navigate(`/builder/${quiz.id}`)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #B7BEC7',
                            background: 'var(--bg-glass)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                          title="Edit Quiz"
                        >
                          <Edit3 size={13} />
                        </button>

                        {onDeleteQuiz && (
                          <button
                            onClick={() => onDeleteQuiz(quiz.id)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(239,68,68,0.2)',
                              background: 'rgba(239,68,68,0.05)',
                              color: '#EF4444',
                              cursor: 'pointer'
                            }}
                            title="Delete Quiz"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                // ─── SESSIONS LISTING ───
                items.map((session, idx) => {
                  const isLive = session.status === 'Ongoing' || session.isLive;
                  return (
                    <div
                      key={session.id || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '10px',
                        border: '1px solid #B7BEC7',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {session.title || 'Training Batch'}
                          </h5>
                          {isLive ? (
                            <span style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'rgba(239,68,68,0.12)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', fontWeight: 800 }}>
                              🔴 LIVE NOW
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'rgba(100,116,139,0.1)', color: 'var(--text-secondary)', borderRadius: '4px', fontWeight: 600 }}>
                              {session.platform === 'jitsi' ? 'Jitsi Meet' : 'Google Meet'}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {session.scheduledAt ? new Date(session.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Flexible'}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={12} />
                            {session.inviteeCount || (session.participants ? session.participants.length : 0)} Enrolled
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={() => {
                            if (onLaunchSession) onLaunchSession(session);
                            else if (session.url) window.open(session.url, '_blank');
                            else navigate('/attendance');
                          }}
                          style={{
                            padding: '6px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            background: '#2563EB',
                            border: 'none',
                            color: 'white',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Play size={13} fill="white" /> Launch Session
                        </button>

                        <button
                          onClick={() => navigate('/attendance')}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #B7BEC7',
                            background: 'var(--bg-glass)',
                            color: 'var(--text-primary)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Roster
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
