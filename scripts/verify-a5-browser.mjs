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
    if (step === 1) {
      // Route options are on wizard step 2, before station codes on step 3.
      const routeDirection = page.locator('.route-options select').filter({ has: page.locator('option[value="varied"]') });
      if (await routeDirection.count() !== 1) throw new Error('Route direction selector not found on step 2');
      await routeDirection.selectOption('varied');
      if (await routeDirection.inputValue() !== 'varied') throw new Error('Different group routes could not be selected');
    }
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
      await page.locator('.wizard-actions button.secondary').click();
      const persistedRouteDirection = page.locator('.route-options select').filter({ has: page.locator('option[value="varied"]') });
      if (await persistedRouteDirection.inputValue() !== 'varied') throw new Error('Different group routes were lost after reload');
      await page.locator('button.next').click();
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
  const packingPreview = page.locator('.packing-preview');
  if (await packingPreview.count() !== 1)
    failures.push('Organizer packing preview is missing');
  else {
    await packingPreview.locator('summary').click();
    const previewRows = packingPreview.locator('li');
    if (await previewRows.count() !== 12)
      failures.push('Organizer packing preview does not list all 12 envelopes');
    const previewText = await packingPreview.innerText();
    for (const code of ['007', '000', '123', '987'])
      if (!previewText.includes(code))
        failures.push('Organizer packing preview is missing lock code ' + code);
    if (!previewText.includes('Danach:'))
      failures.push('Organizer packing preview is missing next destinations');
  }
  // Confirm that the printed organizer pages actually contain distinct team routes.
  const routeLines = await page.locator('.print-organizer-sheet').filter({ hasText: 'Gruppen und Routen' }).locator('p').allTextContents();
  const routeSequences = routeLines.filter(line => /→/.test(line) && /\(.+\):/.test(line)).map(line => line.split(':').slice(1).join(':').trim());
  if (routeSequences.length !== 4 || new Set(routeSequences).size < 2)
    failures.push('A5 reference case must print four team routes with at least two different sequences');
  // The new print contract never emits separate answer sheets.
  if (await page.locator('.print-child-sheet[data-sheet-kind="answer"]').count() !== 0)
    failures.push('Redundant answer sheet is still present in the A5 packet');
  const organizerTitles=await page.locator('.print-organizer-sheet').evaluateAll(sheets=>sheets.map(sheet=>sheet.textContent??''));
  if (!organizerTitles[0]?.includes('Start und Sicherheit'))
    failures.push('Organizer start and safety instructions are not the first printed page');
  const organizerOrder=['Gruppenrouten','Codes und Lösungen','Wegrätsel-Lösungen','Umschlagkontrolle'];
  let previous=-1;
  for(const label of organizerOrder){
    const position=organizerTitles.findIndex(title=>title.includes(label));
    if(position<0 || position<=previous) failures.push('Organizer sections out of order: '+label);
    else previous=position;
  }
  const expectedTeamColors={rot:'rgb(183, 53, 58)',blau:'rgb(39, 102, 163)',grün:'rgb(40, 121, 77)',gelb:'rgb(153, 113, 0)'};
  for(const [team,expectedColor] of Object.entries(expectedTeamColors)){
    for(const [selector,property] of [['.print-child-sheet','borderTopColor'],['.print-label','borderLeftColor'],['.print-checklist-row','borderLeftColor'],['.team-route-line','borderLeftColor']]){
      const sheets=page.locator(selector+'[data-team-color="'+team+'"]');
      if(!await sheets.count()) {failures.push('Missing '+selector+' for team '+team);continue;}
      for(const sheet of await sheets.all()){
        const color=await sheet.evaluate((el,prop)=>getComputedStyle(el)[prop],property);
        if(color!==expectedColor) failures.push('Incorrect '+selector+' team color for '+team+': '+color);
      }
    }
  }
  // Visual acceptance: three-word puzzle must replace, not supplement, three independent tasks.
  const wordSheets=page.locator('.print-child-sheet[data-sheet-kind="task"]:has(.print-three-word-grid)');
  if (await wordSheets.count() === 0) failures.push('No combined three-number word-search worksheet printed');
  for(const sheet of await wordSheets.all()){
    if(await sheet.locator('.print-task').count()!==1)
      failures.push('Combined word-search sheet also contains unrelated individual tasks');
    if(await sheet.locator('.print-three-word-grid .wordsearch-row').count()!==12)
      failures.push('Combined word-search does not have twelve rows');
    if(await sheet.locator('.print-three-word-grid .wordsearch-cell').count()!==144)
      failures.push('Combined word-search does not have 144 cells');
    if(!(await sheet.innerText()).includes('Reihenfolge:'))
      failures.push('Combined word-search lacks a digit ordering rule');
  }
  const redSheets=page.locator('.print-child-sheet[data-team-color="rot"]');
  const blueSheets=page.locator('.print-child-sheet[data-team-color="blau"]');
  if(!await redSheets.count() || !await blueSheets.count()) failures.push('Red and blue A5 team sheets missing');
  for(const [team,selector] of [['rot','.print-child-sheet[data-team-color="rot"]'],['blau','.print-child-sheet[data-team-color="blau"]']]){
    const color=await page.locator(selector).first().evaluate(el=>getComputedStyle(el).borderTopColor);
    if(!color || color==='rgb(0, 0, 0)' || color==='rgba(0, 0, 0, 0)')
      failures.push('Missing visible '+team+' team border color');
    if(!await page.locator('.team-route-line[data-team-color="'+team+'"]').count())
      failures.push('Organizer route lacks '+team+' team color');
  }
  const packet = page.locator('.print-packet');
  if (await packet.count() !== 1) {
    await page.screenshot({ path: 'verification/a5-browser-failure.png', fullPage: true });
    const warnings = await page.locator('.warnings').allTextContents();
    throw new Error('Printable packet unavailable: ' + warnings.join(' | '));
  }
  await packet.waitFor({ state: 'attached', timeout: 10000 });
  // Exercise the real print button with a corrupted envelope label. A
  // mismatched label must block printing, not just fail a unit test.
  await page.evaluate(() => {
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
    window.print = () => { window.__a5PrintCalls++; };
    window.alert = message => { window.__a5Alerts.push(String(message)); };
    const label = document.querySelector('.print-label');
    if (!label) throw new Error('No A5 envelope label available for print gate test');
    label.dataset.team = 'Falsches Team';
  });
  await printButton.click();
  const blockedPrint = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (blockedPrint.calls !== 0 || !blockedPrint.alerts.some(message => message.includes('Etiketten')))
    failures.push('Corrupted A5 envelope label did not block the print button');
  await page.evaluate(() => {
    const label = document.querySelector('.print-label');
    if (!label) throw new Error('Missing A5 envelope label during restoration');
    const checklist = document.querySelector('.print-checklist-row');
    label.dataset.team = checklist?.getAttribute('data-team') ?? '';
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const restoredPrint = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (restoredPrint.calls !== 1 || restoredPrint.alerts.length)
    failures.push('Valid A5 envelope labels did not restore the print action: '+JSON.stringify(restoredPrint));
  // The same gate must reject a packing-list count that disagrees with
  // the envelope manifest, even when the number of pages is unchanged.
  await page.evaluate(() => {
    const row = document.querySelector('.print-checklist-row');
    if (!row) throw new Error('No A5 organizer checklist row');
    row.dataset.count = '999';
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const blockedPacking = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (blockedPacking.calls !== 0 || !blockedPacking.alerts.some(message => message.includes('Packliste')))
    failures.push('Corrupted A5 organizer packing count did not block printing');
  await page.evaluate(() => {
    const row = document.querySelector('.print-checklist-row');
    const label = document.querySelector('.print-label');
    if (!row || !label) throw new Error('Missing A5 packing elements during restoration');
    row.dataset.count = label.dataset.count ?? '';
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const restoredPacking = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (restoredPacking.calls !== 1 || restoredPacking.alerts.length)
    failures.push('Valid A5 organizer packing count did not restore printing');
  // A duplicated label must be rejected even if the organizer list is
  // correct; remove the temporary duplicate before PDF generation.
  await page.evaluate(() => {
    const label = document.querySelector('.print-label');
    if (!label) throw new Error('Missing A5 label for duplicate test');
    const duplicate = label.cloneNode(true);
    duplicate.setAttribute('data-test-duplicate', 'true');
    label.parentElement?.appendChild(duplicate);
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const duplicateLabel = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (duplicateLabel.calls !== 0 || duplicateLabel.alerts.length === 0)
    failures.push('Duplicated A5 envelope label did not block printing');
  await page.evaluate(() => {
    document.querySelector('.print-label[data-test-duplicate="true"]')?.remove();
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const duplicateRestored = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (duplicateRestored.calls !== 1 || duplicateRestored.alerts.length)
    failures.push('A5 print action did not recover after duplicate label removal');
  // A child sheet moved into the wrong envelope must be rejected even
  // though the overall sheet count stays unchanged.
  await page.evaluate(() => {
    const first = document.querySelector('.print-child-sheet');
    if (!first) throw new Error('Missing A5 child sheet for ownership test');
    first.dataset.envelopeId = 'wrong-envelope';
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const wrongChild = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (wrongChild.calls !== 0 || wrongChild.alerts.length === 0)
    failures.push('A5 child sheet with wrong envelope identity did not block printing');
  await page.evaluate(() => {
    const first = document.querySelector('.print-child-sheet');
    const second = document.querySelectorAll('.print-child-sheet')[1];
    if (!first || !second) throw new Error('Missing child sheet for ownership restoration');
    first.dataset.envelopeId = second.dataset.envelopeId ?? '';
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const restoredChild = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (restoredChild.calls !== 1 || restoredChild.alerts.length)
    failures.push('A5 print did not recover after child envelope restoration');
  // A missing route page must not silently produce an incomplete packet.
  await page.evaluate(() => {
    const route = document.querySelector('.print-child-sheet[data-sheet-kind="route"]');
    if (!route) throw new Error('Missing A5 route page for omission test');
    route.dataset.testOriginalKind = route.dataset.sheetKind ?? '';
    route.dataset.sheetKind = 'answer';
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const wrongKind = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (wrongKind.calls !== 0 || wrongKind.alerts.length === 0)
    failures.push('A5 route page mislabelled as answer did not block printing');
  await page.evaluate(() => {
    const route = document.querySelector('.print-child-sheet[data-test-original-kind]');
    if (!route) throw new Error('Missing route page during restoration');
    route.dataset.sheetKind = route.dataset.testOriginalKind ?? 'route';
    delete route.dataset.testOriginalKind;
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const restoredKind = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (restoredKind.calls !== 1 || restoredKind.alerts.length)
    failures.push('A5 print did not recover after route page kind restoration');
  // Removing a whole child page must also block printing, even when
  // its envelope label and packing checklist are still present.
  await page.evaluate(() => {
    const sheet = document.querySelector('.print-child-sheet[data-sheet-kind="task"]');
    if (!sheet) throw new Error('Missing A5 task page for removal test');
    sheet.setAttribute('data-test-removed', 'true');
    sheet.hidden = true;
    sheet.classList.remove('print-sheet');
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const missingSheet = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (missingSheet.calls !== 0 || missingSheet.alerts.length === 0)
    failures.push('Missing A5 child sheet did not block printing');
  await page.evaluate(() => {
    const sheet = document.querySelector('.print-child-sheet[data-test-removed="true"]');
    if (!sheet) throw new Error('Missing child page for restoration');
    sheet.classList.add('print-sheet');
    sheet.hidden = false;
    sheet.removeAttribute('data-test-removed');
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const restoredSheet = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (restoredSheet.calls !== 1 || restoredSheet.alerts.length)
    failures.push('A5 print did not recover after restoring missing child sheet');
  // A visually similar label with a stray space is still a different
  // packing identity and must be rejected before opening the print dialog.
  await page.evaluate(() => {
    const label = document.querySelector('.print-label');
    if (!label) throw new Error('Missing label for whitespace identity test');
    label.dataset.team = ' ' + (label.dataset.team ?? '');
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const paddedLabel = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (paddedLabel.calls !== 0 || paddedLabel.alerts.length === 0)
    failures.push('Whitespace-padded A5 envelope label did not block printing');
  await page.evaluate(() => {
    const label = document.querySelector('.print-label');
    const row = document.querySelector('.print-checklist-row');
    if (!label || !row) throw new Error('Missing label for whitespace identity restoration');
    label.dataset.team = row.dataset.team ?? '';
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const restoredPaddedLabel = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (restoredPaddedLabel.calls !== 1 || restoredPaddedLabel.alerts.length)
    failures.push('A5 print did not recover after correcting whitespace-padded label');
  // The organizer's lock code and next destination are safety-critical
  // packing information. Alter each one and verify the print gate.
  for (const [field,invalid] of [['code','999'],['destination','Falscher Zielort']]) {
    await page.evaluate(([key,value]) => {
      const row = document.querySelector('.print-checklist-row');
      if (!row) throw new Error('Missing organizer checklist for secret integrity test');
      row.dataset.testOriginal = row.dataset[key] ?? '';
      row.dataset[key] = value;
      window.__a5PrintCalls = 0;
      window.__a5Alerts = [];
    }, [field,invalid]);
    await printButton.click();
    const blockedSecret = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
    if (blockedSecret.calls !== 0 || !blockedSecret.alerts.some(message => message.includes('Schloss-Code oder nächster Zielort')))
      failures.push('Tampered A5 organizer '+field+' did not block printing');
    await page.evaluate(key => {
      const row = document.querySelector('.print-checklist-row');
      if (!row) throw new Error('Missing organizer checklist for restoration');
      row.dataset[key] = row.dataset.testOriginal ?? '';
      delete row.dataset.testOriginal;
      window.__a5PrintCalls = 0;
      window.__a5Alerts = [];
    }, field);
    await printButton.click();
    const restoredSecret = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
    if (restoredSecret.calls !== 1 || restoredSecret.alerts.length)
      failures.push('Corrected A5 organizer '+field+' did not restore printing');
  }
  // A mismatched organizer-only lock code must block the real print
  // button, even if the child sheets and envelope labels are intact.
  await page.evaluate(() => {
    const row = document.querySelector('.print-checklist-row');
    if (!row) throw new Error('Missing organizer checklist row for lock-code test');
    row.dataset.testCode = row.dataset.code ?? '';
    row.dataset.code = '999';
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const wrongOrganizerCode = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (wrongOrganizerCode.calls !== 0 || wrongOrganizerCode.alerts.length === 0)
    failures.push('Incorrect organizer-only lock code did not block printing');
  await page.evaluate(() => {
    const row = document.querySelector('.print-checklist-row[data-test-code]');
    if (!row) throw new Error('Missing organizer checklist row for code restoration');
    row.dataset.code = row.dataset.testCode ?? '';
    delete row.dataset.testCode;
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const restoredOrganizerCode = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (restoredOrganizerCode.calls !== 1 || restoredOrganizerCode.alerts.length)
    failures.push('A5 print did not recover after organizer code correction');
  await page.evaluate(() => {
    const row = document.querySelector('.print-checklist-row');
    if (!row) throw new Error('Missing organizer checklist row for next-destination test');
    row.dataset.testDestination = row.dataset.destination ?? '';
    row.dataset.destination = 'Unbekannter Ort';
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const wrongOrganizerDestination = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (wrongOrganizerDestination.calls !== 0 || wrongOrganizerDestination.alerts.length === 0)
    failures.push('Incorrect organizer next destination did not block printing');
  await page.evaluate(() => {
    const row = document.querySelector('.print-checklist-row[data-test-destination]');
    if (!row) throw new Error('Missing organizer checklist row for destination restoration');
    row.dataset.destination = row.dataset.testDestination ?? '';
    delete row.dataset.testDestination;
    window.__a5PrintCalls = 0;
    window.__a5Alerts = [];
  });
  await printButton.click();
  const restoredOrganizerDestination = await page.evaluate(() => ({calls: window.__a5PrintCalls, alerts: window.__a5Alerts}));
  if (restoredOrganizerDestination.calls !== 1 || restoredOrganizerDestination.alerts.length)
    failures.push('A5 print did not recover after organizer destination correction');
  const sheets = page.locator('.print-packet .print-sheet');
  const expected = await sheets.count();
  if (expected < 1) throw new Error('No generated A5 sheets');
  // The preparation guidance is available to organizers on screen, but is
  // deliberately excluded from the children's printable A5 packet.
  const guidance = page.locator('.print-guidance');
  if (await guidance.count() !== 1 || !(await guidance.isVisible()))
    failures.push('A5 organizer print guidance is missing from the screen');
  const guidanceText = await guidance.innerText();
  for (const term of ['A5 Hochformat', 'Packübersicht nach Team:', 'A5-Einzelseiten', 'Schloss-Codes am echten Schloss']) {
    if (!guidanceText.includes(term)) failures.push('A5 organizer guidance missing: ' + term);
  }
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
    routePage: el.getAttribute('data-route-page') ?? '',
    combinedWordGrid: !!el.querySelector('.print-three-word-grid')
  })));
  // Match the screen packing overview to the actual child-page allocation.
  const teamPacking = new Map();
  const packingLabels = await page.locator('.print-label').evaluateAll(elements => elements.map(el => ({
    team: el.getAttribute('data-team') ?? '',
    sheets: Number(el.getAttribute('data-count'))
  })));
  for (const item of packingLabels) {
    const count = teamPacking.get(item.team) ?? {envelopes: 0, sheets: 0};
    count.envelopes++;
    count.sheets += item.sheets;
    teamPacking.set(item.team, count);
  }
  for (const [team, count] of teamPacking) {
    if (!guidanceText.includes(team + ': ' + count.envelopes + ' Umschläge, ' + count.sheets + ' Kinderblätter'))
      failures.push('A5 screen packing overview does not match printed labels for ' + team);
  }
  const envelopeGroups = new Map();
  for (const entry of envelopePages) {
    if (!entry.id) failures.push('A5 child sheet without envelope identifier');
    if (!['task','route'].includes(entry.kind)) failures.push('A5 child sheet with invalid kind: ' + entry.kind);
    const entries = envelopeGroups.get(entry.id) ?? [];
    entries.push(entry);
    envelopeGroups.set(entry.id, entries);
  }
  for (const [id, entries] of envelopeGroups) {
    if (!id.trim() || id !== id.trim()) failures.push('Invalid envelope identifier: ' + id);
    if (entries.filter(entry => entry.kind === 'task').length !== 1 || entries.filter(entry => entry.kind === 'route').length < 1)
      failures.push('Incomplete A5 envelope: ' + id);
    if (entries[0]?.kind !== 'task' || entries[1]?.kind !== 'route' || entries.slice(1).some((entry,index) => entry.kind !== 'route' || entry.routePage !== String(index + 1)))
      failures.push('Incorrect A5 envelope page order: ' + id);
  }
  const expectedEnvelopeOrder = [...envelopeGroups.entries()].flatMap(([id, entries]) => entries.map(() => id));
  if (envelopePages.some((entry, index) => entry.id !== expectedEnvelopeOrder[index]))
    failures.push('A5 child sheets are interleaved between envelopes');
  const labelIds = await page.locator('.print-label').evaluateAll(elements => elements.map(el => el.getAttribute('data-envelope-id') ?? ''));
  if (labelIds.length !== envelopeGroups.size || labelIds.some((id,index) => id !== [...envelopeGroups.keys()][index]))
    failures.push('A5 envelope labels do not match child packet order');
  const taskIds = envelopePages.filter(entry => entry.kind === 'task').map(entry => entry.id);
  if (new Set(taskIds).size !== taskIds.length)
    failures.push('Duplicate task sheets for an envelope');
  if (taskIds.length !== 12 || envelopePages.some(entry => entry.kind === 'answer')) failures.push('Expected exactly 12 task sheets and no answer sheets');
  if (envelopeGroups.size !== 12 || categories.children !== 24 || categories.labels !== 3)
    failures.push('Default 12-child A5 fixture differs from 12 envelopes / 24 child sheets / 3 label sheets: ' + JSON.stringify({envelopes: envelopeGroups.size, categories}));
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
  // Screen-only preparation notes must never consume paper or leak into
  // the children's A5 handouts.
  if (pdfPageTexts.some(content => content.includes('Druckeinstellungen und Packen')))
    failures.push('A5 PDF unexpectedly includes screen-only packing guidance');
  if (pdfPageTexts.some(content => content.includes('Packübersicht nach Team:')))
    failures.push('A5 PDF unexpectedly includes screen-only team packing totals');
  if (pdfPageTexts.some(content => content.includes('Umschläge vor dem Drucken einzeln kontrollieren')))
    failures.push('A5 PDF unexpectedly includes organizer-only on-screen packing preview');
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
      const marker = kind === 'route' ? 'Wegrätsel' : 'Stationsaufgaben:';
      if (marker && !content.includes(marker))
        failures.push('PDF page ' + pageNumber + ' does not contain expected ' + kind + ' sheet heading');
      // Check actual PDF sheet numbering against the DOM envelope sequence.
      const envelopeSheets = envelopePages.filter(entry => entry.id === envelopePages[i].id);
      const sheetIndex = envelopePages.slice(0, i + 1).filter(entry => entry.id === envelopePages[i].id).length;
      if (!content.includes('Blatt ' + sheetIndex + '/' + envelopeSheets.length))
        failures.push('PDF page ' + pageNumber + ' has incorrect envelope sheet numbering: ' + envelopePages[i].id);
      const combinedWordGrid = envelopeSheets.some(entry => entry.kind === 'task' && entry.combinedWordGrid);
      if (kind === 'task') {
        if (combinedWordGrid) {
          if (!content.includes('Geheimcode im Buchstabengitter') || !content.includes('Reihenfolge:'))
            failures.push('PDF task page ' + pageNumber + ' lacks combined word-search and ordering rule');
        } else {
          for (const number of [1, 2, 3]) {
            if (!content.includes('Aufgabe ' + number))
              failures.push('PDF task page ' + pageNumber + ' is missing task ' + number);
          }
        }
      }

    }
    for (let i = 0; i < categories.labels; i++) {
      const pageNumber = categories.organizer + categories.children + i + 1;
      if (!(pdfPageTexts[pageNumber - 1] ?? '').includes('Umschlag'))
        failures.push('PDF page ' + pageNumber + ' does not contain envelope labels');
    }
  }
  const organizerText = pdfPageTexts.slice(0, categories.organizer).join(' ');
  if (!organizerText.includes('Gruppen und Routen'))
    failures.push('PDF organizer section is missing the route overview');
  if (!organizerText.includes('Codes und Lösungen'))
    failures.push('PDF organizer section is missing the code overview');
  if (!organizerText.includes('Umschlagkontrolle'))
    failures.push('PDF organizer section is missing the envelope checklist');
  for (const code of ['007','000','123','987']) {
    if (!organizerText.includes(code))
      failures.push('PDF organizer section is missing code ' + code);
  }
  if (!extracted.stdout.includes('Spielleitung')) failures.push('PDF is missing organizer instructions');
  for (const code of ['007','000','123','987']) {
    if (!extracted.stdout.includes(code)) failures.push('PDF text is missing configured three-digit code ' + code);
  }
  // Every PDF child sheet must carry the same team as its DOM counterpart.
  const printedTeams = await page.locator('.print-child-sheet').evaluateAll(elements =>
    elements.map(element => element.querySelector('p strong')?.textContent?.trim() ?? ''));
  for (let index = 0; index < printedTeams.length; index++) {
    const team = printedTeams[index];
    const pageNumber = categories.organizer + index + 1;
    if (!team || !(pdfPageTexts[pageNumber - 1] ?? '').includes(team))
      failures.push('A5 PDF page ' + pageNumber + ' has no matching team identification');
  }
  // Compare the full team/station/sheet identification line for each child page.
  const printedHeaders = await page.locator('.print-child-sheet').evaluateAll(elements =>
    elements.map(element => element.querySelector('p')?.textContent?.trim() ?? ''));
  for (let index = 0; index < printedHeaders.length; index++) {
    const pageNumber = categories.organizer + index + 1;
    const expectedHeader = printedHeaders[index].replace(/\s+/g, ' ');
    const pdfText = (pdfPageTexts[pageNumber - 1] ?? '').replace(/\s+/g, ' ');
    if (!expectedHeader || !pdfText.includes(expectedHeader))
      failures.push('A5 PDF page ' + pageNumber + ' differs from the team/station/sheet header in the browser');
  }
  // The organizer's packing checklist must include every envelope line.
  const checklistRows = await page.locator('.print-checklist-row > strong').allTextContents();
  const normalizedOrganizer = organizerText.replace(/\s+/g, ' ');
  for (let index = 0; index < checklistRows.length; index++) {
    const row = checklistRows[index].replace(/\s+/g, ' ').trim();
    if (!row || !row.split(' · ').every(part => normalizedOrganizer.includes(part.trim())))
      failures.push('A5 organizer checklist is missing envelope identity ' + (index + 1));
  }
  if (checklistRows.length !== envelopeGroups.size)
    failures.push('A5 organizer checklist has ' + checklistRows.length + ' rows for ' + envelopeGroups.size + ' envelopes');
  if (labelIds.length !== checklistRows.length)
    failures.push('A5 packing checklist and printed envelope labels have different counts');
  // The packing list must show the sheet count and next destination for every envelope.
  const checklistDetails = await page.locator('.print-checklist-row > span').allTextContents();
  if (checklistDetails.length !== checklistRows.length)
    failures.push('A5 packing checklist is missing envelope details');
  for (let index = 0; index < checklistDetails.length; index++) {
    const details = checklistDetails[index].replace(/\s+/g, ' ').trim();
    const sheetCount = details.match(/(\d+) Kinderblätter/)?.[1];
    if (!sheetCount || Number(sheetCount) !== envelopeGroups.get([...envelopeGroups.keys()][index])?.length)
      failures.push('A5 packing checklist has incorrect child sheet count for envelope ' + (index + 1));
    if (!details.includes('Danach:') || !details.includes('Schloss-Code:'))
      failures.push('A5 packing checklist lacks route or lock code for envelope ' + (index + 1));
  }
  // Compare each printed packing-list detail to the actual organizer PDF.
  for (let index = 0; index < checklistDetails.length; index++) {
    const detail = checklistDetails[index].replace(/\s+/g, ' ').trim();
    const code = detail.match(/Schloss-Code:\s*(\d{3})/)?.[1];
    const destination = detail.split('Danach:').at(-1)?.trim();
    if (!code || !destination)
      failures.push('A5 packing checklist has an invalid code or destination for envelope ' + (index + 1));
    if (code && !normalizedOrganizer.includes(code))
      failures.push('A5 organizer PDF is missing packing-list lock code for envelope ' + (index + 1));
    if (destination && !normalizedOrganizer.includes(destination))
      failures.push('A5 organizer PDF is missing packing-list destination for envelope ' + (index + 1));
  }
  // Every packing-list entry must be present on its expected A5 organizer
  // checklist page (four envelopes per sheet), not somewhere in the document.
  const checklistPdfPages = pdfPageTexts.slice(0, categories.organizer)
    .filter(content => content.includes('Umschlagkontrolle'));
  for (let index = 0; index < checklistRows.length; index++) {
    const printedPage = (checklistPdfPages[Math.floor(index / 4)] ?? '').replace(/\s+/g, ' ');
    const row = checklistRows[index].replace(/\s+/g, ' ').trim();
    const parts = row.split(' · ');
    if (!parts.every(part => printedPage.includes(part.trim())))
      failures.push('A5 packing-list row ' + (index + 1) + ' is missing from its expected organizer PDF page');
    const details = (checklistDetails[index] ?? '').replace(/\s+/g, ' ').trim();
    const code = details.match(/Schloss-Code:\s*(\d{3})/)?.[1];
    const destination = details.split('Danach:').at(-1)?.trim();
    if (!code || !printedPage.includes('Schloss-Code: ' + code))
      failures.push('A5 packing-list code ' + (index + 1) + ' is missing from its expected PDF page');
    if (!destination || !printedPage.includes('Danach: ' + destination))
      failures.push('A5 packing-list destination ' + (index + 1) + ' is missing from its expected PDF page');
  }
  if (checklistPdfPages.length !== Math.ceil(checklistRows.length / 4))
    failures.push('A5 organizer PDF has an incorrect number of packing-list pages');
  const childText = pdfPageTexts.slice(categories.organizer, categories.organizer + categories.children).join(' ');
  // Label text must preserve each envelope's group and station assignment.
  const labelNames = await page.locator('.print-label strong').allTextContents();
  const labelPages = pdfPageTexts.slice(categories.organizer + categories.children);
  for (let index = 0; index < labelNames.length; index++) {
    const labelPage = Math.floor(index / 4);
    const expectedLabel = labelNames[index].trim();
    if (!expectedLabel || !(labelPages[labelPage] ?? '').replace(/\s+/g, ' ').includes(expectedLabel.replace(/\s+/g, ' ')))
      failures.push('A5 label ' + (index + 1) + ' missing from its expected PDF sheet');
  }
  // Compare the complete envelope-label description, including the number
  // of sheets to pack, rather than checking the group name alone.
  const labelDescriptions = await page.locator('.print-label span').allTextContents();
  for (let index = 0; index < labelDescriptions.length; index++) {
    const pageNumber = Math.floor(index / 4);
    const expectedDescription = labelDescriptions[index].replace(/\s+/g, ' ').trim();
    const printedPage = (labelPages[pageNumber] ?? '').replace(/\s+/g, ' ');
    if (!expectedDescription || !printedPage.includes(expectedDescription))
      failures.push('A5 envelope label ' + (index + 1) + ' lost its sheet count or sequence');
  }
  if (labelNames.length !== checklistRows.length || labelDescriptions.length !== checklistDetails.length)
    failures.push('A5 label and packing-list item counts differ');
  // Every label must identify the same team, station and sheet quantity as
  // its corresponding organizer packing-list row, not merely a matching count.
  for (let index = 0; index < labelNames.length; index++) {
    const label = labelNames[index]?.replace(/\s+/g, ' ').trim() ?? '';
    const checklist = checklistRows[index]?.replace(/\s+/g, ' ').trim() ?? '';
    const labelDetail = labelDescriptions[index]?.replace(/\s+/g, ' ').trim() ?? '';
    const packingDetail = checklistDetails[index]?.replace(/\s+/g, ' ').trim() ?? '';
    const labelParts = label.match(/^Team (.+) · (.+)$/);
    const checklistParts = checklist.match(/^Team (.+) · Station (\d+): (.+)$/);
    const labelSequence = labelDetail.match(/Umschlag (\d+) von (\d+)/);
    const labelCount = labelDetail.match(/(\d+) Blätter/);
    const packingCount = packingDetail.match(/(\d+) Kinderblätter/);
    if (!labelParts || !checklistParts || !labelSequence ||
        labelParts[1] !== checklistParts[1] || labelParts[2] !== checklistParts[3] ||
        labelSequence[1] !== checklistParts[2] ||
        !labelCount || !packingCount || labelCount[1] !== packingCount[1])
      failures.push('A5 envelope label and organizer packing-list identity differ at envelope ' + (index + 1));
  }
  const labelText = pdfPageTexts.slice(categories.organizer + categories.children).join(' ');
  if (childText.includes('Codes und Lösungen') || childText.includes('Umschlagkontrolle'))
    failures.push('Organizer-only solution or envelope checklist leaked onto child pages');
  if (!labelText.includes('Umschlag'))
    failures.push('PDF label section is missing envelope labels');
  if (!extracted.stdout.includes('Umschlag')) failures.push('PDF is missing envelope information');
  const codeOccurrences = Object.fromEntries(['007','000','123','987'].map(code => [code, pdfPageTexts.filter(pageText => pageText.includes(code)).length]));
  if (Object.values(codeOccurrences).some(count => count === 0)) failures.push('Not every configured lock code is present in the PDF');
  if (browserErrors.length) failures.push(...browserErrors.map(error => 'Browser JavaScript: ' + error));
  const report = { expectedSheets: expected, pdfPages: pages, pdfA5Portrait: !!a5, categories, envelopeCount: envelopeGroups.size, labelCount: labelIds.length, childHeadersChecked: printedHeaders.length, teamIdentitiesChecked: printedTeams.length, labelTextsChecked: labelNames.length, packingRowsChecked: checklistRows.length, packingPagesChecked: checklistPdfPages.length, organizerSectionsChecked: 3, blankPages, codeOccurrences, measurements: measured, failures };
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
