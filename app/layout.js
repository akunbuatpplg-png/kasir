import './globals.css';
export const metadata = { title: 'Kasir Warung', description: 'Aplikasi kasir modern' };
export default function RootLayout({ children }) {
  return (<html lang="id"><body>{children}</body></html>);
}