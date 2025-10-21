import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JSON to Excel Converter',
  description: 'Convert JSON data to Excel (XLSX) and CSV files with advanced configuration options',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}