import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="not-found-page" aria-labelledby="not-found-title">
      <p className="not-found-code">404</p>
      <h1 id="not-found-title">This page isn’t here.</h1>
      <p className="not-found-copy">The link may be outdated, or the page may have moved. Let’s get you back to AnimeVault.</p>
      <Link to="/" className="btn-play-v2 not-found-home"><ArrowLeft size={17} aria-hidden="true" /> Back to home</Link>
    </main>
  );
}
