# Build Flow: mvp-inicial (APK paso a paso)

> Spanish user-facing checklist. Mirror of this file will be
> created at `app/README-paquete.md` by `sdd-apply`. Write in
> plain Spanish, no jargon.

---

## Paso 1 — Probar en local

1. Abrí Chrome (o Edge) en tu computadora.
2. Hacé doble clic en el archivo `app/index.html` de la carpeta
   del proyecto. Se abre en el navegador con la dirección
   `file:///…/app/index.html`.
3. Verificá que ves el dashboard con los totales en `0,00 €` y el
   mensaje "Aún no hay movimientos este mes".
4. Pulsá "Añadir transacción", completá importe `25,50` y
   descripción `Supermercado`, elegí la categoría `Comida` y
   guardá. La transacción aparece en la lista y el total de gastos
   pasa a `25,50 €` al instante.
5. Recargá la pestaña con `F5`. La transacción sigue ahí.
6. Pulsá el botón borrar de la transacción, confirmá, y
   desaparecen la fila y el total.

## Paso 2 — Subir a Netlify Drop

1. Andá a **<https://app.netlify.com/drop>** (no necesitás
   cuenta).
2. Abrí el Explorador de Windows en la carpeta del proyecto y
   arrastrá la **carpeta `app/` completa** a la zona grande que
   dice "Drag and drop your site output folder here".
3. En unos segundos Netlify te muestra una URL pública del estilo
   `https://nombre-largo-12345.netlify.app`. **Copiá esa URL** (la
   vas a necesitar en el paso 3).

## Paso 3 — Generar el APK con PWABuilder

1. Andá a **<https://www.pwabuilder.com/reportcard>** en otra
   pestaña.
2. Pegá la URL de Netlify en el campo "Enter the URL of your
   PWA…" y pulsá **Start**.
3. Cuando termine el análisis, en la columna **Android** (o
   **Package For Stores → Android**) pulsá el botón **Generate**.
4. En la pantalla de opciones, dejá los valores por defecto
   (paquete Android, firmado en modo debug) y pulsá **Generate
   Package** o **Download**. Se descarga un archivo `.apk` (por
   ejemplo `app-debug.apk`).
5. **Guardá ese `.apk` en una carpeta que recuerdes**, por
   ejemplo el Escritorio.

## Paso 4 — Pasar el APK al móvil e instalar

1. Conectá el móvil Android a la computadora con un cable USB.
2. En el móvil, deslizá la barra de notificaciones y pulsá la
   notificación "USB: cargando este dispositivo". Cambiá la
   opción a **Transferir archivos (MTP)**.
3. En el Explorador de Windows, abrí **Este equipo → Nombre del
   móvil → Almacenamiento interno** (o la carpeta que aparezca).
4. Copiá el archivo `.apk` desde tu Escritorio a esa carpeta del
   móvil.
5. Desconectá el cable.
6. En el móvil, abrí la app **Archivos** (la del sistema, no
   Chrome). Andá a la carpeta donde copiaste el `.apk`.
7. Pulsá el archivo `.apk`. El sistema te va a pedir permiso para
   instalar apps de orígenes desconocidos:
   - Ajustes → Apps → Acceso especial → Instalar apps
     desconocidas (o "Instalar aplicaciones de orígenes
     desconocidos", según la versión de Android).
   - Buscá la app **Archivos** (o **Chrome**, según por dónde
     abras) y activá el permiso **Permitir orígenes
     desconocidos**.
   - Volvé atrás y pulsá **Instalar**.
8. Cuando termine, pulsá **Abrir**. La app arranca a pantalla
   completa, sin barra de Chrome, con un icono propio (el "€"
   azul que generamos).
9. Activá el **modo avión** del móvil para probar que la app
   sigue funcionando sin internet: abrila desde el icono, tenés
   que ver el dashboard y poder añadir y borrar movimientos.

## Paso 5 — Limpieza opcional

1. Si querés borrar la URL temporal de Netlify Drop, andá a
   **<https://app.netlify.com/>**, entrá a la sección de tus
   deploys y pulsá **Delete site**. El `.apk` ya descargado sigue
   funcionando aunque borres la URL — todo vive en el móvil.
