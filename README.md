# 🏠 home-moodboard

Recopilatorio de ideas de decoración para el piso nuevo, organizado por estancias.
Web estática (HTML + CSS + JS, sin dependencias ni build). Funciona en móvil y en PC.

## Ver en local

El contenido se carga con `fetch`, así que hay que abrirlo con un servidor local
(no vale con doble clic al archivo). Dentro de la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Y abre **http://localhost:8000**.

## Estructura

```
home-moodboard/
├── index.html          → armazón de la app
├── css/                → estilos (tokens, layout, componentes, modales)
├── js/                 → lógica (data, render, modals, app) en ES modules
├── data/ideas.json     → FUENTE DE LA VERDAD: estancias + ideas
└── media/<estancia>/   → capturas y fotos, organizadas por estancia
```

## Cómo añadir una idea

1. En el móvil, haz **captura** del reel/foto que te gusta.
2. Abre la web → botón **＋ Añadir idea**: elige estancia, sube la captura,
   pega el enlace original y escribe una nota.
3. Al guardar, la idea aparece al instante (borrador local). Para que quede
   en el repo y puedas compartirla, la web te ofrece:
   - **Descargar imagen** → guárdala en `media/<estancia>/`.
   - **Descargar `ideas.json`** → reemplaza `data/ideas.json`.
4. Sube los cambios:
   ```bash
   git add . && git commit -m "Nueva idea" && git push
   ```

## Compartir con la decoradora o una IA

Botón **Brief**: genera un resumen estructurado (por estancia o de todo el
piso) listo para **copiar y pegar en una IA**, o **imprimir/PDF** para enseñarlo.

## Datos (ideas.json)

Cada idea:

| campo | qué es |
|---|---|
| `room` | id de la estancia (ver `rooms`) |
| `title` | nombre corto |
| `notes` | por qué te gusta / detalles |
| `media` | rutas de imagen dentro de `media/` |
| `source` | `instagram` · `tiktok` · `pinterest` · `web` · `propia` |
| `url` | enlace al post original |
| `video` | enlace al vídeo en Drive (si lo descargas) |
| `productUrl` | enlace a la tienda / producto |
| `priceEst`, `shop` | opcionales (precio estimado y tienda/marca) |
| `discarded` | `true` si está archivada (sección "Ideas descartadas") |
