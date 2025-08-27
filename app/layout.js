import "./globals.css";

export const metadata = { title: 'Mapeador de Página' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-dvh">
        {children}
      </body>
    </html>
  );
}
