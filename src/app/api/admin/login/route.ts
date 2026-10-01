import { NextResponse } from "next/server";
import { COOKIE_ADMIN, DURACION_SESION_S, crearSesion, passwordCorrecta } from "../../../lib/auth";

export async function POST(request: Request) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "El panel todavía no tiene contraseña configurada." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);

  if (!passwordCorrecta(String(body?.password ?? ""))) {
    // Una pausa ante cada error hace muy lento probar contraseñas al azar
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_ADMIN, crearSesion()!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_S,
  });
  return res;
}
