# Pipeline de realismo: Blender → Unreal Engine 5

Objetivo visual: **fotorrealismo urbano sucio** (asfalto mojado, grafiti, cartón húmedo, luz de sodio de noche) a 60 fps en una GPU de gama media con DLSS o TSR.

## 1. Qué necesitamos para que se vea realista

| Capa | Herramienta | Por qué |
|------|-------------|---------|
| Iluminación global | **Lumen** (UE5) | Rebotes de luz reales: debajo de un puente, en callejones, con faroles |
| Geometría densa | **Nanite** | Escombros, basura y bordes de andén con millones de polígonos sin costo de LOD manual |
| Sombras | **Virtual Shadow Maps** | Sombras nítidas de rejas, cables y hojas |
| Materiales | **Substrate** (UE 5.x) | Capas de suciedad, humedad y óxido sobre el material base |
| Personajes | **MetaHuman** + Mutable | Rostros y cuerpos fotorrealistas y personalizables (ver `personalizacion.md`) |
| Calles reales | **Fotogrametría** (RealityScan de Epic, gratis) | Escanear andenes, muros y canecas reales de Cúcuta y Medellín |
| Props propios | **Blender** | Cambuche, zorra de reciclaje, barriles, carretas: lo que no existe en las librerías |
| Librerías | **Fab** (marketplace de Epic) | Relleno: vegetación, basura genérica, mobiliario urbano. ⚠️ **verificar**: Megascans dejó de ser gratis desde 2025; se compra por asset o por suscripción |
| Ciudad | **PCG Framework** + World Partition | *Layout* a mano y relleno procedural (basura, carros parqueados, grafiti) |
| Clima | Niagara + materiales con "wetness" | Lluvia, charcos dinámicos, humo de caucho quemado |
| Animación | **Motion Matching** (Game Animation Sample de Epic) + Mixamo para prototipos + MetaHuman Animator para caras | Movimiento natural sin un equipo grande de animación |
| Ropa | Chaos Cloth | Ropa holgada y cobijas que se mueven |
| Audio | MetaSounds | Ciudad que suena: buses, perros, vendedores |
| Escalado | **DLSS 4** (RTX) / TSR / FSR | Imprescindible para "ultra" en hardware real |

## 2. Flujo de un asset (prop)

```
Referencia (foto propia en la calle)
  → Blender: blockout → modelado alto → retopología (o Nanite directo)
  → UVs → bake (normal, AO, curvatura) → texturizado
  → exportar FBX / glTF → importar en UE5 (plugin "Send to Unreal")
  → material instance con capas de suciedad → validar en la escena de prueba
  → commit al repositorio (Git LFS o Perforce)
```

**Texturizado:** Adobe Substance 3D Painter es el estándar de la industria (de pago, ⚠️ **verificar** el precio). Alternativas gratis: el texture paint de Blender, ArmorPaint o Material Maker.

## 3. Flujo de fotogrametría (calles reales)

1. Elegir 5 a 10 elementos icónicos: bordillo, muro con grafiti, caneca, poste, reja, cartón, colchón.
2. Fotografiar con luz de día nublado (sin sombras duras): 80 a 200 fotos por objeto con el celular.
3. Procesar en RealityScan, limpiar en Blender, hacer *de-lighting* de la textura e importar en UE5 como Nanite.
4. ⚠️ No fotografiar personas ni placas identificables. Pedir permiso en lugares privados.

## 4. Render para trailers y arte promocional

- Las cinemáticas se renderizan en UE5 con Movie Render Queue.
- Los renders de Blender (arte clave, *turnarounds*) pueden ir a **AWS Deadline Cloud**: render farm administrado que soporta Blender 4.2, 4.5, 5.0 y 5.1 en flotas administradas. Se paga por uso. Ver `04-tecnologia/arquitectura-aws.md`.

## 5. Hardware actual vs. recomendado

Equipo de desarrollo detectado: **Intel Core Ultra 7 265F · 32 GB de RAM · NVIDIA RTX 5060 Ti 8 GB**.

| Componente | Actual | Para producción de UE5 + MetaHuman | Nota |
|------------|--------|------------------------------------|------|
| GPU | RTX 5060 Ti **8 GB** | 12 a 16 GB de VRAM | 8 GB alcanza para el vertical slice. Para escenas grandes con Lumen y MetaHumans conviene más VRAM |
| RAM | 32 GB | 64 GB | Compilar shaders y *light builds* usa mucha memoria |
| Disco | — | NVMe de 1 TB o más, dedicado | UE5 más el proyecto superan fácil los 200 GB |
| Blender | **No instalado** | Blender 4.5 LTS o 5.x | `winget install BlenderFoundation.Blender` |

## 6. Presupuesto de rendimiento (objetivo)

| Preset | Resolución interna | Objetivo | GPU de referencia |
|--------|--------------------|----------|-------------------|
| Bajo | 720p → 1080p con escalado | 60 fps | GTX 1660 / RX 6600 |
| Alto | 1080p → 1440p | 60 fps | RTX 4060 / 5060 Ti |
| Ultra | 1440p → 4K con DLSS | 60 fps | RTX 4080 o superior |

Hay que medir desde el vertical slice. Si el preset bajo no corre, el mercado latinoamericano queda fuera.
