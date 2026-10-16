# Roadmap

Las duraciones suponen un **equipo pequeño (2–4 personas)** con al menos una persona de arte 3D. Si trabaja una sola persona, hay que multiplicarlas por 2 o 3. Responde con honestidad a la pregunta de la comunidad "¿un mes para que sea jugable?": un prototipo, sí; algo realista y estable, no.

| Fase | Duración estimada | Meta | Salida |
|------|-------------------|------|--------|
| **0. Preproducción** | 3–4 semanas | Decisiones D-01 a D-05, entorno listo, guía de estilo, prueba de pipeline (1 prop de Blender → UE5 y 1 MetaHuman) | GDD v1, ADR aceptado, repo y AWS seguros |
| **1. Vertical slice** | 2–3 meses | **Una cuadra** realista con lluvia y noche, ciclo completo (reciclar → vender → craftear → cambuche → dormir y guardar), guardado local y en la nube | Build jugable de 15 minutos y video para redes |
| **2. Alfa** | 4–6 meses | Todos los sistemas P1, barrio completo con PCG, policía, NPC, sustancias con consecuencias, talentos, Mutable | Build para 50 playtesters |
| **3. Beta / Early Access** | 3–4 meses | Pulido, rendimiento en gama media, localización (español de Colombia → español neutro → inglés), página de Steam | Lanzamiento en Early Access |
| **4. Online social** | Después del lanzamiento | GameLift: mercado entre jugadores, territorio y eventos compartidos | Actualización multijugador |

## Hitos de comunicación
- Semana 1: anuncio y primer devlog ("de JS a Unreal: así se ve el realismo").
- En cada sprint: un devlog corto con la función que votó la comunidad.
- Fin del vertical slice: trailer de prueba y apertura de la wishlist en Steam.

## Definición de "terminado" para un sistema
1. Funciona en una build empaquetada, no solo en el editor.
2. Se guarda, se carga y migra entre versiones.
3. Tiene telemetría básica (uso y fallos).
4. Se probó contra el documento de tono.
5. No baja del objetivo de fps del preset bajo.
