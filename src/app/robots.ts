import type { MetadataRoute } from "next";
import { SITIO_URL } from "./lib/local";

// El panel y la API no tienen nada que indexar
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: `${SITIO_URL}/sitemap.xml`,
  };
}
