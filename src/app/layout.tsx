import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Youth Match — Oportunidades internacionales para jóvenes",
    template: "%s · Youth Match",
  },
  description:
    "Becas, intercambios, congresos, voluntariados y programas de liderazgo de todo el mundo, actualizados cada día y recomendados según tu perfil.",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${GeistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
