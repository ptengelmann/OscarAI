
// Always load config at app startup (server-side)
import '@/lib/config'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { UserProvider } from '@/contexts/UserContext'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OscarAI - AI-Powered Inventory Optimization',
  description: 'Optimize your inventory with AI-powered price recommendations and risk alerts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}