import React, { useCallback, useEffect, useState } from 'react';
import ReliefMap from './ReliefMap';
import SupplyPanel from './SupplyPanel';
import { SUPPLY_RUNS } from '../scenario';

const RUNS_KEY = 'raabta_supply_runs';

function loadRuns() {
  try {
    const saved = JSON.parse(localStorage.getItem(RUNS_KEY));
    if (Array.isArray(saved) && saved.length === SUPPLY_RUNS.length) return saved;
  } catch {
    // fall through to the seeded runs
  }
  return SUPPLY_RUNS;
}

export default function ReliefView({ locations, reports, isPlanDraft, onReportUpdated }) {
  const [districts, setDistricts] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [runs, setRuns] = useState(loadRuns);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [focus, setFocus] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/districts.geojson').then((r) => r.json()),
      fetch('/data/routes.geojson').then((r) => r.json())
    ])
      .then(([d, r]) => {
        setDistricts(d);
        setRoutes(r);
      })
      .catch(() => setLoadError('Map layers could not be loaded. Floodwater and districts are missing.'));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
    } catch {
      // storage unavailable: runs still work for this session
    }
  }, [runs]);

  const handleRunAction = (runId, next) => {
    setRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, status: next } : r)));
  };

  const selectRun = useCallback((runId) => {
    setSelectedRunId(runId);
    setFocus({ kind: 'ops' });
  }, []);

  return (
    <div className="rl-body">
      <section className="rl-map-col" aria-label="Map">
        <div className="rl-map-wrap">
          <ReliefMap
            districts={districts}
            routes={routes}
            locations={locations}
            reports={reports}
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={selectRun}
            focus={focus}
          />
          <div className="rl-map-tools">
            <button className="rl-btn rl-btn-glass" onClick={() => setFocus({ kind: 'pakistan' })}>All Pakistan</button>
            <button className="rl-btn rl-btn-glass" onClick={() => setFocus({ kind: 'ops' })}>Multan relief operation</button>
          </div>
          {loadError && <p className="rl-map-error" role="alert">{loadError}</p>}
        </div>
        <div className="rl-legend">
          <span><i className="rl-key" style={{ background: '#40C8FF' }} />Floodwater seen by satellite, 26 Aug to 7 Sep 2025</span>
          <span><i className="rl-key" style={{ background: 'rgba(255,138,61,0.55)' }} />District shading: more flooded land</span>
          <span><i className="rl-key rl-key-line" style={{ background: '#F2A93B' }} />Supply route</span>
          <span><i className="rl-key rl-key-line rl-key-wet" />Road under water</span>
          <span className="rl-legend-src">Water: UNOSAT (preliminary). Roads: OpenStreetMap via OSRM. Borders: OCHA and WFP. Imagery: Esri.</span>
        </div>
      </section>
      <aside className="rl-panel">
        <SupplyPanel
          districts={districts}
          routes={routes}
          locations={locations}
          reports={reports}
          runs={runs}
          isPlanDraft={isPlanDraft}
          selectedRunId={selectedRunId}
          onSelectRun={selectRun}
          onRunAction={handleRunAction}
          onFocusDistrict={(name) => setFocus({ kind: 'district', name })}
          onReportUpdated={onReportUpdated}
        />
      </aside>
    </div>
  );
}
