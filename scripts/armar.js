// Arma los datos del Tablero King Muebles a partir de la planilla del panel de pedidos.
//
//   node scripts/armar.js [privado/pedidos.csv]
//
// Entrada: la hoja "Pedidos" exportada como CSV (privado/, no se sube).
// Salida: site/datos.json (sin cifrar, no se sube) y site/datos.enc.json (cifrado con la clave de privado/clave.txt:
// es lo único que va a GitHub). Al tablero NO pasan nombres, teléfonos, direcciones, detalle ni notas de los
// clientes: solo número de pedido, fechas, estado, canal, producto, medida, color, localidad y plata.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const raiz = path.join(__dirname, '..');
const entrada = process.argv[2] || path.join(raiz, 'privado', 'pedidos.csv');

// CSV con comillas, comas y saltos de línea adentro de los campos
function leerCsv(texto) {
  const filas = [];
  let fila = [], campo = '', comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); filas.push(fila); fila = []; campo = '';
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  const cab = filas.shift().map((s) => s.replace(/^﻿/, '').trim());
  return filas.filter((f) => f.some((x) => x.trim())).map((f) => Object.fromEntries(cab.map((k, i) => [k, (f[i] || '').trim()])));
}

const num = (s) => { const n = Number(String(s).replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : 0; };
const MENORES = ['de', 'del', 'la', 'las', 'los', 'y', 'e'];
const titulo = (s) => String(s).toLowerCase().split(/(\s+)/)
  .map((w, i) => (i > 0 && MENORES.includes(w)) ? w : w.replace(/^(\p{L})/u, (m) => m.toUpperCase())).join('');

function producto(s) {
  const t = s.toLowerCase();
  if (t.includes('kingdom')) return 'Cama Kingdom';
  if (t.includes('combo')) return 'Combo KNG';
  if (t.includes('cama') && t.includes('kng')) return 'Cama KNG';
  return titulo(s) || 'Sin producto';
}

// "1,40 x 200", "180 x 200" -> "1,40 x 2,00", "1,80 x 2,00"
function medida(s) {
  const p = String(s).toLowerCase().split('x').map((x) => num(x.replace(',', '.')));
  if (p.length !== 2 || !p[0] || !p[1]) return s || 'Sin medida';
  const m = (v) => (v > 10 ? v / 100 : v).toFixed(2).replace('.', ',');
  return `${m(p[0])} x ${m(p[1])}`;
}

const BARRIOS = ['palermo', 'caballito', 'saavedra', 'mataderos', 'villa ortuzar', 'villa ortúzar', 'san cristobal',
  'san cristóbal', 'villa del parque', 'las cañitas', 'belgrano', 'almagro', 'recoleta', 'flores', 'villa urquiza',
  'villa crespo', 'colegiales', 'nuñez', 'núñez', 'barracas', 'boedo', 'chacarita', 'devoto', 'villa devoto'];
function zona(loc) {
  const t = loc.toLowerCase();
  if (!t) return 'Sin dato';
  return (t.includes('caba') || t.includes('capital') || BARRIOS.some((b) => t.includes(b))) ? 'CABA' : 'Provincia';
}
function localidad(loc) {
  const l = titulo(loc.replace(/,?\s*caba$/i, '').replace(/\s*caba$/i, '').replace(/zona oeste/i, '').trim());
  return l || (zona(loc) === 'CABA' ? 'CABA' : 'Sin dato');
}

const filas = leerCsv(fs.readFileSync(entrada, 'utf8'));
const pedidos = filas.filter((f) => f.id).map((f) => ({
  id: num(f.id),
  fecha: f.fecha.slice(0, 10),
  estado: f.estado,
  canal: f.canal || 'Sin origen',
  atendio: f.atendio || 'Sin asignar',
  producto: producto(f.producto),
  medida: medida(f.medida),
  color: titulo(f.color) || 'Sin color',
  zona: zona(f.localidad),
  localidad: localidad(f.localidad),
  precio: num(f.precio),
  flete: num(f.flete),
  sena: num(f.sena),
  saldoCobrado: /^(true|verdadero|sí|si|1)$/i.test(f.saldoCobrado),
  entrega: f.entrega.slice(0, 10),
  creado: f.creado,
  actualizado: f.actualizado,
}));

const datos = {
  generado: new Date().toISOString(),
  fuente: 'Panel de pedidos (hoja "Pedidos")',
  pedidos,
  anuncios: null,   // se llena cuando haya acceso de lectura a la cuenta publicitaria de King Muebles
};
fs.writeFileSync(path.join(raiz, 'site', 'datos.json'), JSON.stringify(datos, null, 1));

// Cifrado como el Tablero Biotina (AES-256-GCM con clave derivada por PBKDF2), pero con una clave de 10 letras y
// números en vez de un PIN de 4: un PIN se adivina con un programa en segundos y estos son números de ventas reales
// (Ramiro no quiere exponer lo que factura). Igual no van datos personales de los clientes.
let cifrado = 'cifrado NO';
try {
  const pin = fs.readFileSync(path.join(raiz, 'privado', 'clave.txt'), 'utf8').trim();
  if (pin.length < 10) throw new Error('la clave tiene que tener 10 caracteres o más');
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), iter = 200000;
  const clave = crypto.pbkdf2Sync(pin, salt, iter, 32, 'sha256');
  const c = crypto.createCipheriv('aes-256-gcm', clave, iv);
  const cuerpo = Buffer.concat([c.update(JSON.stringify(datos), 'utf8'), c.final()]);
  const sobre = { v: 1, iter, salt: salt.toString('base64'), iv: iv.toString('base64'), data: Buffer.concat([cuerpo, c.getAuthTag()]).toString('base64') };
  fs.writeFileSync(path.join(raiz, 'site', 'datos.enc.json'), JSON.stringify(sobre));
  cifrado = 'cifrado OK';
} catch (e) {
  cifrado = 'cifrado NO (' + e.message + ')';
}
const ult = pedidos.map((p) => p.creado).sort().pop();
console.log(`${pedidos.length} pedidos, el último cargado ${ult} | ${cifrado}`);
