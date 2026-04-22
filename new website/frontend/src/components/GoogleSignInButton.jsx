import React, { useEffect, useRef, useState } from 'react';

let gisScriptPromise = null;
const credentialListeners = new Set();

const ensureGoogleScriptLoaded = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-gsi="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google SDK failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.gsi = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google SDK failed to load.'));
    document.head.appendChild(script);
  });

  return gisScriptPromise;
};

const GoogleSignInButton = ({ onCredential, onError }) => {
  const containerRef = useRef(null);
  const credentialRef = useRef(onCredential);
  const errorRef = useRef(onError);
  const [ready, setReady] = useState(false);
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  useEffect(() => {
    credentialRef.current = onCredential;
    errorRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    setReady(false);

    if (!clientId) {
      onError?.(
        'Google login is disabled: missing REACT_APP_GOOGLE_CLIENT_ID. Set it in frontend/.env (local) or in your Vercel Environment Variables.'
      );
      return;
    }

    if (clientId.startsWith('GOCSPX-')) {
      onError?.(
        'Google login is disabled: REACT_APP_GOOGLE_CLIENT_ID must be a Client ID ending in .apps.googleusercontent.com (not a client secret).'
      );
      return;
    }

    let cancelled = false;
    const listener = (credential) => credentialRef.current?.(credential);
    credentialListeners.add(listener);

    const mountGoogleButton = async () => {
      await ensureGoogleScriptLoaded();
      if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;

      if (!window.__gsi_initialized_client_id || window.__gsi_initialized_client_id !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => {
            credentialListeners.forEach((cb) => cb(resp.credential));
          },
          ux_mode: 'popup',
        });
        window.__gsi_initialized_client_id = clientId;
      }

      containerRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
      });
      setReady(true);
    };

    mountGoogleButton().catch(() => {
      errorRef.current?.('Google SDK failed to load. You can still login with username/password.');
    });

    return () => {
      cancelled = true;
      credentialListeners.delete(listener);
    };
    // GIS should initialize once per page lifecycle.
  }, [clientId]);

  if (!clientId) return null;
  return <div ref={containerRef} style={{ display: ready ? 'block' : 'none' }} />;
};

export default GoogleSignInButton;
