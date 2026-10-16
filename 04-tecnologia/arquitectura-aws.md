# Arquitectura en AWS

**Cuenta y perfil:** perfil CLI `Inventio`, región por defecto `us-east-1` (Virginia del Norte).
*Por seguridad, este documento no incluye el ID de la cuenta.*

> Desde Colombia, `us-east-1` suele tener buena latencia y tiene todos los servicios. Para servidores de juego cerca de los jugadores, evaluar la **Local Zone de Bogotá** si Amazon GameLift Servers la soporta para el tipo de instancia elegido. ⚠️ **verificar**

## Fases

### Fase A: "Online" sin multijugador (vertical slice → Alfa)
Lo que pide la comunidad primero es que **la partida y el cambuche no se pierdan**. Se resuelve sin servidores de juego.

```
Cliente UE5 (PC)
   │  HTTPS (JWT)
   ▼
Amazon Cognito ──── cuentas, login (o Epic Online Services / Steam como proveedor de identidad)
   │
API Gateway (HTTP API) ── AWS WAF (límite de peticiones)
   │
AWS Lambda (Node.js o Python)
   ├── DynamoDB ── perfil, guardado (cambuche, inventario, stats), versiones de guardado
   ├── S3 ──────── guardados grandes (snapshots comprimidos)
   └── Kinesis Data Firehose → S3 → Athena ── telemetría (qué sistemas se juegan, dónde muere la gente)

CloudFront + S3 ── parches de contenido, noticias del menú principal, configuración remota (balance de precios)
```

| Servicio | Para qué | Costo inicial esperado |
|----------|----------|------------------------|
| Cognito | Cuentas | Capa gratuita para pocos usuarios activos ⚠️ **verificar** |
| API Gateway + Lambda | API de guardado y perfil | Centavos al mes a escala de pruebas |
| DynamoDB (on-demand) | Guardados | Centavos a pocos dólares |
| S3 + CloudFront | Contenido y snapshots | Pocos dólares |
| Firehose + Athena | Telemetría | Pocos dólares |

**Modelo de datos de guardado (DynamoDB, tabla única):**
| PK | SK | Datos |
|----|----|-------|
| `PLAYER#<sub>` | `PROFILE` | nombre, apariencia (IDs de Mutable), origen, ajustes |
| `PLAYER#<sub>` | `SAVE#<slot>#<versión>` | stats, inventario, cambuche (lista de piezas), talentos, reputación, hora del juego |
| `PLAYER#<sub>` | `SAVE#<slot>#LATEST` | puntero a la última versión (escrito con condición para evitar que un cliente viejo sobrescriba) |

### Fase B: Multijugador (después del lanzamiento o en Early Access)
Para el **mercado entre jugadores**, el territorio y las peleas entre habitantes.

```
Cliente UE5 ── FlexMatch (matchmaking) ── Amazon GameLift Servers
                                            ├── flota administrada en EC2 o contenedores (servidor dedicado UE5 Linux)
                                            └── Anywhere (pruebas en el PC local)
Mercado entre jugadores: Lambda + transacciones de DynamoDB (con validación en el servidor, nunca confiar en el cliente)
```
- El **plugin oficial de Amazon GameLift Servers para Unreal** trae el SDK del servidor, mapas de prueba y plantillas de CloudFormation para flotas EC2 o de contenedores. Las flotas **Anywhere** permiten probar con el servidor corriendo en tu propio equipo.

### Fase C: Producción de arte
- **AWS Deadline Cloud** para renders de Blender (soporta 4.2, 4.5, 5.0 y 5.1 en flotas administradas por el servicio), pagando por uso.
- Opcional: un servidor **Perforce** en EC2 con EBS y backups a S3 cuando el equipo crezca.

## Infraestructura como código
- **AWS CDK (TypeScript)** en la carpeta `infra/` del repositorio, con un *stack* por fase: `SaveApiStack`, `TelemetryStack`, `ContentCdnStack` y después `GameServerStack`.
- Entornos separados por stage: `dev` y `prod`. Idealmente cuentas separadas con AWS Organizations.

## Seguridad (P0, antes de crear recursos)
- [ ] Confirmar que el usuario IAM del perfil `Inventio` tiene **MFA** y permisos mínimos. Migrar a **IAM Identity Center (SSO)** con `aws configure sso --profile Inventio` y dejar las llaves de acceso de larga duración.
- [ ] **AWS Budgets** con alertas al 50, 80 y 100 % de un tope mensual, antes de cualquier recurso.
- [ ] Ninguna credencial de AWS dentro del cliente del juego. El cliente solo habla con API Gateway usando el JWT de Cognito.
- [ ] Validar en el servidor toda operación económica (precios, inventario, comercio).
- [ ] Cifrado en reposo en DynamoDB y S3, y bloqueo de acceso público en los buckets.
- [ ] CloudTrail activo y alarmas en CloudWatch.

## Comandos de arranque (cuando se apruebe)

```bash
aws sts get-caller-identity --profile Inventio
```
```bash
aws budgets describe-budgets --account-id <ID> --profile Inventio
```
```bash
npx aws-cdk@2 bootstrap aws://<ID>/us-east-1 --profile Inventio
```
*(Ningún recurso se ha creado todavía. Esto es solo la guía.)*
