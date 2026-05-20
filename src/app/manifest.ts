import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kje so igrala?",
    short_name: "Igrala",
    description: "Odkrij otroška igrišča po Sloveniji.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f5fb",
    theme_color: "#c8a3f0",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
