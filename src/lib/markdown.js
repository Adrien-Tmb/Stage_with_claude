// Rendu Markdown minimal (titres, listes, gras, italique, liens, séparateurs) pour les CV rédigés par Claude.
// Le texte est échappé AVANT toute mise en forme : aucun HTML du document source n'est interprété.

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_(.+?)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

export function markdownToHtml(md = '') {
  const out = [];
  let list = null;
  let para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`); list = null; } };

  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    const item = line.match(/^\s*[-*•]\s+(.*)$/);
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) { flushPara(); flushList(); out.push('<hr />'); continue; }
    if (heading) { flushPara(); flushList(); out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); continue; }
    if (item) { flushPara(); (list ??= []).push(item[1]); continue; }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return out.join('\n');
}

/** Styles partagés entre l'aperçu et l'impression (format A4). */
export const CV_CSS = `
  .cv-doc { font-family: Inter, system-ui, sans-serif; color: #0f172a; font-size: 10.5pt; line-height: 1.45; }
  .cv-doc h1 { font-size: 20pt; font-weight: 700; margin: 0 0 2px; letter-spacing: -0.01em; }
  .cv-doc h2 { font-size: 10.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #047857; border-bottom: 1.5px solid #10b981; padding-bottom: 2px; margin: 14px 0 6px; }
  .cv-doc h3 { font-size: 10.5pt; font-weight: 600; margin: 8px 0 2px; }
  .cv-doc p { margin: 2px 0 6px; }
  .cv-doc ul { list-style: disc; margin: 2px 0 6px; padding-left: 16px; }
  .cv-doc strong { font-weight: 600; }
  .cv-doc li { margin: 1px 0; }
  .cv-doc hr { border: 0; border-top: 1px solid #e2e8f0; margin: 8px 0; }
  .cv-doc a { color: #047857; text-decoration: none; }
`;

/** Ouvre le CV dans une fenêtre imprimable (« Enregistrer en PDF » dans la boîte d'impression). */
export function printMarkdown(title, md) {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>@page { size: A4; margin: 14mm 15mm; } body { margin: 0; } ${CV_CSS}</style></head>
    <body><div class="cv-doc">${markdownToHtml(md)}</div><script>window.onload = () => setTimeout(() => window.print(), 300);<\/script></body></html>`);
  w.document.close();
  return true;
}

/**
 * Remplace {{email}} / {{phone}} par les coordonnées du profil (stockées dans le navigateur) :
 * les dossiers publiés sur GitHub Pages ne contiennent jamais ces données personnelles.
 */
export function fillContact(text = '', { email, phone } = {}) {
  return text
    .replace(/\{\{email\}\}/g, email || '')
    .replace(/\{\{phone\}\}/g, phone || '')
    .replace(/(?:[ \t]*·[ \t]*){2,}/g, ' · ')
    .replace(/^[ \t]*·[ \t]*|[ \t]*·[ \t]*$/gm, '');
}
