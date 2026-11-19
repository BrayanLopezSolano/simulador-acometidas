# Simulador de acometidas

Minijuego para practicar el examen práctico del INFOTEP (República Dominicana) sobre **acometida eléctrica aérea** y **acometida soterrada**. Está pensado para iPhone en vertical.

- Toca una pieza en la bandeja y luego toca dónde va en el dibujo.
- **Práctica:** con pistas y explicaciones. **Examen:** sin pistas, con nota y lista de errores.
- **Identificar piezas**, **Repaso rápido** y **Videos de apoyo**.
- Es un solo archivo, `index.html`, sin librerías. Funciona sin internet, salvo los videos.

## ⚠ Aviso de exactitud

- No se encontró en internet una norma dominicana con medidas para acometidas. **Por eso la app no muestra ninguna medida** (alturas, profundidades ni calibres): todas dicen "Confirmar con instructor".
- Cada paso lleva una etiqueta: **Confirmado** (con fuente), **Práctica común** (sin norma dominicana confirmada) o **Confirmar con instructor**.
- Solo los pasos de seguridad (las 5 reglas de oro) están confirmados con fuente (INSST).
- Si algo no coincide con lo que enseña el instructor, manda lo que diga el instructor.

## Cómo corregir el contenido (para instructores)

Abre `index.html` y busca `const DATOS = {`. Ahí están las piezas, las zonas, los pasos y los mensajes de error, con comentarios en español. No hace falta tocar la parte de abajo (la lógica). Si escribes mal un identificador, la app muestra en pantalla qué está mal.

## Pruebas

```
node tests/prueba.js
```

Usa Playwright con Chromium y el perfil "iPhone 13". Prueba el recorrido completo, los errores, la nota, el tamaño de los botones y de la letra, y el uso sin red.
