# Tablero King Muebles

Página con los números del negocio para Ramiro y Cande: el mes contra el anterior, la plata por cobrar, el taller,
las próximas entregas, qué se vende y de dónde vienen las ventas. Más adelante, los anuncios de Meta.

- Los datos salen del panel de pedidos (planilla "Pedidos King Muebles"), exportada como CSV a `privado/pedidos.csv`.
- `node scripts/armar.js` arma `site/datos.json` (no se sube) y `site/datos.enc.json` (cifrado con la clave de
  `privado/clave.txt`). A GitHub solo va el cifrado. No pasan nombres, teléfonos, direcciones, detalle ni notas.
- Se publica con GitHub Pages desde `site/` (`.github/workflows/publicar.yml`), igual que el Tablero Biotina.
- **Versión de prueba (la publicada, 11/11):** `node scripts/demo.js` arma `site/datos.demo.json` con pedidos y anuncios
  INVENTADOS (Agustín no quiere que Ramiro piense que le revisamos los números). Si ese archivo está, la página lo
  muestra sin clave, con la franja "Versión de prueba", y corre las fechas al día en que se mira.
  `site/datos.enc.json` (los datos reales) está en `.gitignore` hasta que Ramiro lo contrate.
- Vista local: `python -m http.server 8794 --directory site` (o "tablero-king" en `.claude/launch.json`).
