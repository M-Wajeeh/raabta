import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, PlusCircle, HelpCircle, ShieldCheck } from 'lucide-react';
import { api } from '../api';

export default function IncidentFeed({ reports = [], onReportUpdated }) {
  const [showForm, setShowForm] = useState(false);
  const [hazardType, setHazardType] = useState('OBSTRUCTION');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [zone, setZone] = useState('Sector 4 Canal Corridor');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) return;
    setSubmitting(true);
    try {
      const created = await api.submitReport({
        hazard_type: hazardType,
        title,
        description: desc,
        location_zone: zone
      });
      onReportUpdated(created);
      setTitle('');
      setDesc('');
      setShowForm(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (reportId, newStatus) => {
    try {
      const updated = await api.verifyReport(
        reportId,
        newStatus,
        'Coordinator S. Malik',
        'Verified via physical field responder check.'
      );
      onReportUpdated(updated);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <AlertCircle size={18} color="var(--accent-amber)" />
          <span>Unmet Needs & Hazard Reports</span>
          <span className="badge badge-urgent" style={{ marginLeft: '0.5rem' }}>
            {reports.filter((r) => r.status === 'UNVERIFIED').length} unverified
          </span>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowForm(!showForm)}
        >
          <PlusCircle size={14} />
          <span>Report Need / Hazard</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Type
              </label>
              <select
                value={hazardType}
                onChange={(e) => setHazardType(e.target.value)}
                style={{ width: '100%', padding: '0.4rem', background: '#0b1120', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.8rem' }}
              >
                <option value="OBSTRUCTION">Route Obstruction</option>
                <option value="TRANSPORT">Assisted Transport Needed</option>
                <option value="MEDICAL">Medical / Supply Shortage</option>
                <option value="SHELTER">Shelter Access Issue</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Affected Zone
              </label>
              <input
                type="text"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                style={{ width: '100%', padding: '0.4rem', background: '#0b1120', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.8rem' }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Summary
            </label>
            <input
              type="text"
              placeholder="e.g. Fallen tree blocking Sector 4 underpass"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', background: '#0b1120', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.8rem' }}
              required
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Details (Observed condition)
            </label>
            <textarea
              rows={2}
              placeholder="Note: Reports start as UNVERIFIED until physical coordinator verification."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', background: '#0b1120', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.8rem' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              Submit Report (Marked Unverified)
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div>
        {reports.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No unmet needs reported yet.
          </div>
        ) : (
          reports.map((r) => {
            const isUnverified = r.status === 'UNVERIFIED';
            const isResolved = r.status === 'RESOLVED';
            return (
              <div key={r.id} className={`report-item ${!isUnverified ? 'verified' : ''}`}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: isUnverified ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: isUnverified ? '#fbbf24' : '#34d399' }}>
                      {r.status}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Zone: <strong>{r.location_zone}</strong>
                    </span>
                  </div>
                  <h5 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {r.title}
                  </h5>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '0.2rem' }}>
                    {r.description}
                  </p>
                  {r.notes && (
                    <div style={{ fontSize: '0.75rem', color: '#93c5fd', marginTop: '0.35rem' }}>
                      <strong>Coordinator Note:</strong> {r.notes}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {isUnverified && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleVerify(r.id, 'VERIFIED')}
                      title="Verify after ground check"
                    >
                      <ShieldCheck size={12} />
                      <span>Verify</span>
                    </button>
                  )}
                  {!isResolved && (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleVerify(r.id, 'RESOLVED')}
                      title="Mark need as resolved"
                    >
                      <CheckCircle2 size={12} />
                      <span>Resolve</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
