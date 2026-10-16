# Checklist de lo que falta por completar

Estado: ⬜ pendiente · 🟨 en curso · ✅ hecho. Prioridad: **P0** vertical slice · **P1** Alfa · **P2** después del lanzamiento.
La misma lista está en `checklist.csv` para importarla en Google Sheets (Archivo → Importar).

## 1. Decisiones del equipo (antes de producir)

| ID | Tarea | Prioridad | Responsable | Estado | Terminado cuando |
|----|-------|-----------|-------------|--------|------------------|
| D-01 | Confirmar nombre definitivo y buscar marca en la SIC | P0 | | ⬜ | Nombre libre y registrado o en trámite |
| D-02 | Decidir: proyecto propio vs. colaborar con el creador original | P0 | | ⬜ | Decisión escrita en `06-legal-y-publicacion/` |
| D-03 | Aprobar el motor (ADR-0001: UE5) | P0 | | ⬜ | ADR en estado "Aceptado" |
| D-04 | Definir equipo y roles (programación, arte 3D, diseño, audio) | P0 | | ⬜ | Tabla de roles con personas |
| D-05 | Definir tope de presupuesto mensual (AWS y herramientas) | P0 | | ⬜ | Cifra aprobada |
| D-06 | Validar el tono con una organización local | P1 | | ⬜ | Reunión hecha y notas guardadas |

## 2. Entorno y herramientas

| ID | Tarea | Prioridad | Responsable | Estado | Terminado cuando |
|----|-------|-----------|-------------|--------|------------------|
| E-01 | Instalar Blender 4.5 LTS o 5.x | P0 | | ⬜ | Abre y exporta FBX |
| E-02 | Instalar Epic Games Launcher y UE 5.7+ | P0 | | ⬜ | Proyecto C++ vacío compila |
| E-03 | Instalar Visual Studio 2022 (cargas de C++ y juegos) o Rider | P0 | | ⬜ | Depura el proyecto |
| E-04 | Crear el repositorio con Git LFS y el `.gitattributes` de UE | P0 | | ⬜ | Primer push con un .uasset |
| E-05 | Activar los plugins: MetaHuman, Mutable, PCG, Send to Unreal | P0 | | ⬜ | Plugins cargan sin error |
| E-06 | Instalar RealityScan (celular o PC) para fotogrametría | P1 | | ⬜ | Primer escaneo importado |
| E-07 | Evaluar una GPU con 12–16 GB de VRAM | P1 | | ⬜ | Decisión de compra |

## 3. AWS (perfil `Inventio`)

| ID | Tarea | Prioridad | Responsable | Estado | Terminado cuando |
|----|-------|-----------|-------------|--------|------------------|
| A-01 | Activar MFA y revisar los permisos del usuario IAM | P0 | | ⬜ | MFA activo y política de mínimo privilegio |
| A-02 | Crear alertas de AWS Budgets (50/80/100 %) | P0 | | ⬜ | Alerta de prueba recibida |
| A-03 | Migrar el perfil a IAM Identity Center (SSO) | P1 | | ⬜ | `aws sso login --profile Inventio` funciona |
| A-04 | Hacer bootstrap de CDK en `us-east-1` | P0 | | ⬜ | Stack CDKToolkit creado |
| A-05 | Crear el stack de la API de guardado (Cognito, API Gateway, Lambda, DynamoDB) | P0 | | ⬜ | El cliente guarda y carga el cambuche en la nube |
| A-06 | Crear el stack de telemetría (Firehose → S3 → Athena) | P1 | | ⬜ | Consulta de muertes por zona funciona |
| A-07 | Crear el stack de contenido (S3 + CloudFront) para configuración remota | P1 | | ⬜ | Cambiar un precio sin parchar el cliente |
| A-08 | Hacer un prototipo con flota GameLift Anywhere y servidor dedicado UE5 | P2 | | ⬜ | Dos clientes en la misma sesión |
| A-09 | Configurar una cola de Deadline Cloud para renders de Blender | P2 | | ⬜ | Render de prueba descargado |
| A-10 | Activar CloudTrail y alarmas de CloudWatch | P0 | | ⬜ | Trail activo |

## 4. Arte y realismo

| ID | Tarea | Prioridad | Responsable | Estado | Terminado cuando |
|----|-------|-----------|-------------|--------|------------------|
| R-01 | Moodboard y guía de estilo (paleta, luz, suciedad) | P0 | | ⬜ | Documento aprobado |
| R-02 | Sesión de fotos de referencia en Cúcuta y Medellín (sin personas identificables) | P0 | | ⬜ | Más de 300 fotos organizadas |
| R-03 | Blockout de una cuadra para el vertical slice | P0 | | ⬜ | Se recorre en el editor |
| R-04 | Escanear 5–10 props urbanos por fotogrametría | P1 | | ⬜ | Importados como Nanite |
| R-05 | Modelar en Blender los props propios: cambuche (kit modular), zorra, barril, bolsas de basura | P0 | | ⬜ | Kit modular encaja en la rejilla |
| R-06 | Materiales con capas de suciedad y humedad (Substrate) | P0 | | ⬜ | Material maestro con parámetros |
| R-07 | Crear 10 MetaHumans base para el catálogo | P0 | | ⬜ | 10 personajes en el editor |
| R-08 | Montar el Customizable Object de Mutable (cabeza, cuerpo, pelo, 3 capas de ropa) | P1 | | ⬜ | El jugador cambia la apariencia en el juego |
| R-09 | Deterioro visual ligado a higiene, salud y lluvia | P1 | | ⬜ | Los cambios se ven al variar las estadísticas |
| R-10 | Lluvia, charcos y humo con Niagara | P1 | | ⬜ | Lluvia afecta superficies y personaje |
| R-11 | Animación de locomoción con Motion Matching | P1 | | ⬜ | Caminar, correr y agacharse fluidos |
| R-12 | Presets gráficos de bajo a ultra con DLSS, TSR y FSR | P1 | | ⬜ | 60 fps en el preset bajo en la GPU de referencia |

## 5. Sistemas de juego

| ID | Tarea | Prioridad | Responsable | Estado | Terminado cuando |
|----|-------|-----------|-------------|--------|------------------|
| G-01 | Necesidades: hambre, sueño, salud, higiene, ánimo | P0 | | ⬜ | Las cinco suben y bajan y afectan el juego |
| G-02 | Ciclo día/noche con efectos en la economía | P0 | | ⬜ | La limosna cambia según la hora |
| G-03 | Recolección y venta de reciclaje (recicladora, chatarrería) | P0 | | ⬜ | Precio por material, venta funcional |
| G-04 | Botín aleatorio en bolsas con tablas de probabilidad | P0 | | ⬜ | Tabla configurable por datos |
| G-05 | Cambuche modular con almacenamiento | P0 | | ⬜ | Construir, guardar y recargar idéntico |
| G-06 | Guardado local con versiones y migración | P0 | | ⬜ | Un guardado viejo carga en una build nueva |
| G-07 | Guardado en la nube (A-05) | P0 | | ⬜ | Cambiar de PC y conservar la partida |
| G-08 | Lluvia con refugio y cartón | P0 | | ⬜ | Mojarse tiene consecuencia |
| G-09 | Crafteo en la zorra (incluye quemar caucho para sacar cobre) | P1 | | ⬜ | 10 recetas |
| G-10 | Tienda y economía de compra | P1 | | ⬜ | Gastar el dinero en mejoras |
| G-11 | Semáforo: malabares o tintos con habilidad mejorable | P1 | | ⬜ | Minijuego con progresión |
| G-12 | Cuidar carros | P1 | | ⬜ | Ingreso estable por turno |
| G-13 | Carros con semáforos y robo de retrovisores con tiempo | P1 | | ⬜ | Si fallas, hay penalización |
| G-14 | Policía con patrullas aleatorias y decomiso | P1 | | ⬜ | Puede quitar el inventario |
| G-15 | Sustancias ficticias, abstinencia y calidad según precio | P1 | | ⬜ | Efecto corto, costo largo, revisado contra el tono |
| G-16 | Camino de rehabilitación (completar o escapar) | P1 | | ⬜ | Misión jugable de principio a fin |
| G-17 | Árbol de talentos de 4 ramas | P1 | | ⬜ | Los talentos cambian los números de verdad |
| G-18 | Inventario por bolsos y peso | P1 | | ⬜ | Mochilas amplían la capacidad |
| G-19 | NPC habitantes con territorio y eventos | P1 | | ⬜ | Disputas y robos emergentes |
| G-20 | Mercado de barril con NPC | P1 | | ⬜ | Comprar y vender a otros habitantes |
| G-21 | Historia de origen elegible | P1 | | ⬜ | 4 orígenes con diálogos distintos |
| G-22 | Mascota | P2 | | ⬜ | Perro con 3 habilidades |
| G-23 | Mercado entre jugadores (multijugador) | P2 | | ⬜ | Comercio validado en el servidor |
| G-24 | Cámara en primera persona opcional | P2 | | ⬜ | Cambio de cámara sin bugs |

## 6. Calidad, seguridad y publicación

| ID | Tarea | Prioridad | Responsable | Estado | Terminado cuando |
|----|-------|-----------|-------------|--------|------------------|
| Q-01 | Pipeline de build automatizada (runner Windows) | P1 | | ⬜ | Build nocturna empaquetada |
| Q-02 | Auditoría de release con REA (cadenas, secretos, firma, comparación de builds) | P1 | | ⬜ | Informe sin hallazgos críticos |
| Q-03 | Validación en el servidor de la economía (anti-trampas) | P1 | | ⬜ | Editar la memoria del cliente no da dinero |
| Q-04 | Pruebas de rendimiento en hardware de gama media | P1 | | ⬜ | Informe de fps por preset |
| Q-05 | Política de privacidad (Ley 1581 de 2012, habeas data) | P1 | | ⬜ | Publicada y enlazada en el juego |
| Q-06 | Clasificación por edad (cuestionario de contenido de Steam / IARC) | P1 | | ⬜ | Clasificación 18+ obtenida |
| Q-07 | Página de Steam (Steam Direct) | P1 | | ⬜ | Página "Próximamente" con wishlist |
| Q-08 | Plan de devlogs en TikTok, YouTube y Steam | P0 | | ⬜ | Calendario de 8 semanas |
| Q-09 | Programa de playtesters y Discord | P1 | | ⬜ | 50 testers activos |
| Q-10 | Votación de funciones para la comunidad | P1 | | ⬜ | Primera votación cerrada |
