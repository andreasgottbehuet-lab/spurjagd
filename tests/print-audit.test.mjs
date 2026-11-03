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
