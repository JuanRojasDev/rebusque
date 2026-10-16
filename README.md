# REBUSQUE — Simulador de supervivencia urbana (nombre provisional)

**Estado:** Preproducción · **Versión del documento:** 0.1 (2026-10-16)
**Motor propuesto:** Unreal Engine 5.7+ · **Arte:** Blender + MetaHuman + fotogrametría
**Nube:** AWS (perfil CLI `Inventio`, región `us-east-1`)

---

## Juega la demo

**▶ https://d6yg5ju3l45gz.cloudfront.net** · funciona en celular y PC, sin instalar nada.

La demo web (`juego-web/`) es una vista isométrica de una cuadra con ciclo de día, atardecer y noche, lluvia y tráfico con semáforo. El ciclo es reciclar → vender → comer → armar el cambuche → dormir para guardar. Trae editor de personaje y mapa con GPS.

### Correrla en local

Requiere Node.js 20+.

```bash
cd juego-web
npm ci --ignore-scripts
npm run dev
```

Para publicarla: `npm run build` y luego `bash scripts/deploy-aws.sh` (S3 privado + CloudFront con OAC; ver `04-tecnologia/arquitectura-aws.md`).

### Stack

Three.js + Vite, sin backend: la partida se guarda en el `localStorage` del navegador. Todo el arte es procedural u original: no hay assets de terceros.

---

## Cómo leer esta carpeta

| # | Carpeta | Qué hay | Empieza por |
|---|---------|---------|-------------|
| 01 | `01-vision/` | Concepto, pilares, sistemas de juego, tono | `GDD.md` |
| 02 | `02-investigacion/` | Resumen de los 5 videos y lo que pidió la comunidad. Las transcripciones y los comentarios crudos no se publican, porque son contenido de terceros | `voz-de-la-comunidad.md` |
| 03 | `03-arte-y-realismo/` | Pipeline Blender → UE5, realismo, personalización | `pipeline-realismo.md` |
| 04 | `04-tecnologia/` | Elección de motor, arquitectura AWS, uso de REA | `decision-de-motor.md` |
| 05 | `05-produccion/` | Roadmap, **checklist**, presupuesto y riesgos | `checklist.md` |
| 06 | `06-legal-y-publicacion/` | Propiedad intelectual, clasificación por edad, tiendas | `legal-y-publicacion.md` |

## Resumen en un minuto

1. **El juego.** Sobrevives en la calle de una ciudad colombiana: hambre, sueño, higiene, salud, ánimo y dependencia. Haces rebusque (reciclaje, chatarrería, semáforo, cuidar carros), construyes y personalizas tu **cambuche** y te mueves en una ciudad viva, con lluvia, noche, policía y otros habitantes.
2. **Lo que pide la gente.** Lo más votado es **cambuche + guardar partida** (56 ❤). Le siguen una **economía de sustancias con consecuencias reales** (35 ❤) y el **síndrome de abstinencia** (14 ❤). Hay muchas ideas de economía callejera: cobre, retrovisores, chatarrería, semáforo. Ver `02-investigacion/voz-de-la-comunidad.md`.
3. **El realismo.** UE5 (Lumen, Nanite, MetaHuman, PCG) más assets propios modelados en Blender y calles reales escaneadas con fotogrametría. La serie original fracasó por intentar el realismo en JavaScript y sin un artista 3D.
4. **Lo online.** Primero: cuentas, guardado en la nube del cambuche, telemetría y contenido descargable, todo *serverless* en AWS. Después: multijugador con mercado entre jugadores sobre Amazon GameLift Servers.
5. **Primer hito.** Un *vertical slice* de una cuadra realista con el ciclo completo: reciclar → vender → craftear → mejorar el cambuche → dormir y guardar.

## Convenciones

- Prioridades: **P0** = imprescindible para el vertical slice · **P1** = Alfa · **P2** = después del lanzamiento.
- Todo lo marcado con ⚠️ **verificar** es un dato que cambia rápido (precios, licencias, versiones) y hay que confirmarlo en la fuente oficial antes de decidir.
- Las decisiones técnicas se registran como ADR en `04-tecnologia/`.
