import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'AI Chat Dynamic UI',
  description: 'AI-powered chat application with dynamic UI generation',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="container mx-auto max-w-7xl h-screen flex flex-col p-4">
            <header className="mb-4">
              <div className="text-center py-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Math Assistant</h1>
                <p className="text-gray-600">Ask mathematical questions and get interactive calculators</p>
              </div>
            </header>
            <main className="flex-1 flex flex-col min-h-0">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}