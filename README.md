# Inventario Pro

Inventario de componentes electrónicos: stock con historial, escáner QR/código de barras, préstamos, wishlist automática y proyectos con lista de materiales y piezas impresas.

Next.js 16 (App Router, Server Components, Server Actions) · Prisma 6 + PostgreSQL · Tailwind v4 · Motion · Recharts.

## Desplegar en Vercel

1. **Antes de nada, descarga una copia** desde la app que esté en producción: Configuración/Ajustes → Exportar.
   Si la base de producción es nueva (por ejemplo, Neon recién creada), esa copia es la única forma de traer los datos.
2. **Variables de entorno** (Project → Settings → Environment Variables):

   | Variable | Obligatoria | Para qué |
   | --- | --- | --- |
   | `DATABASE_URL` | sí | Postgres (Neon). La crea la integración de Storage |
   | `ADMIN_PASSWORD` | sí | contraseña de entrada; usa una larga, la URL es pública |
   | `AUTH_SECRET` | sí | firma de la sesión. Aleatoria, 32+ caracteres: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
   | `CRON_SECRET` | no | protege `/api/cron/overdue`; Vercel lo envía solo |
   | `NOTIFY_WEBHOOK_URL` | no | webhook de Discord para el resumen de préstamos vencidos |
   | `NEXT_PUBLIC_APP_TZ` | no | por defecto `America/Bogota` |

   Sin `ADMIN_PASSWORD` y `AUTH_SECRET` nadie puede entrar. Cambiar una variable exige un Redeploy.
3. **Push a `main`.** Vercel ejecuta `npm run vercel-build`: pone `provider = "postgresql"` en el esquema, genera el cliente, aplica `prisma db push` **sin** `--accept-data-loss` y compila.
   Si un cambio de esquema futuro fuera destructivo, el build se detiene en vez de borrar datos.
4. En la app nueva: Ajustes → "Restaurar o importar" con la copia del paso 1, y "Cargar variantes de ESP32".
   Si había préstamos, `npm run db:backfill` (con el `DATABASE_URL` de producción en `.env`) crea las personas.
5. Inventario → Etiquetas QR: imprime y pega. Desde ahí el escáner ya sirve.

### Reglas de dependencias (para que el build no se rompa)

- **`@prisma/client` y `prisma` van en `dependencies`, con la misma versión exacta.** Si falta `@prisma/client`,
  `prisma generate` lo instala por su cuenta durante el build en modo producción y de paso borra de
  `node_modules` todo lo que esté en `devDependencies`. El síntoma en el log es la línea
  `Installed the @prisma/client and prisma packages in your project`, seguida de `Cannot find module 'typescript'`
  o `'@tailwindcss/postcss'`.
- **Todo lo que usa `next build` va en `dependencies`**: TypeScript, Tailwind, `@types/*`. En `devDependencies` solo queda ESLint.
- **TypeScript está fijado en 5.9.** No ejecutes `npm install typescript` sin versión: la 6 cambia valores por defecto.
- No hace falta `NPM_CONFIG_PRODUCTION` ni `ignoreBuildErrors`.

## Desarrollo (SQLite)

```bash
cp .env.example .env   # DATABASE_URL="file:./dev.db", ADMIN_PASSWORD, AUTH_SECRET
npm install
npm run db:push
npm run dev
```

La cámara del escáner solo funciona en HTTPS o en `localhost`.

## SQLite en local, Postgres en Vercel

Prisma no deja elegir el motor por variable de entorno, así que el esquema se escribe para que sirva en los dos y solo cambia una línea:

- `prisma/schema.prisma` se guarda en el repositorio con `provider = "sqlite"`.
- `npm run vercel-build` lo cambia a `postgresql` antes de generar el cliente. Vercel usa ese script en lugar de `build` cuando existe; si en tu proyecto sobrescribiste el Build Command, ponlo en `npm run vercel-build`.
- A mano: `npm run db:use sqlite` o `npm run db:use postgresql`, y después `npx prisma generate`.

Para que el mismo código funcione en ambos motores:

- No hay `enum` en el esquema. Los valores permitidos están en `src/lib/enums.ts` y de ahí salen los tipos, las validaciones de zod y las opciones de los formularios.
- No se usa `mode: "insensitive"` ni `createMany({ skipDuplicates })`, que solo existen en Postgres. Las búsquedas pasan por el helper `ci` de `src/lib/prisma.ts`.

## Arquitectura

```
src/
  proxy.ts                 sesión en el borde (Next 16: reemplaza a middleware.ts)
  lib/
    enums.ts               valores permitidos de los campos String (tipos + zod + UI)
    stock.ts               reglas de stock y préstamos (puras, cliente y servidor)
    stock-engine.ts        applyStock(): único punto donde cambia el stock, en transacción
    queries.ts             lecturas, solo desde Server Components
    safe-action.ts         envoltorio de Server Actions: sesión + zod + errores + revalidación
    auth.ts / session.ts   contraseña y JWT
  actions/                 mutaciones
  components/ui/           primitivos estilo shadcn (Radix + cva); `npx shadcn@latest add …` funciona
  app/(main)/              páginas: servidor por defecto, islas cliente en *Client.tsx / *Islands.tsx
```

Reglas que mantienen el inventario coherente:

- El stock solo cambia a través de `applyStock`, que deja un movimiento y nunca permite negativos.
- "Bajo mínimo" es estar **por debajo** del mínimo. Tener justo el mínimo está en orden.
- El pedido automático de la wishlist es un espejo del stock: aparece al bajar del mínimo y se cierra al recuperarse.
- Las alertas se calculan del estado real en cada carga; no hay tabla de notificaciones.

## Pendiente conocido

- Sigue siendo una contraseña única. Para varias cuentas o varios talleres hace falta Auth.js (o similar) y un `workspace_id` en cada tabla.
- `xlsx@0.18.5` de npm tiene avisos de seguridad sin parche en npm. La importación ya exige sesión; lo correcto es pasar a la versión que publica SheetJS en su CDN o a `exceljs`.
- El escáner carga ZXing-WASM desde jsDelivr en navegadores sin `BarcodeDetector` (iOS, Firefox).
- `src/app/api/import-csv/route.ts` es el archivo original con sesión añadida: conserva sus `any` y falla `npm run lint`. El resto del código pasa sin errores.
- No hay tests automatizados en el repositorio.
