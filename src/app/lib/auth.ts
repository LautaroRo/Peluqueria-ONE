import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Sesión del panel: una cookie firmada con la contraseña del local (ADMIN_PASSWORD, en Vercel).
// Si se cambia la contraseña, todas las sesiones abiertas dejan de valer.

export const COOKIE_ADMIN = "one_admin";
export const DURACION_SESION_S = 60 * 60 * 24 * 30; // 30 días: Héctor no tiene que loguearse todos los días

const secreto = () => {
  const pass = process.env.ADMIN_PASSWORD;
  return pass ? createHmac("sha256", "one-peluqueria").update(pass).digest() : null;
};

const firmar = (valor: string, clave: Buffer) => createHmac("sha256", clave).update(valor).digest("base64url");

const igualesSeguro = (a: string, b: string) => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

export function passwordCorrecta(intento: string): boolean {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass || typeof intento !== "string") return false;
  // Comparar huellas de igual largo evita filtrar información por el tiempo de respuesta
  const h = (s: string) => createHmac("sha256", "cmp").update(s).digest("base64url");
  return igualesSeguro(h(intento), h(pass));
}

export function crearSesion(): string | null {
  const clave = secreto();
  if (!clave) return null;
  const vence = String(Math.floor(Date.now() / 1000) + DURACION_SESION_S);
  return `${vence}.${firmar(vence, clave)}`;
}

export function sesionValida(token: string | undefined): boolean {
  const clave = secreto();
  if (!clave || !token) return false;
  const [vence, firma] = token.split(".");
  if (!vence || !firma || !igualesSeguro(firma, firmar(vence, clave))) return false;
  return Number(vence) > Date.now() / 1000;
}

export async function esAdmin(): Promise<boolean> {
  const store = await cookies();
  return sesionValida(store.get(COOKIE_ADMIN)?.value);
}
