# Política de seguridad

## Reportar una vulnerabilidad

**No abras un issue público** para un problema de seguridad.

Repórtalo en privado desde la pestaña **Security** del repositorio → **Report a vulnerability** ([enlace directo](https://github.com/JuanRojasDev/rebusque/security/advisories/new)). Solo los mantenedores verán el reporte.

Incluye:

- qué encontraste y dónde (archivo, URL o paso del juego);
- cómo reproducirlo;
- qué impacto crees que tiene.

Respondemos dentro de **7 días**. Si se confirma, lo corregimos, publicamos el arreglo y te damos crédito en el aviso, salvo que prefieras quedar en el anonimato.

## Qué cubre

| Dentro del alcance | Fuera del alcance |
|---|---|
| El código de este repositorio | Trampas en tu propia partida (el guardado vive en tu navegador) |
| El sitio `rebusque.inventio.com.co` | Ataques de denegación de servicio o pruebas de carga |
| Los workflows de GitHub Actions | Ingeniería social a los mantenedores |
| Dependencias usadas por el juego | Problemas en servicios de terceros (GitHub, AWS) |

## Prácticas del proyecto

- El juego no tiene backend ni cuentas en la v0.1, y no guarda datos personales en servidores.
- El despliegue usa OIDC con credenciales temporales y un rol limitado al bucket y la distribución del juego. No hay llaves guardadas en GitHub.
- Las acciones de GitHub están fijadas por commit y las dependencias se instalan sin scripts.
- El sitio se sirve solo por HTTPS, con cabeceras de seguridad (HSTS, `nosniff`, protección contra iframes).
