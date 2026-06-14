import React from 'react';
import { UserPlus, UserMinus, Calendar } from 'lucide-react';

interface Membership {
  id: string;
  user: {
    username: string;
    email: string;
  };
  joined_at: string;
  left_at: string | null;
}

interface GroupTimelineProps {
  memberships: Membership[];
}

export const GroupTimeline: React.FC<GroupTimelineProps> = ({ memberships }) => {
  const events: { date: Date; type: 'join' | 'leave'; user: string; text: string }[] = [];

  memberships.forEach(m => {
    events.push({
      date: new Date(m.joined_at),
      type: 'join',
      user: m.user.username,
      text: `${m.user.username} joined the group`
    });
    if (m.left_at) {
      events.push({
        date: new Date(m.left_at),
        type: 'leave',
        user: m.user.username,
        text: `${m.user.username} moved out/left the group`
      });
    }
  });

  const sortedEvents = events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Calendar size={18} style={{ color: 'var(--primary)' }} />
        <span>Membership Timeline</span>
      </h3>
      {sortedEvents.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No history found.</p>
      ) : (
        <div className="timeline">
          {sortedEvents.map((event, idx) => (
            <div key={idx} className="timeline-item">
              <div className={`timeline-dot ${event.type === 'leave' ? 'left' : ''}`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {event.type === 'join' ? (
                    <UserPlus size={14} style={{ color: 'var(--success)' }} />
                  ) : (
                    <UserMinus size={14} style={{ color: 'var(--error)' }} />
                  )}
                  {event.text}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {event.date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
