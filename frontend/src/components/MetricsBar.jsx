import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, HelpCircle, Layers } from 'lucide-react';

export default function MetricsBar({ metrics }) {
  if (!metrics) return null;

  return (
    <div className="metrics-banner">
      <div className="metric-card">
        <div className="metric-label">
          <span>Completion Loop</span>
          <CheckCircle2 size={16} color="var(--accent-green)" />
        </div>
        <div className="metric-value" style={{ color: 'var(--accent-green)' }}>
          {metrics.completion_percentage}%
        </div>
        <div className="metric-sub">
          {metrics.completed_tasks} of {metrics.total_tasks} preparedness tasks completed
        </div>
        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${metrics.completion_percentage}%` }}></div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">
          <span>In Progress</span>
          <Clock size={16} color="var(--accent-amber)" />
        </div>
        <div className="metric-value" style={{ color: '#fbbf24' }}>
          {metrics.in_progress_tasks}
        </div>
        <div className="metric-sub">
          Volunteers currently executing assigned tasks
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">
          <span>Escalations</span>
          <AlertTriangle size={16} color="var(--accent-red)" />
        </div>
        <div className="metric-value" style={{ color: '#f87171' }}>
          {metrics.escalated_tasks}
        </div>
        <div className="metric-sub">
          Unmet needs escalated to coordinator
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">
          <span>Pending Assignment</span>
          <Layers size={16} color="var(--accent-cyan)" />
        </div>
        <div className="metric-value" style={{ color: '#38bdf8' }}>
          {metrics.pending_tasks}
        </div>
        <div className="metric-sub">
          Awaiting volunteer dispatch
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">
          <span>Unverified Reports</span>
          <HelpCircle size={16} color="#c084fc" />
        </div>
        <div className="metric-value" style={{ color: '#c084fc' }}>
          {metrics.unverified_reports_count}
        </div>
        <div className="metric-sub">
          Field hazard reports pending coordinator check
        </div>
      </div>
    </div>
  );
}
