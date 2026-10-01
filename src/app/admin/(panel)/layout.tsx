import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { esAdmin } from "../../lib/auth";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

// El panel se dibuja solo con sesión. Igual, cada ruta de la API vuelve a chequear:
// esto es para no mostrar la pantalla, la protección de los datos está en el servidor.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await esAdmin())) redirect("/admin/login");
  return children;
}
