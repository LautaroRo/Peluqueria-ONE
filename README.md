# ONE · Peluquería y Barbería

Sitio y sistema de turnos de la peluquería ONE (Argüello, Córdoba). Hecho con **Next.js 16**, **React 19**, **TypeScript** y **MongoDB** (Mongoose).

## Qué hace

- **Landing**: presentación del local y de Héctor, servicios con duración y precio, cómo reservar, mapa, horarios con el estado "abierto / cerrado" en vivo, opiniones y preguntas frecuentes. Incluye la ficha del negocio para Google (schema.org), `sitemap.xml` y `robots.txt`.
- **Reservar** (`/reservar`): servicio → día → horario → datos. Solo muestra los días y horarios en que el local atiende, los que siguen libres y, para los servicios largos, los horarios donde entran completos. Al confirmar se puede sumar el turno a Google Calendar.
- **Mi turno** (`/consultar`): el cliente busca su turno con el teléfono y lo puede cambiar o cancelar hasta 8 horas antes.
- **Panel** (`/admin`, con contraseña):
  - **Hoy**: avance del día, próximo turno resaltado e ingreso estimado.
  - **Agenda**: atendido, reprogramar, cancelar y recordatorio por WhatsApp con el mensaje armado. Botón **+ Turno** para cargar los que llegan por teléfono o en persona.
  - **Estadísticas**: tendencia por día, semana o mes (turnos o ingresos), números del mes contra el mismo tramo del mes anterior, horarios más pedidos, servicios, clientes más fieles y ocupación de los próximos 7 días.
  - **Clientes**: ficha de cada uno con visitas, gasto, historial y notas privadas. Exportable a Excel.
  - **Historial**: filtrable y exportable a Excel.
  - **Servicios**: nombre, descripción, precio y duración (30, 60 o 90 min); se prenden y apagan sin borrarlos.
  - **Bloqueos**: días u horarios sin atención (vacaciones, feriados), que dejan de poder reservarse.

## Servicios

El catálogo vive en la base y se edita desde el panel. La primera vez se carga con la lista de [`src/app/lib/servicios.ts`](src/app/lib/servicios.ts), sin precios. Cada turno guarda una copia del servicio (nombre, precio y duración) al reservarse: cambiar un precio no altera los turnos ya sacados ni las estadísticas pasadas.

Un servicio de una hora ocupa dos medias horas de la agenda. La base tiene un índice único por día y media hora, así que dos turnos no se pueden superponer aunque se reserven al mismo tiempo.

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
