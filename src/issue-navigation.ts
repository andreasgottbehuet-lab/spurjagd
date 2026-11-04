/** Map a validation error to the wizard section where it can be fixed. */
export function issueStep(issue:string):1|2|3|4 {
 const text=issue.toLocaleLowerCase('de');
 if(/teilnehmer|gruppengröße|gruppenanzahl|alter|spielziel/.test(text)) return 1;
 if(/zeit|dauer|gehzeit|startort|zielort|treffpunkt|start- und abschluss|gruppenplan/.test(text)) return 2;
 if(/station|standort|code|schloss|wegrätsel|rätsel|route|ortsname|beschreibung/.test(text)) return 3;
 return 4;
}
