# Personalización

Hay tres capas: **quién eres** (personaje), **dónde vives** (cambuche) y **cómo juegas** (talentos y equipo). Todo se guarda localmente y en la nube.

## 1. Personaje

| Elemento | Tecnología | Detalle |
|----------|-----------|---------|
| Cara y cuerpo base | **MetaHuman Creator** (integrado en UE 5.7) | El equipo crea un catálogo de 20 a 40 MetaHumans base de distintas edades, etnias y contexturas |
| Editor dentro del juego | **Mutable** (plugin de UE) | El jugador mezcla cabezas, cuerpos, peinados, barbas y ropa. Mutable intercambia y combina mallas y materiales en tiempo real, pero **no** permite la edición facial fina de MetaHuman Creator: se eligen y combinan presets |
| Ropa por capas | Mutable + Chaos Cloth | Gorra, buzo, cobija, chanclas o tenis rotos; todo se consigue en la basura o comprando |
| Deterioro dinámico | Parámetros de material ligados a estadísticas | **Higiene** → mugre en piel y ropa · **Salud** → palidez y ojeras · **Lluvia** → ropa mojada · **Abstinencia** → sudor y temblor (animación) |
| Historia de origen | Datos (DataAssets) | Desplazamiento, migración, deudas, consumo o familia. Cambia diálogos, contactos iniciales y una habilidad inicial |

⚠️ **verificar** la licencia vigente de MetaHuman: hoy va incluida en la licencia estándar de Unreal (gratis por debajo de 1 M USD de ingresos y con términos estándar por encima). La generación de nuevos MetaHumans en Creator usa servicios en línea de Epic.

## 2. Cambuche (idea #1 de la comunidad)

- **Construcción modular** sobre una rejilla con *snapping*: piezas de pared, techo, piso, puerta y decoración.
- **Materiales:** cartón (barato, se moja), madera, lámina (resiste la lluvia, hace ruido), tela o lona, plástico.
- **Ubicaciones** con ventajas y desventajas: puente (seco, con policía), caño (escondido, húmedo), lote (amplio, con dueño).
- **Mobiliario funcional:** cama (recupera más sueño), fogón (cocinar), candado (protege el inventario), altar o fotos (sube el ánimo).
- **Persistencia:** cada pieza se guarda como datos (tipo, posición, estado). El guardado en la nube serializa este estado (ver `04-tecnologia/arquitectura-aws.md`).

## 3. Equipo y progresión

- **Bolsos y mochilas:** amplían el inventario por slots y peso (pedido de la comunidad).
- **Zorra de reciclaje:** mesa de crafteo móvil que se puede personalizar (pintura, llantas, capacidad).
- **Árbol de talentos:** cuatro ramas (Calle, Oficio, Labia, Sigilo).
- **Mascota (P2):** apariencia y nombre; aprende trucos.

## 4. Opciones de accesibilidad y de jugador

- Presets gráficos de bajo a ultra (clave para el mercado latinoamericano).
- Subtítulos con tamaño ajustable, remapeo de controles y modo daltónico.
- Interruptor de contenido: un "modo historia" con la economía de sustancias atenuada, para streamers y para públicos que la prefieran.
