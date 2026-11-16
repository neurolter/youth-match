# Páginas de ejemplo (fixtures)

Fragmentos REALES de cada fuente, capturados el 16 de noviembre de 2026 y recortados
(sin anuncios, estilos ni scripts) para que las pruebas sean rápidas. Sirven para
detectar cuándo un sitio cambia su estructura: si una prueba del parser falla tras
actualizar un fixture, hay que ajustar el conector.

- `youthop-conferences.html` es la única excepción: youthop.com respondía error 524
  (servidor caído) el día de la captura, así que contiene la estructura esperada de
  WordPress y debe reemplazarse por una captura real cuando el sitio vuelva.
- En `carolina-list.html`, la segunda fila (plazo abierto) es una variante de la
  fila real: el día de la captura los 212 programas tenían el plazo cerrado.
