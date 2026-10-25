import React, { useState } from 'react';
import { AlertCircle, FileText, CheckCircle, ShieldCheck, ExternalLink, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { api } from '../api';

const SAMPLE_BULLETIN = "URGENT DISASTER BULLETIN: The National Disaster Management Authority (NDMA) has issued a Level 3 Flash Flood Warning for District Riverside Lowlands and Sector 4 Canal Corridor. Heavy catchment rainfall upstream is expected to breach localized embankments within 4 hours. Residents in low-lying sectors are advised to prepare for precautionary relocation to designated assembly points. Emergency response units and volunteer groups must immediately inspect drainage culverts and assist registered vulnerable households.";

export default function AlertExtractor({ plan, onPlanUpdated, isOffline }) {
  const [showInput, setShowInput] = useState(false);
  const [rawText, setRawText] = useState(SAMPLE_BULLETIN);
  const [agency, setAgency] = useState('National Disaster Management Authority (NDMA)');
  const [sourceUrl, setSourceUrl] = useState('https://ndma.gov.pk/bulletins/2026/flood-level-3-riverside');
  const [loading, setLoading] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [approverName, setApproverName] = useState('Coordinator Sarah Malik');
  const [approving, setApproving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isDraft = plan?.status === 'DRAFT_PENDING_APPROVAL';

  const handleParse = async (e) => {
    e.preventDefault();
    if (isOffline) {
      alert('Parsing new live alerts requires an active network link.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const draftPlan = await api.parseAlert(rawText, agency, sourceUrl);
      onPlanUpdated(draftPlan);
      setShowInput(false);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!plan) return;
    setApproving(true);
    setErrorMsg('');
    try {
      const approvedPlan = await api.approvePlan(plan.id, approverName);
      onPlanUpdated(approvedPlan);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <FileText size={18} color="var(--accent-blue)" />
          <span>Official Emergency Warning & Action Plan</span>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowInput(!showInput)}
        >
          {showInput ? 'Hide Alert Parser' : 'Parse New Warning / Bulletin'}
        </button>
      </div>

      {showInput && (
        <form onSubmit={handleParse} style={{ marginBottom: '1.25rem', background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
              Official Warning Bulletin (Grounding Source)
            </label>
            <textarea
              rows={3}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', padding: '0.5rem', fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Issuing Agency
              </label>
              <input
                type="text"
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', padding: '0.4rem', fontSize: '0.85rem' }}
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Official Bulletin URL
              </label>
              <input
                type="url"
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', padding: '0.4rem', fontSize: '0.85rem' }}
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              <Sparkles size={14} />
              <span>{loading ? 'Extracting Grounded Plan...' : 'Generate Grounded Action Plan'}</span>
            </button>
          </div>
        </form>
      )}

      {errorMsg && (
        <div style={{ background: 'var(--accent-red-bg)', color: '#fca5a5', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Human Approval Gate Banner */}
      {plan && (
        <div className={`approval-banner ${isDraft ? 'approval-draft' : 'approval-published'}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isDraft ? (
              <AlertCircle size={22} color="var(--accent-amber)" />
            ) : (
              <ShieldCheck size={22} color="var(--accent-green)" />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                {isDraft
                  ? 'Human Approval Gate: Action Plan in Draft Mode'
                  : 'Authorized & Published Action Plan'}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                {isDraft
                  ? 'Governance Rule: Tasks cannot be dispatched to volunteers until authorized by a coordinator.'
                  : `Authorized by ${plan.approved_by} on ${new Date(plan.approved_at || Date.now()).toLocaleTimeString()}`}
              </div>
            </div>
          </div>

          {isDraft && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Coordinator Name"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                style={{ padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: '#0b1120', color: '#fff', fontSize: '0.8rem' }}
              />
              <button
                className="btn btn-success btn-sm"
                onClick={handleApprove}
                disabled={approving || !approverName.trim()}
              >
                <CheckCircle size={14} />
                <span>{approving ? 'Authorizing...' : 'Authorize & Dispatch'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Current Plan Overview & Grounding Anchors */}
      {plan && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{plan.title}</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '0.2rem' }}>
                Source: {plan.source_agency} ·{' '}
                <a
                  href={plan.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  Verify Original Bulletin <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowEvidence(!showEvidence)}
            >
              <span>{showEvidence ? 'Hide Source Citations' : 'View Source Citations'}</span>
              {showEvidence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showEvidence && plan.evidence_anchors && (
            <div className="evidence-box">
              <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '0.35rem' }}>
                Preserved Source Evidence (Anti-Hallucination Anchors):
              </div>
              {plan.evidence_anchors.map((anchor, idx) => (
                <div key={idx} style={{ marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{anchor.field_name.replace('_', ' ')}:</span>{' '}
                  <span>{anchor.extracted_value}</span>
                  <div className="evidence-quote">"{anchor.source_quote}"</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
