# Cómo publicar (Vercel + GitHub)

1. Sube esta carpeta a un repositorio de GitHub (git push o "Upload files").
2. En vercel.com: Add New > Project > importa el repositorio > Framework "Other" > Deploy.
3. En el proyecto de Vercel: Storage > Create Database > Neon (Postgres) > Connect to Project.
   Esto crea la variable DATABASE_URL sola.
4. Deployments > los 3 puntos del último deploy > Redeploy (para que tome la variable).
5. Abre tu URL, juega, pierde y escribe un nombre: el puntaje aparece en el ranking.

Las tablas se crean solas la primera vez. No hay que importar ningún .sql.
`api/ranking.js` reemplaza a `api.php`; `vercel.json` redirige /api.php hacia él, así que el juego no cambió.
`local-xampp/` guarda el api.php y el .sql originales por si quieres seguir usando XAMPP.
