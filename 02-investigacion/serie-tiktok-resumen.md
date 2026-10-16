# Investigación: la serie original en TikTok

**Fuente:** @babanamkevalamm, serie de cinco *devlogs* "Simulador de habitantes de calle", publicada entre el 10 y el 15 de octubre de 2026.
**Reto del creador:** no pagar nada a empresas de IA; programar solo con los planes gratuitos de varias herramientas de IA.
**Stack del prototipo:** juego web en JavaScript con Node, sin persistencia (localStorage pendiente).

| Día | Fecha | Vistas | ❤ | Comentarios | Link |
|-----|-------|-------:|--:|------------:|------|
| 1 | 2026-10-10 | 19.600 | 500 | 19 | [video](https://www.tiktok.com/@babanamkevalamm/video/7694827392908446977) |
| 2 | 2026-10-11 | 142.300 | 5.384 | 88 | [video](https://www.tiktok.com/@babanamkevalamm/video/7695547031137438997) |
| 3 | 2026-10-12 | 20.900 | 969 | 36 | [video](https://www.tiktok.com/@babanamkevalamm/video/7695891315699256597) |
| 4 | 2026-10-13 | 21.200 | 1.161 | 45 | [video](https://www.tiktok.com/@babanamkevalamm/video/7696292038458871060) |
| 5 | 2026-10-15 | 11.700 | 698 | 57 | [video](https://www.tiktok.com/@babanamkevalamm/video/7696689365233306901) |

*Métricas tomadas el 2026-10-16.*

## Qué se construyó cada día (resumen)

1. **Día 1.** Intento de "app para mendigar" sobre Google Maps, hecha en un minuto con un chatbot. La API de Maps no conectó y casi nada funcionó. Idea base: desbloquear zonas, subirlas de nivel y comprar mejoras como un termo de tintos o un parlante.
2. **Día 2.** Arranque formal: visión artística, arquitectura en Node y lectura del código generado archivo por archivo. Cambió el cilindro de prueba por un personaje con gorra y agregó lluvia. Abrió el proyecto a colaboradores.
3. **Día 3.** Colisiones, bolsas de basura que se recolectan y venden, tesoros en la basura, sonido y un *roadmap* diario.
4. **Día 4.** Incorporó ideas de la comunidad: árbol de talentos, enfermedades, salud mental y cambuche. Hizo un generador de ciudad (quedó como un laberinto, luego lo corrigió) y la función de dormir. Faltan el guardado y subir el repositorio (problema de credenciales).
5. **Día 5.** Carros y robo de retrovisores, gripa y salud. El árbol de talentos y el crafteo están a medias. Le falta una tienda para gastar el dinero. Se le acabó el límite gratuito de la IA.

## Lecciones para nuestro proyecto

| Problema que tuvo | Cómo lo evitamos |
|-------------------|------------------|
| JS en el navegador no da realismo, y la comunidad lo criticó ("usar JavaScript para juegos…") | UE5 nativo en PC (ver `04-tecnologia/decision-de-motor.md`) |
| "Tiene la lógica pero sin artista 3D" | Pipeline de arte propio desde el día 1 (Blender, MetaHuman, fotogrametría) |
| Ciudad aleatoria con forma de laberinto | *Layout* hecho a mano más PCG para el relleno |
| Sin guardado: se pierde todo | Guardado local más guardado en la nube como P0 |
| Problemas con credenciales para subir el repo | Git LFS o Perforce desde el inicio; AWS con SSO o roles, sin llaves sueltas |
| Límites de las capas gratuitas de IA | Usar la IA como apoyo, con presupuesto definido. El diseño y el arte no dependen de ella |
| Funciones a medias que se acumulan | Checklist con definición de "terminado" por sistema (`05-produccion/checklist.md`) |

## Relación con el proyecto original

Esta es una propuesta **independiente** que toma la idea y lo que pidió su comunidad como investigación de mercado. No usamos su código, sus assets, su nombre ni su voz. El creador dijo que abriría el repositorio para colaboraciones; si conviene colaborar con él en vez de competir, se decide en `06-legal-y-publicacion/legal-y-publicacion.md`.
