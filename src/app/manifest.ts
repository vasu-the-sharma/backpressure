import type { MetadataRoute } from "next";

/** Lets the site be installed / pinned with the brand icon and colors. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Backpressure",
    short_name: "Backpressure",
    description: "See how systems behave under load.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
