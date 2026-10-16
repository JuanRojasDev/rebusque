# REA en el proyecto: verificación y calidad de builds

**REA** es un kit de **ingeniería inversa y análisis** de artefactos: binarios nativos, ejecutables de Windows, bundles web, Electron, bases SQLite, capturas de red y depuración en tiempo de ejecución. **No sirve para crear el juego**: lo crean UE5 y Blender. Su papel aquí es **auditar lo que nosotros mismos compilamos y publicamos**.

## Usos concretos

| Momento | Uso de REA | Qué detecta |
|---------|-----------|-------------|
| Cada build de release | Inspeccionar el `.exe` y los módulos empaquetados (layout PE, recursos, firma) | Build sin firmar, símbolos de depuración filtrados, versión equivocada |
| Antes de publicar | Buscar cadenas en el binario y en los `.pak` | **Llaves, URLs internas o tokens que se colaron en el cliente** |
| Entre versiones | Comparar dos builds | Comportamiento que cambió sin querer (regresiones) |
| Guardado local | Inspeccionar el archivo o la base de guardado | Formato estable, sin datos sensibles, fácil de migrar |
| Online | Capturar el tráfico del propio cliente | Que solo vaya a nuestros endpoints, sobre HTTPS, sin datos personales de más |
| Launcher o web complementaria | Analizar el bundle web | Dependencias pesadas, código muerto, secretos en el JS |
| Anti-trampas básico | Depuración en tiempo de ejecución de nuestro propio cliente | Qué tan fácil es alterar dinero o inventario, para reforzar la validación en el servidor |

## Límite claro
- ❌ **No** usar REA para extraer modelos, texturas, código o datos de juegos de terceros (*Schedule I*, GTA, etc.). Viola sus licencias (EULA) y contamina la propiedad intelectual de nuestro proyecto.
- ✅ Solo sobre artefactos que **nosotros** producimos o tenemos derecho a analizar.

## Integración propuesta
- Un paso de "auditoría de release" en la checklist (`05-produccion/checklist.md`, sección Calidad) que corre los análisis de cadenas y de comparación antes de subir a Steam.
