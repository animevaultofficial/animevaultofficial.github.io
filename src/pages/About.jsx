import { Heart, Layers3, MonitorSmartphone, Search, ShieldCheck } from 'lucide-react';
import '../styles/staticPages.css';

const FEATURES = [
  {
    icon: Search,
    title: 'Discover what to watch',
    description: 'Browse anime, movies, and TV series with searchable catalogs and detailed title pages.',
  },
  {
    icon: Layers3,
    title: 'Keep your library close',
    description: 'Use your profile, favorites, and viewing history to pick up where you left off.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Made for your screen',
    description: 'AnimeVault is designed to work across desktop browsers and Android devices.',
  },
  {
    icon: ShieldCheck,
    title: 'Clear source handling',
    description: 'Playback availability depends on the selected title, provider, and your device.',
  },
];

export default function About() {
  return (
    <section className="about-page-v2">
      <header className="about-hero">
        <span className="static-eyebrow">ABOUT THE PROJECT</span>
        <h1>Entertainment, organized around you.</h1>
        <p>
          AnimeVault brings anime, movies, and series discovery together in one
          easy-to-use experience, with tools to make your library feel like yours.
        </p>
      </header>
      <div className="about-feature-grid">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <article className="about-feature-card" key={title}>
            <span className="about-feature-icon"><Icon size={21} /></span>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </div>
      <p className="about-signoff"><Heart size={15} fill="currentColor" /> Made for fans, by fans.</p>
    </section>
  );
}
