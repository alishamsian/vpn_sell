/** خروجی امن برای parse_mode=HTML در تلگرام */

export function escapeHtmlTelegram(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * قاب شیشه‌ای ساده (HTML): عنوان بولد + بدنه monospace داخل pre.
 * متن خام را escape کنید؛ برای تگ‌های HTML از قبل آماده فقط عنوان را پاس بدهید.
 */
export function wrapTelegramGlassPanel(titlePlain: string, bodyRaw: string): string {
  const title = escapeHtmlTelegram(titlePlain);
  const body = escapeHtmlTelegram(bodyRaw);
  return [
    `<b>╭ ${title} ╮</b>`,
    `<pre>${body}</pre>`,
    `<b>╰──────────────╯</b>`,
  ].join("\n");
}

/** تقسیم متن خام به صفحات با حفظ خطوط (قبل از ساخت HTML). */
export function splitRawTextIntoPages(text: string, maxChars = 3200): string[] {
  const t = text.trimEnd();
  if (t.length <= maxChars) {
    return t ? [t] : [""];
  }
  const pages: string[] = [];
  const lines = t.split("\n");
  let buf = "";
  const flush = () => {
    if (buf.trim().length > 0) {
      pages.push(buf.trimEnd());
    }
    buf = "";
  };
  for (const line of lines) {
    const next = buf.length === 0 ? line : `${buf}\n${line}`;
    if (next.length > maxChars) {
      if (buf.length > 0) {
        flush();
      }
      if (line.length > maxChars) {
        for (let i = 0; i < line.length; i += maxChars) {
          pages.push(line.slice(i, i + maxChars));
        }
        buf = "";
      } else {
        buf = line;
      }
    } else {
      buf = next;
    }
  }
  flush();
  return pages.length > 0 ? pages : [""];
}

export function buildHtmlPagesFromDataset(title: string, rawBody: string): string[] {
  const rawPages = splitRawTextIntoPages(rawBody, 3000);
  return rawPages.map((chunk) => wrapTelegramGlassPanel(title, chunk));
}
