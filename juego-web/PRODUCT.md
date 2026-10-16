# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (celular y PC; controles táctiles + teclado/mouse)

## Stack

Three.js + Vite (confirmado por el usuario, 2026-10-16). Build estático publicado en AWS S3 + CloudFront, perfil CLI `Inventio`.

## Users

Jugadores que llegan desde TikTok, en su mayoría desde el celular y de Colombia: público joven y adulto que ya conoce el humor de la calle y la jerga paisa/cucuteña. Abren un link, quieren jugar en segundos, sin instalar nada.

## Product Purpose

**Rebusque** es un simulador de supervivencia urbana: arrancas sin nada en una cuadra nocturna y lluviosa de una ciudad colombiana ficticia, reciclas, vendes, comes, construyes tu cambuche y duermes para guardar. Esta primera versión (vertical slice) prueba que el ciclo completo es divertido y se ve espectacular en el navegador.

Éxito: que alguien que viene de TikTok entienda qué hacer en menos de 30 segundos y complete un ciclo entero (reciclar → vender → comer → construir → dormir/guardar).

## Positioning

Lo pidió la comunidad del devlog original (cambuche + guardado fue lo más votado) y se ve como ningún juego web del género: noche, lluvia, asfalto mojado y luces de sodio.

## Voice

Español colombiano, cercano y con humor, sin burlarse del personaje (ver `../01-vision/tono-y-responsabilidad.md`). Montos en pesos colombianos (COP).

## Constraints

- Tiene que correr en celulares de gama media → presets gráficos y escalado de resolución.
- v1 sin sustancias ni robo (quedan para la P1 del GDD).
- Guardado en localStorage (en la nube, más adelante).
- Ciudad, marcas y personas ficticias.
