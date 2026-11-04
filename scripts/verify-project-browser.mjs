import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('verification', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ acceptDownloads: true });
const checks = [];
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.locator('#projectTitle').fill('Browser Testprojekt');
  await page.waitForTimeout(900);
  const originalId = await page.locator('#savedProjects').inputValue();
  if (!originalId) throw new Error('Initial project not saved');
  checks.push('Autosave');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sichern' }).click();
  const download = await pending;
  if (!download.suggestedFilename().includes('Browser-Testprojekt')) throw new Error('Backup filename');
  await download.saveAs('verification/project-backup.json');
  checks.push('JSON export');
  await page.getByRole('button', { name: 'Neu', exact: true }).click();
  await page.waitForTimeout(900);
  if (await page.locator('#savedProjects').inputValue() === originalId) throw new Error('New project ID');
  checks.push('New project');
  await page.locator('#savedProjects').selectOption(originalId);
  if (await page.locator('#projectTitle').inputValue() !== 'Browser Testprojekt') throw new Error('Switch lost data');
  await page.reload({ waitUntil: 'networkidle' });
  if (await page.locator('#projectTitle').inputValue() !== 'Browser Testprojekt') throw new Error('Reload lost data');
  checks.push('Switch and reload');
  writeFileSync('verification/project-invalid-backup.json', '{invalid');
  const countBeforeInvalid = await page.locator('#savedProjects option').count();
  await page.locator('input[type="file"]').setInputFiles('verification/project-invalid-backup.json');
  await page.waitForTimeout(300);
  if (await page.locator('#savedProjects option').count() !== countBeforeInvalid) throw new Error('Invalid backup changed projects');
  if (!(await page.locator('.storage-message').textContent()).includes('Import fehlgeschlagen')) throw new Error('Invalid backup lacks error message');
  checks.push('Invalid backup rejected');
  await page.locator('input[type="file"]').setInputFiles('verification/project-backup.json');
  await page.waitForTimeout(900);
  if (!(await page.locator('#projectTitle').inputValue()).includes('Import')) throw new Error('Backup import');
  checks.push('JSON import');
  const before = await page.locator('#savedProjects option').count();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Löschen' }).click();
  if (await page.locator('#savedProjects option').count() !== before) throw new Error('Cancelled deletion changed projects');
  checks.push('Cancel deletion');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Löschen' }).click();
  await page.waitForTimeout(900);
  if (await page.locator('#savedProjects option').count() !== before - 1) throw new Error('Delete project');
  checks.push('Delete project');
  if (errors.length) throw new Error('Browser JavaScript errors: ' + errors.join(' | '));
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
  try { await page.screenshot({ path: 'verification/project-browser-failure.png', fullPage: true }); } catch {}
  throw error;
} finally {
  writeFileSync('verification/project-browser-report.json', JSON.stringify({ checks, errors }, null, 2));
  await browser.close();
}
console.log('Project browser checks:', checks.join(', '));
