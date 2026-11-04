import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('verification', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ acceptDownloads: true });
const checks = [];
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
  await page.locator('input[type="file"]').setInputFiles('verification/project-backup.json');
  await page.waitForTimeout(900);
  if (!(await page.locator('#projectTitle').inputValue()).includes('Import')) throw new Error('Backup import');
  checks.push('JSON import');
  const before = await page.locator('#savedProjects option').count();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Löschen' }).click();
  await page.waitForTimeout(900);
  if (await page.locator('#savedProjects option').count() !== before - 1) throw new Error('Delete project');
  checks.push('Delete project');
} finally {
  writeFileSync('verification/project-browser-report.json', JSON.stringify({ checks }, null, 2));
  await browser.close();
}
console.log('Project browser checks:', checks.join(', '));
