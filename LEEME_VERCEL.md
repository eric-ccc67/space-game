# Cómo publicar (Vercel + GitHub)
bruhxd
1. Sube esta carpeta a un repositorio de GitHub (git push o "Upload files").
2. En vercel.com: Add New > Project > importa el repositorio > Framework "Other" > Deploy.
3. En el proyecto de Vercel: Storage > Create Database > Neon (Postgres) > Connect to Project.
   Esto crea la variable DATABASE_URL sola.
4. Deployments > los 3 puntos del último deploy > Redeploy (para que tome la variable).
5. Abre tu URL, juega, pierde y escribe un nombre: el puntaje aparece en el ranking.

Las tablas se crean solas la primera vez. No hay que importar ningún .sql.
`api/ranking.js` reemplaza a `api.php`; `vercel.json` redirige /api.php hacia él, así que el juego no cambió.
`local-xampp/` guarda el api.php y el .sql originales por si quieres seguir usando XAMPP.

## Instalar el juego en el teléfono (v43)
En el menú del juego está la opción **Descargar app**. Funciona sola al publicar en Vercel (necesita https).
- Android (Chrome/Edge): un toque y se instala. iPhone: Safari > Compartir > Añadir a pantalla de inicio (la ventana del juego lo explica).
- Si quieres un archivo .apk de verdad (Play Store o para pasar por WhatsApp), entra a pwabuilder.com, pega la URL de tu juego en Vercel y descarga el paquete de Android: usa estos mismos archivos.
