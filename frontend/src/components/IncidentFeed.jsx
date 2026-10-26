import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, PlusCircle, ShieldCheck } from 'lucide-react';
import { api } from '../api';

export default function IncidentFeed({ reports = [], onReportUpdated }) {
  const [showForm, setShowForm] = useState(false);
  const [hazardType, setHazardType] = useState('OBSTRUCTION');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [zone, setZone] = useState('Sector 4 Canal Corridor');
  const [submitting, setSubmitting] = useState(false);

  const safeReports = Array.isArray(reports) ? reports : (reports?.reports || reports?.data || []);

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

  const unverifiedCount = safeReports.filter((r) => r.status === 'UNVERIFIED').length;

  return (
    <div className="incident-feed-card">
      <div className="feed-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <AlertCircle size={18} color="var(--accent-amber)" />
          <h4 className="feed-title">Unmet Needs & Hazard Reports</h4>
          <span className="brand-badge" style={{ background: 'var(--accent-amber-bg)', color: 'var(--accent-amber)', borderColor: '#fef08a' }}>
            {unverifiedCount} unverified
          </span>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowForm(!showForm)}
        >
          <PlusCircle size={14} />
          <span>Report Need</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--bg-surface-subtle)', padding: '1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                Type
              </label>
              <select
                value={hazardType}
                onChange={(e) => setHazardType(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem' }}
              >
                <option value="OBSTRUCTION">Route Obstruction</option>
                <option value="TRANSPORT">Assisted Transport Needed</option>
                <option value="MEDICAL">Medical / Supply Shortage</option>
                <option value="SHELTER">Shelter Access Issue</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                Affected Zone
              </label>
              <input
                type="text"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
              Summary
            </label>
            <input
              type="text"
              placeholder="e.g. Fallen tree blocking Sector 4 underpass"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem' }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
              Details (Observed condition)
            </label>
            <textarea
              rows={2}
              placeholder="Note: Reports start as UNVERIFIED until physical coordinator verification."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              Submit Report (Marked Unverified)
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {safeReports.length === 0 ? (
          <div style={{ padding: '1.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No unmet needs reported yet.
          </div>
        ) : (
          safeReports.map((r) => {
            const isUnverified = r.status === 'UNVERIFIED';
            const isResolved = r.status === 'RESOLVED';
            return (
              <div key={r.id} className="incident-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', background: isUnverified ? 'var(--accent-amber-bg)' : 'var(--accent-green-bg)', color: isUnverified ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                      {r.status}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Zone: <strong>{r.location_zone}</strong>
                    </span>
                  </div>
                  <h5 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {r.title}
                  </h5>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                    {r.description}
                  </p>
                  {r.notes && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--accent-blue)', marginTop: '0.4rem', background: 'var(--accent-indigo-bg)', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-xs)' }}>
                      <strong>Coordinator Note:</strong> {r.notes}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginLeft: '1rem' }}>
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
