# do-chat — Guía de Setup

## 1. Crear cuenta en Supabase (gratis)

1. Ve a https://supabase.com y crea una cuenta
2. Crea un nuevo proyecto (elige cualquier nombre, región USA East o cualquiera)
3. Guarda la contraseña del proyecto

## 2. Ejecutar el schema SQL

1. En tu proyecto de Supabase → **SQL Editor**
2. Copia y pega el contenido de `supabase/schema.sql`
3. Haz click en **Run**

## 3. Obtener las keys de Supabase

1. En Supabase → **Settings** → **API**
2. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4. Obtener la Claude API Key

1. Ve a https://console.anthropic.com
2. Crea una cuenta si no tienes
3. En **API Keys** → crea una nueva key
4. Copia el valor → `ANTHROPIC_API_KEY`

## 5. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local` y llena los 3 valores:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## 6. Correr el proyecto

```bash
npm run dev
```

Abre http://localhost:3000

## 7. Primera vez

1. Ve a `/register` y crea tu cuenta
2. Crea otra cuenta en otra ventana/navegador para probar el chat
3. En cualquier conversación, escribe `@do resumir` para probar la IA

## Comandos de IA disponibles

| Comando | Qué hace |
|---------|----------|
| `@do resumir` | Resume la conversación |
| `@do tareas` | Extrae tareas y pendientes |
| `@do busca [texto]` | Busca en el historial |
| `@do reporte` | Genera reporte completo |
| `@do [cualquier cosa]` | Consulta libre con contexto del chat |

## Deploy en Vercel (gratis)

```bash
npx vercel
```

Agrega las 3 variables de entorno en el dashboard de Vercel.

## Costo estimado

- Supabase Free: $0/mes (hasta 500MB DB, 2GB storage, 50k usuarios)
- Vercel Free: $0/mes
- Claude API: ~$10-30/mes según uso (prototipos con poco tráfico = cerca de $0)
- **Total arranque: $0/mes**
