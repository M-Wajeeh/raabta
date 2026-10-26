import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, HelpCircle, Layers } from 'lucide-react';

export default function MetricsBar({ metrics }) {
  if (!metrics) return null;

  const pct = metrics.completion_percentage || 0;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="metrics-banner">
      {/* Circular Progress Ring Card */}
      <div className="metric-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.2rem' }}>
        <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
          <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="28"
              cy="28"
              r={radius}
              fill="transparent"
              stroke="#e2e8f0"
              strokeWidth="5"
            />
            <circle
              cx="28"
              cy="28"
              r={radius}
              fill="transparent"
              stroke="#059669"
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#059669' }}>
            {pct}%
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="metric-label">
            <span>Preparedness Loop</span>
          </div>
          <div className="metric-sub" style={{ marginTop: '0.2rem' }}>
            <strong>{metrics.completed_tasks}</strong> of <strong>{metrics.total_tasks}</strong> tasks completed
          </div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">
          <span>In Progress</span>
          <Clock size={16} color="var(--accent-amber)" />
        </div>
        <div className="metric-value" style={{ color: 'var(--accent-amber)' }}>
          {metrics.in_progress_tasks}
        </div>
        <div className="metric-sub">
          Volunteers actively dispatched in field
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">
          <span>Critical Escalations</span>
          <AlertTriangle size={16} color="var(--accent-red)" />
        </div>
        <div className="metric-value" style={{ color: 'var(--accent-red)' }}>
          {metrics.escalated_tasks}
        </div>
        <div className="metric-sub">
          Bottlenecks escalated to coordinator
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">
          <span>Pending Dispatch</span>
          <Layers size={16} color="var(--accent-blue)" />
        </div>
        <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>
          {metrics.pending_tasks}
        </div>
        <div className="metric-sub">
          Awaiting field assignment
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">
          <span>Unverified Reports</span>
          <HelpCircle size={16} color="var(--accent-purple)" />
        </div>
        <div className="metric-value" style={{ color: 'var(--accent-purple)' }}>
          {metrics.unverified_reports_count}
        </div>
        <div className="metric-sub">
          Field hazard reports pending check
        </div>
      </div>
    </div>
  );
}
