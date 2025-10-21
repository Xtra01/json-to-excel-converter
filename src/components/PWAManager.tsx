'use client';

import { useEffect } from 'react';

export default function PWAManager() {
  useEffect(() => {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
          .then(function(registration) {
            console.log('✅ SW registration successful: ', registration.scope);
          }, function(err) {
            console.log('❌ SW registration failed: ', err);
          });
      });
    }

    // PWA Installer Script
    const script = document.createElement('script');
    script.src = '/pwa-installer.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
      const existingScript = document.querySelector('script[src="/pwa-installer.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return null;
}