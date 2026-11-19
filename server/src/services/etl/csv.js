/** CSV UTF-8 con comillas, escapes, CRLF y campos multilínea. */
export function parseCsv(input) {
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const records = [];
  let values = [], field = '', quoted = false, closed = false;
  let line = 1, start = 1, touched = false;
  const finish = () => {
    values.push(field);
    if (touched || values.length > 1 || field !== '') records.push({ values, line: start });
    values = []; field = ''; closed = false; touched = false;
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closed = true; }
      } else { field += char; if (char === '\n') line++; }
      continue;
    }
    if (char === ',') { values.push(field); field = ''; closed = false; touched = true; }
    else if (char === '\n') { finish(); line++; start = line; }
    else if (char === '"' && field === '' && !closed) { quoted = true; touched = true; }
    else {
      if (closed || char === '"' || char === '\r') throw new Error(`CSV inválido en línea ${line}`);
      field += char; touched = true;
    }
  }
  if (quoted) throw new Error(`Comillas sin cerrar en línea ${start}`);
  finish();
  return records;
}

export function encodeCsv(header, rows) {
  const escape = (value) => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n') + '\n';
}
