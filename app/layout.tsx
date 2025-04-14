import './globals.css';

export const metadata = {
  title: 'Dota Auctions',
  description: 'A place to manage your Dota Auctions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
