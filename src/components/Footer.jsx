import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

function Footer() {
  return (
    <footer className="footer-v2">
      <div className="footer-content-v2">
        <div className="footer-brand">
          <Link to="/" className="brand">AnimeVault</Link>
          <p>Discover anime, movies, and series in one place.</p>
          <a className="footer-contact-link" href="mailto:support@animevault.com"><Mail size={17} /> Contact support</a>
        </div>
        
        <div className="footer-links-grid">
          <div className="footer-link-group">
            <h3>Explore</h3>
            <Link to="/search?type=ANIME">Animes</Link>
            <Link to="/search?type=MANGA">Mangas</Link>
            <Link to="/search?trending=true">Trending</Link>
          </div>
          <div className="footer-link-group">
            <h3>Support</h3>
            <Link to="/contact">Contact Us</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/request">Request Anime</Link>
          </div>
          <div className="footer-link-group">
            <h3>Legal</h3>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/dmca">DMCA</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} AnimeVault. All rights reserved.</p>
        <p>This site does not store any files on its server. All contents are provided by non-affiliated third parties.</p>
      </div>
    </footer>
  );
}

export default Footer;
