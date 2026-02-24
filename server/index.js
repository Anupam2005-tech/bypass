const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const https = require('https');
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

app.use(cors());
app.use(express.json());

// Stealth Script to be injected
const stealthScript = `
<script>
(function() {
    console.log('[Bypass] Stealth mode activated');

    // Neutralize Visibility API
    Object.defineProperty(document, 'hidden', { value: false, configurable: false });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: false });
    Object.defineProperty(document, 'webkitHidden', { value: false, configurable: false });
    Object.defineProperty(document, 'webkitVisibilityState', { value: 'visible', configurable: false });

    // Block events that detect tab switching or focus loss
    const blockedEvents = ['visibilitychange', 'webkitvisibilitychange', 'blur', 'focus', 'focusout', 'focusin', 'resize', 'mouseleave'];
    
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (blockedEvents.includes(type.toLowerCase())) {
            console.log('[Bypass] Blocked event listener for:', type);
            return;
        }
        return originalAddEventListener.apply(this, arguments);
    };

    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
        if (blockedEvents.includes(type.toLowerCase())) return;
        return originalRemoveEventListener.apply(this, arguments);
    };

    // Hijack onblur and onfocus
    Object.defineProperty(window, 'onblur', { set: () => {}, get: () => null });
    Object.defineProperty(window, 'onfocus', { set: () => {}, get: () => null });
    Object.defineProperty(document, 'onvisibilitychange', { set: () => {}, get: () => null });

    // Spoof focus status
    Object.defineProperty(document, 'hasFocus', { value: () => true, writable: false });

    // Suppress alerts and confirms that might be used for detection
    window.alert = function(msg) { console.log('[Bypass] Suppressed alert:', msg); };
    window.confirm = function(msg) { console.log('[Bypass] Suppressed confirm:', msg); return true; };
})();
</script>
`;

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL is required');
    }

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': req.headers['accept'] || '*/*'
            },
            responseType: 'arraybuffer',
            httpsAgent: httpsAgent
        });

        const contentType = response.headers['content-type'];
        res.set('Content-Type', contentType);

        // Strip security headers that might block framing
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('Strict-Transport-Security');

        if (contentType && contentType.includes('text/html')) {
            const html = response.data.toString();
            const $ = cheerio.load(html);

            // Inject the stealth script
            $('head').prepend(stealthScript);

            const baseUrl = new URL(targetUrl);
            $('link, script, img, a').each((i, el) => {
                const attr = el.name === 'link' ? 'href' : (el.name === 'script' || el.name === 'img' ? 'src' : 'href');
                let val = $(el).attr(attr);
                if (val && !val.startsWith('http') && !val.startsWith('//') && !val.startsWith('data:')) {
                    try {
                        const absoluteUrl = new URL(val, baseUrl.href).href;
                        if (el.name === 'a') {
                            $(el).attr('href', `/proxy?url=${encodeURIComponent(absoluteUrl)}`);
                        } else {
                            $(el).attr(attr, `/proxy?url=${encodeURIComponent(absoluteUrl)}`);
                        }
                    } catch (e) {}
                }
            });
            return res.send($.html());
        }

        // For other content types (images, scripts, styles), just pipe the data
        res.send(response.data);
    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).send('Failed to fetch the target site.');
    }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
