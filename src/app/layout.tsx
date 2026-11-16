import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Youth Match — Oportunidades internacionales para jóvenes",
    template: "%s · Youth Match",
  },
  description:
    "Becas, intercambios, congresos, voluntariados y programas de liderazgo de todo el mundo, recomendados según tu perfil.",
};

export const viewport: Viewport = {
  themeColor: "#060f2e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
