# Ahorrio

App personal para llevar el control de gastos e ingresos. Funciona sin conexión y se puede instalar como APK en Android.

## Cómo probar en local

1. Abrí Chrome o Brave en tu computadora.
2. Hacé doble clic en `app/index.html`, o abrí una terminal en la carpeta `app/` y ejecutá:
   ```powershell
   python -m http.server 8000
   ```
   y entrá a `http://localhost:8000`.

## Qué hace

- Añadir, editar y borrar gastos e ingresos
- Categorías por defecto + crear/borrar categorías propias
- Selector de mes con navegación por flechas
- Gráfico circular de gastos por categoría
- Presupuestos por categoría con barra de progreso
- Historial mensual con gráfico de barras y ahorro acumulado
- Exportar/Importar datos (CSV y JSON)
- Funciona offline (PWA con service worker)

## Generar el APK

Seguí el checklist en `openspec/changes/mvp-inicial/build-flow.md`.

## Qué NO hace esta versión

- No sincroniza entre dispositivos
- No tiene login ni multi-usuario
- No tiene notificaciones push
- No importa movimientos bancarios automáticamente
- No tiene gráficos avanzados (líneas de tendencia, comparativas)
- No tiene modo oscuro
