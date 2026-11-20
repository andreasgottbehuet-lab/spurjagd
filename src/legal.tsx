import { legalData } from './legal-data.ts';

const isEn = () => document.documentElement.lang.toLowerCase().startsWith('en');

export function Impressum() {
  const en = isEn();
  return <section>
    <h2>{en ? 'Legal notice' : 'Impressum'}</h2>
    <p>Name:{legalData.name}</p>
    <p>{en ? 'Address' : 'Anschrift'}: {legalData.anschrift}</p>
    <p>{en ? 'Email' : 'E-Mail'}: {legalData.email}</p>
    <p>{en ? 'Phone' : 'Telefon'}: {legalData.telefon}</p>
  </section>;
}

export function Datenschutz() {
  const en = isEn();
  const items = en
    ? ['No cookies are used.', 'No sign-in is required.', 'Projects are stored only in your browser (localStorage).', 'The app is hosted by Cloudflare.', 'Your entries are not passed on.']
    : ['Es werden keine Cookies verwendet.', 'Eine Anmeldung ist nicht nötig.', 'Projekte werden nur im Browser (localStorage) gespeichert.', 'Das Hosting erfolgt bei Cloudflare.', 'Eingaben werden nicht weitergegeben.'];
  return <section>
    <h2>{en ? 'Privacy' : 'Datenschutz'}</h2>
    <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>
    <p>Vom Betreiber vor der Veroeffentlichung rechtlich zu pruefen.</p>
  </section>;
}
