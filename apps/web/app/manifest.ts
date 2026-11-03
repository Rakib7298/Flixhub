import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MediaMatrix",
    short_name: "MediaMatrix",
    description: "Media discovery and authorized playback.",
    start_url: "/",
    display: "standalone",
    background_color: "#080A0D",
    theme_color: "#080A0D",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
