import React from 'react';
import { ShieldAlert, Wifi, WifiOff, RotateCcw, Printer, Download, Sparkles } from 'lucide-react';

export default function Header({ isOffline, onToggleOffline, onResetScenario, onExport }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand-section">
          <div className="brand-logo-icon">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="brand-title">
              Raabta
              <span className="brand-badge">Clarity Edition</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Civic Resilience & Autonomous Emergency Preparedness Loop
            </div>
          </div>
        </div>

        <div className="nav-actions">
          <button
            className={`status-pill ${isOffline ? 'status-offline' : 'status-online'}`}
            onClick={onToggleOffline}
            title="Toggle between Live EOC server mode and Weak Connectivity Offline Cache"
          >
            {isOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
            <span>{isOffline ? 'Offline Field Cache' : 'Live EOC Operations'}</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={onExport}
            title="Download offline checklist & task sheet"
          >
            <Download size={14} />
            <span>Export Pack</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => window.print()}
            title="Print emergency action cards for field runners"
          >
            <Printer size={14} />
            <span>Print Cards</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={onResetScenario}
            title="Reset to 2-minute seeded Riverside flood demo state"
          >
            <RotateCcw size={14} />
            <span>2-Min Demo Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
}
