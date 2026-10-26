import React, { useState } from 'react';
import { api } from '../api';
import { DEPOTS, CAMP_NEEDS, RUN_STATUS } from '../scenario';

const NEXT_ACTION = {
  ready: { label: 'Approve and dispatch', next: 'enroute' },
  enroute: { label: 'Mark delivered', next: 'delivered' },
  blocked: { label: 'Plan boat transfer', next: 'boat' },
  boat: { label: 'Mark delivered', next: 'delivered' }
};

export default function SupplyPanel({
  districts, routes, locations, reports, runs, isPlanDraft,
  selectedRunId, onSelectRun, onRunAction, onFocusDistrict, onReportUpdated
}) {
  const [error, setError] = useState('');

  const worst = (districts?.features || [])
    .filter((f) => f.properties.floodKm2 > 0)
    .sort((a, b) => b.properties.floodKm2 - a.properties.floodKm2)
    .slice(0, 6);
  const maxKm2 = worst[0]?.properties.floodKm2 || 1;

  const routeFacts = (runId) => routes?.features.find((f) => f.properties.id === runId && f.properties.kind === 'route')?.properties;
  const campName = (campId) => locations.find((l) => l.id === campId)?.zone || campId;

  const handleVerify = async (reportId, status) => {
    setError('');
    try {
      await api.verifyReport(reportId, status, 'Coordinator S. Malik', 'Checked by a field volunteer.');
      onReportUpdated();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="rl-panel-scroll">
      <section aria-labelledby="rl-worst" className="rl-section">
        <h2 id="rl-worst">Most flooded districts</h2>
        <p className="rl-muted">Land under water on the 26 Aug to 7 Sep satellite passes. Select one to zoom in.</p>
        <ul className="rl-list">
          {worst.map((f) => (
            <li key={f.properties.name}>
              <button className="rl-district" onClick={() => onFocusDistrict(f.properties.name)}>
                <span className="rl-row">
                  <span><strong>{f.properties.name}</strong> <span className="rl-muted">{f.properties.province}</span></span>
                  <span>{f.properties.floodKm2.toLocaleString()} km²</span>
                </span>
                <span className="rl-bar"><span style={{ width: `${(f.properties.floodKm2 / maxKm2) * 100}%` }} /></span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="rl-runs" className="rl-section">
        <h2 id="rl-runs">Supply runs</h2>
        {runs.map((run) => {
          const facts = routeFacts(run.id);
          const status = RUN_STATUS[run.status];
          const action = NEXT_ACTION[run.status];
          const gated = run.status === 'ready' && isPlanDraft;
          const from = DEPOTS.find((d) => d.id === run.from)?.name.replace(' depot', '');
          return (
            <article
              key={run.id}
              className={`rl-run rl-run-${run.status}${run.id === selectedRunId ? ' rl-selected' : ''}`}
            >
              <button className="rl-run-head" onClick={() => onSelectRun(run.id)} aria-pressed={run.id === selectedRunId}>
                <span className="rl-run-title">{from} to {campName(run.campId)}</span>
                <span className="rl-status" style={{ color: status.color }}>{status.label}</span>
              </button>
              <p>
                {run.load}.
                {facts && ` ${facts.km} km by road, about ${facts.minutes} min.`}
                {facts?.kmInFlood > 0 && <strong> {facts.kmInFlood} km of the road is under water.</strong>}
                {run.driver && run.status === 'enroute' && ` Driver ${run.driver}.`}
              </p>
              {action && (
                <button
                  className={`rl-btn${run.status === 'blocked' ? ' rl-btn-danger' : ''}`}
                  disabled={gated}
                  onClick={() => onRunAction(run.id, action.next)}
                >
                  {action.label}
                </button>
              )}
              {gated && <p className="rl-muted">Approve the action plan first.</p>}
            </article>
          );
        })}
      </section>

      <section aria-labelledby="rl-needs" className="rl-section">
        <h2 id="rl-needs">Food packs per camp</h2>
        {locations.map((loc) => {
          const need = CAMP_NEEDS[loc.id];
          if (!need) return null;
          const campRuns = runs.filter((r) => r.campId === loc.id);
          const delivered = campRuns.filter((r) => r.status === 'delivered').reduce((n, r) => n + r.foodPacks, 0);
          const moving = campRuns.filter((r) => r.status === 'enroute' || r.status === 'boat').reduce((n, r) => n + r.foodPacks, 0);
          return (
            <div key={loc.id} className="rl-need">
              <span className="rl-row">
                <span>{loc.zone}</span>
                <span className={delivered === 0 && moving === 0 ? 'rl-alert' : 'rl-muted'}>
                  {delivered} of {need}{moving > 0 && `, ${moving} on the way`}
                </span>
              </span>
              <span className="rl-bar rl-bar-need">
                <span style={{ width: `${Math.min(100, (delivered / need) * 100)}%` }} />
                <span className="rl-bar-moving" style={{ width: `${Math.min(100, (moving / need) * 100)}%` }} />
              </span>
            </div>
          );
        })}
      </section>

      <section aria-labelledby="rl-field" className="rl-section">
        <h2 id="rl-field">From the field</h2>
        {error && <p className="rl-alert" role="alert">{error}</p>}
        {reports.length === 0 && <p className="rl-muted">No reports yet.</p>}
        {reports.map((r) => (
          <article key={r.id} className={`rl-report${r.status === 'UNVERIFIED' ? ' rl-report-open' : ''}`}>
            <span className="rl-row">
              <strong>{r.title}</strong>
              <span className="rl-muted">{r.status === 'UNVERIFIED' ? 'Not verified' : r.status.toLowerCase()}</span>
            </span>
            <p className="rl-muted">{r.location_zone}. {r.description}</p>
            {r.status === 'UNVERIFIED' && (
              <span className="rl-actions">
                <button className="rl-btn rl-btn-light" onClick={() => handleVerify(r.id, 'VERIFIED')}>Verify</button>
                <button className="rl-btn rl-btn-ghost" onClick={() => handleVerify(r.id, 'REJECTED')}>Reject</button>
              </span>
            )}
          </article>
        ))}
      </section>

      <p className="rl-footnote">
        Floodwater, district borders and road distances are real. Depots, stock, camp needs and supply runs are sample data for the demo.
      </p>
    </div>
  );
}
