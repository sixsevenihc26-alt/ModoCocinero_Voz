# Modo Cocinero

**Modo Cocinero** es una aplicación web diseñada para ayudar a las personas a seguir recetas de cocina paso a paso, utilizando controles manuales y comandos de voz.

La aplicación permite consultar recetas, navegar entre instrucciones, repetir pasos, controlar temporizadores y adaptar la experiencia visual según las necesidades del usuario.

## Funcionalidades principales

- Explorar recetas por categorías.
- Buscar recetas por nombre o ingrediente.
- Consultar ingredientes e información nutricional.
- Seguir una receta paso a paso.
- Avanzar, retroceder y repetir instrucciones.
- Leer instrucciones en voz alta.
- Controlar la aplicación mediante comandos de voz.
- Iniciar, pausar, cancelar y consultar temporizadores.
- Configurar el volumen y la velocidad de lectura.
- Activar modo oscuro, alto contraste y diferentes tamaños de texto.
- Adaptarse a pantallas de celular y computadora.

## Comandos de voz disponibles

Durante el Modo Cocinero se pueden utilizar órdenes como:

- “Siguiente paso”.
- “Paso anterior”.
- “Repetir instrucción”.
- “Leer el paso”.
- “Iniciar temporizador”.
- “Temporizador de cinco minutos”.
- “Pausar temporizador”.
- “Cancelar temporizador”.
- “¿Cuánto tiempo falta?”.
- “Ayuda”.

## Tecnologías utilizadas

- HTML5.
- CSS3.
- JavaScript.
- Web Speech API.
- Speech Recognition API.
- Speech Synthesis API.
- GitHub Pages.

## Estructura del proyecto

```text
modo-cocinero/
├── index.html
├── README.md
└── .gitignore
```

Actualmente, la estructura, los estilos y la lógica de la aplicación se encuentran dentro de `index.html`.

## Cómo ejecutar el proyecto

### Opción 1: abrir el archivo directamente

1. Descarga o clona el repositorio.
2. Abre la carpeta del proyecto.
3. Haz doble clic en `index.html`.

### Opción 2: usar Visual Studio Code

1. Abre el proyecto en Visual Studio Code.
2. Instala la extensión **Live Server**.
3. Haz clic derecho sobre `index.html`.
4. Selecciona **Open with Live Server**.

## Publicación con GitHub Pages

1. Verifica que el archivo principal se llame `index.html`.
2. Entra al repositorio en GitHub.
3. Abre **Settings**.
4. Entra a **Pages**.
5. En **Source**, selecciona **Deploy from a branch**.
6. Selecciona la rama `main`.
7. Selecciona la carpeta `/(root)`.
8. Guarda los cambios.

Después de unos minutos, GitHub mostrará la dirección pública de la aplicación.

## Compatibilidad del reconocimiento de voz

El reconocimiento de voz depende de las funciones disponibles en el navegador.

Para obtener mejores resultados se recomienda utilizar:

- Google Chrome.
- Microsoft Edge.
- Un micrófono habilitado.
- Una conexión estable a Internet.

El usuario debe conceder permiso al navegador para utilizar el micrófono.

## Limitaciones actuales

- Las recetas están guardadas directamente en el código.
- Las configuraciones pueden perderse al actualizar la página si no se utiliza almacenamiento local.
- Solo se utiliza un temporizador activo por vez.
- El reconocimiento de voz puede variar según el navegador.
- La adaptación automática de cantidades todavía puede requerir implementación adicional.
- No se utiliza una base de datos ni un servidor.

## Mejoras futuras

- Adaptar ingredientes según el número de porciones.
- Guardar preferencias mediante `localStorage`.
- Incorporar varios temporizadores con nombres.
- Agregar favoritos e historial de recetas.
- Permitir crear recetas personalizadas.
- Incorporar el comando “Explicar este paso”.
- Mejorar el funcionamiento sin conexión.
- Separar el proyecto en archivos HTML, CSS y JavaScript.
- Agregar pruebas automáticas.
- Implementar una base de datos.

## Autores

Proyecto desarrollado por el equipo **Devline**.

Integrantes:

- Nombre del integrante 1.
- Nombre del integrante 2.
- Nombre del integrante 3.
- Nombre del integrante 4.

## Licencia

Este proyecto fue desarrollado con fines educativos.
