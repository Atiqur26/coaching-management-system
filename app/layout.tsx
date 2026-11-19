import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Coaching Management', description: 'Coaching institute management system' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="bn"><body>{children}</body></html>; }
