/*
 * JSON to Excel Converter
 * Copyright (C) 2024 Xtra01
 * Licensed under AGPL v3 - see LICENSE file
 * For commercial licensing: https://github.com/Xtra01/json-to-excel-converter
 */

import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JSON to Excel Converter',
  description: 'Convert JSON data to Excel (XLSX) and CSV files with advanced configuration options',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'JSON2Excel',
  },
  icons: [
    {
      rel: 'icon',
      url: '/icon-192.svg',
      sizes: '192x192',
      type: 'image/svg+xml',
    },
    {
      rel: 'apple-touch-icon',
      url: '/icon-192.svg',
      sizes: '192x192',
      type: 'image/svg+xml',
    }
  ]
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="JSON2Excel" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen bg-gray-50">
        {children}
        <script src="/pwa-installer.js" async />
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
            `,
          }}
        />
      </body>
    </html>
  )
}