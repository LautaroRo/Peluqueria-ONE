// Datos del local, en un solo lugar
export const SITIO_URL = "https://peluqueria-one-weld.vercel.app";

export const DIRECCION = {
  calle: "Heriberto Martínez 6814",
  zona: "Argüello, Córdoba Capital",
};

const consulta = encodeURIComponent(`${DIRECCION.calle}, ${DIRECCION.zona}, Argentina`);

// El mapa se busca por dirección (el embed anterior tenía coordenadas de ejemplo y marcaba otro lugar)
export const MAPA_EMBED = `https://maps.google.com/maps?q=${consulta}&z=16&output=embed`;
export const LINK_MAPS = `https://www.google.com/maps/search/?api=1&query=${consulta}`;
export const LINK_COMO_LLEGAR = `https://www.google.com/maps/dir/?api=1&destination=${consulta}`;

// Si sumás fotos a /public, poné acá su ruta y aparecen solas en la landing
export const FOTO_LOCAL: string | null = null; // ej. "/foto.jpg"
export const FOTO_HECTOR: string | null = null; // ej. "/hector.jpg"
