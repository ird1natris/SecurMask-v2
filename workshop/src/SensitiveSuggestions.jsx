import React, { useState } from 'react';
import { MASK_RULES } from './upload-data';

export default function SensitiveSuggestions({ detections, rules, onApply }) {
  const [selected, setSelected] = useState(() => Object.fromEntries(detections.map(d => [d.column, !d.needsReview && !Object.hasOwn(rules, d.column)])));
  const [choices, setChoices] = useState(() => Object.fromEntries(detections.map(d => [d.column, d.rule])));
  const [replace, setReplace] = useState(false);
  const eligible = d => replace || !Object.hasOwn(rules, d.column);
  const chosen = detections.filter(d => selected[d.column] && eligible(d));
  return <section className="smart-panel" aria-label="Sensitive field suggestions">
    <h3>{detections.length} likely sensitive {detections.length === 1 ? 'column' : 'columns'} found</h3>
    <p className="micro">Confidence is a pattern evidence score, not the probability that a field is sensitive. Checks use headings and up to 200 nonblank values per column, on this device.</p>
    <details><summary>How confidence is calculated</summary><p className="micro">A matching heading alone scores 80%. For types with value patterns, a matching heading scores 55 + 40 × the matching fraction. Without a matching heading, emails score 70 + 25 × the fraction; ambiguous numbers score 40 + 25 × the fraction and require review. Value-only matches need at least 50% agreement. Pattern scores from fewer than 5 samples are capped at 85%. These are heuristic weights, not measured accuracy.</p></details>
    {!detections.length ? <p>No likely sensitive fields found. Review the remaining columns; names, addresses and details in notes can be missed.</p> : <>
      <div className="smart-actions">
        <button className="secondary" onClick={() => setSelected(Object.fromEntries(detections.map(d => [d.column, eligible(d)])))}>Select all suggestions</button>
        <button className="secondary" onClick={() => setSelected({})}>Deselect all</button>
      </div>
      <label className="ack"><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} />Replace existing column rules when selected</label>
      <div className="suggestion-list">
        {detections.map(d => <div className="suggestion" key={d.column}>
          <label className="ack"><input type="checkbox" aria-label={`Suggest ${d.header}`} checked={!!selected[d.column] && eligible(d)} disabled={!eligible(d)} onChange={e => setSelected(s => ({ ...s, [d.column]: e.target.checked }))} /><strong>{d.header}</strong></label>
          <p><strong>{d.confidence}% confidence</strong> · {d.label}{d.needsReview ? ' · Needs review' : ''}</p>
          <p className="micro">{d.reason}</p>
          {!eligible(d) && <p className="micro">Existing rule preserved.</p>}
          <select aria-label={`Suggested rule for ${d.header}`} value={choices[d.column]} onChange={e => setChoices(c => ({ ...c, [d.column]: e.target.value }))}>
            {MASK_RULES.filter(r => r.value !== 'keep').map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>)}
      </div>
      <button className="primary" disabled={!chosen.length} onClick={() => onApply(Object.fromEntries(chosen.map(d => [d.column, choices[d.column]])))}>Apply {chosen.length} selected suggestions</button>
    </>}
  </section>;
}

export function ProtectionReport({ report }) {
  return <section className="smart-panel" aria-label="Masking protection report" role="status">
    <h3>{report.score === null ? 'Protection score: not available' : `Protection score: ${report.score}%`}</h3>
    <p>Coverage of detected sensitive cells — not a safety or anonymity rating.</p>
    <p><strong>Keep only what the task needs, rather than aiming for 100%.</strong> A higher score alone does not make sharing appropriate.</p>
    {report.score !== null && <>
      <progress aria-label="Detected sensitive data protection" value={report.score} max="100" />
      <p>{report.full} fully replaced · {report.partial} partially hidden · {report.unchanged} unchanged or incompatible rule</p>
      <details><summary>Remaining details by column</summary>
        <ul>{report.findings.map(f => <li key={f.column}><strong>{f.header}</strong>: {f.full} replaced, {f.partial} partial, {f.unchanged} unchanged / incompatible.</li>)}</ul>
      </details>
    </>}
    <p className="micro">{report.unclassified} columns unclassified. Review these too. Detection can miss sensitive data and identifying combinations; even 100% does not mean safe to share.</p>
    <details><summary>How this score works</summary><p className="micro">Across all nonblank cells in detected columns, full replacement earns 1 point, compatible partial masking earns 0.5, and unchanged values or incompatible rules earn 0. The percentage is points ÷ detected cells × 100. Confidence percentages do not change these weights. No detections means no score.</p></details>
  </section>;
}
