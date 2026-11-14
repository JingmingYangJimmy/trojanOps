// Owner: D (WP-2). App shell: masthead, content (max 1280px, 24px padding), disclaimer footer.
import type { Metadata } from 'next';
import { Footer, Masthead } from '@/components/shell';
import { mono, sans, serif } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrojanOps',
  description: 'Governed agents for USC student clubs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Masthead />
        <main className="mx-auto w-full max-w-[1280px] flex-1 p-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
