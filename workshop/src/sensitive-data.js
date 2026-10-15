// Heuristic evidence scores, not calibrated probabilities. No values leave the device.
const definitions = [
  { type: 'secret', label: 'Password or secret', rule: 'remove', header: /\b(password|passwd|secret|token|api key|kata laluan)\b/ },
  { type: 'email', label: 'Email', rule: 'email', header: /\b(e mail|email|emel)\b/, pattern: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
  { type: 'id', label: 'Identity or financial number', rule: 'redact', header: /\b(ic|nric|mykad|passport|pasport|ssn|national id|identity|identification|kad pengenalan|account|akaun|credit card|debit card|card number|iban)\b/, pattern: v => /^(?:\d{6}-\d{2}-\d{4}|\d{12}|(?:\d[ -]?){13,19})$/.test(v) },
  { type: 'phone', label: 'Phone', rule: 'phone', header: /\b(phone|mobile|telephone|tel|telefon|contact number|no hp|handphone|whatsapp)\b/, pattern: v => /^\+?[\d\s().-]+$/.test(v) && (v.match(/\d/g) || []).length >= 7 && (v.match(/\d/g) || []).length <= 15 },
  { type: 'address', label: 'Address', rule: 'remove', header: /\b(address|alamat|street|postcode|postal code|zip code)\b/ },
  { type: 'dob', label: 'Date of birth', rule: 'remove', header: /\b(dob|birth date|date of birth|birthday|tarikh lahir)\b/ },
  { type: 'age', label: 'Age', rule: 'age', header: /\b(age|umur)\b/, pattern: v => /^\d{1,3}$/.test(v) && Number(v) <= 120 },
  { type: 'name', label: 'Person’s name', rule: 'id', header: /\b(name|nama|patient|pesakit)\b/ },
  { type: 'notes', label: 'Sensitive details or free text', rule: 'remove', header: /\b(medical|diagnosis|health|condition|disease|penyakit|kesihatan|notes?|remarks?|catatan|religion|agama|salary|gaji)\b/ },
];
const normaliseHeader = h => h.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function detectSensitive(data) {
  return data.headers.flatMap((header, column) => {
    const values = data.rows.map(row => String(row[column] ?? '').trim()).filter(Boolean);
    if (!values.length) return [];
    const count = Math.min(200, values.length);
    const sample = Array.from({ length: count }, (_, i) => values[Math.floor(i * values.length / count)]);
    const heading = normaliseHeader(header);
    const businessName = /\b(company|business|product|file|sheet|column|organisation|organization|item)\b/.test(heading);
    const referenceNumber = /\b(order|invoice|reference|sku|quantity|amount|price|postcode|postal|zip)\b/.test(heading);
    const candidates = definitions.flatMap(def => {
      const headerMatch = def.header.test(heading) && !(def.type === 'name' && businessName);
      const matches = def.pattern ? sample.filter(def.pattern).length : 0;
      const ratio = matches / count;
      if (!headerMatch && (!['email', 'phone', 'id'].includes(def.type) || ratio < 0.5 || (referenceNumber && def.type !== 'email'))) return [];
      let confidence = headerMatch ? 80 : 0;
      if (headerMatch && def.pattern) confidence = Math.round(55 + 40 * ratio);
      if (!headerMatch) confidence = Math.round((def.type === 'email' ? 70 + 25 * ratio : 40 + 25 * ratio));
      if (count < 5 && def.pattern) confidence = Math.min(confidence, 85);
      const needsReview = def.type === 'notes' || confidence < 80 || (def.type === 'age' && ratio < 1);
      const evidence = [headerMatch ? 'Column heading matches.' : 'Detected from value patterns; heading does not confirm the type.'];
      if (def.pattern) evidence.push(`${matches}/${count} sampled nonblank values match (${Math.round(ratio * 100)}%).`);
      else evidence.push('Heading-based suggestion; values have not been classified.');
      if (count < 5) evidence.push('Small sample.');
      return [{ column, header, headerMatch, type: def.type, label: def.label, rule: def.rule, confidence, needsReview, sampleCount: count, nonblankCount: values.length, reason: evidence.join(' ') }];
    });
    candidates.sort((a, b) => Number(b.headerMatch) - Number(a.headerMatch) || b.confidence - a.confidence);
    return candidates.length ? [candidates[0]] : [];
  }).sort((a, b) => b.confidence - a.confidence || a.column - b.column);
}

// Coverage policy: full replacements = 1, partial hiding = 0.5.
// Check actual output too: unchanged values never earn masking credit.
export function protectionSummary(data, output, rules, detections) {
  let total = 0, credit = 0;
  const findings = detections.map(item => {
    let cells = 0, full = 0, partial = 0, unchanged = 0;
    const rule = rules[item.column] || 'keep';
    for (let i = 0; i < data.rows.length; i++) {
      const original = data.rows[i][item.column];
      if (!original.trim()) continue;
      cells++;
      const value = output[i][item.column];
      if (value === original) unchanged++;
      else if (['remove', 'id', 'redact'].includes(rule)) full++;
      else if ((rule === 'email' && item.type === 'email') || (rule === 'phone' && item.type === 'phone') || rule === 'last4' || (rule === 'age' && item.type === 'age')) partial++;
      else unchanged++;
    }
    total += cells;
    credit += full + partial * 0.5;
    return { ...item, full, partial, unchanged, cells };
  });
  return {
    score: total ? Math.round(credit / total * 100) : null,
    total,
    full: findings.reduce((n, f) => n + f.full, 0),
    partial: findings.reduce((n, f) => n + f.partial, 0),
    unchanged: findings.reduce((n, f) => n + f.unchanged, 0),
    unclassified: data.headers.length - detections.length,
    findings,
  };
}
