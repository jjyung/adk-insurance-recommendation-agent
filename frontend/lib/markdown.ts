export function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>');

  // fenced code blocks (protect from further processing)
  const codeBlocks: string[] = [];
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const inner = match.slice(3, -3);
    codeBlocks.push(`<pre><code>${inner}</code></pre>`);
    return `\x02CODE${codeBlocks.length - 1}\x03`;
  });

  // inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // horizontal rule
  html = html.replace(/^---$/gm, '<hr/>');

  // process lists line-by-line to correctly separate ul / ol
  const lines = html.split('\n');
  const resultLines: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (listType && listItems.length > 0) {
      const items = listItems.map((i) => `<li>${i}</li>`).join('');
      resultLines.push(`<${listType}>${items}</${listType}>`);
      listType = null;
      listItems = [];
    }
  };

  for (const line of lines) {
    const ulMatch = line.match(/^[\-\*] (.+)$/);
    const olMatch = line.match(/^\d+\. (.+)$/);

    if (ulMatch) {
      if (listType === 'ol') flushList();
      listType = 'ul';
      listItems.push(ulMatch[1]);
    } else if (olMatch) {
      if (listType === 'ul') flushList();
      listType = 'ol';
      listItems.push(olMatch[1]);
    } else {
      flushList();
      resultLines.push(line);
    }
  }
  flushList();
  html = resultLines.join('\n');

  // restore code blocks
  html = html.replace(/\x02CODE(\d+)\x03/g, (_, i) => codeBlocks[Number(i)]);

  // line breaks: double newline → paragraph break, single → <br>
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br/>');
  html = `<p>${html}</p>`;

  // cleanup: unwrap block-level elements from <p>
  const blocks = ['h1', 'h2', 'h3', 'ul', 'ol', 'pre', 'hr/'];
  for (const tag of blocks) {
    const open = tag === 'hr/' ? '<hr/>' : `<${tag}>`;
    const close = tag === 'hr/' ? '' : `</${tag}>`;
    html = html.replace(new RegExp(`<p>(${escRe(open)})`, 'g'), '$1');
    if (close)
      html = html.replace(new RegExp(`(${escRe(close)})</p>`, 'g'), '$1');
  }
  html = html.replace(/<p><\/p>/g, '');
  return html;
}

function escRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
