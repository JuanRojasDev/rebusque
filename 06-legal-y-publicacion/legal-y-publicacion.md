# Legal y publicación

*Esto es orientación de producto, no asesoría legal. Validar con un abogado de propiedad intelectual y de tecnología en Colombia antes del lanzamiento.*

## 1. Propiedad intelectual

| Tema | Situación | Acción |
|------|-----------|--------|
| La idea del "simulador de habitante de calle" | Las ideas y las mecánicas de juego en general **no** se protegen; la expresión concreta (código, arte, nombre, voz) sí | Nombre, arte, código y guion 100 % propios |
| El creador original (@babanamkevalamm) | Proyecto público en desarrollo, con un repo que prometió abrir a colaboradores | **Decidir (D-02)**: (a) proyecto independiente con crédito de inspiración, o (b) proponer una colaboración formal con acuerdo escrito |
| Comentarios de su comunidad | Usados como investigación de mercado (ideas) | No copiar textos en el juego; agradecer a la comunidad |
| Si se colabora en su repo | Depende de la licencia que publique | Revisar la licencia antes de reutilizar cualquier línea |
| Marca "Rebusque" u otro nombre | No verificada | Búsqueda de antecedentes en la **SIC** (Superintendencia de Industria y Comercio) y en Steam |
| Assets de Fab o Megascans | Licencia por asset (Fab Standard License, o Epic Content License para los legados) | Registrar cada asset con su licencia en una tabla |
| MetaHuman | Incluido en la licencia de Unreal | Respetar los términos de uso de Epic |
| Música, fuentes y sonidos | Cada uno tiene su licencia | Solo material con licencia comercial |
| Ingeniería inversa | Solo sobre artefactos propios (ver `04-tecnologia/rea-y-calidad.md`) | Nunca extraer assets de otros juegos |
| Lugares, marcas y personas reales | Riesgo de difamación o marca | Ciudad ficticia, marcas inventadas, sin personas reales. Excluir referencias a personas reales que aparecen en los comentarios |

## 2. Clasificación por edad y tiendas

| Plataforma | Situación para esta temática | Nota |
|------------|------------------------------|------|
| **Steam (PC)** | Viable con el cuestionario de contenido maduro (drogas, violencia, lenguaje) | Plataforma de lanzamiento |
| Consolas | Requieren clasificación ESRB/PEGI (vía IARC) y certificación del fabricante | Evaluar después de la Beta; las sustancias ficticias ayudan |
| Google Play / App Store | Políticas restrictivas sobre la promoción de drogas ⚠️ **verificar** las políticas vigentes | Fuera de alcance por ahora |
| Roblox | Sus normas comunitarias lo impiden (el propio creador lo comentó) | Descartado |

Clasificación objetivo: **18+ / Mature**, con control de edad en el inicio.

## 3. Datos personales (cuentas y guardado en la nube)

- Colombia: **Ley 1581 de 2012** (protección de datos o habeas data) y sus decretos reglamentarios. Se necesita una política de tratamiento, consentimiento explícito y un canal para ejercer derechos.
- Recolectar lo mínimo: ID de cuenta, guardado y telemetría anónima. Nada de ubicación ni contactos.
- Si hay jugadores de la UE: se suma el RGPD.

## 4. Empresa y monetización

- Publicar a nombre de una persona jurídica (SAS) para firmar con Steam y separar responsabilidades.
- Formulario fiscal de Steam (W-8BEN-E para una entidad extranjera) ⚠️ **verificar** con un contador.
- Modelo: pago único sin anuncios, cosméticos y expansiones posteriores. Si se dona un porcentaje a una organización social, ponerlo por escrito.
