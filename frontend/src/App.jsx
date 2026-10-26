import React, { useState, useEffect } from 'react';
import MetricsBar from './components/MetricsBar';
import AlertExtractor from './components/AlertExtractor';
import TaskBoard from './components/TaskBoard';
import IncidentFeed from './components/IncidentFeed';
import PrintableCards from './components/PrintableCards';
import ReliefView from './components/ReliefView';
import { api } from './api';
import { WifiOff, Wifi, Printer, Download } from 'lucide-react';
import './relief.css';

export default function App() {
  const [plan, setPlan] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [reports, setReports] = useState([]);
  const [isOffline, setIsOffline] = useState(api.isOfflineMode());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('map');

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
    if (confirm('Reset the demo to the seeded Multan and Muzaffargarh flood scenario?')) {
      await api.resetScenario(true);
      localStorage.removeItem('raabta_supply_runs');
      window.location.reload();
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

  const isPlanDraft = plan?.status === 'DRAFT_PENDING_APPROVAL';

  return (
    <div className={view === 'map' ? 'rl-shell' : 'app-container'}>
      <header className="rl-topbar no-print">
        <div className="rl-brand">
          <span className="rl-brand-name">Raabta</span>
          <span lang="ur" dir="rtl" className="rl-brand-ur">رابطہ</span>
        </div>
        <div className="rl-event">
          <strong>Pakistan floods 2025</strong>
          <span>GDACS orange flood alert since 14 Aug 2025</span>
        </div>
        <nav className="rl-tabs" aria-label="Views">
          <button aria-pressed={view === 'map'} onClick={() => setView('map')}>Relief map</button>
          <button aria-pressed={view === 'plan'} onClick={() => setView('plan')}>
            Action plan and tasks{isPlanDraft && <span className="rl-dot" aria-label="needs approval" />}
          </button>
        </nav>
        <div className="rl-top-actions">
          <button className="rl-btn rl-btn-ghost" onClick={handleToggleOffline} aria-pressed={isOffline}>
            {isOffline ? <WifiOff size={15} /> : <Wifi size={15} />}
            {isOffline ? 'Offline' : 'Online'}
          </button>
          <button className="rl-btn rl-btn-ghost" onClick={() => window.print()}><Printer size={15} />Print cards</button>
          <button className="rl-btn rl-btn-ghost" onClick={handleExport}><Download size={15} />Offline pack</button>
          <button className="rl-btn rl-btn-link" onClick={handleResetScenario}>Reset demo</button>
        </div>
      </header>

      {isOffline && (
        <div className="rl-offline no-print" role="status">
          <WifiOff size={16} />
          <span>Offline. Working from data saved on this device. Map photos may not load, but floodwater, districts and routes still show.</span>
        </div>
      )}

      {view === 'map' ? (
        <ReliefView
          locations={locations}
          reports={reports}
          isPlanDraft={isPlanDraft}
          onReportUpdated={handleReportUpdated}
        />
      ) : (
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
                isPlanDraft={isPlanDraft}
                onTaskUpdated={handleTaskUpdated}
              />
            </div>

            <IncidentFeed
              reports={reports}
              onReportUpdated={handleReportUpdated}
            />
          </div>
        </main>
      )}

      {/* Formatted printable cards rendered for Ctrl+P */}
      <PrintableCards
        plan={plan}
        tasks={plan?.tasks || []}
        volunteers={volunteers}
      />
    </div>
  );
}
