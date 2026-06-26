import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Video, Clock, ExternalLink } from 'lucide-react';

export default function CalendarWidget({ meetings = [], title = "Training & Meetings Schedule" }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get start day of month and number of days in month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Handle month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Convert meetings list to a quick lookup map by local date string (YYYY-MM-DD)
  const meetingsByDate = meetings.reduce((map, meeting) => {
    if (!meeting.scheduledAt) return map;
    // Parse scheduled date in local timezone
    const dateStr = new Date(meeting.scheduledAt).toISOString().split('T')[0];
    if (!map[dateStr]) map[dateStr] = [];
    map[dateStr].push(meeting);
    return map;
  }, {});

  // Generate calendar grid array
  const calendarDays = [];
  // Empty slots before first day of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper to construct local date string for comparisons
  const makeDateStr = (day) => {
    if (!day) return '';
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const selectedDayMeetings = meetingsByDate[selectedDateStr] || [];

  return (
    <div className="glass-card" style={{
      background: 'rgba(255, 255, 255, 0.45)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      height: '100%',
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Calendar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#071B36', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarIcon size={18} color="#F36F21" />
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button"
            onClick={handlePrevMonth}
            style={{ background: 'rgba(0,0,0,0.03)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#071B36', minWidth: '100px', textAlign: 'center' }}>
            {monthNames[month]} {year}
          </span>
          <button 
            type="button"
            onClick={handleNextMonth}
            style={{ background: 'rgba(0,0,0,0.03)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Week Day Labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((dayLabel, idx) => (
          <div key={idx} style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8', padding: '4px 0' }}>
            {dayLabel}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {calendarDays.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} style={{ padding: '8px 0' }} />;
          }

          const dateStr = makeDateStr(day);
          const hasMeetings = !!meetingsByDate[dateStr];
          const isSelected = dateStr === selectedDateStr;
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={() => setSelectedDateStr(dateStr)}
              style={{
                borderRadius: '8px',
                padding: '8px 0',
                background: isSelected 
                  ? 'linear-gradient(135deg, #F36F21 0%, #E05A0E 100%)' 
                  : hasMeetings 
                    ? 'rgba(243, 111, 33, 0.1)' 
                    : isToday 
                      ? 'rgba(37, 99, 235, 0.08)' 
                      : 'transparent',
                color: isSelected 
                  ? '#FFFFFF' 
                  : hasMeetings 
                    ? '#E05A0E' 
                    : isToday 
                      ? '#2563EB' 
                      : '#1E293B',
                fontWeight: (hasMeetings || isSelected || isToday) ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 4px 10px rgba(243,111,33,0.3)' : 'none',
                border: isToday && !isSelected ? '1px solid rgba(37, 99, 235, 0.3)' : 'none'
              }}
              onMouseOver={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                }
              }}
              onMouseOut={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = hasMeetings 
                    ? 'rgba(243, 111, 33, 0.1)' 
                    : isToday 
                      ? 'rgba(37, 99, 235, 0.08)' 
                      : 'transparent';
                }
              }}
            >
              {day}
              {hasMeetings && !isSelected && (
                <span style={{
                  position: 'absolute',
                  bottom: '3px',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: '#F36F21'
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Date Meetings Panel */}
      <div style={{
        marginTop: '8px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        flex: 1,
        minHeight: '110px',
        maxHeight: '220px',
        overflowY: 'auto'
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Schedule for {new Date(selectedDateStr).toLocaleDateString([], { dateStyle: 'medium' })}
        </div>
        
        {selectedDayMeetings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedDayMeetings.map((meeting) => {
              const timeStr = new Date(meeting.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={meeting.id} style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.65)',
                  border: '1px solid rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ fontSize: '0.8rem', color: '#071B36', fontWeight: 700 }}>{meeting.title}</strong>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      background: 'rgba(243, 111, 33, 0.08)',
                      color: '#F36F21',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}>
                      {meeting.Project?.name || 'Global'}
                    </span>
                  </div>
                  {meeting.description && (
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{meeting.description}</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.7rem', color: '#94A3B8' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={12} />
                      {timeStr}
                    </span>
                    {meeting.url && (
                      <a 
                        href={meeting.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}
                      >
                        Join Meeting <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic' }}>
            No training meetings scheduled.
          </div>
        )}
      </div>
    </div>
  );
}
