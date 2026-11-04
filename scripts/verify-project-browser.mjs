import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

mkdirSync('verification', { recursive: true });
let browser;
let page;
const checks = [];
const errors = [];
try {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ acceptDownloads: true });
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
  await page.getByRole('button', { name: 'Neu', exact: true }).click();
  await page.waitForFunction(previous => document.querySelector('#savedProjects')?.value !== previous && document.querySelector('#savedProjects')?.value, originalId);
  if (await page.locator('#savedProjects').inputValue() === originalId) throw new Error('New project ID');
  checks.push('New project');
  await page.locator('#savedProjects').selectOption(originalId);
  await page.locator('#projectTitle').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#projectTitle')?.value === 'Browser Testprojekt');
  if (await page.locator('#projectTitle').inputValue() !== 'Browser Testprojekt') throw new Error('Switch lost data');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#projectTitle')?.value === 'Browser Testprojekt');
  if (await page.locator('#projectTitle').inputValue() !== 'Browser Testprojekt') throw new Error('Reload lost data');
  checks.push('Switch and reload');
  writeFileSync('verification/project-invalid-backup.json', '{invalid');
  const countBeforeInvalid = await page.locator('#savedProjects option').count();
  await page.locator('input[type="file"]').setInputFiles('verification/project-invalid-backup.json');
  await page.locator('.storage-message').filter({ hasText: 'Import fehlgeschlagen' }).waitFor();
  if (await page.locator('#savedProjects option').count() !== countBeforeInvalid) throw new Error('Invalid backup changed projects');
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
  checks.push('Last project replacement');
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
  writeFileSync('verification/project-browser-report.json', JSON.stringify({ checks, errors }, null, 2));
  if (browser) await browser.close();
}
console.log('Project browser checks:', checks.join(', '));
