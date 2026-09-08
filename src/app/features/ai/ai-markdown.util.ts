/**
 * Minimal, dependency-free markdown renderer for AI answers.
 *
 * The input is ALWAYS HTML-escaped first, so the produced HTML is safe to
 * bind with [innerHTML] — only markup generated here can appear. Supports
 * the subset the assistant actually produces: headings, bold/italic, inline
 * code, fenced code blocks, bullet/numbered lists and pipe tables.
 */
export function renderAiMarkdown(raw: string): string {
  const escaped = (raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];
  let inCode = false;
  let listMode: 'ul' | 'ol' | null = null;
  let tableBuffer: string[] = [];

  const closeList = () => {
    if (listMode) {
      out.push(listMode === 'ul' ? '</ul>' : '</ol>');
      listMode = null;
    }
  };

  const flushTable = () => {
    if (!tableBuffer.length) return;
    const rows = tableBuffer.filter((r) => !/^\s*\|?[\s|:-]+\|?\s*$/.test(r));
    const cells = (row: string) =>
      row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => inline(c.trim()));
    let html = '<div class="ai-md-table"><table>';
    rows.forEach((row, i) => {
      const tag = i === 0 ? 'th' : 'td';
      html += '<tr>' + cells(row).map((c) => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
    });
    html += '</table></div>';
    out.push(html);
    tableBuffer = [];
  };

  const inline = (text: string): string =>
    text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      flushTable();
      closeList();
      out.push(inCode ? '</code></pre>' : '<pre><code>');
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(line + '\n');
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      closeList();
      tableBuffer.push(line);
      continue;
    }
    flushTable();

    const heading = line.match(/^\s*(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 3, 6);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      if (listMode !== 'ul') {
        closeList();
        out.push('<ul>');
        listMode = 'ul';
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numbered) {
      if (listMode !== 'ol') {
        closeList();
        out.push('<ol>');
        listMode = 'ol';
      }
      out.push(`<li>${inline(numbered[1])}</li>`);
      continue;
    }
    closeList();
    if (line.trim() === '') {
      out.push('<div class="ai-md-gap"></div>');
    } else {
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  if (inCode) out.push('</code></pre>');
  closeList();
  flushTable();
  return out.join('');
}
