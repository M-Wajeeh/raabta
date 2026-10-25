/**
 * Raabta API Client with Offline LocalStorage Resilience.
 * Seamlessly stores active action plans and checklists locally so
 * volunteers can operate even with unreliable connectivity.
 */

const CACHE_KEYS = {
  CURRENT_PLAN: 'raabta_cached_plan',
  METRICS: 'raabta_cached_metrics',
  VOLUNTEERS: 'raabta_cached_volunteers',
  REPORTS: 'raabta_cached_reports',
  LOCATIONS: 'raabta_cached_locations',
  OFFLINE_MODE: 'raabta_offline_simulated'
};

export const api = {
  isOfflineMode: () => {
    return localStorage.getItem(CACHE_KEYS.OFFLINE_MODE) === 'true' || !navigator.onLine;
  },

  setOfflineMode: (val) => {
    localStorage.setItem(CACHE_KEYS.OFFLINE_MODE, val ? 'true' : 'false');
  },

  async getCurrentPlan() {
    if (this.isOfflineMode()) {
      const cached = localStorage.getItem(CACHE_KEYS.CURRENT_PLAN);
      if (cached) return JSON.parse(cached);
    }
    try {
      const res = await fetch('/api/action-plans/current');
      if (!res.ok) throw new Error('Failed to fetch plan');
      const data = await res.json();
      localStorage.setItem(CACHE_KEYS.CURRENT_PLAN, JSON.stringify(data));
      return data;
    } catch (err) {
      const cached = localStorage.getItem(CACHE_KEYS.CURRENT_PLAN);
      if (cached) return JSON.parse(cached);
      throw err;
    }
  },

  async parseAlert(rawText, sourceAgency, sourceUrl) {
    const res = await fetch('/api/alerts/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: rawText, source_agency: sourceAgency, source_url: sourceUrl })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to parse alert');
    }
    const data = await res.json();
    localStorage.setItem(CACHE_KEYS.CURRENT_PLAN, JSON.stringify(data));
    return data;
  },

  async approvePlan(planId, approvedBy, notes = '') {
    const res = await fetch(`/api/action-plans/${planId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved_by: approvedBy, notes })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Approval failed');
    }
    const data = await res.json();
    localStorage.setItem(CACHE_KEYS.CURRENT_PLAN, JSON.stringify(data));
    return data;
  },

  async updateTask(taskId, updatePayload) {
    if (this.isOfflineMode()) {
      // Offline local mutation
      const cached = localStorage.getItem(CACHE_KEYS.CURRENT_PLAN);
      if (cached) {
        const plan = JSON.parse(cached);
        const task = plan.tasks.find(t => t.id === taskId);
        if (task) {
          Object.assign(task, updatePayload, { updated_at: new Date().toISOString() });
          localStorage.setItem(CACHE_KEYS.CURRENT_PLAN, JSON.stringify(plan));
          return task;
        }
      }
    }
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Task update failed');
    }
    return await res.json();
  },

  async getMetrics() {
    if (this.isOfflineMode()) {
      const cached = localStorage.getItem(CACHE_KEYS.METRICS);
      if (cached) return JSON.parse(cached);
    }
    try {
      const res = await fetch('/api/metrics');
      if (!res.ok) throw new Error('Metrics fetch failed');
      const data = await res.json();
      localStorage.setItem(CACHE_KEYS.METRICS, JSON.stringify(data));
      return data;
    } catch (err) {
      const cached = localStorage.getItem(CACHE_KEYS.METRICS);
      if (cached) return JSON.parse(cached);
      throw err;
    }
  },

  async getVolunteers() {
    try {
      const res = await fetch('/api/volunteers');
      const data = await res.json();
      localStorage.setItem(CACHE_KEYS.VOLUNTEERS, JSON.stringify(data));
      return data;
    } catch (err) {
      const cached = localStorage.getItem(CACHE_KEYS.VOLUNTEERS);
      return cached ? JSON.parse(cached) : [];
    }
  },

  async getLocations() {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      localStorage.setItem(CACHE_KEYS.LOCATIONS, JSON.stringify(data));
      return data;
    } catch (err) {
      const cached = localStorage.getItem(CACHE_KEYS.LOCATIONS);
      return cached ? JSON.parse(cached) : [];
    }
  },

  async getReports() {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      localStorage.setItem(CACHE_KEYS.REPORTS, JSON.stringify(data));
      return data;
    } catch (err) {
      const cached = localStorage.getItem(CACHE_KEYS.REPORTS);
      return cached ? JSON.parse(cached) : [];
    }
  },

  async submitReport(payload) {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Report submission failed');
    return await res.json();
  },

  async verifyReport(reportId, status, verifiedBy, notes = '') {
    const res = await fetch(`/api/reports/${reportId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, verified_by: verifiedBy, notes })
    });
    if (!res.ok) throw new Error('Report verification failed');
    return await res.json();
  },

  async resetScenario(preApprove = true) {
    const res = await fetch(`/api/scenario/reset?pre_approve=${preApprove}`, { method: 'POST' });
    if (!res.ok) throw new Error('Scenario reset failed');
    return await res.json();
  },

  async getExportData() {
    const res = await fetch('/api/scenario/export');
    return await res.json();
  }
};
