import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('verification', { recursive: true });
let browser;
const failures = [];
const browserErrors = [];
let activePage;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  activePage = page;
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  for (let step = 0; step < 3; step++) {
    if (step === 2) {
      // Station codes are edited on wizard step 3, not on the landing screen.
      const codeInputs = page.locator('input[pattern="[0-9]{3}"]');
      const codeCount = await codeInputs.count();
      if (codeCount < 1) throw new Error('No station code inputs on wizard step 3');
      const fixtureCodes = ['007', '000', '123', '987'];
      if (codeCount !== fixtureCodes.length) throw new Error('Expected four station code inputs, got ' + codeCount);
      for (let i = 0; i < codeCount; i++) {
        await codeInputs.nth(i).fill(fixtureCodes[i]);
        if (await codeInputs.nth(i).inputValue() !== fixtureCodes[i])
          throw new Error('Station code lost leading zeroes: ' + fixtureCodes[i]);
      }
    }
    if (step === 2) {
      await page.locator('input[pattern="[0-9]{3}"]').last().blur();
      await page.waitForTimeout(1000);
      await page.reload({ waitUntil: 'networkidle' });
      // The wizard starts on its first screen after reload. Return to the
      // station editor before inspecting persisted values.
      for (let navigation = 0; navigation < 2; navigation++) {
        await page.locator('button.next').click();
      }
      const values = await page.locator('input[pattern="[0-9]{3}"]').evaluateAll(inputs => inputs.map(input => input.value));
      if (JSON.stringify(values) !== JSON.stringify(['007','000','123','987']))
        throw new Error('Saved lock codes differ after reload: ' + JSON.stringify(values));
      // Invalid codes must be flagged, and correction must restore readiness.
      const firstCode = page.locator('input[pattern="[0-9]{3}"]').first();
      for (const invalid of ['', '07']) {
        await firstCode.fill(invalid);
        if (await firstCode.getAttribute('aria-invalid') !== 'true')
          throw new Error('Invalid lock code was not flagged: ' + JSON.stringify(invalid));
      }
      await firstCode.fill('007');
      if (await firstCode.getAttribute('aria-invalid') !== 'false')
        throw new Error('Corrected lock code remains invalid');
    }
    const next = page.locator('button.next');
    if (await next.count() !== 1) throw new Error('Wizard navigation not found at step ' + (step + 1));
    await next.click();
  }
  // End-to-end print gate: invalid input must suppress the complete packet,
  // and correcting the input must rebuild it without restarting the project.
  await page.locator('.wizard-actions button.secondary').click();
  const editedCode = page.locator('input[pattern="[0-9]{3}"]').first();
  await editedCode.fill('07');
  await page.locator('button.next').click();
  if (await page.locator('.print-packet').count() !== 0)
    throw new Error('Printable packet remains visible with an invalid lock code');
  if (await page.locator('button.print').count() && !(await page.locator('button.print').isDisabled()))
    throw new Error('Print action remains enabled with an invalid lock code');
  await page.locator('.wizard-actions button.secondary').click();
  await page.locator('input[pattern="[0-9]{3}"]').first().fill('007');
  await page.locator('button.next').click();
  await page.locator('.print-packet').waitFor({ state: 'attached' });
  if (await page.locator('button.print').isDisabled())
    throw new Error('Print action did not recover after correcting lock code');
  if (browserErrors.length) throw new Error('Browser JavaScript errors: ' + browserErrors.join(' | '));
  const printButton = page.locator('button.print');
  if (await printButton.count() !== 1 || await printButton.isDisabled())
    throw new Error('A5 print button is missing or disabled after entering valid fixture codes');
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
  const renderedOrder = await sheets.evaluateAll(elements => elements.map(el =>
    el.classList.contains('print-organizer-sheet') ? 'organizer' :
    el.classList.contains('print-child-sheet') ? 'child' :
    el.classList.contains('print-label-sheet') ? 'label' : 'unknown'
  ));
  const firstChild = renderedOrder.indexOf('child');
  const firstLabel = renderedOrder.indexOf('label');
  if (firstChild < 1 || firstLabel <= firstChild ||
      renderedOrder.slice(0, firstChild).some(kind => kind !== 'organizer') ||
      renderedOrder.slice(firstChild, firstLabel).some(kind => kind !== 'child') ||
      renderedOrder.slice(firstLabel).some(kind => kind !== 'label'))
    failures.push('A5 sheet category order must be organizer, child, labels');
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
    if (!id.trim() || id !== id.trim()) failures.push('Invalid envelope identifier: ' + id);
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
  const taskIds = envelopePages.filter(entry => entry.kind === 'task').map(entry => entry.id);
  const answerIds = envelopePages.filter(entry => entry.kind === 'answer').map(entry => entry.id);
  if (new Set(taskIds).size !== taskIds.length || new Set(answerIds).size !== answerIds.length)
    failures.push('Duplicate task or answer sheets for an envelope');
  if (taskIds.join('|') !== answerIds.join('|')) failures.push('Task and answer envelope sequence differs');
  if (taskIds.length !== 12 || answerIds.length !== 12) failures.push('Expected exactly 12 task and 12 answer sheets');
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
  // Export representative PDF pages as PNG for a quick human print-layout review.
  for (const [label, number] of [
    ['organizer', 1],
    ['child', categories.organizer + 1],
    ['labels', categories.organizer + categories.children + 1]
  ]) {
    if (number > pages) continue;
    const preview = spawnSync('pdftoppm', [
      '-f', String(number), '-l', String(number), '-singlefile',
      '-scale-to', '1200', '-png', 'verification/a5-browser-print.pdf',
      'verification/a5-preview-' + label
    ], { encoding: 'utf8' });
    if (preview.status !== 0) failures.push('Cannot render A5 ' + label + ' preview: ' + preview.stderr);
  }
  const extracted = spawnSync('pdftotext', ['-layout', 'verification/a5-browser-print.pdf', '-'], { encoding: 'utf8' });
  if (extracted.status !== 0) throw new Error('pdftotext failed: ' + extracted.stderr);
  const pdfPageTexts = extracted.stdout.split('\f');
  if (pdfPageTexts.at(-1)?.trim() === '') pdfPageTexts.pop();
  const blankPages = pdfPageTexts.flatMap((content, index) => content.trim() ? [] : [index + 1]);
  if (pdfPageTexts.length !== pages) failures.push('PDF text extraction reports ' + pdfPageTexts.length + ' pages, expected ' + pages);
  if (blankPages.length) failures.push('PDF contains blank pages: ' + blankPages.join(', '));
  // Validate that each PDF page carries the expected category of content,
  // not merely that the DOM contains the right number of sheets.
  if (pdfPageTexts.length === expected) {
    for (let i = 0; i < categories.organizer; i++) {
      if (!(pdfPageTexts[i] ?? '').trim()) failures.push('Empty organizer page ' + (i + 1));
    }
    for (let i = 0; i < envelopePages.length; i++) {
      const pageNumber = categories.organizer + i + 1;
      const content = pdfPageTexts[pageNumber - 1] ?? '';
      const kind = envelopePages[i].kind;
      const marker = kind === 'task' ? 'Stationsaufgaben:' : kind === 'answer' ? 'Antwortblatt' : 'Wegrätsel';
      if (marker && !content.includes(marker))
        failures.push('PDF page ' + pageNumber + ' does not contain expected ' + kind + ' sheet heading');
      // Check actual PDF sheet numbering against the DOM envelope sequence.
      const envelopeSheets = envelopePages.filter(entry => entry.id === envelopePages[i].id);
      const sheetIndex = envelopePages.slice(0, i + 1).filter(entry => entry.id === envelopePages[i].id).length;
      if (!content.includes('Blatt ' + sheetIndex + '/' + envelopeSheets.length))
        failures.push('PDF page ' + pageNumber + ' has incorrect envelope sheet numbering: ' + envelopePages[i].id);
      if (kind === 'answer' && !content.includes('Unser Schloss-Code:'))
        failures.push('PDF answer page ' + pageNumber + ' lacks code entry field');
    }
    for (let i = 0; i < categories.labels; i++) {
      const pageNumber = categories.organizer + categories.children + i + 1;
      if (!(pdfPageTexts[pageNumber - 1] ?? '').includes('Umschlag'))
        failures.push('PDF page ' + pageNumber + ' does not contain envelope labels');
    }
  }
  if (!extracted.stdout.includes('Spielleitung')) failures.push('PDF is missing organizer instructions');
  for (const code of ['007','000','123','987']) {
    if (!extracted.stdout.includes(code)) failures.push('PDF text is missing configured three-digit code ' + code);
  }
  if (!extracted.stdout.includes('Umschlag')) failures.push('PDF is missing envelope information');
  const codeOccurrences = Object.fromEntries(['007','000','123','987'].map(code => [code, pdfPageTexts.filter(pageText => pageText.includes(code)).length]));
  if (Object.values(codeOccurrences).some(count => count === 0)) failures.push('Not every configured lock code is present in the PDF');
  if (browserErrors.length) failures.push(...browserErrors.map(error => 'Browser JavaScript: ' + error));
  const report = { expectedSheets: expected, pdfPages: pages, pdfA5Portrait: !!a5, categories, envelopeCount: envelopeGroups.size, labelCount: labelIds.length, blankPages, codeOccurrences, measurements: measured, failures };
  writeFileSync('verification/a5-browser-report.json', JSON.stringify(report, null, 2));
  if (failures.length) {
    await page.screenshot({ path: 'verification/a5-browser-failure.png', fullPage: true });
    throw new Error(failures.join('\n'));
  }
  console.log('A5 browser print verified:', expected, 'pages');
} catch (error) {
  // Preserve evidence even when the wizard or Chromium fails before PDF creation.
  writeFileSync('verification/a5-browser-error.json', JSON.stringify({
    message: error instanceof Error ? error.message : String(error),
    browserErrors
  }, null, 2));
  if (activePage && !activePage.isClosed()) {
    try { await activePage.screenshot({ path: 'verification/a5-browser-failure.png', fullPage: true }); }
    catch (screenshotError) { console.error('Failure screenshot unavailable:', screenshotError); }
  }
  throw error;
} finally {
  if (browser) await browser.close();
}
