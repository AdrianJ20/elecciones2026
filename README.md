# Elecciones San Martín 2026

Scaffold estático y sin dependencias para un futuro panel público de seguimiento electoral para residentes de San Martín, Perú. Esta primera entrega no muestra resultados electorales ni totales de candidaturas.

## Vista local

No hace falta instalar paquetes. Desde la raíz del proyecto, sirva los archivos estáticos con una herramienta local, por ejemplo:

```bash
python -m http.server 8000
```

Después visite `http://localhost:8000`. Al cargar, el panel solicita únicamente `public/data/latest.json` desde el mismo origen; el botón **Actualizar datos** vuelve a solicitar ese snapshot local. El navegador no consulta ONPE directamente.

## Actualizar el snapshot de ONPE

Requiere Node.js 18 o posterior y acceso de red:

```bash
npm run collect:onpe
```

El recolector consulta únicamente el endpoint oficial verificado de ONPE para el mapa de calor regional. Busca el registro cuyo `ubigeoNivel01` numérico es `210000` (San Martín), valida `porcentajeActasContabilizadas` y `actasContabilizadas`, y solo entonces escribe `public/data/latest.json`.

Si la respuesta es inválida, ambigua o la solicitud falla, el comando termina con error antes de reemplazar un snapshot válido que ya exista en ese mismo entorno. La escritura válida usa un archivo temporal y un reemplazo atómico. `public/data/latest.json` es un artefacto generado y está excluido de Git. Los runners limpios de Actions no conservan el snapshot de ejecuciones anteriores; una recolección fallida no crea datos de respaldo.

## Contrato de datos

El snapshot normalizado tiene esta forma:

```json
{
  "source": {
    "name": "ONPE",
    "url": "https://resultadoelectoral.onpe.gob.pe/presentacion-backend/resumen-general/mapa-calor?idAmbitoGeografico=1&idEleccion=1&tipoFiltro=ambito_geografico"
  },
  "retrievedAt": "2026-10-05T12:00:00.000Z",
  "officialUpdateState": "solo si ONPE lo entrega",
  "countProgress": {
    "ubigeoNivel01": 210000,
    "porcentajeActasContabilizadas": 18.851,
    "actasContabilizadas": 476
  },
  "candidateResults": {
    "status": "unavailable"
  }
}
```

`officialUpdateState` se omite cuando la respuesta oficial no incluye un estado reconocido. El contrato declara siempre `candidateResults.status` como `"unavailable"`; este proyecto no infiere, fabrica ni presenta votos o resultados de candidaturas.

## Compilar el sitio estático

```bash
npm run build
```

La compilación no requiere dependencias y recrea `dist/` desde cero. Publica únicamente `index.html`, los recursos requeridos en `assets/` y, si existe, `public/data/latest.json`. El snapshot opcional se analiza y valida con el mismo contrato de procedencia y métricas que usa el panel; un archivo JSON inválido o sin procedencia oficial detiene la compilación. También falla con un mensaje claro si falta el documento de entrada o un recurso estático requerido.

La ausencia de snapshot permite compilar y publicar el panel estático: muestra **Datos oficiales temporalmente no disponibles**, sin cifras ni fecha inventadas. Un snapshot presente pero inválido sigue deteniendo la compilación; no se ignora ni se sustituye por datos ficticios.

Para publicar métricas reales, es necesario obtener un snapshot válido mediante una recolección exitosa: ejecute primero `npm run collect:onpe` y después `npm run build`. La compilación no descarga datos ni reutiliza datos externos no validados. El botón **Actualizar datos** solo relee el archivo del sitio; no inicia una nueva recolección de ONPE.

## GitHub Pages

El flujo `.github/workflows/deploy-pages.yml` se ejecuta ante pushes a la rama predeterminada, ejecución manual y una programación cada seis horas. En cada ejecución, GitHub Actions intenta descargar y validar el snapshot de ONPE en el servidor. Solo el paso de recolección admite un fallo: conserva su resultado fallido y lo comunica con una advertencia y un resumen de Actions. Después ejecuta las pruebas, las comprobaciones y la compilación como requisitos obligatorios antes de subir `dist/` y desplegarlo.

Si ONPE no está disponible y no existe un snapshot, se permite publicar el panel sin métricas. No se conserva automáticamente el snapshot de un runner anterior. Si una recolección posterior tiene éxito, su snapshot verificado puede publicarse por el mismo flujo, sin solicitudes directas a ONPE desde el navegador, proxies ni bypasses.

Antes de usarlo, el repositorio debe estar en GitHub y tener Actions habilitado. Después de subir el flujo a la rama predeterminada, abra **Settings → Pages** y seleccione **GitHub Actions** como la fuente de Pages. La ejecución manual permite iniciar el mismo flujo desde la pestaña **Actions**. La recuperación descrita aquí aún requiere verificar una nueva ejecución remota y el sitio desplegado; las pruebas locales no demuestran una publicación exitosa.

## Comprobaciones

```bash
npm test
npm run check
npm run build
```

`npm test` verifica de forma determinista la validación y el formateo del snapshot, la interfaz sin datos, los fallos de red/JSON, la recuperación de una actualización y el contrato estructural del flujo (solo recolección tolerante, aviso de fallo y requisitos de publicación). No realiza solicitudes a ONPE ni ejecuta Actions. La comprobación estructural valida la sintaxis de los scripts y ejecuta un fixture local para el contrato normalizado, incluida una respuesta inválida.
