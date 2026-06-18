# Proposal: mvp-inicial (v0.1 de Control de Gastos Mensuales)

## Why
Necesitás una app que funcione en tu Android para registrar tus gastos e ingresos del mes. Hoy todo está descrito en un PDF ejecutivo de 12 páginas con un alcance enorme (auth en la nube, biometría, presupuestos, multi-cuenta, multi-moneda, sincronización, gráficos, etc.). Vos pediste "poco a poco", así que este primer cambio entrega solo la parte mínima: una PWA instalable, en español, sin conexión, con lo indispensable para anotar y borrar movimientos del mes en curso y ver los totales al instante. El resto de las funciones del documento se hará en cambios posteriores, cada uno verificable por separado.

## What
Esta primera entrega produce una PWA instalable como APK en Android, con todo guardado en el propio dispositivo (sin servidor, sin cuenta). Concretamente:

- **Dashboard** con los totales del mes actual: ingresos, gastos y balance (formato `dd/MM/yyyy` y moneda `€`).
- **Selector de mes** (mes anterior y mes actual) para ver los totales y los movimientos de otro mes.
- **Añadir transacción**: formulario con tipo (gasto/ingreso), importe, descripción, fecha y categoría.
- **Listar transacciones** del mes seleccionado, ordenadas por fecha.
- **Borrar transacción** con confirmación previa.
- **Categorías por defecto hardcodeadas** en el código: Comida, Transporte, Ocio, Compras, Alquiler, Ahorro, Sueldo, Otros (gastos e ingresos). Sin editor de categorías en la UI.
- **Persistencia local** con `localStorage`. Los datos sobreviven a recargas, cierre del navegador y reinicio del móvil.
- **Service Worker** para que la app abra sin conexión después de la primera carga.
- **Web App Manifest** (icono, nombre, colores) para que Chrome ofrezca "Instalar app" y para que el APK abra a pantalla completa.
- **Empaquetado APK** mediante PWABuilder (online y gratuito), alimentado con una URL temporal de Netlify Drop.
- **Interfaz 100 % en es-ES**: textos, fechas, moneda y separador decimal con coma.

## Out of Scope (v0.1)
Las siguientes funciones del PDF quedan explícitamente fuera de este cambio y se propondrán en su propio `proposal.md` cuando llegue el momento:

- Sincronización en la nube, backend, REST API, Firebase.
- Autenticación real (email + contraseña, OAuth, JWT).
- Bloqueo con PIN, contraseña o biometría.
- Cifrado local de los datos.
- Editor de categorías personalizadas en la UI (crear, renombrar, eliminar).
- Soporte multi-cuenta (Efectivo, Tarjeta, Cuenta bancaria).
- Multi-moneda y conversión de divisas.
- Edición de transacciones una vez creadas (solo se añaden y se borran).
- Importación o exportación CSV / JSON.
- Gráficos e informes (circular, barras, líneas, tendencias).
- Presupuestos mensuales por categoría o globales.
- Alertas y notificaciones push (umbrales de presupuesto, fin de mes, saldo negativo).
- Reseteo automático mensual (cambiar de mes es manual; los totales históricos se conservan mientras el usuario no borre `localStorage`).
- Transacciones recurrentes.
- Multi-usuario.
- iOS / iPhone (la PWA es instalable, pero el flujo de APK verificado es Android).
- Tests automatizados (la verificación es manual; los escenarios se listan en `Success Criteria`).

## Approach
PWA vanilla servida como ficheros estáticos (`index.html` + CSS + JS sin build step, sin framework, sin `package.json`). El usuario abre `app/index.html` directamente en Chrome para probar la lógica. Cuando la app funciona, arrastra la carpeta a Netlify Drop, copia la URL pública, la pega en PWABuilder y descarga un `.apk` firmado en modo debug. Ese `.apk` se pasa por USB al móvil y se instala activando una sola vez "Instalar apps de orígenes desconocidos". Todo el código vive en el repo; no hay backend, no hay base de datos remota, no hay cuenta de usuario.

## Impact
- **Superficie de código:** proyecto nuevo (greenfield). ~5–10 ficheros estáticos bajo `app/`: `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, carpeta `icons/` y un `README-paquete.md` con el paso a paso Netlify + PWABuilder.
- **Datos:** sin migración. `localStorage` arranca vacío; las categorías por defecto viven en el código (no se persisten).
- **Sistemas externos temporales:** Netlify Drop (URL pública efímera) y PWABuilder (compilación online del APK). El usuario activa una vez "Orígenes desconocidos" en su Android.
- **Reversibilidad:** alta. Todo el código está en el repo; no hay DB remota, ni auth, ni PII en la nube. Borrar `localStorage` desde DevTools o desinstalar el APK devuelve la app a fábrica.

## Success Criteria
1. Abrir `app/index.html` en Chrome muestra el dashboard con los totales del mes actual en `0,00 €` y el mensaje "Aún no hay movimientos este mes".
2. Pulsar "Añadir transacción", rellenar importe `25,50` y descripción `Supermercado`, guardar: aparece en la lista del mes y el total de gastos pasa a `25,50 €` al instante.
3. Cambiar el selector de mes al mes anterior: la lista y los totales reflejan ese mes (vacíos si no hay nada).
4. Pulsar el botón borrar de una transacción, confirmar: desaparece de la lista y los totales se recalculan.
5. Recargar la pestaña con F5: los movimientos siguen ahí (persistencia en `localStorage`).
6. En Chrome del móvil Android, abrir la PWA, instalar con "Añadir a pantalla de inicio": aparece un icono propio que abre la app a pantalla completa, sin barra de Chrome.
7. Subir la carpeta a Netlify Drop, copiar la URL, meterla en PWABuilder, descargar el `.apk`, pasarlo por USB al móvil, instalarlo (con "Orígenes desconocidos" activado): el icono abre la app a pantalla completa.
8. Activar modo avión en el móvil tras la primera instalación: la app sigue abriendo y las funciones siguen funcionando.

## Risks
- **PWABuilder exige una URL pública**, no acepta `file://`. *Mitigación:* se documenta el flujo Netlify Drop → PWABuilder en el README del paquete; es un paso manual de un minuto, sin coste.
- **Sin test runner**, la verificación es manual y depende del usuario no-developer. *Mitigación:* los `Success Criteria` de arriba son una checklist concreta; la fase `sdd-verify` los recorre con el usuario paso a paso.
- **`localStorage` tiene un tope de ~5 MB.** Para uso personal de un mes está más que sobrado, pero miles de transacciones históricas podrían llenarlo. *Mitigación:* documentado en el README del paquete; la migración a `IndexedDB` se propondrá en un cambio posterior si hace falta.
- **El usuario no tiene herramientas de desarrollo** y no puede abrir la consola del navegador si algo se rompe. *Mitigación:* HTML minimalista, textos descriptivos en pantalla, capturas en el README; los errores visibles se muestran en la propia UI, no solo en consola.
- **El APK de PWABuilder va firmado en modo debug**, no se puede publicar en Play Store. *Mitigación:* documentado y aceptable para uso personal; el usuario no va a distribuir la app.

## Open Questions
Ninguno — el alcance de v0.1 está claro y el resto del PDF queda como candidatos para cambios posteriores. Si durante la implementación surge una duda concreta (por ejemplo, el formato exacto del campo importe o el set inicial de categorías), se resolverá en la fase `sdd-spec`.
