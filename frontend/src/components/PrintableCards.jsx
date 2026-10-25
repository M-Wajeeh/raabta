import React from 'react';

export default function PrintableCards({ plan, tasks = [], volunteers = [] }) {
  if (!plan) return null;

  return (
    <div className="print-only">
      <div style={{ borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
        <h1 style={{ fontSize: '18pt', fontWeight: 'bold' }}>
          RAABTA COMMUNITY EMERGENCY ACTION CARDS
        </h1>
        <p style={{ fontSize: '10pt', margin: '4px 0' }}>
          <strong>Incident:</strong> {plan.title} · <strong>Issuing Agency:</strong> {plan.source_agency}
        </p>
        <p style={{ fontSize: '9pt', color: '#333' }}>
          <strong>Notice:</strong> Physical emergency cards for offline field runners. Keep backup radio tuned to Channel 14 VHF.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
        {tasks.map((task) => (
          <div
            key={task.id}
            style={{
              border: '2px solid #000',
              padding: '12px',
              borderRadius: '4px',
              pageBreakInside: 'avoid'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12pt', fontWeight: 'bold' }}>[{task.task_code}] {task.title}</span>
              <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>PRIORITY: {task.priority}</span>
            </div>

            <p style={{ fontSize: '10pt', marginBottom: '8px', lineHeight: 1.4 }}>
              {task.description}
            </p>

            <div style={{ fontSize: '9pt', background: '#f4f4f4', padding: '6px', marginBottom: '8px', borderLeft: '3px solid #000' }}>
              <strong>Location Designation:</strong> {task.location_status} ({task.location_note || 'Designated Zone'})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '9pt', borderTop: '1px solid #eee', paddingTop: '6px' }}>
              <div>
                <strong>Assigned Volunteer:</strong> {task.assigned_to || '___________________________'}
              </div>
              <div>
                <strong>Physical Sign-off:</strong> [ ] Completed  [ ] Escalated
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
