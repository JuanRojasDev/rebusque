# ADR-0001: Elección de motor

**Estado:** Propuesto · **Fecha:** 2026-10-16

## Contexto
Se pide gráficos "ultra realistas", personalización de personaje y entorno, juego en línea y Blender para el arte. El prototipo de referencia (JS en el navegador) quedó corto en realismo y rendimiento, y su comunidad lo señaló.

## Opciones evaluadas

| Criterio | **Unreal Engine 5** | Unity 6 (HDRP) | Godot 4 | Web (Three.js / Babylon) |
|----------|---------------------|----------------|---------|--------------------------|
| Fotorrealismo de serie | ★★★★★ Lumen y Nanite | ★★★★ | ★★★ | ★★ |
| Humanos realistas | ★★★★★ MetaHuman nativo | ★★★ | ★★ | ★ |
| Personalización de personaje | Mutable (plugin oficial) | Terceros | Manual | Manual |
| Ciudad procedural | PCG Framework oficial | Terceros | Manual | Manual |
| Multijugador | Replicación nativa y servidores dedicados; plugin oficial de **Amazon GameLift Servers** | Netcode para GameObjects; GameLift | Básico | Propio |
| Integración con Blender | Plugin "Send to Unreal" | FBX | Muy buena (glTF) | glTF |
| Costo | Gratis hasta 1 M USD de ingresos brutos por producto, luego 5 % de regalías ⚠️ **verificar** | Suscripción por puesto según ingresos | Libre (MIT) | Libre |
| Requisitos para el jugador | Altos | Medios y altos | Bajos | Bajos |
| Curva de aprendizaje | Alta (C++ y Blueprints) | Media (C#) | Baja (GDScript o C#) | Media |

## Decisión
**Unreal Engine 5.7 o la versión estable más reciente al iniciar**, con C++ para los sistemas centrales (economía, guardado, red) y Blueprints para el contenido y la iteración de diseño.

## Consecuencias
- ✅ El techo visual pedido es alcanzable sin construir el *render* a mano.
- ✅ MetaHuman, Mutable, PCG, Motion Matching y GameLift encajan en un solo ecosistema.
- ⚠️ Los requisitos mínimos del jugador son altos: presets bajos obligatorios y pruebas en hardware de gama media.
- ⚠️ Los proyectos pesan mucho: control de versiones con Git LFS (equipo pequeño) o Perforce (más de 3 artistas).
- ⚠️ Hay que aprender C++ de Unreal o contratar a alguien con experiencia.
- ❌ No hay versión web jugable directa. Para una demo en navegador existe Pixel Streaming (streaming desde GPU en la nube), pero cuesta por usuario y por hora; solo para demos puntuales.

## Herramientas complementarias

| Uso | Herramienta |
|-----|-------------|
| Control de versiones | Git + Git LFS en GitHub (inicio) → Perforce P4 (gratis hasta 5 usuarios ⚠️ **verificar**) en EC2 si crece el equipo |
| IDE | Visual Studio 2022 o Rider (este último tiene licencia gratis para uso no comercial ⚠️ **verificar**) |
| Agente de código | Claude Code u otro agente sobre el repo, con revisión humana de cada cambio |
| Gestión | GitHub Projects o Jira con la checklist de `05-produccion/` |
| CI de builds | GitHub Actions con un runner Windows propio o un EC2 Windows (las builds de UE no caben en los runners gratuitos) |
