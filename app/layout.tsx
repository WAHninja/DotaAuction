import './globals.css';

export const metadata = {
  title: 'Dota Auctions',
  description: 'A place to manage your Dota Auctions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="bg-blue-600 text-white p-4 text-center">
          <h1 className="text-3xl font-bold">Dota Auctions</h1>
        </header>
        <main>{children}</main>
        <footer className="bg-blue-600 text-white p-4 text-center">
          <p>© 2025 Dota Auctions</p>
        </footer>
      </body>
    </html>
  );
}
