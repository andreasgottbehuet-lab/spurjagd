export const SUBJECTS = ['Sachkunde', 'Biologie', 'Chemie', 'Physik', 'Erdkunde', 'Allgemeinwissen'] as const;
export type Subject = typeof SUBJECTS[number];
export type BankAgeLevel = 'older' | 'advanced';

export interface BankQuestion {
  fach: Subject;
  altersstufe: BankAgeLevel;
  frage: string;
  loesung: string;
  letterIndex: number; // 0-basierter Index des Buchstabens in der Lösung
}

const q = (fach: Subject, altersstufe: BankAgeLevel, frage: string, loesung: string, letterIndex: number): BankQuestion =>
  ({ fach, altersstufe, frage, loesung, letterIndex });

export const QUESTION_BANK: readonly BankQuestion[] = [
  q('Sachkunde', 'older', 'Wie heißt der Ort, an dem Bücher ausgeliehen werden?', 'Bibliothek', 0),
  q('Sachkunde', 'older', 'Welches Verkehrsmittel fährt auf Schienen und hat oft mehrere Waggons?', 'Zug', 1),
  q('Sachkunde', 'older', 'Welche Jahreszeit folgt auf den Winter?', 'Frühling', 0),
  q('Sachkunde', 'advanced', 'Wie nennt man das Gerät, mit dem man die Himmelsrichtung bestimmt?', 'Kompass', 2),
  q('Biologie', 'older', 'Wie nennt man Tiere, die ihre Jungen mit Milch säugen?', 'Säugetiere', 0),
  q('Biologie', 'older', 'Welches Organ pumpt das Blut durch den Körper?', 'Herz', 1),
  q('Biologie', 'advanced', 'Wie heißt der grüne Farbstoff in Pflanzenblättern?', 'Chlorophyll', 0),
  q('Biologie', 'advanced', 'Wie nennt man die Umwandlung einer Raupe in einen Schmetterling?', 'Metamorphose', 3),
  q('Chemie', 'older', 'Wie lautet der Alltagsname für H2O?', 'Wasser', 0),
  q('Chemie', 'older', 'Welches Gas atmen wir zum Leben ein?', 'Sauerstoff', 0),
  q('Chemie', 'advanced', 'Welches chemische Element hat das Symbol Fe?', 'Eisen', 1),
  q('Chemie', 'advanced', 'Wie heißt das Gas mit der Formel CO2?', 'Kohlenstoffdioxid', 0),
  q('Physik', 'older', 'Wie heißt die Kraft, die Gegenstände zur Erde zieht?', 'Schwerkraft', 0),
  q('Physik', 'older', 'Bei wie viel Grad Celsius gefriert Wasser (Zahl als Wort)?', 'Null', 0),
  q('Physik', 'advanced', 'In welcher Einheit wird die elektrische Spannung gemessen?', 'Volt', 1),
  q('Physik', 'advanced', 'Wie nennt man die Energie, die ein bewegter Körper hat?', 'Bewegungsenergie', 0),
  q('Erdkunde', 'older', 'Wie heißt die Hauptstadt von Deutschland?', 'Berlin', 0),
  q('Erdkunde', 'older', 'Wie heißt der größte Ozean der Erde?', 'Pazifik', 0),
  q('Erdkunde', 'advanced', 'Auf welchem Kontinent liegt Ägypten?', 'Afrika', 0),
  q('Erdkunde', 'advanced', 'Wie heißt der höchste Berg der Erde?', 'Everest', 0),
  q('Allgemeinwissen', 'older', 'Wie viele Minuten hat eine Stunde (Zahl als Wort)?', 'Sechzig', 0),
  q('Allgemeinwissen', 'older', 'Wie viele Tage hat eine Woche (Zahl als Wort)?', 'Sieben', 0),
  q('Allgemeinwissen', 'advanced', 'Wie heißt die Währung in Deutschland?', 'Euro', 0),
  q('Allgemeinwissen', 'advanced', 'Wie nennt man ein Wort mit gegenteiliger Bedeutung?', 'Antonym', 0),
];
