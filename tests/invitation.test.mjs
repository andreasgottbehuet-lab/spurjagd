import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { clampNote, formatInvitationDate, invitationTitle, INVITATION_NOTE_MAX } from '../src/invitation.ts';

const cardBuild = await build({ entryPoints: [new URL('../src/InvitationCard.tsx', import.meta.url).pathname], bundle: true, format: 'esm', jsx: 'automatic', packages: 'external', write: false });
const cardCode = cardBuild.outputFiles[0].text.replace('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')));
const { InvitationCard } = await import('data:text/javascript,' + encodeURIComponent(cardCode));

test('InvitationCard escapes text and selects its design background', () => {
  const props = { title: '<script>alert(1)</script>', date: '2026-12-24', time: '12:00', place: '<script>alert(1)</script>', note: '<script>alert(1)</script>', tinte: 'farbig', lang: 'de' };
  const wald = renderToStaticMarkup(createElement(InvitationCard, { ...props, designId: 'wald' }));
  assert.match(wald, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(wald, /<script>/);
  assert.ok(wald.includes('/grafik/wald/einladung_farbig.webp'));
  const schlicht = renderToStaticMarkup(createElement(InvitationCard, { ...props, designId: 'schlicht' }));
  assert.ok(schlicht.includes('invitation-card-plain'));
  assert.ok(!schlicht.includes('url('));
});

test('invitationTitle respects touched state and project renames', () => {
  assert.equal(invitationTitle('Projekt', 'Titel', false), 'Projekt');
  assert.equal(invitationTitle('Projekt', 'Titel', true), 'Titel');
  assert.equal(invitationTitle('Projekt', '', true), '');
  assert.equal(invitationTitle('Neues Projekt', 'Titel', false), 'Neues Projekt');
});

test('clampNote limits notes to 120 characters and preserves short notes', () => {
  assert.equal(INVITATION_NOTE_MAX, 120);
  assert.equal(clampNote('x'.repeat(200)), 'x'.repeat(120));
  assert.equal(clampNote('kurz'), 'kurz');
});

test('formatInvitationDate formats a local German date and rejects invalid input', () => {
  const formatted = formatInvitationDate('2026-12-24', 'de');
  assert.match(formatted, /Dezember/);
  assert.match(formatted, /24/);
  assert.match(formatted, /Donnerstag/);
  assert.equal(formatInvitationDate('ungueltig', 'de'), '');
  assert.equal(formatInvitationDate('', 'de'), '');
});
