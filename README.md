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

Si la respuesta es inválida, ambigua o la solicitud falla, el comando termina con error antes de reemplazar el último snapshot válido. La escritura válida usa un archivo temporal y un reemplazo atómico. `public/data/latest.json` es un artefacto generado y está excluido de Git.

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

Para publicar datos actuales, ejecute primero `npm run collect:onpe` y después `npm run build`. La compilación no descarga datos ni reutiliza datos externos no validados.

## GitHub Pages

El flujo `.github/workflows/deploy-pages.yml` está preparado para ejecutarse ante pushes a la rama predeterminada, ejecución manual y una programación cada seis horas. En cada ejecución, GitHub Actions descarga y valida el snapshot de ONPE en el servidor antes de ejecutar las pruebas, las comprobaciones y la compilación. Si la recolección falla, el flujo falla y no despliega el sitio; el artefacto publicado es `dist/`.

Antes de usarlo, el repositorio debe estar en GitHub y tener Actions habilitado. Después de subir el flujo a la rama predeterminada, abra **Settings → Pages** y seleccione **GitHub Actions** como la fuente de Pages. La ejecución manual permite iniciar el mismo flujo desde la pestaña **Actions**. Este repositorio no ejecuta ni afirma haber ejecutado ese flujo de forma remota.

## Comprobaciones

```bash
npm test
npm run check
npm run build
```

`npm test` verifica de forma determinista la validación y el formateo del snapshot que usa el navegador. La comprobación estructural valida la sintaxis de los scripts y ejecuta un fixture local para el contrato normalizado, incluida una respuesta inválida.
