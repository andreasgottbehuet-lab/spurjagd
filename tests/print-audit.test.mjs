import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlan} from '../src/generator.ts';
import {auditPrintPacket} from '../src/print-audit.ts';

const config=()=>({
 players:12,groupSize:3,durationMinutes:60,age:'8–10',goal:'locks',
 locations:[
  {id:'a',name:'Spielplatz',description:'Rutsche und Schaukeln auf dem Spielplatz'},
  {id:'b',name:'Wiese',description:'Eine Wiese mit Bäumen und Gras'},
  {id:'c',name:'Feuerwehrplatz',description:'Platz neben dem Feuerwehrhaus'},
  {id:'d',name:'Sportplatz',description:'Fußballtore und Laufbahn'}
 ],
 puzzleMinutes:10,walkingMinutes:5,startFinishMinutes:10,
 startMode:'distributed',routeMode:'varied',finishMode:'meeting',
 startPoint:'Zuhause',meetingPoint:'Zuhause',
 stationCodes:{a:'007',b:'120',c:'999',d:'000'},
 routeClueModes:{a:'questions',b:'description',c:'letters',d:'questions'},
 routeClueTexts:{}
});
test('Vollständiges Spielpaket mit unterschiedlichen Gruppenrouten ist druckfähig',()=>{
 const c=config();
 const plan=createPlan(c);
 assert.deepEqual(auditPrintPacket(c,plan,'projekt-1'),[]);
 assert.equal(plan.teams.length,4);
 assert.equal(plan.teams.reduce((sum,team)=>sum+team.stations.length,0),12);
});
test('Druckprüfung findet fehlende Schloss-Codes und unlösbare Wegrätsel',()=>{
 const c=config();
 c.stationCodes.b='12';
 c.routeClueModes.a='custom';
 const issues=auditPrintPacket(c,createPlan(c),'projekt-1');
 assert.ok(issues.some(issue=>issue.includes('Code')&&issue.includes('Wiese')));
 assert.ok(issues.some(issue=>issue.includes('Wegrätsel')||issue.includes('eigenes Wegrätsel')));
});
test('Druckprüfung erkennt manipulierte Gruppenrouten',()=>{
 const c=config();
 const plan=createPlan(c);
 plan.teams[0].stations[1]=plan.teams[0].stations[0];
 assert.ok(auditPrintPacket(c,plan,'projekt-1').some(issue=>issue.includes('doppelt')));
});
test('Druckprüfung berücksichtigt verschiedene Schloss-Codes einschließlich 000',()=>{
 const c=config();
 const plan=createPlan(c);
 for(const code of ['000','001','010','100','999']){
  c.stationCodes.a=code;
  assert.deepEqual(auditPrintPacket(c,plan,'projekt-1'),[]);
 }
});

test('Druckfreigabe verlangt einen benannten Start und bei gemeinsamem Finale ein benanntes Ziel',()=>{
 const c=config();
 const plan=createPlan(c);
 c.startPoint=' ';
 c.meetingPoint=' ';
 const issues=auditPrintPacket(c,plan,'projekt-1');
 assert.ok(issues.some(issue=>issue.includes('Startort fehlt')));
 assert.ok(issues.some(issue=>issue.includes('Zielort fehlt')));
});
test('Druckfreigabe weist doppelte Stations-IDs zurück',()=>{
 const c=config();
 c.locations[1].id=c.locations[0].id;
 const issues=auditPrintPacket(c,createPlan({...c,locations:config().locations}),'projekt-1');
 assert.ok(issues.some(issue=>issue.includes('Stations-IDs')));
});

test('Unlösbare oder offen verratene Ortsrätsel verhindern Druck',()=>{const c=config();c.routeClueModes.a='description';c.locations[0].description='Spielplatz';const issues=auditPrintPacket(c,createPlan(c),'projekt-1');assert.ok(issues.some(issue=>issue.includes('Ortsbeschreibung')||issue.includes('Wegrätsel')));});

test('Eigenes Wegrätsel darf den Zielort nicht nennen',()=>{const c=config();c.routeClueModes.b='custom';c.routeClueTexts.b='Geht direkt zur Wiese.';const issues=auditPrintPacket(c,createPlan(c),'projekt-1');assert.ok(issues.some(issue=>issue.includes('nennt bereits den Zielort')));});

test('Druckprüfung erkennt vertauschte, aber einzeln gültige Gruppenstationen',()=>{
 const c=config(), plan=createPlan(c);
 const team=plan.teams[0];
 [team.stations[0],team.stations[1]]=[team.stations[1],team.stations[0]];
 const issues=auditPrintPacket(c,plan,'projekt-1');
 assert.ok(issues.some(issue=>issue.includes('Gruppenroute')));
});
test('Druckprüfung erkennt manipulierten Zielort und Teilnehmerzahl',()=>{
 const c=config(),plan=createPlan(c);
 plan.teams[0].finish='Unbekannt';
 plan.teams[1].memberCount=1;
 const issues=auditPrintPacket(c,plan,'projekt-1');
 assert.ok(issues.some(issue=>issue.includes('Gruppenroute')));
});

test('Druckprüfung erkennt manipulierte Stationsnamen und Beschreibungen',()=>{
 const c=config(),plan=createPlan(c);
 plan.teams[0].stations[0].name='Falscher Name';
 plan.teams[0].stations[1].description='Veränderte Ortsangabe';
 assert.ok(auditPrintPacket(c,plan,'projekt-1').some(issue=>issue.includes('Gruppenroute')));
});

test('Veränderte Gruppenprofile werden bei der Druckprüfung erkannt',()=>{const c=config();c.teamProfiles={'0':{age:'8–10',difficulty:'normal'}};const plan=createPlan(c);plan.teams[0].profile.difficulty='hard';assert.ok(auditPrintPacket(c,plan,'projekt-1').some(issue=>issue.includes('Gruppenroute')));});

test('Stationsnamen mit Rand-Leerzeichen behalten ihre Fragenrätsel-Einstellung',()=>{const c=config();c.locations[0].name='  Spielplatz  ';const plan=createPlan(c);assert.deepEqual(auditPrintPacket(c,plan,'projekt-1'),[]);});

test('Nicht besuchte Stationen benötigen keinen Schloss-Code',()=>{
 const c={...config(),players:3,groupSize:3,durationMinutes:30,stationCodes:{a:'007'}};
 const plan=createPlan(c);
 assert.equal(plan.stopsPerTeam,1);
 assert.deepEqual(plan.teams[0].stations.map(station=>station.id),['a']);
 assert.deepEqual(auditPrintPacket(c,plan,'projekt-1'),[]);
});

test('Ein fehlender Code an einer besuchten Station sperrt weiterhin den Druck',()=>{
 const c={...config(),players:3,groupSize:3,durationMinutes:30,stationCodes:{}};
 const plan=createPlan(c);
 assert.ok(auditPrintPacket(c,plan,'projekt-1').some(issue=>issue.includes('Code')&&issue.includes('Spielplatz')));
});

test('Bei mehreren Teams zählen nur tatsächlich besuchte Stationen für Codepflicht',()=>{
 const c={...config(),players:6,groupSize:3,durationMinutes:30,stationCodes:{a:'007',b:'120'}};
 const plan=createPlan(c);
 assert.deepEqual(plan.teams.map(team=>team.stations[0].id),['a','b']);
 assert.deepEqual(auditPrintPacket(c,plan,'projekt-1'),[]);
});

test('Ungültige Alt-Codes an unbesuchten Stationen blockieren einen kurzen Parcours nicht',()=>{
 const c={...config(),players:3,groupSize:3,durationMinutes:30,stationCodes:{a:'007',b:'12',c:'',d:'99'}};
 const plan=createPlan(c);
 assert.deepEqual(auditPrintPacket(c,plan,'projekt-1'),[]);
});

test('Nach Verlängerung der Spieldauer wird ein zuvor optionaler Code wieder Pflicht',()=>{
 const c={...config(),players:3,groupSize:3,durationMinutes:30,stationCodes:{a:'007'}};
 assert.deepEqual(auditPrintPacket(c,createPlan(c),'projekt-1'),[]);
 c.durationMinutes=60;
 const plan=createPlan(c);
 assert.equal(plan.stopsPerTeam,3);
 assert.ok(auditPrintPacket(c,plan,'projekt-1').some(issue=>issue.includes('Code')&&issue.includes('Wiese')));
});

test('Manipulierte Zeitangaben der Routenplanung werden vor Druck erkannt',()=>{
 const c=config(),plan=createPlan(c);
 plan.estimatedMinutes+=5;
 plan.remainderMinutes-=5;
 assert.ok(auditPrintPacket(c,plan,'projekt-1').some(issue=>issue.includes('Zeitberechnung')));
});

test('Abweichende verbleibende Minuten blockieren trotz unveränderter Routen die Freigabe',()=>{
 const c=config(),plan=createPlan(c);
 plan.remainderMinutes=999;
 assert.ok(auditPrintPacket(c,plan,'projekt-1').some(issue=>issue.includes('Zeitberechnung')));
});

test('Ein eigener Zielhinweis mit Satzzeichen zwischen Ortswörtern wird gesperrt',()=>{
 const c=config();
 c.locations[1].name='Wiese über der Sabine';
 c.routeClueModes.b='custom';
 c.routeClueTexts.b='Geht zur Wiese, über der Sabine!';
 const plan=createPlan(c);
 assert.ok(auditPrintPacket(c,plan,'projekt-1').some(issue=>issue.includes('nennt bereits den Zielort')));
});

test('Eine manipulierte Zeitberechnung lässt sich nicht durch gleiche Gesamtzeit verstecken',()=>{
 const c=config(),plan=createPlan(c);
 plan.estimatedMinutes+=2;
 plan.remainderMinutes-=2;
 assert.ok(auditPrintPacket(c,plan,'projekt-1').some(issue=>issue.includes('Zeitberechnung')));
});

test('Fehlende Warnungen bei vielen gleichzeitig startenden Gruppen sperren die Druckfreigabe',()=>{
 const c={...config(),players:60,groupSize:1,startMode:'distributed'};
 const plan=createPlan(c);
 assert.ok(plan.cautions.length>4);
 assert.deepEqual(auditPrintPacket(c,plan,'projekt-1'),[]);
 plan.cautions=[];
 assert.ok(auditPrintPacket(c,plan,'projekt-1').some(issue=>issue.includes('Planungshinweise')));
});

test('Gruppenanzahl und Planungshinweise werden unabhängig geprüft',()=>{
 const c=config(),plan=createPlan(c);
 plan.teams.pop();
 plan.cautions.push('Manipulierte Warnung');
 const issues=auditPrintPacket(c,plan,'projekt-1');
 assert.ok(issues.some(issue=>issue.includes('Gruppenplan')));
 assert.ok(issues.some(issue=>issue.includes('Planungshinweise')));
});

test('Umlaut-Umschreibung darf in eigenen Zielhinweisen keinen Zielort verraten',()=>{
 const c=config();
 c.locations[1].name='Wiese über der Sabine';
 c.routeClueModes.b='custom';
 c.routeClueTexts.b='Geht zur Wiese ueber der Sabine.';
 assert.ok(auditPrintPacket(c,createPlan(c),'projekt-1').some(issue=>issue.includes('nennt bereits den Zielort')));
});

test('Ortsbeschreibung mit verstecktem Zielnamen wird bei der Druckprüfung abgewiesen',()=>{
 const c=config();
 c.locations[1].name='Wiese über der Sabine';
 c.locations[1].description='Ihr sucht die Wiese ueber der Sabine neben den Bäumen.';
 c.routeClueModes.b='description';
 assert.ok(auditPrintPacket(c,createPlan(c),'projekt-1').some(issue=>issue.includes('verrät den Zielnamen') || issue.includes('Wegrätsel')));
});

test('Druckfreigabe weist zu lange benutzerdefinierte Wegrätsel zurück',()=>{
 const c=config();
 c.routeClueModes.a='custom';
 c.routeClueTexts.a='X'.repeat(401);
 const issues=auditPrintPacket(c,createPlan(c),'projekt-1');
 assert.ok(issues.some(issue=>issue.includes('400 Zeichen')));
});

test('Druckfreigabe erkennt manipulierte Planungshinweise',()=>{
 const c=config();
 const plan=createPlan(c);
 plan.cautions.push('Nicht aus der Planung stammender Hinweis');
 assert.ok(auditPrintPacket(c,plan,'projekt-1').some(issue=>issue.includes('Planungshinweise')));
});

test('Druckprüfung erkennt doppelte Stationskennungen trotz Leerzeichen',()=>{
 const c=config();
 c.locations[1].id=' '+c.locations[0].id+' ';
 const issues=auditPrintPacket(c,createPlan(config()),'projekt-1');
 assert.ok(issues.some(issue=>issue.includes('Stations-IDs sind nicht eindeutig')));
});

test('Druckprüfung entdeckt abweichende Gruppengrößen und Zielorte',()=>{
 const c=config();
 const plan=createPlan(c);
 plan.teams[0].memberCount++;
 plan.teams[1].finish='Unbekannter Ort';
 const issues=auditPrintPacket(c,plan,'projekt-1');
 assert.ok(issues.some(issue=>issue.includes('Gruppenroute Rot')));
 assert.ok(issues.some(issue=>issue.includes('Gruppenroute Blau')));
});

test('Druckprüfung erkennt veränderte Stationsbeschreibungen',()=>{
 const c=config();
 const plan=createPlan(c);
 plan.teams[0].stations[0].description='Nachträglich geändert';
 const issues=auditPrintPacket(c,plan,'projekt-1');
 assert.ok(issues.some(issue=>issue.includes('Gruppenroute Rot')));
});

test('End-to-End-Matrix: Routen, Ziele und Gruppenzahlen bleiben druckfähig',()=>{
 let cases=0;
 for(const players of [3,6,12,15]) for(const startMode of ['shared','distributed']) for(const routeMode of ['same','varied']) for(const finishMode of ['meeting','origin','start']){
  const c={...config(),players,startMode,routeMode,finishMode,startPoint:'Startpunkt',meetingPoint:'Treffpunkt'};
  const plan=createPlan(c);
  const issues=auditPrintPacket(c,plan,'matrix-projekt');
  assert.deepEqual(issues,[],JSON.stringify({players,startMode,routeMode,finishMode,issues}));
  assert.equal(plan.teams.reduce((sum,team)=>sum+team.memberCount,0),players);
  for(const team of plan.teams){
   assert.equal(team.stations.length,plan.stopsPerTeam);
   assert.equal(new Set(team.stations.map(station=>station.id)).size,team.stations.length);
   assert.equal(team.finish,finishMode==='start'?team.stations[0].name:finishMode==='origin'?'Startpunkt':'Treffpunkt');
  }
  cases++;
 }
 assert.equal(cases,48);
});

test('End-to-End: Kürzere Routen verlangen nur die tatsächlich besuchten Codes',()=>{
 for(const players of [3,6,9,12]) for(const durationMinutes of [30,45,60]){
  const c={...config(),players,durationMinutes};
  const plan=createPlan(c);
  const visited=new Set(plan.teams.flatMap(team=>team.stations.map(station=>station.id)));
  c.stationCodes=Object.fromEntries(Object.entries(c.stationCodes).filter(([id])=>visited.has(id)));
  assert.deepEqual(auditPrintPacket(c,plan,'kurzstrecke'),[],JSON.stringify({players,durationMinutes}));
 }
});
