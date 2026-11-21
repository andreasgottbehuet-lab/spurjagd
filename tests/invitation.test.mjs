import test from 'node:test';
import assert from 'node:assert/strict';
import { clampNote, formatInvitationDate, invitationTitle, INVITATION_NOTE_MAX } from '../src/invitation.ts';

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
