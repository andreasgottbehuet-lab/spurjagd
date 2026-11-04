import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

mkdirSync('verification', { recursive: true });
let browser;
let page;
const checks = [];
const startedAt = new Date().toISOString();
const errors = [];
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.locator('#projectTitle').fill('Browser Testprojekt');
  await page.locator('#projectTitle').blur();
  await page.waitForFunction(() => document.querySelector('#savedProjects')?.value && [...document.querySelectorAll('#savedProjects option')].some(option => option.value === document.querySelector('#savedProjects').value && option.textContent?.includes('Browser Testprojekt')));
  const originalId = await page.locator('#savedProjects').inputValue();
  if (!originalId) throw new Error('Initial project not saved');
  checks.push('Autosave');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sichern' }).click();
  const download = await pending;
  if (!download.suggestedFilename().includes('Browser-Testprojekt')) throw new Error('Backup filename');
  await download.saveAs('verification/project-backup.json');
  const backup = JSON.parse(readFileSync('verification/project-backup.json', 'utf8'));
  if (backup.format !== 'spurjagd-backup-1' || backup.project?.id !== originalId || backup.project?.title !== 'Browser Testprojekt')
    throw new Error('Downloaded JSON does not contain the expected project');
  checks.push('JSON export');
  await page.locator('#projectTitle').fill('Sicherung ohne Wartezeit');
  const immediateDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sichern' }).click();
  const immediateFile = await immediateDownload;
  await immediateFile.saveAs('verification/project-immediate-backup.json');
  const immediateBackup = JSON.parse(readFileSync('verification/project-immediate-backup.json', 'utf8'));
  if (immediateBackup.project?.title !== 'Sicherung ohne Wartezeit')
    throw new Error('Immediate JSON export lost pending title edits');
  await page.locator('#projectTitle').fill('Browser Testprojekt');
  checks.push('Immediate export includes unsaved edits');
  await page.getByRole('button', { name: 'Neu', exact: true }).click();
  await page.waitForFunction(previous => document.querySelector('#savedProjects')?.value !== previous && document.querySelector('#savedProjects')?.value, originalId);
  if (await page.locator('#savedProjects').inputValue() === originalId) throw new Error('New project ID');
  checks.push('New project');
  await page.locator('#projectTitle').fill('Neuer Entwurf mit ungespeicherter Änderung');
  await page.getByRole('button', { name: 'Neu', exact: true }).click();
  await page.locator('#savedProjects').selectOption(originalId);
  await page.waitForFunction(() => document.querySelector('#projectTitle')?.value === 'Browser Testprojekt');
  const titles = await page.locator('#savedProjects option').allTextContents();
  if (!titles.some(title => title.includes('Neuer Entwurf mit ungespeicherter Änderung')))
    throw new Error('Immediate project switch lost unsaved edits');
  checks.push('Save before project switch');
  await page.locator('#savedProjects').selectOption(originalId);
  await page.locator('#projectTitle').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#projectTitle')?.value === 'Browser Testprojekt');
  if (await page.locator('#projectTitle').inputValue() !== 'Browser Testprojekt') throw new Error('Switch lost data');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#projectTitle')?.value === 'Browser Testprojekt');
  if (await page.locator('#projectTitle').inputValue() !== 'Browser Testprojekt') throw new Error('Reload lost data');
  checks.push('Switch and reload');
  await page.locator('#projectTitle').fill('Sofortiger Seitenwechsel');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#projectTitle')?.value === 'Sofortiger Seitenwechsel');
  checks.push('Immediate reload flushes pending edits');
  // Repeated pagehide/visibility saves must not reuse a revision timestamp.
  const revisionBefore=await page.evaluate(() => JSON.parse(localStorage.getItem('spurjagd-projects-v1'))[0].updatedAt);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const revisionAfter=await page.evaluate(() => JSON.parse(localStorage.getItem('spurjagd-projects-v1'))[0].updatedAt);
  if (Date.parse(revisionAfter) <= Date.parse(revisionBefore))
    throw new Error('Pagehide flush did not advance the saved revision');
  checks.push('Pagehide flush advances project revision');
  await page.locator('#projectTitle').fill('Browser Testprojekt');
  await page.locator('#projectTitle').blur();
  await page.waitForFunction(() => [...document.querySelectorAll('#savedProjects option')].some(option => option.textContent?.includes('Browser Testprojekt')));
  writeFileSync('verification/project-invalid-backup.json', '{invalid');
  const countBeforeInvalid = await page.locator('#savedProjects option').count();
  await page.locator('input[type="file"]').setInputFiles('verification/project-invalid-backup.json');
  await page.locator('.storage-message').filter({ hasText: 'Import fehlgeschlagen' }).waitFor();
  if (await page.locator('#savedProjects option').count() !== countBeforeInvalid) throw new Error('Invalid backup changed projects');
  if (await page.locator('#projectTitle').inputValue() !== 'Browser Testprojekt') throw new Error('Invalid backup changed active project');
  if (!(await page.locator('.storage-message').textContent()).includes('Import fehlgeschlagen')) throw new Error('Invalid backup lacks error message');
  checks.push('Invalid backup rejected');
  await page.locator('input[type="file"]').setInputFiles('verification/project-backup.json');
  await page.waitForFunction(() => document.querySelector('#projectTitle')?.value.includes('Import'));
  if (await page.locator('#projectTitle').inputValue() !== 'Browser Testprojekt (Import)') throw new Error('Backup import title mismatch');
  if (await page.locator('.step-button.active').count() !== 1) throw new Error('Restored project has no active planning step');
  checks.push('JSON import');
  const importedId = await page.locator('#savedProjects').inputValue();
  if (importedId === originalId) throw new Error('Import overwrote original project');
  await page.locator('#savedProjects').selectOption(originalId);
  await page.waitForFunction(() => document.querySelector('#projectTitle')?.value === 'Browser Testprojekt');
  checks.push('Original project preserved after import');
  await page.locator('#savedProjects').selectOption(importedId);
  await page.waitForFunction(() => document.querySelector('#projectTitle')?.value.includes('Import'));
  const before = await page.locator('#savedProjects option').count();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Löschen' }).click();
  if (await page.locator('#savedProjects option').count() !== before) throw new Error('Cancelled deletion changed projects');
  checks.push('Cancel deletion');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Löschen' }).click();
  await page.waitForFunction(expected => document.querySelectorAll('#savedProjects option').length === expected, before - 1);
  if (await page.locator('#savedProjects option').count() !== before - 1) throw new Error('Delete project');
  const afterDelete = await page.locator('#savedProjects').evaluate(select => [...select.options].map(option => option.value));
  if (afterDelete.includes(importedId) || !afterDelete.includes(originalId)) throw new Error('Deleting import also removed original project');
  checks.push('Delete project');
  const remainingIds = await page.locator('#savedProjects').evaluate(select => [...select.options].map(option => option.value));
  for (const id of remainingIds.slice(1)) {
    await page.locator('#savedProjects').selectOption(id);
    await page.waitForFunction(expected => document.querySelector('#savedProjects')?.value === expected, id);
    page.once('dialog', dialog => dialog.accept());
    const countBefore = await page.locator('#savedProjects option').count();
    await page.getByRole('button', { name: 'Löschen' }).click();
    await page.waitForFunction(expected => document.querySelectorAll('#savedProjects option').length === expected, countBefore - 1);
    if ((await page.locator('#savedProjects option').evaluateAll(options => options.map(option => option.value))).includes(id))
      throw new Error('Deleted project still present: ' + id);
  }
  const lastId = await page.locator('#savedProjects').inputValue();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Löschen' }).click();
  await page.waitForFunction(previous => document.querySelector('#savedProjects')?.value && document.querySelector('#savedProjects')?.value !== previous, lastId);
  if (await page.locator('#savedProjects option').count() !== 1) throw new Error('Last-project deletion did not create a fresh draft');
  const freshTitle = await page.locator('#projectTitle').inputValue();
  if (freshTitle !== 'Meine Schnitzeljagd') throw new Error('Final deletion retained old project title');
  const freshId = await page.locator('#savedProjects').inputValue();
  if (freshId === originalId || freshId === importedId) throw new Error('Fresh draft reused deleted project ID');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(expected => document.querySelector('#savedProjects')?.value === expected, freshId);
  if (await page.locator('#projectTitle').inputValue() !== 'Meine Schnitzeljagd') throw new Error('Fresh draft was not persisted after reload');
  checks.push('Last project replacement');
  // Simulate an external edit without dispatching a storage event in this tab.
  // The revision check must reject destructive actions even without event notification.
  await page.evaluate(() => {
    const key='spurjagd-projects-v1';
    const projects=JSON.parse(localStorage.getItem(key));
    projects[0].title='Extern aktualisierter Entwurf';
    projects[0].updatedAt=new Date(Date.parse(projects[0].updatedAt)+1000).toISOString();
    localStorage.setItem(key,JSON.stringify(projects));
  });
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Löschen' }).click();
  await page.locator('.storage-message').filter({ hasText: 'zwischenzeitlich verändert' }).waitFor();
  if (await page.locator('#savedProjects option').count() !== 1)
    throw new Error('Stale deletion removed a newer project');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#projectTitle')?.value === 'Extern aktualisierter Entwurf');
  checks.push('Stale deletion blocked without storage event');
  const otherTab = await page.context().newPage();
  try {
    await otherTab.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await otherTab.locator('#projectTitle').fill('Aenderung aus zweitem Tab');
    await otherTab.waitForFunction(() => [...document.querySelectorAll('#savedProjects option')].some(option => option.textContent?.includes('Aenderung aus zweitem Tab')));
    await page.locator('.storage-message').filter({ hasText: 'anderen Tab' }).waitFor();
    await page.locator('#projectTitle').fill('Veraltete Eingabe');
    await page.waitForTimeout(850);
    await otherTab.reload({ waitUntil: 'networkidle' });
    if (await otherTab.locator('#projectTitle').inputValue() !== 'Aenderung aus zweitem Tab')
      throw new Error('Stale tab overwrote newer project changes');
    checks.push('Concurrent tab change detected');
    // A stale editor may still export its unsaved work, but must not create,
    // import, switch or delete projects after another tab changed the list.
    const staleTitle=await page.locator('#projectTitle').inputValue();
    const staleProjectId=await page.locator('#savedProjects').inputValue();
    await page.getByRole('button', { name: 'Neu', exact: true }).click();
    if (await page.locator('#savedProjects').inputValue() !== staleProjectId)
      throw new Error('Stale editor created a project despite storage conflict');
    await page.getByRole('button', { name: 'Löschen' }).click();
    if (await page.locator('#savedProjects').inputValue() !== staleProjectId)
      throw new Error('Stale editor deleted a project despite storage conflict');
    const staleExportPromise=page.waitForEvent('download');
    await page.getByRole('button', { name: 'Sichern' }).click();
    const staleExport=await staleExportPromise;
    await staleExport.saveAs('verification/project-stale-tab-backup.json');
    const staleBackup=JSON.parse(readFileSync('verification/project-stale-tab-backup.json','utf8'));
    if (staleBackup.project?.title !== staleTitle)
      throw new Error('Stale editor cannot export its current unsaved draft');
    checks.push('Stale tab blocks writes but permits emergency JSON export');
    const staleCount=await page.locator('#savedProjects option').count();
    await page.locator('input[type="file"]').setInputFiles('verification/project-backup.json');
    await page.waitForTimeout(100);
    if (await page.locator('#savedProjects option').count() !== staleCount ||
        await page.locator('#savedProjects').inputValue() !== staleProjectId)
      throw new Error('Stale editor imported a project despite storage conflict');
    checks.push('Stale tab blocks backup import');
  } finally {
    await otherTab.close();
  }
  if (errors.length) throw new Error('Browser JavaScript errors: ' + errors.join(' | '));
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  if (page && !page.isClosed()) {
    try { await page.screenshot({ path: 'verification/project-browser-failure.png', fullPage: true }); } catch {}
  }
  throw error;
} finally {
  writeFileSync('verification/project-browser-report.json', JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), passed: errors.length === 0, checks, errors }, null, 2));
  if (browser) await browser.close();
}
console.log('Project browser checks:', checks.join(', '));
