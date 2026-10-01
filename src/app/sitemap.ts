import type { MetadataRoute } from "next";
import { SITIO_URL } from "./lib/local";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITIO_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITIO_URL}/reservar`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITIO_URL}/consultar`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
