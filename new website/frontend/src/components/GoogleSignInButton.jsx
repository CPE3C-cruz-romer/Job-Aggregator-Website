import React, { useEffect, useRef, useState } from 'react';

const GoogleSignInButton = ({ onCredential, onError }) => {
  const containerRef = useRef(null);
  const credentialRef = useRef(onCredential);
  const errorRef = useRef(onError);
  const initializedClientRef = useRef('');
  const [ready, setReady] = useState(false);
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  useEffect(() => {
    credentialRef.current = onCredential;
    errorRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    setReady(false);

    if (!clientId) {
      errorRef.current?.(
        'Google login is disabled: missing REACT_APP_GOOGLE_CLIENT_ID. Set it in frontend/.env (local) or in your Vercel Environment Variables.'
      );
      return;
    }

    if (clientId.startsWith('GOCSPX-')) {
      errorRef.current?.(
        'Google login is disabled: REACT_APP_GOOGLE_CLIENT_ID must be a Client ID ending in .apps.googleusercontent.com (not a client secret).'
      );
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 25;

    const mountGoogleButton = () => {
      if (cancelled || !containerRef.current) return true;
      if (!window.google?.accounts?.id) return false;

      try {
        if (
          initializedClientRef.current !== clientId
          && window.__googleClientInitializedId !== clientId
        ) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (resp) => credentialRef.current?.(resp.credential),
            ux_mode: 'popup',
          });
          initializedClientRef.current = clientId;
          window.__googleClientInitializedId = clientId;
        }

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
        });
        setReady(true);
        return true;
      } catch (err) {
        errorRef.current?.('Google auth initialization failed. Verify authorized origins in Google Cloud Console.');
        return true;
      }
    };

    if (mountGoogleButton()) return () => {};

    const interval = window.setInterval(() => {
      attempts += 1;
      const mounted = mountGoogleButton();
      if (mounted || attempts >= maxAttempts) {
        if (!mounted) {
          errorRef.current?.('Google SDK failed to load. You can still login with username/password.');
        }
        window.clearInterval(interval);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [clientId]);

  if (!clientId) return null;
  return <div ref={containerRef} style={{ display: ready ? 'block' : 'none' }} />;
};

export default GoogleSignInButton;
