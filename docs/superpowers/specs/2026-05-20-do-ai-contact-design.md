# @do AI — Diseño: @do como Contacto

**Fecha:** 2026-05-20  
**Área:** @do AI — UX y arquitectura  
**Estado:** Aprobado — pendiente de implementación  
**North star:** "Tan fácil como WhatsApp + tan fácil como ChatGPT, sin fricción"

---

## Resumen ejecutivo

@do deja de ser un panel flotante superpuesto sobre los chats y pasa a ser un **contacto dedicado, fijo en el tope de la lista de chats** — exactamente como le escribirías a un colega en WhatsApp. El usuario lo abre, ve una pantalla de bienvenida limpia con chips contextuales generados sin gastar tokens de IA, escribe o toca un chip, y @do responde con streaming. Al salir, el bottom nav reaparece. Zero overhead, zero fricción.

---

## Sección 1 — Dirección de UX: @do como Contacto

**Decisión:** Opción B — @do como Contacto (descartadas: A "IA Invisible" y C "Acciones en Mensaje").

@do aparece **fijo en la primera posición** de la lista de chats, por encima de todos los otros. Visualmente se distingue por:
- Avatar cuadrado con gradiente azul-índigo y el símbolo ✦ (no un avatar de persona)
- Nombre: **do AI**
- Preview dinámico generado desde la DB (no desde Claude): `"2 tareas vencen hoy · 3 chats activos"`

El preview se calcula con 2–3 queries a Supabase al cargar la lista. Si no hay nada urgente, muestra `"Tu asistente · siempre activo"`.

**Razón de la elección:** Es el modelo mental más familiar para usuarios latinoamericanos (WhatsApp). No requiere aprender un gesto nuevo ni encontrar un botón. @do vive donde el usuario ya mira: la lista de chats.

---

## Sección 2 — Pantalla de bienvenida

**Decisión:** Opción B — Bienvenida simple estilo ChatGPT (descartada la A "Daily Brief" por costo en tokens).

Cuando el usuario abre @do (o cuando no hay mensajes previos en la sesión del día):

```
✦                          ← ícono grande, centrado
Hola, Abel 👋              ← nombre del usuario desde auth
Miércoles 20 mayo · ¿En qué trabajamos?   ← fecha + subtitle

[Chip 1 contextual]
[Chip 2 contextual]
[Chip 3 contextual]

[ Escribí o tocá una sugerencia…    ↑ ]
```

**Chips contextuales — generación sin tokens:**

Los chips se calculan con queries SQL a Supabase, en este orden de prioridad:

| Prioridad | Chip | Query |
|-----------|------|-------|
| 1° | ⚠️ Tarea vence HOY | `SELECT tasks WHERE due_date = TODAY AND user_id = me` |
| 2° | 🟡 Tarea vence mañana | `SELECT tasks WHERE due_date = TOMORROW AND user_id = me` |
| 3° | 💬 Chat activo | `SELECT rooms con mensajes nuevos desde last_visit, ORDER BY count DESC` |
| 4° | 📨 Sin respuesta 48h+ | `SELECT messages WHERE last_msg = mine AND age > 48hs AND no reply` |
| 5° | Default genérico | "Resumí mis chats", "Ver pendientes", "¿En qué quedamos?" |

**Reglas:**
- Máximo **3 chips** siempre.
- Si hay tarea urgente (hoy), ocupa el slot 1 sin excepción.
- Si no hay nada contextual, se muestran chips genéricos.
- **Costo total al abrir @do: $0.00 — cero tokens.** Claude solo entra cuando el usuario envía un mensaje o toca un chip.

**Al tocar un chip:** pre-llena el input con el texto del chip y lo envía automáticamente. El mismo flujo que escribir a mano.

**Cuándo aparece el welcome:** cuando el room de @do no tiene mensajes, o como primera pantalla de cada sesión nueva (se puede implementar con un flag de "última apertura > 8 horas").

---

## Sección 3 — Modo enfocado: sin bottom nav

Cuando el usuario navega al room de @do, el **bottom nav desaparece** (fade-out 200ms). Solo quedan:
- Header con ← atrás (o swipe-back en iOS)
- Historial de conversación
- Input bar

**Por qué:**
- Los tabs invitan a escapar; la IA necesita atención sostenida
- Da más espacio vertical al historial
- Psicológicamente distingue "modo IA" de "modo chat normal"
- Consistente con ChatGPT/Gemini/Claude en mobile

**Navegación:**
- Entrar: slide horizontal normal → bottom nav fade-out 200ms simultáneo
- Salir (← o swipe-back iOS): slide back → bottom nav fade-in 200ms simultáneo
- El swipe-back de iOS funciona nativamente; el nav reaparece progresivamente con el gesto

**Implementación:** `const isDoRoom = userId === DO_BOT_ID`. Si true → `opacity-0 pointer-events-none transition-opacity duration-200` en el nav. Un hook `useDoMode()` lo encapsula.

---

## Sección 4 — Cambios técnicos

### 4.1 Bot user en DB (Trivial)
Crear migration para insertar un usuario especial con UUID fijo conocido por la app:
```sql
INSERT INTO users (id, name, avatar_type, is_bot)
VALUES ('00000000-0000-0000-0000-000000000d00', 'do AI', 'bot', true);
```
La app define `DO_BOT_ID = '00000000-0000-0000-0000-000000000d00'` como constante global.

### 4.2 Chat list — pin dinámico (Baja)
- Al cargar la lista de chats, un query adicional calcula el preview de @do (tasks urgentes + unread count)
- @do siempre se renderiza en posición 0, independientemente del orden por último mensaje
- El room de @do se crea automáticamente si no existe (mismo flujo que un 1:1 nuevo)

### 4.3 Componente `DoWelcomeScreen` (Media)
Nuevo componente React que reemplaza el historial vacío cuando el room de @do no tiene mensajes:
- Recibe `userName`, `date`
- Ejecuta las 3 queries de chips al montar (sin Claude)
- Al tocar chip → llama al handler de envío de mensaje con el texto del chip
- Desaparece en cuanto hay al menos 1 mensaje en el historial

### 4.4 Bottom nav condicional (Baja)
Hook `useDoMode()`:
```typescript
const useDoMode = (userId: string) => {
  return userId === DO_BOT_ID
}
```
En el layout/nav component: `const isDoMode = useDoMode(params.userId)`. Aplicar clases Tailwind condicionales con transition.

### 4.5 Streaming en room dedicado (Media — ya 80% hecho)
- El endpoint `api/chat/ai-chat/route.ts` ya produce SSE word-by-word
- `RoomView.tsx` ya tiene `askAI()` con el reader de SSE
- Hay que conectar el flujo: cuando `isDoRoom` y el usuario envía un mensaje → redirigir a `askAI()` en lugar del envío normal
- La respuesta de @do se guarda en `messages` con `sender_id = DO_BOT_ID`
- El streaming se muestra como una burbuja de mensaje que va apareciendo (cursor parpadeante)

### 4.6 Cleanup del overlay (Baja)
Una vez que el room dedicado funciona, eliminar:
- `aiStreamText`, `aiCurrentQuery`, `aiPanelHistory`, `aiProcessing`, `aiPanelScrollRef` states
- El panel overlay HTML en `RoomView.tsx`
- La lógica del botón ✦ que abría el panel

El cleanup puede hacerse después de validar el nuevo flujo en producción.

---

## Qué NO entra en este spec

- Historial de conversaciones anteriores con @do (persistencia multi-sesión) — siguiente iteración
- Notificaciones push proactivas desde @do — siguiente iteración
- @do en chats grupales (@-mention) — ya existe, no se toca
- Monetización / límites de tokens — spec separado

---

## Criterios de éxito

1. Abrir @do no gasta ningún token de Claude
2. Los chips contextuales reflejan datos reales del usuario (no hardcodeados)
3. La transición de entrada/salida de @do es fluida (60fps, sin salto del nav)
4. Una respuesta de @do aparece con streaming visible antes de los 2 segundos
5. Un usuario nuevo entiende qué es @do sin instrucciones (test de usabilidad 0-fricción)
