import type { Metadata } from 'next';
import './globals.css';
import './chat.css';

export const metadata: Metadata = {
  title: 'Tatparya Store',
  description: 'Shop online - powered by Tatparya',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
