import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { ConfirmProvider } from '@/providers/confirm-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Calendar Booking App',
  description: 'Schedule appointments and manage your calendar with ease',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ConfirmProvider>
          {children}
          <Toaster richColors closeButton theme="dark" position="top-right" />
        </ConfirmProvider>
        <Analytics />
      </body>
    </html>
  )
}
