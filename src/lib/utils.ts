import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMessageTime(date: string) {
  const d = new Date(date)
  const time = format(d, 'HH:mm')
  if (isToday(d)) return time
  if (isYesterday(d)) return `Ayer ${time}`
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diffDays < 7) return format(d, 'EEE HH:mm', { locale: es })
  return format(d, 'dd/MM/yy HH:mm')
}

// For conversation list — like WhatsApp: no time for past days
export function formatChatListTime(date: string) {
  const d = new Date(date)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Ayer'
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diffDays < 7) return format(d, 'EEE', { locale: es })
  return format(d, 'dd/MM/yy')
}

export function formatRelativeTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function isAIMessage(content: string) {
  return content.startsWith('@do') || content.startsWith('/do')
}

export function parseAICommand(content: string): { command: string; query: string } {
  const cleaned = content.replace(/^@do\s*|^\/do\s*/i, '').trim()
  const lower = cleaned.toLowerCase()

  if (lower.startsWith('resume') || lower.startsWith('resumen') || lower.startsWith('resumir')) {
    return { command: 'summarize', query: cleaned }
  }
  if (lower.startsWith('tareas') || lower.startsWith('extrae tareas') || lower.startsWith('lista de tareas')) {
    return { command: 'extract_tasks', query: cleaned }
  }
  if (lower.startsWith('busca') || lower.startsWith('buscar') || lower.startsWith('search')) {
    return { command: 'search', query: cleaned }
  }
  if (lower.startsWith('reporte') || lower.startsWith('informe') || lower.startsWith('genera')) {
    return { command: 'generate_report', query: cleaned }
  }
  return { command: 'free', query: cleaned }
}
