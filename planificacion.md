# Secre — Asistente de escritorio por voz y texto — Planificación y contexto

> **Secre** es el nombre provisional; la identidad visual se define más adelante.

> **Para retomar en un chat nuevo:** pegá este archivo completo y escribí:
> "Este es el contexto de mi proyecto. Estamos en la **Fase X**. Continuemos desde ahí."
>
> Última actualización: 28 de octubre de 2026 · Estado actual: **planificación cerrada, preguntas abiertas respondidas; falta empezar la Fase 0/1**

---

## 1. Objetivo

Un asistente personal para PC (Windows) que se use **escribiendo o hablando**, que pueda:

1. **Conversar e investigar** (búsqueda web + síntesis con fuentes).
2. **Ejecutar acciones en la PC** (ej.: "Reproduce Nirvana en Spotify").
3. Vivir como una **isla minimalista en el borde superior de la pantalla**: invisible en reposo, aparece al invocarlo, y se suspende solo tras un tiempo sin uso.

El acceso amplio a la PC (automatización de interfaz) se deja **para el final**.

## 2. Restricciones y decisiones fijas

| Tema | Decisión |
|---|---|
| Hardware | i3-10100F (4 núcleos), RX 6600 (AMD, sin CUDA), 16 GB RAM |
| IA local | **No** usar Ollama ni modelos locales pesados (consumen demasiados recursos) |
| Filosofía | Lo pesado va a la nube; la PC solo graba audio, reproduce y ejecuta acciones |
| Origen del código | **Desarrollo desde cero.** Se descartó forkear Coucou |
| Plataforma | Solo PC (Windows 10/11) |
| Idioma | Español (voz argentina) |

### Sobre Coucou (proyecto de referencia)
- Repo: `github.com/louis-cfm/coucou` (compañero tipo "isla/notch"; en Windows usa Tauri 2).
- Código bajo **MIT**; nombre, personaje Mochi, ícono y sonidos son **todos los derechos reservados** del autor.
- **Regla:** solo tomamos la *idea* del comportamiento (se esconde en reposo, aparece con hover/atajo). **No copiamos código, nombre, personaje, sonidos ni diseño.** Si en algún momento se copiara código suyo, hay que conservar su aviso MIT en un `LICENSE`.

## 3. Concepto de comportamiento (máquina de estados)

| Estado | Qué ocurre | Micrófono | Consumo |
|---|---|---|---|
| **Dormido** | Invisible (o apenas un trazo en el borde) | Cerrado | Casi cero |
| **Despierto** | Aparece al **tocar la barra superior** (zona central) o desde la bandeja | Cerrado | Bajo |
| **Escuchando** | Graba lo que decís | Abierto | Medio |
| **Pensando** | Consulta al LLM / ejecuta herramientas | Cerrado | Bajo |
| **Hablando** | Reproduce la respuesta (TTS) | Cerrado | Bajo |
| **Suspensión** | Tras **5 min** sin uso (configurable) → vuelve a Dormido | Cerrado | |

- **Arranque manual:** un ejecutable (o acceso directo) que se abre cuando se quiere; al abrirlo queda activo. El **autoarranque con Windows** se deja como idea para más adelante.
- **Activación:** tocar/hacer clic en la barra superior. Para no tapar los botones de las ventanas (minimizar/cerrar), la zona sensible es solo el **centro del borde superior** (ancho acotado, p. ej. 200-300 px). Un atajo de teclado opcional puede servir de respaldo.
- El micrófono **nunca** está abierto fuera de "Escuchando" (privacidad y recursos).
- Entrada por texto y por voz conviven en la misma interfaz.

## 4. Stack elegido

| Pieza | Elección | Plan B | Notas |
|---|---|---|---|
| **Interfaz** | Tauri 2 (ventana transparente, siempre encima, sin robar foco) | Electron / pywebview | Liviano; control total del diseño |
| **Núcleo** | Python (asyncio) local, comunicado con la UI por WebSocket/HTTP local | Todo en Rust/TS | Mejores librerías de audio/IA |
| **LLM** | Claude Haiku 5.5 (`claude-haiku-5-5`) por API, con *tool use* | Gemini Flash (tier gratis, pero puede usar tus datos para mejorar modelos) | ~$0.10 / $0.50 por millón de tokens (in/out) hasta 100K tokens |
| **STT** | Groq `whisper-large-v3-turbo` | faster-whisper / whisper.cpp local con modelos chicos | ~$0.04/hora de audio; hay tier gratis con límites |
| **TTS** | `edge-tts` con `es-AR-ElenaNeural` / `es-AR-TomasNeural` | Piper local | edge-tts es gratis pero **no oficial** (puede romperse) |
| **Activación** | Toque en la barra superior (clic para hablar) en MVP; atajo de teclado opcional | openWakeWord (Fase 6) | **Porcupine descartado:** su tier gratis terminó el 30/06/2026 |
| **Búsqueda web** | Herramienta de búsqueda web de la API de Claude (a verificar en Fase 5) | Brave / Tavily | |
| **Secretos** | Windows Credential Manager (`keyring`) | `.env` fuera del repo | Nunca claves en el código |

**Costo estimado:** un comando típico (~2K tokens in / 200 out) ≈ $0.0003; ~1000 comandos ≈ $0.30 (aproximado; el tokenizador nuevo genera ~30% más tokens). La API se factura aparte de cualquier suscripción de chat.

## 5. Arquitectura

```
[Atajo / hover / bandeja] → [Mic] → STT (Groq) ──┐
[Texto en la isla] ───────────────────────────────┤
                                                  ▼
                       Router: ¿comando simple? → ejecuta directo (sin LLM)
                                                  │ no
                                                  ▼
                  Claude Haiku 5.5 + herramientas (tool use)
                  ├─ open_app / open_url / teclas multimedia / volumen
                  ├─ play_music (Spotify)
                  ├─ web_search / research
                  └─ ui_automation (Fase 6, con confirmación)
                                                  ▼
                      Respuesta → TTS (edge-tts) → parlantes + isla
```

### Control de la PC en 3 niveles (siempre intentar el más barato primero)
1. **Herramientas directas** — rápidas y fiables: abrir apps/URLs, teclas multimedia, volumen, archivos, APIs.
2. **Automatización de UI de Windows** — pywinauto o Windows-MCP, para apps sin API.
3. **Visión / computer use** — último recurso.

### Caso Spotify (importante)
- Desde 2026 la **Web API de Spotify exige que el dueño de la app tenga Premium** (si se vence, la app deja de funcionar). Modo desarrollo: máx. 5 usuarios.
- **Con Premium:** API oficial (necesita un dispositivo/reproductor activo).
- **Sin Premium:** abrir `spotify:search:<consulta>` en la app de escritorio y dar play con automatización de UI (más frágil).
- **Confirmado: hay Premium → usar la API oficial.** Requisitos: crear una app en el Spotify Developer Dashboard, tener la app de Spotify de escritorio abierta (dispositivo activo) y mantener Premium activo mientras se use. Los permisos (scopes) de reproducción son `user-read-playback-state` y `user-modify-playback-state`.

## 6. Seguridad (desde el día 1)

- Lista blanca de acciones permitidas; todo lo demás se rechaza.
- **Confirmación explícita** antes de borrar, instalar, enviar o pagar algo.
- **Tecla de pánico** global que corta cualquier acción en curso.
- Registro (log) local de cada acción ejecutada.
- Claves en Credential Manager; nunca en el repositorio.
- El audio no se guarda en disco; se envía solo al proveedor de STT y se descarta.

## 7. Dirección de diseño (UI)

- Estética **editorial, minimalista, humana**. Prohibido el look "IA genérico": nada de dashboards oscuros con neón morado/azul, tarjetas flotantes con sombras exageradas ni degradados saturados.
- **Paleta:** grises cálidos, tonos tierra, pasteles desaturados o monocromático limpio. Nunca colores por defecto de Tailwind a plena saturación.
- **Tipografía:** jerarquía impecable, mucho espacio en blanco.
- **Detalles:** bordes de 0.5–1px, microinteracciones discretas, estados activo/inactivo sutiles, layout asimétrico/modular.
- **Código:** componentes modulares, limpios y listos para producción, enfocados en UX real.
- Nombre, personaje y sonidos: **propios y originales** (definir en Fase 1).

## 8. Fases y checklist

| Fase | Entregable | Estimado | Estado |
|---|---|---|---|
| **0** | Repo, estructura, gestión de claves, "hola mundo" LLM por texto | 1 día | ☐ |
| **1** | **La isla:** ventana transparente, zona de activación superior, estados, bandeja, suspensión de 5 min, ejecutable de arranque manual (sin IA) | 3-5 días | ☐ |
| **2** | **Cerebro por texto:** chat con Claude + 2-3 herramientas simples | 1-2 días | ☐ |
| **3** | **Voz:** push-to-talk → Groq STT → respuesta → edge-tts | 2-3 días | ☐ |
| **4** | **Acciones en la PC:** apps, música, volumen, web, con confirmaciones | 3-5 días | ☐ |
| **5** | **Investigación:** búsqueda web + síntesis con fuentes | 2-4 días | ☐ |
| **6** | **Pulido y acceso ampliado:** wake word, memoria, automatización de UI | a demanda | ☐ |

Las fases 1-3 ≈ 1-2 semanas a ritmo tranquilo. Lo de Spotify solo importa desde la Fase 4.

## 9. Estructura de proyecto sugerida

```
asistente/
├─ ui/                 # Tauri 2 + frontend (isla)
├─ core/               # Núcleo Python
│  ├─ main.py          # servidor local + máquina de estados
│  ├─ audio/           # captura de mic, VAD, reproducción
│  ├─ stt.py           # Groq Whisper
│  ├─ tts.py           # edge-tts (+ fallback Piper)
│  ├─ llm.py           # Claude + tool use
│  ├─ router.py        # comandos simples sin LLM
│  ├─ tools/           # open_app, media, spotify, search, ...
│  └─ safety.py        # lista blanca, confirmaciones, panic, logs
├─ docs/planificacion.md
└─ README.md
```

## 10. Riesgos conocidos

- **Depende de internet:** sin conexión no hay STT ni LLM (el plan B local es más lento y consume CPU).
- **edge-tts no es oficial:** puede romperse → Piper de respaldo.
- **Precios y límites cambian rápido:** verificar cada servicio al contratarlo (Groq, Claude, Gemini).
- **Automatización de UI frágil:** se rompe cuando las apps actualizan su interfaz.
- **Latencia:** objetivo < 2-3 s entre terminar de hablar y empezar a responder. El router de comandos simples ayuda.
- **Zona superior vs. controles de ventana:** una franja a lo ancho de la pantalla taparía los botones de ventanas maximizadas; por eso la zona de activación es solo la parte central.
- **Wake word en español** con openWakeWord puede requerir ajuste (reportes de menor precisión en idiomas no ingleses).

## 11. Preguntas abiertas

**Respondidas:**
- [x] ¿Spotify Premium? → **Sí.** Se usa la API oficial.
- [x] ¿Cómo despertar/hablar? → **Tocando la barra superior** (zona central del borde).
- [x] ¿Suspensión por inactividad? → **5 minutos.**
- [x] ¿Nombre? → **"Secre"** (provisional; identidad visual a definir).
- [x] ¿Autoarranque? → **No por ahora.** Ejecutable de arranque manual; autoarranque con Windows queda para más adelante.

**Pendientes (no bloquean la Fase 1):**
- [ ] Identidad visual y nombre definitivo.
- [ ] ¿Atajo de teclado de respaldo para hablar? (opcional)
- [ ] ¿Un solo clic para empezar a grabar y otro para terminar, o mantener presionado? (definir en Fase 3)

## 12. Registro de decisiones

| Fecha | Decisión |
|---|---|
| 28/10/2026 | Sin Ollama ni IA local pesada; todo lo pesado en la nube |
| 28/10/2026 | Stack: Tauri 2 + núcleo Python; Groq (STT), Claude Haiku 5.5 (LLM), edge-tts (TTS) |
| 28/10/2026 | Wake word diferido; MVP con push-to-talk (Porcupine descartado por fin de tier gratis) |
| 28/10/2026 | **Desarrollo desde cero**; Coucou solo como inspiración conceptual, sin copiar código ni assets |
| 28/10/2026 | Acceso amplio a la PC (UI automation) se deja para la Fase 6 |
| 28/10/2026 | Nombre provisional: **Secre** |
| 28/10/2026 | Activación por toque en la barra superior (zona central); suspensión a los 5 min |
| 28/10/2026 | Arranque manual con ejecutable; autoarranque con Windows pospuesto |
| 28/10/2026 | Hay Spotify Premium → música con la Web API oficial |

## 13. Fuentes de la investigación (consultadas en octubre de 2026)

- Groq Whisper (precio y límites) — GroqCloud, resúmenes de precios de octubre 2026.
- faster-whisper / whisper.cpp — comparativas locales 2026 (mejor en NVIDIA; en CPU solo modelos chicos).
- TTS local (Piper, Kokoro, Supertonic) — comparativas 2026; edge-tts voces es-AR.
- Claude Haiku 5.5 — lanzado el 7/10/2026, `claude-haiku-5-5`, $0.10/$0.50 por MTok.
- Spotify Web API — guía de migración de febrero de 2026 (Premium obligatorio para apps en modo desarrollo).
- Porcupine — fin del tier gratuito el 30/06/2026 (foro de Home Assistant); alternativa openWakeWord.
- Windows-MCP / pywinauto-mcp — automatización de UI de Windows vía MCP.
- Gemini API — tier gratuito 2026 (por modelo, con uso de datos para mejorar modelos).
- Coucou (`louis-cfm/coucou`) — referencia de comportamiento; licencia MIT (código) y derechos reservados (assets).