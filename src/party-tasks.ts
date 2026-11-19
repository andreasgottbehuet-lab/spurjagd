export type PartyTaskCategory='bewegung'|'knobeln'|'natur'|'teamwork';
export type PartyTaskPlace='drinnen'|'garten'|'park';
export type PartyTask={id:string;titel:string;regel:string;alterVon:number;alterBis:number;material:string[];dauerMinuten:number;kategorie:PartyTaskCategory;orte:PartyTaskPlace[]};

export const PARTY_TASKS:PartyTask[]=[
 {id:'sackhuepfen',titel:'Sackhüpfen',regel:'Steig in einen Sack und hüpfe bis zur markierten Linie. Eine erwachsene Person passt auf, dass der Weg frei ist.',alterVon:5,alterBis:12,material:['Hüpf-Säcke','Markierung'],dauerMinuten:10,kategorie:'bewegung',orte:['garten','park']},
 {id:'eierlauf',titel:'Eierlauf',regel:'Balanciere ein Ei auf einem Löffel bis zum Ziel. Geht langsam und gebt zerbrochene Eier einer erwachsenen Person.',alterVon:5,alterBis:12,material:['Löffel','gekochte Eier'],dauerMinuten:10,kategorie:'natur',orte:['garten','park']},
 {id:'stopptanz',titel:'Stopptanz',regel:'Tanzt, solange Musik spielt, und erstarrt, wenn sie stoppt. Wer wackelt, macht einfach bei der nächsten Runde weiter.',alterVon:4,alterBis:14,material:['Musik'],dauerMinuten:10,kategorie:'bewegung',orte:['drinnen','garten']},
 {id:'ballonplatzen',titel:'Ballonplatzen',regel:'Setzt euch auf einen Ballon, bis er platzt. Eine erwachsene Person sammelt alle Ballonstücke sofort ein.',alterVon:7,alterBis:14,material:['Luftballons','Sitzkissen'],dauerMinuten:10,kategorie:'teamwork',orte:['garten','park']},
 {id:'fuehlsack',titel:'Fühlsack',regel:'Fühlt in den Sack, ohne hineinzusehen, und ratet den Gegenstand. Sagt danach, woran ihr ihn erkannt habt.',alterVon:4,alterBis:12,material:['Stoffbeutel','sichere Gegenstände'],dauerMinuten:10,kategorie:'knobeln',orte:['drinnen','garten']},
 {id:'geraeuschequiz',titel:'Geräuschequiz',regel:'Hört genau zu und ratet, welches Geräusch vorgemacht wird. Jede Person darf einen Tipp abgeben.',alterVon:5,alterBis:14,material:['keines'],dauerMinuten:10,kategorie:'natur',orte:['drinnen','park']},
 {id:'tierpantomime',titel:'Tierpantomime',regel:'Stellt ein Tier ohne Worte dar. Die anderen raten und nennen danach ein Merkmal des Tiers.',alterVon:4,alterBis:12,material:['Tierkarten'],dauerMinuten:10,kategorie:'teamwork',orte:['drinnen','garten']},
 {id:'hindernisparcours',titel:'Hindernisparcours',regel:'Geht nacheinander durch einen einfachen Parcours. Baut ihn niedrig und sicher auf und lasst genug Abstand.',alterVon:6,alterBis:14,material:['Kissen','Hütchen'],dauerMinuten:15,kategorie:'bewegung',orte:['drinnen','garten']},
 {id:'kleiderrennen',titel:'Kleiderrennen',regel:'Zieht ein großes Kleidungsstück an und lauft damit bis zur Linie und zurück. Achtet auf freie Sicht und einen freien Weg.',alterVon:6,alterBis:14,material:['große Jacken','Markierung'],dauerMinuten:10,kategorie:'bewegung',orte:['garten','park']},
 {id:'turmbau',titel:'Turmbau',regel:'Baut gemeinsam den höchsten Turm, der zehn Sekunden stehen bleibt. Jede Person darf abwechselnd ein Teil hinzufügen.',alterVon:5,alterBis:14,material:['Bauklötze'],dauerMinuten:15,kategorie:'knobeln',orte:['drinnen','garten']}
];
