import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Dota Auctions',
  description: 'A place to manage your Dota Auctions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-900 text-white font-sans">
        <header className="bg-blue-900 text-white p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-3xl font-bold font-cinzel">
              <Link href="/">Dota Auctions</Link>
            </h1>
            <nav className="space-x-4 text-lg">
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <Link href="/register" className="hover:underline">
                Register
              </Link>
              <Link href="/login" className="hover:underline">
                Login
              </Link>
            </nav>
          </div>
        </header>

        <main className="min-h-screen container mx-auto p-4">{children}</main>

        <footer className="bg-blue-900 text-white p-4 text-center">
          <p>© 2025 Dota Auctions</p>
        </footer>
      </body>
    </html>
  );
}
