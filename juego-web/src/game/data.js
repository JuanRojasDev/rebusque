// Catálogo del juego. Precios en pesos colombianos (COP), ficticios pero verosímiles.

export const MATERIALS = {
  carton: { name: 'Cartón', peso: 1, precio: 350, icon: 'package', unit: 'kg' },
  plastico: { name: 'Plástico', peso: 0.5, precio: 300, icon: 'recycle', unit: 'kg' },
  lata: { name: 'Latas', peso: 0.2, precio: 250, icon: 'recycle', unit: 'un' },
  vidrio: { name: 'Vidrio', peso: 1, precio: 120, icon: 'water', unit: 'kg' },
  chatarra: { name: 'Chatarra', peso: 2, precio: 900, icon: 'wrench', unit: 'kg' },
  cobre: { name: 'Cobre', peso: 0.5, precio: 6000, icon: 'flame', unit: 'kg' },
  celular: { name: 'Celular viejo', peso: 0.2, precio: 15000, icon: 'phone', unit: 'un' },
  reloj: { name: 'Reloj', peso: 0.1, precio: 8000, icon: 'watch', unit: 'un' },
};

// Cosas que no se venden a la recicladora: se usan o se construye con ellas.
export const ITEMS = {
  sobrado: { name: 'Comida sobrada', peso: 0.3, icon: 'food', desc: 'De la basura. Llena, pero puede caer mal.', use: { hambre: 16 }, risk: 0.35 },
  empanada: { name: 'Empanada', peso: 0.1, icon: 'sandwich', desc: 'Calientica, con ají.', use: { hambre: 22 } },
  pan: { name: 'Pan', peso: 0.1, icon: 'bread', desc: 'Pan de sal del día.', use: { hambre: 10 } },
  arepa: { name: 'Arepa con queso', peso: 0.2, icon: 'sandwich', desc: 'La que más llena.', use: { hambre: 38, salud: 2 } },
  tinto: { name: 'Tinto', peso: 0.05, icon: 'coffee', desc: 'Quita el sueño un rato y calma la ansiedad.', use: { sueno: 9, vicio: 8 } },
  cigarrillo: { name: 'Cigarrillo suelto', peso: 0.01, icon: 'flame', desc: 'Calma el vicio. Le quita un poquito a la salud.', use: { vicio: 35, salud: -1 } },
  agua: { name: 'Agua en bolsa', peso: 0.3, icon: 'water', desc: 'Hidrata y aliviana.', use: { salud: 4, hambre: 3 } },
  acetaminofen: { name: 'Acetaminofén', peso: 0.02, icon: 'pill', desc: 'Cura la gripa.', use: { salud: 10 }, cures: 'gripa' },
  jabon: { name: 'Jabón', peso: 0.1, icon: 'bath', desc: 'La próxima lavada en la pila deja la higiene al 100.' },
  lona: { name: 'Lona azul', peso: 2, icon: 'tent', desc: 'Para el techo del cambuche.' },
  madera: { name: 'Tablas', peso: 2, icon: 'layers', desc: 'Para las paredes del cambuche.' },
  colchon: { name: 'Colchón viejo', peso: 6, icon: 'bed', desc: 'Para dormir como gente.' },
  vela: { name: 'Vela', peso: 0.05, icon: 'flame', desc: 'Ilumina el cambuche: duermes más tranquilo.' },
};

export const SHOP = [
  { id: 'empanada', precio: 2500 },
  { id: 'pan', precio: 1000 },
  { id: 'arepa', precio: 4000 },
  { id: 'tinto', precio: 1000 },
  { id: 'cigarrillo', precio: 500 },
  { id: 'agua', precio: 1500 },
  { id: 'acetaminofen', precio: 1800 },
  { id: 'jabon', precio: 2500 },
  { id: 'vela', precio: 1000 },
  { id: 'lona', precio: 9000 },
  { id: 'madera', precio: 6000, qty: 3, label: 'Tablas ×3' },
  { id: 'costal', precio: 12000, upgrade: true, name: 'Costal grande', icon: 'backpack', desc: 'Carga hasta 40 kg en vez de 20.' },
];

export const CAMBUCHE = [
  { id: 'base', name: 'Base de cartón', icon: 'package', req: { carton: 8 }, desc: 'Para dormir sin tocar el piso. Duermes y guardas.' },
  { id: 'techo', name: 'Techo de lona', icon: 'tent', req: { lona: 1 }, desc: 'Duermes mejor y la lluvia no te enferma.', needs: 'base' },
  { id: 'paredes', name: 'Paredes de tablas', icon: 'layers', req: { madera: 6 }, desc: 'Nadie te roba mientras duermes.', needs: 'base' },
  { id: 'cama', name: 'Colchón', icon: 'bed', req: { colchon: 1 }, desc: 'Recuperas mucho más sueño.', needs: 'base' },
  { id: 'fogon', name: 'Fogón de latas', icon: 'flame', req: { lata: 6, madera: 2 }, desc: 'Calienta: la comida sobrada ya no cae mal.', needs: 'base' },
  { id: 'vela', name: 'Vela y foto', icon: 'heart', req: { vela: 1 }, desc: 'Despiertas más tranquilo: calma el vicio.', needs: 'base' },
];

// Tabla de botín de una bolsa de basura (pesos relativos).
export const LOOT = [
  ['carton', 30, 1, 3],
  ['plastico', 22, 1, 3],
  ['lata', 20, 1, 4],
  ['vidrio', 9, 1, 2],
  ['chatarra', 6, 1, 1],
  ['sobrado', 8, 1, 1],
  ['madera', 4, 1, 2],
  ['cobre', 2.4, 1, 1],
  ['lona', 0.9, 1, 1],
  ['colchon', 0.5, 1, 1],
  ['celular', 0.6, 1, 1],
  ['reloj', 0.6, 1, 1],
];

export const ORIGINS = {
  reciclador: { name: 'Reciclador', desc: 'Llevas años en el reciclaje y sabes qué sirve: encuentras más material en cada bolsa.' },
  desplazado: { name: 'Desplazado', desc: 'Llegaste del campo huyendo de la violencia. Aguantas: la lluvia y el frío te afectan menos.' },
  migrante: { name: 'Migrante', desc: 'Cruzaste la frontera buscando trabajo. Tienes labia: en el semáforo te dan más.' },
  endeudado: { name: 'Gota a gota', desc: 'Lo perdiste todo por un préstamo gota a gota. Sabes negociar: vendes 15 % más caro.' },
};

export const NEEDS = [
  { id: 'hambre', label: 'Hambre', icon: 'food' },
  { id: 'sueno', label: 'Sueño', icon: 'moon' },
  { id: 'higiene', label: 'Higiene', icon: 'bath' },
  { id: 'salud', label: 'Salud', icon: 'heart' },
  { id: 'vicio', label: 'Vicio', icon: 'flame' },
];

export const CAPACITY = { base: 20, costal: 40 };

export const fmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
export const cop = (n) => `$ ${fmt.format(Math.round(n))}`;
