import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MetricsBar from './components/MetricsBar';
import AlertExtractor from './components/AlertExtractor';
import TaskBoard from './components/TaskBoard';
import MapView from './components/MapView';
import IncidentFeed from './components/IncidentFeed';
import PrintableCards from './components/PrintableCards';
import { api } from './api';
import { WifiOff, AlertTriangle } from 'lucide-react';

export default function App() {
  const [plan, setPlan] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [reports, setReports] = useState([]);
  const [isOffline, setIsOffline] = useState(api.isOfflineMode());
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [currentPlan, currentMetrics, volList, locList, repList] = await Promise.all([
        api.getCurrentPlan().catch(() => null),
        api.getMetrics().catch(() => null),
        api.getVolunteers().catch(() => []),
        api.getLocations().catch(() => []),
        api.getReports().catch(() => [])
      ]);

      if (currentPlan) setPlan(currentPlan);
      if (currentMetrics) setMetrics(currentMetrics);
      setVolunteers(volList || []);
      setLocations(locList || []);
      setReports(repList || []);
    } catch (err) {
      console.error('Data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for browser online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleToggleOffline = () => {
    const nextVal = !isOffline;
    setIsOffline(nextVal);
    api.setOfflineMode(nextVal);
  };

  const handleResetScenario = async () => {
    if (confirm('Reset scenario to seeded Riverside District Flash Flood baseline?')) {
      await api.resetScenario(true);
      await loadData();
    }
  };

  const handleExport = async () => {
    try {
      const data = await api.getExportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `raabta_offline_pack_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const handlePlanUpdated = async (updatedPlan) => {
    setPlan(updatedPlan);
    const newMetrics = await api.getMetrics().catch(() => null);
    if (newMetrics) setMetrics(newMetrics);
  };

  const handleTaskUpdated = async (updatedTask) => {
    if (plan) {
      const updatedTasks = plan.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
      setPlan({ ...plan, tasks: updatedTasks });
    }
    const newMetrics = await api.getMetrics().catch(() => null);
    if (newMetrics) setMetrics(newMetrics);
  };

  const handleReportUpdated = async () => {
    const [repList, newMetrics] = await Promise.all([
      api.getReports().catch(() => []),
      api.getMetrics().catch(() => null)
    ]);
    setReports(repList);
    if (newMetrics) setMetrics(newMetrics);
  };

  return (
    <div className="app-container">
      <Header
        isOffline={isOffline}
        onToggleOffline={handleToggleOffline}
        onResetScenario={handleResetScenario}
        onExport={handleExport}
      />

      {isOffline && (
        <div style={{ background: '#78350f', borderBottom: '1px solid #b45309', padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#fef3c7' }}>
          <WifiOff size={16} />
          <span>
            <strong>Offline Field Mode Active:</strong> Operating from local cached action plan and offline storage. Changes persist locally.
          </span>
        </div>
      )}

      <main className="main-content">
        <MetricsBar metrics={metrics} />

        <AlertExtractor
          plan={plan}
          onPlanUpdated={handlePlanUpdated}
          isOffline={isOffline}
        />

        <div className="main-grid">
          <div>
            <TaskBoard
              tasks={plan?.tasks || []}
              volunteers={volunteers}
              isPlanDraft={plan?.status === 'DRAFT_PENDING_APPROVAL'}
              onTaskUpdated={handleTaskUpdated}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <MapView locations={locations} reports={reports} />
            <IncidentFeed
              reports={reports}
              onReportUpdated={handleReportUpdated}
            />
          </div>
        </div>
      </main>

      {/* Formatted printable cards rendered for Ctrl+P */}
      <PrintableCards
        plan={plan}
        tasks={plan?.tasks || []}
        volunteers={volunteers}
      />
    </div>
  );
}
