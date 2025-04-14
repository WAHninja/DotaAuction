import './globals.css';

export const metadata = {
  title: 'Dota Auctions',
  description: 'A place to manage your Dota Auctions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Corrected crossOrigin to "anonymous" for TypeScript */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-900 text-white font-sans">
        {/* You can replace font-sans with a custom class if Cinzel is applied globally */}
        <header className="bg-blue-900 text-white p-4 text-center shadow-md">
          <h1 className="text-3xl font-bold font-cinzel">Dota Auctions</h1>
        </header>
        <main className="min-h-screen">{children}</main>
        <footer className="bg-blue-900 text-white p-4 text-center">
          <p>© 2025 Dota Auctions</p>
        </footer>
      </body>
    </html>
  );
}
