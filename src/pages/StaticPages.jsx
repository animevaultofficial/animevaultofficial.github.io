import { Mail, MessageSquare, Send } from 'lucide-react';

export function Contact() {
  return (
    <div className="static-page-v2">
      <div className="static-header">
        <h1>Contact Us</h1>
        <p>Have questions or feedback? We'd love to hear from you.</p>
      </div>
      <div className="contact-grid">
        <div className="contact-info">
          <div className="contact-card">
            <Mail className="icon" />
            <h3>Email Us</h3>
            <p>support@animevault.com</p>
          </div>
          <div className="contact-card">
            <MessageSquare className="icon" />
            <h3>Community</h3>
            <p>Join our Discord server</p>
          </div>
        </div>
        <form className="contact-form" onSubmit={e => e.preventDefault()}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" placeholder="Your name" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="Your email" />
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea placeholder="How can we help?" rows={5}></textarea>
          </div>
          <button className="btn-play-v2">
            <Send size={18} /> Send Message
          </button>
        </form>
      </div>
    </div>
  );
}

export function FAQ() {
  const faqs = [
    { q: "Is AnimeVault free?", a: "Yes, our platform is completely free to use." },
    { q: "Do I need an account to watch?", a: "No, you can start watching immediately without any registration." },
    { q: "How often is the content updated?", a: "We update our library daily with the latest episodes and manga chapters." },
    { q: "Can I download episodes?", a: "Streaming is our primary focus, but some mirrors provide download options." }
  ];

  return (
    <div className="static-page-v2">
      <div className="static-header">
        <h1>Frequently Asked Questions</h1>
        <p>Everything you need to know about the platform.</p>
      </div>
      <div className="faq-list">
        {faqs.map((f, i) => (
          <div key={i} className="faq-item">
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Terms() {
  return (
    <div className="static-page-v2">
      <div className="static-header">
        <h1>Terms of Service</h1>
        <p>Last updated: May 2026</p>
      </div>
      <div className="legal-content">
        <h3>1. Acceptance of Terms</h3>
        <p>By accessing AnimeVault, you agree to comply with these terms.</p>
        <h3>2. Use of Service</h3>
        <p>AnimeVault is for personal, non-commercial use only.</p>
        <h3>3. Third-Party Content</h3>
        <p>We do not host files. We only link to content provided by third-party services.</p>
      </div>
    </div>
  );
}

export function Privacy() {
  return (
    <div className="static-page-v2">
      <div className="static-header">
        <h1>Privacy Policy</h1>
        <p>Last Updated: {new Date().toLocaleDateString()}</p>
        <p>Your privacy is of the utmost importance to us at AnimeVault.</p>
      </div>
      <div className="legal-content">
        <h3>1. Introduction and Scope</h3>
        <p>Welcome to AnimeVault ("Company", "we", "our", "us"). We respect your privacy and are committed to protecting it through our compliance with this privacy policy. This policy describes the types of information we may collect from you or that you may provide when you visit the AnimeVault application or website (our "Service") and our practices for collecting, using, maintaining, protecting, and disclosing that information.</p>
        <p>This policy applies to information we collect: (a) on this Service, (b) in email, text, and other electronic messages between you and this Service, (c) through desktop and mobile applications you download from this Service, and (d) when you interact with our advertising and applications on third-party websites and services, if those applications or advertising include links to this policy.</p>

        <h3>2. Information We Collect About You</h3>
        <p>We collect several types of information from and about users of our Service, including information:</p>
        <ul>
          <li><strong>Personal Information:</strong> By which you may be personally identified, such as name, postal address, e-mail address, telephone number, or any other identifier by which you may be contacted online or offline ("personal information").</li>
          <li><strong>Non-Personal Information:</strong> That is about you but individually does not identify you, such as your watch history, favorites, UI preferences, and anonymized interaction data.</li>
          <li><strong>Technical Information:</strong> About your internet connection, the equipment you use to access our Service, and usage details, including IP addresses, operating system, browser type, and hardware specifications.</li>
        </ul>

        <h3>3. How We Collect Information</h3>
        <p>We collect this information:</p>
        <ul>
          <li><strong>Directly from you</strong> when you provide it to us, such as when registering an account, subscribing to newsletters, or contacting support.</li>
          <li><strong>Automatically as you navigate through the site.</strong> Information collected automatically may include usage details, IP addresses, and information collected through cookies, web beacons, and other tracking technologies.</li>
          <li><strong>From third parties</strong>, for example, our business partners, analytics providers, and authentication providers (such as Google or Discord integrations).</li>
        </ul>

        <h3>4. Use of Cookies and Local Storage</h3>
        <p>We heavily rely on browser and desktop Local Storage to save your watch history, application state, and preferences. We also use cookies (small files placed on the hard drive of your computer or device). You may refuse to accept browser cookies by activating the appropriate setting on your browser. However, if you select this setting you may be unable to access certain parts of our Service. Our cookies help us to:</p>
        <ul>
          <li>Estimate our audience size and usage patterns.</li>
          <li>Store information about your preferences, allowing us to customize our Service according to your individual interests.</li>
          <li>Speed up your searches and video loading times.</li>
          <li>Recognize you when you return to our Service.</li>
        </ul>

        <h3>5. How We Use Your Information</h3>
        <p>We use information that we collect about you or that you provide to us, including any personal information:</p>
        <ul>
          <li>To present our Service and its contents to you.</li>
          <li>To provide you with information, products, or services that you request from us.</li>
          <li>To fulfill any other purpose for which you provide it.</li>
          <li>To provide you with notices about your account, including expiration and renewal notices.</li>
          <li>To carry out our obligations and enforce our rights arising from any contracts entered into between you and us.</li>
          <li>To notify you about changes to our Service or any products or services we offer or provide though it.</li>
          <li>In any other way we may describe when you provide the information.</li>
          <li>For any other purpose with your consent.</li>
        </ul>

        <h3>6. Disclosure of Your Information</h3>
        <p>We do not sell your personal data. However, we may disclose aggregated information about our users, and information that does not identify any individual, without restriction. We may disclose personal information that we collect or you provide as described in this privacy policy:</p>
        <ul>
          <li>To our subsidiaries and affiliates.</li>
          <li>To contractors, service providers, and other third parties we use to support our business (such as cloud hosting, authentication providers like Neon Auth, and analytics services).</li>
          <li>To fulfill the purpose for which you provide it.</li>
          <li>For any other purpose disclosed by us when you provide the information.</li>
          <li>With your consent.</li>
          <li>To comply with any court order, law, or legal process, including to respond to any government or regulatory request.</li>
          <li>To enforce or apply our terms of use and other agreements.</li>
          <li>If we believe disclosure is necessary or appropriate to protect the rights, property, or safety of AnimeVault, our customers, or others.</li>
        </ul>

        <h3>7. Data Security</h3>
        <p>We have implemented measures designed to secure your personal information from accidental loss and from unauthorized access, use, alteration, and disclosure. All information you provide to us is stored on our secure servers behind firewalls. Any authentication data is handled by our third-party authentication partners using industry-standard cryptography.</p>
        <p>The safety and security of your information also depends on you. Where we have given you (or where you have chosen) a password for access to certain parts of our Service, you are responsible for keeping this password confidential. We ask you not to share your password with anyone.</p>

        <h3>8. Changes to Our Privacy Policy</h3>
        <p>It is our policy to post any changes we make to our privacy policy on this page. If we make material changes to how we treat our users' personal information, we will notify you through a notice on the Service home page or via email to the primary email address specified in your account. The date the privacy policy was last revised is identified at the top of the page. You are responsible for ensuring we have an up-to-date active and deliverable email address for you, and for periodically visiting our Service and this privacy policy to check for any changes.</p>
        
        <h3>9. Contact Information</h3>
        <p>To ask questions or comment about this privacy policy and our privacy practices, contact us via the Contact Us page or email us directly at privacy@animevault.com.</p>
      </div>
    </div>
  );
}

export function DMCA() {
  return (
    <div className="static-page-v2">
      <div className="static-header">
        <h1>DMCA Policy</h1>
        <p>Content removal requests.</p>
      </div>
      <div className="legal-content">
        <p>AnimeVault respects the intellectual property rights of others. If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement, please contact us at dmca@animevault.com.</p>
        <p>Please note that we do not host any content on our servers. We merely link to publicly available content.</p>
      </div>
    </div>
  );
}

export function RequestAnime() {
  return (
    <div className="static-page-v2">
      <div className="static-header">
        <h1>Request Anime</h1>
        <p>Missing your favorite series? Let us know.</p>
      </div>
      <form className="contact-form" onSubmit={e => e.preventDefault()}>
        <div className="form-group">
          <label>Anime Title</label>
          <input type="text" placeholder="e.g. One Piece" />
        </div>
        <div className="form-group">
          <label>Additional Details</label>
          <textarea placeholder="Specific season or version?" rows={3}></textarea>
        </div>
        <button className="btn-play-v2">Submit Request</button>
      </form>
    </div>
  );
}
