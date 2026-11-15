# MISIÓN RESCATE: ESPEJO MARCIANO — Chispa

Aventura educativa para exploradores de 8 a 13 años. React + Next.js App Router + Tailwind + Canvas, con Pixel Art isométrico 2:1. Se juega con un toque/clic o con WASD/flechas.

## Abrir solo en este equipo

La versión compilada está en `out/`. El servidor de esta entrega escucha en **http://127.0.0.1:3001**. No se publicó ni se subió a Sites.

Para abrirla de nuevo si el servidor se cierra, desde esta carpeta:

```sh
python3 -m http.server 3001 --bind 127.0.0.1 --directory out
```

El enlace funciona en esta computadora mientras el servidor está abierto. Para desarrollar:

```sh
npm install
npm run dev
```

## La aventura

1. Toca un pin del mapa: Santa Cruz, Uyuni (departamento de Potosí) o La Paz. Ese clic inicia un prólogo automático de **20 segundos**.
2. **0–10 s:** explora libremente tu isla y escucha la bienvenida de Chispa. NASA POWER se consulta en segundo plano.
3. **10–16 s:** aparece sola la alerta, suena una sirena retro y toda la escena se tiñe de rojo. Todavía no cambia el terreno.
4. **16–20 s:** la misma isla se transforma por losetas en Marte; las casas se vuelven módulos y el personaje recibe su traje. La alerta continúa.
5. **Segundo 20:** se apagan la sirena, el filtro y la sacudida; comienza **Sol 1** directamente. No hay botones de avance ni pregunta del Sol 0. Si POWER no respondió, se usa el respaldo real y se empieza igualmente.
6. Sigue los puntos y la flecha. Tocar un edificio hace caminar al personaje a su puerta y abre su misión.
7. Día 1: agua en verde y luz al 45%; pulsa **Empezar a cultivar**. Dura 25 segundos; cerrar la ventana pausa el cultivo.
8. Día 8: en el Refugio elige hasta dos ayudas por ronda. Limpiar paneles lleva al astronauta afuera. Son tres rondas.
9. Día 18: acerca las líneas a la franja verde y conecta. DONKI aporta el aviso real; tienes diez segundos para el escudo de fantasía.
10. Día 28: toca el Garaje, elige camino y conduce el rover. **Avanzar 5 km** recorre un tramo; también funcionan las flechas y el toque. Enciende el calor cuando haga frío.
11. Cada misión jugable termina con una pregunta y una medalla. La última respuesta abre el diploma educativo.

La alarma empieza con sonido activado; se puede silenciar con el botón de música. La elección de ciudad desbloquea Web Audio mediante el gesto del jugador. Al reiniciar se cancela el reloj anterior; elegir otra ciudad inicia veinte segundos nuevos. El movimiento reducido conserva los mismos tiempos, con filtro rojo estático y sin sacudidas.

El cambio de polos y la pérdida repentina de atmósfera son **ficción de esta historia**. La pantalla lo señala durante el prólogo y la alerta. El botón Info NASA explica la diferencia con los cambios reales de los polos magnéticos y enlaza a la explicación de NASA.

## Chispa y el modo sin frustración

Chispa tiene tres expresiones: feliz, alerta y celebración. Explica con dibujos los gases y el agua, el polvo que tapa la luz, los «estornudos» del Sol y el esfuerzo de subir una cuesta en bicicleta.

No hay derrota inmediata por falta de recursos. Si las reservas bajan demasiado, Chispa pausa los cálculos y relojes y explica la causa. El jugador pulsa un control claro para corregirlo. Chispa aporta una **reserva didáctica ilimitada**, identificada en pantalla, y espera a que el niño decida seguir. Se conservan la ciudad, el avance y las medallas.

Si se agota el reloj del escudo, Chispa pausa y ofrece otra oportunidad, sin aplicar el impacto solar. Al reanudar se ajustan los tiempos para que la pausa no reste segundos. Las preguntas tampoco consumen reservas.

Cada misión entrega una medalla al acertar: **Científico del Agua**, **Héroe Solar**, **Cazador de Señales** y **Piloto Marciano**. El álbum de arriba permite ver las ganadas y las pendientes. Reiniciar limpia toda la expedición.

El diploma es del juego y **no está emitido ni acreditado por NASA**. No se pide el nombre ni ningún dato personal del niño.

## Mapas geográficos y arte

Los nueve departamentos del mapa inicial y las siluetas de las tres islas proceden de [GeoBolivia / geoBoundaries BOL ADM1](https://www.geoboundaries.org/api/current/gbOpen/BOL/ADM1/), límites representados en 2015, dominio público. Se incluyeron localmente; no se descargan al jugar.

Archivo original simplificado: `geoBoundaries-BOL-ADM1_simplified.geojson`, versión GitHub `9469f09`. Se simplificó más con Ramer–Douglas–Peucker (0.022 grados); se usa el polígono principal de cada departamento y se omiten islotes pequeños. Los contornos se normalizan conservando su proporción geográfica y luego se proyectan en isométrico. La escala de casas y personajes es deliberadamente de juguete.

`lib/bolivia-data.json` guarda esos contornos y el plano de cada isla. `lib/regions.ts` y `lib/isometric.ts` restringen movimiento y rutas a casillas interiores conectadas. Se prueban las cinco puertas y todas las casillas transitables en los tres departamentos.

La roca flotante, casas, palmeras, montañas, sal, astronauta, plantas, módulos y rover se dibujan por código. Chispa y las medallas son SVG pixelados. No se usan imágenes externas. Todos los Canvas desactivan el suavizado y el CSS global aplica `image-rendering: pixelated`. La interfaz usa Pixelify Sans en negrita y títulos Silkscreen desde Google Fonts, con respaldo local monoespaciado. El cuerpo parte de 18–20 px, los diálogos usan 22 px y los títulos pixelados nunca bajan de 14 px. Los textos Canvas llevan un contorno negro de 4 px.

## Datos reales de NASA

- **POWER:** conserva las coordenadas y la consulta del 15/01/2024 para temperatura y luz solar. Es un registro histórico consultado en la API, no el tiempo actual. Si tarda más de 6.5 segundos o falla, se usan los registros reales incluidos en `public/data/`.
- **DONKI:** conserva la consulta de llamaradas de los últimos 30 días con `DEMO_KEY`, validación de fecha/clase, cancelación y espera máxima de cinco segundos. Sin respuesta válida se usa la llamarada real **X8.7 del 14/05/2024 a las 16:51 UTC, región 13664**. La pantalla distingue consulta NASA y dato real guardado.
- Los datos no provocan peligros reales ni representan un pronóstico. El escudo, el viaje de la isla y los consumos son reglas del juego.
- Sabatier en la ISS combina hidrógeno y CO₂ para recuperar agua; **no quema el oxígeno de la cabina**. La nota NASA aclara la diferencia con la máquina simplificada del juego.
- El acceso único **[?] Info NASA** muestra el dato de cada misión, con enlaces a Sabatier, Opportunity, Pathfinder, DONKI y Jezero.

`PRESERVACION_LOGICA.json` documenta la comparación de las funciones de consulta, URL y parser con la versión anterior. El proveedor sí cambia para pausar temporizadores durante la ayuda; los bloques de consulta POWER/DONKI permanecen iguales.

## Verificación

```sh
npm run typecheck
npm test
npm run build
```

Pruebas de rutas dentro de las islas, cálculos de recursos, API y respaldos, preguntas sin castigo, medallas sin duplicación, pausas y recuperación, reintento de escudo, seis recorridos completos, diploma y reinicio. El detalle de la revisión visual está en `VERIFICACION.txt`.

## Interfaz de lectura clara

Los objetivos, recursos y diálogos tienen fondos oscuros casi sólidos y bordes de 4 px. El suelo usa colores planos y menos adornos; no hay líneas CRT ni parpadeo habitual. Solo las emergencias conservan la alerta visual. El objetivo está fijo al desplazarse. El nombre de un edificio aparece si es la misión, si estás cerca o si lo señalas.

Un único acceso **[?] Info NASA** reúne los datos, las fuentes y los detalles opcionales. Desde allí se despliegan Cómo jugar y Mi viaje. En las misiones, abrir esta información pausa el cultivo y permite regresar al panel. Las fórmulas, los recursos y las conexiones NASA conservan su implementación.
