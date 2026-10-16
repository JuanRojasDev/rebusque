# Presupuesto estimado y riesgos

## Costos de herramientas y servicios (orden de magnitud)

⚠️ **verificar** todos los precios en la fuente oficial antes de comprometerse. Son referencias para planear, no cotizaciones.

| Concepto | Costo | Cuándo |
|----------|-------|--------|
| Unreal Engine 5 | Gratis hasta 1 M USD de ingresos brutos por producto; 5 % de regalías por encima | Siempre |
| MetaHuman | Incluido en la licencia de UE | Siempre |
| Blender | Gratis (GPL) | Siempre |
| RealityScan | Gratis | Preproducción |
| Substance 3D Painter | Suscripción mensual (o alternativas gratuitas) | Si el equipo lo adopta |
| Assets de Fab | Variable por asset o suscripción | Relleno de escenario |
| Steam Direct | 100 USD por juego (recuperable tras ventas mínimas) | Antes de la Beta |
| AWS, fase A (serverless) | Desde centavos hasta unas decenas de USD al mes a escala de pruebas | Vertical slice → Alfa |
| AWS GameLift (multijugador) | Por hora de instancia, según el tipo y la región | Fase 4 |
| AWS Deadline Cloud | Por uso (minutos de render) | Trailers |
| GPU con 12–16 GB de VRAM | Compra única | Alfa |
| Música y efectos de sonido | Bibliotecas con licencia o un compositor | Alfa |

**Herramienta clave:** [AWS Pricing Calculator](https://calculator.aws/) para la fase A con 1.000 y 10.000 jugadores activos al mes.

## Riesgos principales

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|--------|-------|---------|------------|
| 1 | **Alcance infinito**: la comunidad propone funciones cada día | Alta | Alto | Votaciones con cupo por sprint; todo lo nuevo entra como P2 por defecto |
| 2 | **Cuello de botella de arte 3D** ("sin artista 3D es un Renault 4") | Alta | Alto | Contratar o asociar a una persona de arte desde la fase 0; fotogrametría y Fab para el relleno |
| 3 | **Rendimiento** en la GPU del jugador promedio latinoamericano | Media | Alto | Presets bajos desde el inicio y pruebas en gama media |
| 4 | **Rechazo o restricción en tiendas** por contenido de drogas | Media | Alto | PC/Steam primero, sustancias ficticias, clasificación 18+; consolas y móvil se evalúan después |
| 5 | **Reacción pública** por burla a una población vulnerable | Media | Alto | Documento de tono, alianza con una organización, camino de recuperación |
| 6 | **Conflicto de propiedad intelectual** con el creador original | Baja–Media | Medio | Nombre, assets y código propios; considerar colaboración (ver legal) |
| 7 | **Costos de AWS** que se disparan | Baja | Medio | Budgets con alertas, serverless primero, nada de GameLift hasta tener jugadores |
| 8 | **Credenciales filtradas** (en el repo o en el cliente) | Media | Alto | SSO, sin llaves en el cliente, escaneo de secretos en CI, auditoría con REA |
| 9 | **Guardados corruptos** o perdidos | Media | Alto | Versionado de guardados, escritura condicional, snapshots en S3 |
| 10 | Dependencia de capas gratuitas de IA | Media | Bajo | La IA es una ayuda, no el plan; el presupuesto la incluye |
