# Cómo contribuir a Rebusque

Gracias por querer aportar. Las ideas de la comunidad son la razón de varias funciones del juego, así que todo aporte cuenta: código, ideas, reportes de errores o pruebas en tu celular.

## Antes de empezar

- Lee el [código de conducta](CODE_OF_CONDUCT.md).
- Lee [tono y responsabilidad](01-vision/tono-y-responsabilidad.md). Rebusque retrata una población real y vulnerable, y el humor nunca va contra el personaje.
- Si es un cambio grande, abre primero un [issue](https://github.com/JuanRojasDev/rebusque/issues/new/choose) para conversarlo.

## Reglas del contenido

1. **Todo el arte, audio y texto debe ser propio** o tener una licencia que permita usarlo, y hay que decir de dónde salió en el PR.
2. **Nada copiado de otros juegos**: ni modelos, ni sprites, ni sonidos, ni interfaces. Inspirarse en un estilo está bien; copiar assets no.
3. **Sustancias ficticias:** el juego no nombra drogas reales y siempre muestra consecuencias.
4. **Sin datos personales ni secretos** en el código: nada de llaves, tokens ni correos.

## Flujo de trabajo

1. Haz un fork (o una rama, si tienes acceso) a partir de `main`.
2. Instala y corre el juego:
   ```bash
   cd juego-web
   npm ci --ignore-scripts
   npm run dev
   ```
3. Haz tus cambios en una rama con un nombre que lo explique, por ejemplo `feat/semaforo-malabares` o `fix/costal-lleno`.
4. Prueba en **celular y PC**. Las herramientas de desarrollador del navegador tienen modo dispositivo.
5. Corre el build antes de subir:
   ```bash
   npm run build
   ```
6. Abre un pull request hacia `main` y llena la plantilla.

El workflow **Verificación** debe quedar en verde: instala las dependencias, las audita, compila y revisa que no haya secretos. Cuando se fusiona, el juego se publica solo.

## Estilo del código

- JavaScript moderno con módulos ES, sin frameworks de UI.
- Nombres y comentarios en español, como el resto del proyecto.
- Comenta el **por qué**, no el qué.
- Nada de dependencias nuevas sin conversarlo antes: el juego tiene que seguir siendo liviano.

## Reportar errores

Abre un issue con la plantilla **Reportar un error**: qué pasó, qué esperabas, cómo reproducirlo y en qué dispositivo y navegador.

## Licencia de los aportes

Al enviar un pull request aceptas que tu código se publique bajo la [licencia MIT](LICENSE) del proyecto. El nombre, el logo y los documentos de diseño siguen reservados (ver [MARCA.md](MARCA.md)).
