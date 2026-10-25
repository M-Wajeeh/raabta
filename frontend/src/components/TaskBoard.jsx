import React, { useState } from 'react';
import { CheckSquare, UserCheck, Play, CheckCircle, AlertTriangle, MapPin, ShieldAlert } from 'lucide-react';
import { api } from '../api';

export default function TaskBoard({ tasks = [], volunteers = [], isPlanDraft, onTaskUpdated }) {
  const [filter, setFilter] = useState('ALL');
  const [escalatingTaskId, setEscalatingTaskId] = useState(null);
  const [escalationReason, setEscalationReason] = useState('');
  const [assigningTaskId, setAssigningTaskId] = useState(null);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'ALL') return true;
    return t.status === filter;
  });

  const handleAssign = async (task) => {
    if (!selectedVolunteerId) return;
    const vol = volunteers.find((v) => v.id === selectedVolunteerId);
    if (!vol) return;

    setSubmitting(true);
    try {
      const updated = await api.updateTask(task.id, {
        status: 'ASSIGNED',
        assigned_to: vol.name,
        volunteer_id: vol.id
      });
      onTaskUpdated(updated);
      setAssigningTaskId(null);
      setSelectedVolunteerId('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartProgress = async (task) => {
    setSubmitting(true);
    try {
      const updated = await api.updateTask(task.id, { status: 'IN_PROGRESS' });
      onTaskUpdated(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (task) => {
    setSubmitting(true);
    try {
      const updated = await api.updateTask(task.id, { status: 'COMPLETED' });
      onTaskUpdated(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async (task) => {
    if (!escalationReason.trim()) {
      alert('An escalation reason is required to notify the coordinator of unmet needs.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await api.updateTask(task.id, {
        status: 'ESCALATED',
        escalation_reason: escalationReason
      });
      onTaskUpdated(updated);
      setEscalatingTaskId(null);
      setEscalationReason('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <CheckSquare size={18} color="var(--accent-green)" />
          <span>Community Preparedness Checklist & Tasks</span>
          <span className="badge badge-medium" style={{ marginLeft: '0.5rem' }}>
            {tasks.length} standard tasks
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED'].map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(s)}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {isPlanDraft && (
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fde68a', padding: '0.65rem 1rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={16} />
          <span>Plan in draft status. Approve the plan above to unlock volunteer task dispatching.</span>
        </div>
      )}

      <div className="task-list">
        {filteredTasks.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No tasks found matching filter: {filter}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div key={task.id} className="task-card">
              <div className="task-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="task-code">{task.task_code}</span>
                    <span className={`badge badge-${task.priority.toLowerCase()}`}>
                      {task.priority} Priority
                    </span>
                    <span className={`badge badge-${task.status.toLowerCase()}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="task-title">{task.title}</h4>
                </div>
              </div>

              <div className="task-desc">{task.description}</div>

              <div className="task-meta">
                <span className="location-tag">
                  <MapPin size={12} style={{ display: 'inline', marginRight: '3px' }} />
                  {task.location_status}
                </span>

                {task.assigned_to && (
                  <span style={{ color: '#93c5fd', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <UserCheck size={12} /> Assigned: <strong>{task.assigned_to}</strong>
                  </span>
                )}
              </div>

              {task.status === 'ESCALATED' && task.escalation_reason && (
                <div style={{ background: 'var(--accent-red-bg)', borderLeft: '3px solid #ef4444', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', color: '#fca5a5' }}>
                  <strong>Escalation / Unmet Need:</strong> {task.escalation_reason}
                </div>
              )}

              {/* Action Buttons */}
              <div className="task-actions">
                {task.status === 'PENDING' && (
                  <>
                    {assigningTaskId === task.id ? (
                      <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
                        <select
                          value={selectedVolunteerId}
                          onChange={(e) => setSelectedVolunteerId(e.target.value)}
                          style={{ flex: 1, padding: '0.35rem', background: '#0f172a', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.8rem' }}
                        >
                          <option value="">Select Volunteer...</option>
                          {volunteers.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} ({v.role} · {v.zone})
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAssign(task)}
                          disabled={submitting || !selectedVolunteerId}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setAssigningTaskId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={isPlanDraft}
                        onClick={() => setAssigningTaskId(task.id)}
                        title={isPlanDraft ? 'Coordinator approval required' : 'Assign to field volunteer'}
                      >
                        <UserCheck size={14} />
                        <span>Assign Volunteer</span>
                      </button>
                    )}
                  </>
                )}

                {task.status === 'ASSIGNED' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={isPlanDraft || submitting}
                    onClick={() => handleStartProgress(task)}
                  >
                    <Play size={14} />
                    <span>Start Execution</span>
                  </button>
                )}

                {(task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') && (
                  <>
                    <button
                      className="btn btn-success btn-sm"
                      disabled={isPlanDraft || submitting}
                      onClick={() => handleComplete(task)}
                    >
                      <CheckCircle size={14} />
                      <span>Mark Complete</span>
                    </button>

                    <button
                      className="btn btn-danger btn-sm"
                      disabled={isPlanDraft || submitting}
                      onClick={() => setEscalatingTaskId(task.id)}
                    >
                      <AlertTriangle size={14} />
                      <span>Escalate Need</span>
                    </button>
                  </>
                )}

                {task.status === 'ESCALATED' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={isPlanDraft || submitting}
                    onClick={() => setAssigningTaskId(task.id)}
                  >
                    <span>Re-assign / Update</span>
                  </button>
                )}
              </div>

              {/* Escalation Reason Modal / Box */}
              {escalatingTaskId === task.id && (
                <div style={{ marginTop: '0.5rem', background: '#1e1b2e', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fca5a5', marginBottom: '0.25rem' }}>
                    Describe Unresolved Barrier or Unmet Supply Need:
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Depot stock depleted, water level too high, extra truck needed..."
                    value={escalationReason}
                    onChange={(e) => setEscalationReason(e.target.value)}
                    style={{ width: '100%', padding: '0.4rem', background: '#0b1120', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', marginBottom: '0.5rem' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleEscalate(task)}
                      disabled={submitting || !escalationReason.trim()}
                    >
                      Submit Escalation
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setEscalatingTaskId(null); setEscalationReason(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
