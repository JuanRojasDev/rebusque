# Game Design Document (GDD) — v0.1

## 1. Concepto

**Género:** supervivencia + simulación económica + construcción ligera, en tercera persona (con opción de primera).
**Plataforma inicial:** PC Windows (Steam). Consolas y móvil se evalúan después de la Alfa.
**Ambientación:** una ciudad colombiana ficticia inspirada en Cúcuta y Medellín (puentes, caños, semáforos, chatarrerías, recicladoras, plazas de mercado).
**Fantasía del jugador:** *"Empezar sin nada, rebuscarme la vida y construir algo propio en una ciudad que no me ve."*

**Referentes**, que los mismos comentarios mencionan:

| Juego | Qué tomamos |
|-------|-------------|
| *Schedule I* (TVGS, 2025) | Economía ilegal con gestión y progresión, en 3D. Demuestra que hay un mercado en Steam |
| *NEO Scavenger* | Supervivencia dura, inventario y enfermedades |
| *This War of Mine* | Tono humano y decisiones morales con consecuencias |
| *Valheim* / *7 Days to Die* | Construcción modular de refugio y persistencia |
| *Dark Souls* (lo pidió un comentario) | Cámara y combate con peso. Solo como referencia de *feel*, no de dificultad |

## 2. Pilares de diseño

1. **Supervivencia con realismo social.** Las necesidades se sienten en el cuerpo del personaje y en cómo lo trata la ciudad.
2. **Economía del rebusque.** Cada cosa de la calle tiene valor para alguien: cobre, cartón, retrovisores, latas.
3. **Tu cambuche, tu historia.** Personalización profunda que **persiste** (guardado local y en la nube).
4. **Ciudad viva.** Día y noche, lluvia, policía, otros habitantes, territorio y eventos aleatorios.

## 3. Ciclo principal (core loop)

```
Despertar en el cambuche
   → revisar necesidades (hambre, sueño, higiene, salud, ánimo, dependencia)
   → salir al rebusque (reciclar, semáforo, cuidar carros, pedir, robar con riesgo)
   → vender (recicladora, chatarrería, repuestos, mercado informal)
   → comprar / craftear (zorra de reciclaje = mesa de crafteo)
   → mejorar el cambuche y las habilidades (árbol de talentos)
   → dormir = guardar partida
```

## 4. Sistemas

### 4.1 Necesidades y estado (P0)
- **Hambre, sueño, salud, higiene y ánimo**, más **dependencia** (P1).
- La **higiene** afecta lo que recibes al pedir: la gente se aleja (pedido con 35 ❤).
- **Día y noche**: de día hay más limosna; de noche hay más riesgo y más reciclaje disponible.
- **Clima**: con lluvia hay que refugiarse o taparse con cartón. La lluvia moja y enferma (comentarios del día 5).

### 4.2 Rebusque y economía (P0–P1)
| Actividad | Riesgo | Notas de la comunidad |
|-----------|--------|-----------------------|
| Reciclar basura (cartón, plástico, latas, papel, cobre) | Bajo | Bolsas con botín aleatorio de baja probabilidad (cuchillo, gorra, dinero) |
| Chatarrería y recicladora | — | Lugares de venta con precios por material |
| Quemar caucho o cable para sacar cobre | Medio (humo, salud, policía) | Proceso de crafteo |
| Semáforo: malabares o vender tintos | Bajo | Habilidades mejorables: a mejor show, más plata. Montos aleatorios de 500 a 10.000 COP |
| Cuidar carros | Bajo | Trabajo "legal", ingreso estable |
| Robar retrovisores, rines, tuercas, tapas | Alto | Minijuego con el tiempo del semáforo; si fallas pierdes vida o te detienen. Se venden en "repuestos" |
| Asaltar transeúntes | Muy alto | Botín aleatorio; alto impacto en reputación y policía |
| Mercado entre habitantes (barril) | Medio | Primero entre NPC; entre jugadores después del lanzamiento (multijugador) |

### 4.3 Sustancias y dependencia (P1, ver `tono-y-responsabilidad.md`)
- Sustancias **ficticias** con nombres propios del juego, no marcas ni nombres reales.
- Cada una da un efecto temporal (estamina, ver reciclables resaltados, aguantar el frío) a cambio de un costo: riesgo de enfermedad, **abstinencia** que reduce la estamina y otras desventajas, y deterioro de la salud.
- **La calidad depende del precio**: lo barato dura menos y enferma más (propuesta de un comentario).
- Hay NPC que venden y una estructura de distribución (un "jíbaro" ficticio).
- **Camino de salida**: un centro de rehabilitación como misión. Se puede completar o escapar ("escapar del anexo").

### 4.4 Cambuche y construcción (P0, la idea más votada)
- Piezas modulares de cartón, madera, lámina, tela y lona.
- Ubicaciones: debajo de un puente, junto a un caño o en un lote.
- El cambuche es el **punto de guardado** y tiene su propio almacenamiento (cada bolso o mochila amplía el inventario).
- Mejoras: cama, techo impermeable, candado, fogón.

### 4.5 Progresión (P1)
- **Árbol de talentos**: resistencias (dejar de enfermarse por ciertas acciones), labia para pedir, sigilo para robar, oficio para reciclar más rápido.
- **Reputación** en tres ejes: con los otros habitantes, con los comerciantes y con la policía.

### 4.6 Ciudad viva (P1)
- Ciudad generada con el **PCG Framework** de UE5 sobre un *layout* diseñado a mano, no puramente aleatorio. En el prototipo original la generación aleatoria produjo un laberinto.
- **Policía**: patrullas aleatorias que pueden quitarte el inventario y la vida.
- **Otros habitantes**: territorio, peleas y eventos en los que le roban a NPC comunes.
- **Zona de comercio informal** (pedido tipo "Bronx"): un barrio ficticio con reglas propias.
- **Carros en movimiento** con semáforos funcionales.

### 4.7 Compañía (P2)
- **Mascota** (perro callejero) con habilidades: alerta de policía, encontrar basura, compañía que sube el ánimo.

## 5. Cámara y control
- Tercera persona por defecto; primera persona opcional (fue pedida).
- Combate cuerpo a cuerpo sencillo y con peso (P1). No es un juego de combate.

## 6. Modelo de negocio (propuesta)
- **Pago único en Steam**, sin anuncios (pedido con 12 ❤).
- Contenido cosmético o expansiones después del lanzamiento. Nada de "pagar para ganar".
- Posible **Early Access** a partir de la Beta para financiar el desarrollo con la comunidad.

## 7. Fuera de alcance por ahora
- Port a Roblox: sus normas comunitarias no permiten esta temática (el propio creador lo dijo).
- "Juego de paro nacional": otro proyecto.
- Versión móvil con gráficos ultra: no es viable con este nivel visual.
