import type { MetadataRoute } from "next";

// Permite instalar Youth Match en el celular como una app (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Youth Match",
    short_name: "Youth Match",
    description: "Becas, intercambios, congresos y voluntariados internacionales para jóvenes de Latinoamérica.",
    lang: "es",
    start_url: "/para-ti?utm_source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f4ef",
    theme_color: "#0b1f52",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Para ti", url: "/para-ti" },
      { name: "Descubrir", url: "/descubrir" },
      { name: "Guardadas", url: "/guardadas" },
    ],
  };
}
