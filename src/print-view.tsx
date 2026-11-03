import { createChildSheets, type PrintKit, type ChildCard } from './print-kit';

interface PrintViewProps {
  projectTitle: string;
  kit: PrintKit;
  mode: 'children' | 'clues' | 'leader';
}

function ChildCardView({ card }: { card: ChildCard }) {
  return <article className={'print-half-card ' + (card.kind === 'clue' ? 'print-clue-card' : 'print-puzzle-card')}>
    <div className="print-card-header">
      <span>SPURJAGD</span>
      <span>Team {card.team} · Station {card.order}</span>
    </div>
    {card.kind === 'puzzle' ? <>
      <h2>Schloss-Rätsel</h2>
      <p className="print-station-name">{card.station}</p>
      <p className="print-intro">Löst die Aufgaben in der angegebenen Reihenfolge. Jede Antwort ergibt eine Ziffer des Schloss-Codes.</p>
      <div className="print-tasks">
        {card.puzzles.map((p, i) => <section className="print-task" key={i}>
          <strong>{i + 1}. {p.instruction}</strong>
          {p.render && <div className="print-symbols">{Array.from({ length: p.render.count }, (_, j) => <span key={j}>{p.render?.symbol}</span>)}</div>}
          <p>{p.question}</p>
          {p.instruction.includes('Verschiebe jeden Buchstaben') && <p className="print-alphabet">A B C D E F G H I J K L M N O P Q R S T U V W X Y Z</p>}
          <div className="print-answer-line">Ziffer: ______</div>
        </section>)}
      </div>
      <p className="print-combination">Unser Schloss-Code: {'____ '.repeat(card.puzzles.length)}</p>
    </> : <>
      <h2>{card.isFinal ? 'Der letzte Hinweis' : 'Geheimnisvoller Wegweiser'}</h2>
      <p className="print-station-name">An {card.station} bereitlegen. Erst nach dem Schloss-Rätsel an Station {card.order} öffnen!</p>
      <div className="print-next-clue">{card.text}</div>
      <p className="print-intro">Löst den Hinweis gemeinsam. Er zeigt euch den nächsten Weg.</p>
    </>}
    <div className="print-card-foot">Nur für Team {card.team} · Nach dem Spiel wieder einsammeln</div>
  </article>;
}

export function PrintView({ projectTitle, kit, mode }: PrintViewProps) {
  if (kit.issues.length > 0) return null;
  const sheets = createChildSheets(kit.cards).filter(pair => pair[0].kind === (mode === 'clues' ? 'clue' : 'puzzle'));
  const leaderPages = Array.from({ length: Math.ceil(kit.leaderRows.length / 2) }, (_, i) => kit.leaderRows.slice(i * 2, i * 2 + 2));
  return <div className={'print-document print-mode-' + mode} aria-label="SPURJAGD Druckpaket">
    {mode !== 'leader' ? sheets.map((pair, i) => <section className="print-sheet child-sheet" key={i}>
      {pair.map((card, j) => <ChildCardView key={j} card={card}/>)}
      {pair.length === 1 && <div className="print-half-card"/>}
    </section>) : leaderPages.map((rows, i) => <section className="print-sheet leader-sheet" key={i}>
      <header className="leader-header">
        <h1>SPURJAGD · Spielleitung</h1>
        <p>{projectTitle} · Lösungsübersicht · Seite {i + 1} von {leaderPages.length}</p>
      </header>
      <div className="leader-entries">{rows.map((row, j) => <article className="leader-entry" key={j}>
        <h2>Team {row.team} · Station {row.order}: {row.station}</h2>
        <p><strong>Schloss-Code:</strong> <span className="leader-code">{row.code}</span></p>
        <p><strong>Lösungen:</strong> {row.solutions.map((solution, k) => <span key={k}>{k + 1}. {solution}{k < row.solutions.length - 1 ? ' · ' : ''}</span>)}</p>
        <p><strong>Weiter zu:</strong> {row.next}</p>
        <p><strong>Hinweistext:</strong> {row.clue}</p>
      </article>)}</div>
      <footer className="leader-footer">
        <p>Vor Spielbeginn alle Schlösser mit den tatsächlichen Codes prüfen. Rätsel- und Hinweiskarten teamweise zuordnen.</p>
        <p>Aufsicht, Wege, Straßenquerungen, Gewässer, Wetter und Zugänglichkeit vor Ort prüfen. Nach dem Spiel Material einsammeln.</p>
      </footer>
    </section>)}
  </div>;
}
