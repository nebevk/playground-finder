import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kje so igrala?",
    short_name: "Igrala",
    description: "Odkrij otroška igrišča po Sloveniji.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7fb",
    theme_color: "#8e4ae2",
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
