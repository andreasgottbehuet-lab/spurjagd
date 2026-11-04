import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('verification', { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const browserErrors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  for (let step = 0; step < 3; step++) {
    if (step === 2) {
      // Station codes are edited on wizard step 3, not on the landing screen.
      const codeInputs = page.locator('input[pattern="[0-9]{3}"]');
      const codeCount = await codeInputs.count();
      if (codeCount < 1) throw new Error('No station code inputs on wizard step 3');
      for (let i = 0; i < codeCount; i++) await codeInputs.nth(i).fill(String(100 + i % 900));
    }
    const next = page.locator('button.next');
    if (await next.count() !== 1) throw new Error('Wizard navigation not found at step ' + (step + 1));
    await next.click();
  }
  if (browserErrors.length) throw new Error('Browser JavaScript errors: ' + browserErrors.join(' | '));
  const packet = page.locator('.print-packet');
  if (await packet.count() !== 1) {
    await page.screenshot({ path: 'verification/a5-browser-failure.png', fullPage: true });
    const warnings = await page.locator('.warnings').allTextContents();
    throw new Error('Printable packet unavailable: ' + warnings.join(' | '));
  }
  await packet.waitFor({ state: 'attached', timeout: 10000 });
  const sheets = page.locator('.print-packet .print-sheet');
  const expected = await sheets.count();
  if (expected < 1) throw new Error('No generated A5 sheets');
  const categories = await sheets.evaluateAll(elements => ({
    organizer: elements.filter(el => el.classList.contains('print-organizer-sheet')).length,
    children: elements.filter(el => el.classList.contains('print-child-sheet')).length,
    labels: elements.filter(el => el.classList.contains('print-label-sheet')).length,
    unknown: elements.filter(el => !['print-organizer-sheet','print-child-sheet','print-label-sheet'].some(name => el.classList.contains(name))).length
  }));
  if (categories.unknown || categories.organizer + categories.children + categories.labels !== expected)
    failures.push('A5 pages without a valid category: ' + JSON.stringify(categories));
  if (!categories.organizer || !categories.children || !categories.labels)
    failures.push('A5 packet is missing a required page category: ' + JSON.stringify(categories));
  const envelopePages = await page.locator('.print-child-sheet').evaluateAll(elements => elements.map(el => ({
    id: el.getAttribute('data-envelope-id') ?? '',
    kind: el.getAttribute('data-sheet-kind') ?? '',
    routePage: el.getAttribute('data-route-page') ?? ''
  })));
  const envelopeGroups = new Map();
  for (const entry of envelopePages) {
    if (!entry.id) failures.push('A5 child sheet without envelope identifier');
    if (!['task','answer','route'].includes(entry.kind)) failures.push('A5 child sheet with invalid kind: ' + entry.kind);
    const entries = envelopeGroups.get(entry.id) ?? [];
    entries.push(entry);
    envelopeGroups.set(entry.id, entries);
  }
  for (const [id, entries] of envelopeGroups) {
    if (entries.filter(entry => entry.kind === 'task').length !== 1 || entries.filter(entry => entry.kind === 'answer').length !== 1 || entries.filter(entry => entry.kind === 'route').length < 1)
      failures.push('Incomplete A5 envelope: ' + id);
    if (entries[0]?.kind !== 'task' || entries[1]?.kind !== 'answer' || entries.slice(2).some((entry,index) => entry.kind !== 'route' || entry.routePage !== String(index + 1)))
      failures.push('Incorrect A5 envelope page order: ' + id);
  }
  const expectedEnvelopeOrder = [...envelopeGroups.entries()].flatMap(([id, entries]) => entries.map(() => id));
  if (envelopePages.some((entry, index) => entry.id !== expectedEnvelopeOrder[index]))
    failures.push('A5 child sheets are interleaved between envelopes');
  const labelIds = await page.locator('.print-label').evaluateAll(elements => elements.map(el => el.getAttribute('data-envelope-id') ?? ''));
  if (labelIds.length !== envelopeGroups.size || labelIds.some((id,index) => id !== [...envelopeGroups.keys()][index]))
    failures.push('A5 envelope labels do not match child packet order');
  if (envelopeGroups.size !== 12 || categories.children !== 36 || categories.labels !== 3)
    failures.push('Default 12-child A5 fixture differs from 12 envelopes / 36 child sheets / 3 label sheets: ' + JSON.stringify({envelopes: envelopeGroups.size, categories}));
  await page.emulateMedia({ media: 'print' });
  // Print-media emulation does not impose the PDF paper width on the screen viewport.
  // Match the A5 content width before collecting geometry diagnostics.
  await page.setViewportSize({ width: Math.round(128 * 96 / 25.4), height: Math.round(190 * 96 / 25.4) });
  const measured = await sheets.evaluateAll(elements => {
    const pxPerMm = 96 / 25.4;
    const maxW = 128 * pxPerMm;
    const maxH = 190 * pxPerMm;
    return elements.map((el, i) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const h = Math.max(el.scrollHeight, rect.height);
      const w = Math.max(el.scrollWidth, rect.width);
      return { page: i + 1, widthPx: w, heightPx: h, visible: style.display !== 'none',
        tooWide: w > maxW + 3, tooTall: h > maxH + 3 };
    });
  });
  for (const entry of measured) {
    if (!entry.visible || entry.tooWide || entry.tooTall) failures.push('A5 DOM sheet ' + entry.page + ': ' + JSON.stringify(entry));
  }
  await page.pdf({ path: 'verification/a5-browser-print.pdf', format: 'A5', printBackground: true, preferCSSPageSize: true });
  const pdfinfo = spawnSync('pdfinfo', ['verification/a5-browser-print.pdf'], { encoding: 'utf8' });
  if (pdfinfo.status !== 0) throw new Error('pdfinfo failed: ' + pdfinfo.stderr);
  const pages = Number(pdfinfo.stdout.match(/^Pages:\s*(\d+)/m)?.[1]);
  const size = pdfinfo.stdout.match(/^Page size:\s*([\d.]+) x ([\d.]+) pts/m);
  const a5 = size && Math.abs(Number(size[1]) - 419.53) < 2 && Math.abs(Number(size[2]) - 595.28) < 2;
  if (!a5) failures.push('PDF page size differs from A5 portrait: ' + (size?.[0] ?? 'unknown'));
  if (pages !== expected) failures.push('PDF pages ' + pages + ' do not match logical A5 sheets ' + expected);
  const extracted = spawnSync('pdftotext', ['-layout', 'verification/a5-browser-print.pdf', '-'], { encoding: 'utf8' });
  if (extracted.status !== 0) throw new Error('pdftotext failed: ' + extracted.stderr);
  const pdfPageTexts = extracted.stdout.split('\f');
  if (pdfPageTexts.at(-1)?.trim() === '') pdfPageTexts.pop();
  const blankPages = pdfPageTexts.flatMap((content, index) => content.trim() ? [] : [index + 1]);
  if (pdfPageTexts.length !== pages) failures.push('PDF text extraction reports ' + pdfPageTexts.length + ' pages, expected ' + pages);
  if (blankPages.length) failures.push('PDF contains blank pages: ' + blankPages.join(', '));
  if (!extracted.stdout.includes('Spielleitung')) failures.push('PDF is missing organizer instructions');
  if (!extracted.stdout.includes('Umschlag')) failures.push('PDF is missing envelope information');
  if (browserErrors.length) failures.push(...browserErrors.map(error => 'Browser JavaScript: ' + error));
  const report = { expectedSheets: expected, pdfPages: pages, pdfA5Portrait: !!a5, categories, envelopeCount: envelopeGroups.size, labelCount: labelIds.length, blankPages, measurements: measured, failures };
  writeFileSync('verification/a5-browser-report.json', JSON.stringify(report, null, 2));
  if (failures.length) {
    await page.screenshot({ path: 'verification/a5-browser-failure.png', fullPage: true });
    throw new Error(failures.join('\n'));
  }
  console.log('A5 browser print verified:', expected, 'pages');
} finally {
  await browser.close();
}
