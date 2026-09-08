import { Contact, FAQ, Terms, Privacy, DMCA, RequestAnime } from './StaticPages';

const PAGES = { contact: Contact, faq: FAQ, terms: Terms, privacy: Privacy, dmca: DMCA, request: RequestAnime };

export default function StaticPageRoute({ page }) {
  const Page = PAGES[page];
  return Page ? <Page /> : null;
}
