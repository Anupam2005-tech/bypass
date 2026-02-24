import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsStandalone(true);
    }

    // iOS Detection
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI to notify the user they can add to home screen
      setShowInstallBtn(true);
    });

    window.addEventListener('appinstalled', () => {
      // Log install to analytics
      console.log('PWA was installed');
      setShowInstallBtn(false);
      setIsStandalone(true);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!url) {
      setError('Please enter a URL');
      return;
    }
    
    let formattedUrl = url.trim();
    
    // Basic domain check: must have at least one dot and not start/end with a dot
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+/;
    const fullUrlRegex = /^https?:\/\/.+/;

    if (!fullUrlRegex.test(formattedUrl)) {
      if (!domainRegex.test(formattedUrl)) {
        setError('Please enter a valid URL or domain name');
        return;
      }
      formattedUrl = 'https://' + formattedUrl;
    }
    
    try {
      new URL(formattedUrl);
    } catch (err) {
      setError('The URL format is invalid');
      return;
    }

    const backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const backendUrl = `${backendBaseUrl}/proxy?url=${encodeURIComponent(formattedUrl)}`;
    setProxyUrl(backendUrl);
    setIsBrowsing(true);
  };

  const handleBack = () => {
    setIsBrowsing(false);
    setProxyUrl('');
  };

  return (
    <div className="app-container">
      {!isBrowsing ? (
        <div className="landing">
          <header>
            <div className="header-top">
              <h1 className="logo">Zenith</h1>
            </div>
            <p className="subtitle">Secure · Stealth · Essential</p>
          </header>

          {/* Download/PWA Notice */}
          {!isStandalone && (
            <div className="pwa-notice">
              <div className="pwa-content">
                <span className="pwa-icon">📲</span>
                <div className="pwa-text">
                  <strong>Zenith is available as an app!</strong>
                  <p>Run Zenith directly from your desktop or home screen for a faster experience.</p>
                </div>
              </div>
              {showInstallBtn ? (
                <button onClick={handleInstallClick} className="install-btn pulse">
                  Download App
                </button>
              ) : (
                <div className="pwa-hint">
                  {isIOS ? (
                    <>To install: Tap the <strong>Share</strong> icon <span className="share-icon">⎋</span> and select <strong>"Add to Home Screen"</strong>.</>
                  ) : (
                    <>To download: Click the <strong>browser menu</strong> icon and select <strong>"Install App"</strong>.</>
                  )}
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="search-container">
            <div className="glass-input-wrapper">
              <input 
                type="text" 
                placeholder="Paste the target URL (e.g., exam.com) here..." 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
              <button type="submit">
                Launch
              </button>
            </div>
            {error && <p className="error-message">{error}</p>}
          </form>

          <div className="features">
            <div className="feature">
              <div className="icon-box">🛡️</div>
              <h3>Anti-Detection</h3>
              <p>Neutralizes visibility and focus events to keep your session hidden.</p>
            </div>
            <div className="feature">
              <div className="icon-box">👁️</div>
              <h3>Stealth Mode</h3>
              <p>Masks tab switching, window resizing, and focus loss automatically.</p>
            </div>
            <div className="feature">
              <div className="icon-box">🌐</div>
              <h3>Full Proxy</h3>
              <p>Strips security headers and rewrites links for a seamless experience.</p>
            </div>
          </div>

          <footer className="main-footer">
            <div className="footer-content">
              <span className="creator-tag">Crafted with love  by</span>
              <span className="creator-name">Anupam Bhowmik</span>
            </div>
          </footer>
        </div>
      ) : (
        <div className="browser-view">
          <nav className="browser-controls">
            <button onClick={handleBack} className="back-btn">
              <span>←</span> Back to Dashboard
            </button>
            <div className="address-bar">{url}</div>
            <div className="status-badge">Stealth Active</div>
          </nav>
          <iframe 
            src={proxyUrl} 
            title="Proxy Viewport" 
            className="proxy-iframe"
          />
        </div>
      )}
    </div>
  );
}

export default App;
