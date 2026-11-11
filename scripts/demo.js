// Arma la VERSIÓN DE PRUEBA del tablero, con pedidos y anuncios INVENTADOS (nada de la planilla real), para
// mostrársela a Ramiro sin que parezca que revisamos sus números.
//
//   node scripts/demo.js
//
// Escribe site/datos.demo.json. Si ese archivo está, la página lo muestra directo (sin clave) con la franja
// "Versión de prueba". La página corre las fechas al día en que se mira, así que la prueba nunca queda vieja.
// Los precios son los de lista de la web; todo lo demás (cantidades, zonas, anuncios) es inventado.
const fs = require('fs');
const path = require('path');

// azar con semilla: la prueba sale siempre igual
let semilla = 20261112;
const azar = () => { semilla = (semilla + 0x6D2B79F5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const uno = (l) => l[Math.floor(azar() * l.length)];
const pesado = (pares) => { let r = azar() * pares.reduce((s, [, p]) => s + p, 0); for (const [v, p] of pares) { if ((r -= p) < 0) return v; } return pares[0][0]; };

const hoy = new Date(Date.now() - 3 * 3600 * 1000);
const dia = (n) => { const d = new Date(hoy); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const PRECIO_KNG = { '1,40 x 1,90': 499000, '1,60 x 2,00': 520000, '1,80 x 2,00': 570000, '2,00 x 2,00': 610000 };
const COLORES = ['Helsinki', 'Nocce Milano', 'Scotch', 'Olmo Finlandés', 'Grafito'];
const CABA = ['Palermo', 'Caballito', 'Villa Urquiza', 'Almagro', 'Flores', 'Belgrano', 'Villa Crespo'];
const PROVINCIA = ['Caseros', 'Morón', 'Ramos Mejía', 'San Justo', 'Haedo', 'Ituzaingó', 'Castelar', 'Villa Ballester', 'Quilmes', 'Lanús'];
const ANUNCIOS = ['Video: la cama se abre', 'Video KNG Queen con precio', 'Placa Combo KNG', 'Placa colores'];

const pedidos = [];
for (let n = 44; n >= 1; n--) {
  const cuantos = pesado([[0, 2], [1, 5], [2, 3]]);
  for (let k = 0; k < cuantos; k++) {
    const prod = pesado([['Cama KNG', 60], ['Combo KNG', 25], ['Cama KNG Individual', 15]]);
    const blanco = azar() < 0.62;
    let medida, precio;
    if (prod === 'Cama KNG Individual') { medida = uno(['90 x 1,90', '1,00 x 1,90']); precio = blanco ? 450000 : 480000; }
    else if (prod === 'Combo KNG') { medida = pesado([['1,40 x 1,90', 6], ['1,60 x 2,00', 4]]); precio = (medida === '1,40 x 1,90' ? 725000 : 765000) + (blanco ? 0 : 30000); }
    else { medida = pesado([['1,60 x 2,00', 40], ['1,40 x 1,90', 35], ['1,80 x 2,00', 15], ['2,00 x 2,00', 10]]); precio = PRECIO_KNG[medida] + (blanco ? 0 : 30000); }
    const enCaba = azar() < 0.5;
    const canal = pesado([['Instagram', 50], ['WhatsApp', 40], ['En la fábrica', 10]]);
    const total = precio;
    const sena = azar() < 0.5 ? 50000 : Math.round(total * pesado([[0.3, 1], [0.5, 1]]) / 10000) * 10000;
    const plazo = 10 + Math.floor(azar() * 9);
    let estado, entrega = dia(-n + plazo), cobrado = false;
    if (n > plazo) { estado = 'Entregado'; cobrado = azar() < 0.9; }
    else if (n > plazo - 2) estado = 'Listo';
    else if (n > 4) estado = 'En fabricación';
    else estado = 'Señado';
    pedidos.push({
      id: 0, fecha: dia(-n), estado, canal, atendio: canal === 'Instagram' ? 'Cande' : 'Ramiro', producto: prod, medida,
      color: blanco ? 'Blanco' : uno(COLORES), zona: enCaba ? 'CABA' : 'Provincia', localidad: uno(enCaba ? CABA : PROVINCIA),
      precio, flete: 55000 + 5000 * Math.floor(azar() * 8), sena, saldoCobrado: cobrado, entrega,
      creado: dia(-n) + ' 12:00:00', actualizado: dia(-n) + ' 12:00:00', anuncio: null,
    });
  }
}
pedidos.forEach((p, i) => { p.id = i + 1; });
// de las ventas de este mes por Instagram o WhatsApp, algunas vinieron por un anuncio (reparto fijo, para que el
// semáforo muestre los tres casos)
const REPARTO = [0, 1, null, 0, 2, 1, null, 0, null, 1, 0, null, 2, 0];
pedidos.filter((p) => p.fecha.slice(0, 7) === dia(0).slice(0, 7) && p.canal !== 'En la fábrica')
  .forEach((p, i) => { const a = REPARTO[i % REPARTO.length]; p.anuncio = a == null ? null : ANUNCIOS[a]; });
// para que se vean los avisos: una entrega atrasada y un pedido sin fecha
const atrasada = pedidos.find((p) => p.estado === 'Listo');
if (atrasada) atrasada.entrega = dia(-2);
const sinFecha = pedidos.filter((p) => p.estado === 'Señado').pop();
if (sinFecha) sinFecha.entrega = '';

// anuncios del mes (inventados): gasto y consultas; las ventas las cuenta la página con los pedidos marcados
const anuncios = {
  periodo: 'Este mes',
  filas: [
    { anuncio: ANUNCIOS[0], estado: 'Activo', gasto: 108000, consultas: 141 },
    { anuncio: ANUNCIOS[1], estado: 'Activo', gasto: 156000, consultas: 98 },
    { anuncio: ANUNCIOS[2], estado: 'Activo', gasto: 78000, consultas: 37 },
    { anuncio: ANUNCIOS[3], estado: 'Activo', gasto: 95000, consultas: 12 },
  ],
};

const datos = { demo: true, generado: new Date().toISOString(), fuente: 'Datos inventados', pedidos, anuncios };
fs.writeFileSync(path.join(__dirname, '..', 'site', 'datos.demo.json'), JSON.stringify(datos));
const delMes = pedidos.filter((p) => p.fecha.slice(0, 7) === dia(0).slice(0, 7));
console.log(`${pedidos.length} pedidos inventados (${delMes.length} este mes, ${pedidos.filter((p) => p.anuncio).length} por anuncio)`);
