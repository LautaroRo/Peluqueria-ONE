# ONE · Peluquería y Barbería

Sitio y sistema de turnos de la peluquería ONE (Argüello, Córdoba). Hecho con **Next.js 16**, **React 19**, **TypeScript** y **MongoDB** (Mongoose).

## Qué hace

- **Landing**: presentación del local y de Héctor, cómo reservar, mapa, horarios con el estado "abierto / cerrado" en vivo y opiniones.
- **Reservar** (`/reservar`): día → horario → datos. Solo muestra los días y horarios en que el local atiende y los que siguen libres. Al confirmar se puede sumar el turno a Google Calendar.
- **Mi turno** (`/consultar`): el cliente busca su turno con el teléfono y lo puede cambiar o cancelar hasta 8 horas antes.
- **Panel** (`/admin`, con contraseña): la agenda de hoy con el próximo turno resaltado, la agenda completa, clientes con acceso directo a WhatsApp e historial. Desde ahí se marca "atendido", se reprograma o se cancela.

## Horarios

Están en un solo lugar, [`src/app/lib/horarios.ts`](src/app/lib/horarios.ts). Si cambian, se edita ahí y se actualizan juntos la landing, el calendario y las validaciones del servidor.

## Seguridad

- Los datos de los clientes (nombres, teléfonos, historial) solo salen con la sesión del panel.
- Lo público devuelve lo mínimo: los horarios ocupados de un día van sin nombres ni teléfonos.
- Un cliente solo puede modificar o cancelar su propio turno (con su teléfono) y con la anticipación mínima.
- La base no admite dos turnos en el mismo horario, aunque dos personas reserven al mismo tiempo.
- Las horas se calculan siempre en hora de Córdoba (el servidor corre en UTC).

## Variables de entorno

| Variable | Para qué |
|---|---|
| `MONGO_DB_URL` | Conexión a MongoDB |
| `ADMIN_PASSWORD` | Contraseña del panel. Cambiarla cierra todas las sesiones abiertas. |

## Fotos

Si se suman fotos a `public/` (por ejemplo `foto.jpg` del local y `hector.jpg`), se activan en [`src/app/lib/local.ts`](src/app/lib/local.ts) y aparecen solas en la landing.

## Correr en local

```bash
npm install
npm run dev
```
