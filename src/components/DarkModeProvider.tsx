'use client'

import { useEffect } from 'react'

const DARK_CSS = `
  .bg-white { background-color: #18181b !important; }
  .bg-gray-50 { background-color: #27272a !important; }
  .bg-gray-100 { background-color: #3f3f46 !important; }
  .bg-gray-200 { background-color: #52525b !important; }
  .border-gray-100 { border-color: #3f3f46 !important; }
  .border-gray-200 { border-color: #52525b !important; }
  .divide-gray-100 > * + * { border-color: #3f3f46 !important; }
  .text-gray-900 { color: #fafafa !important; }
  .text-gray-800 { color: #e4e4e7 !important; }
  .text-gray-700 { color: #d4d4d8 !important; }
  .text-gray-600 { color: #a1a1aa !important; }
  .text-gray-500 { color: #71717a !important; }
  .text-gray-400 { color: #52525b !important; }
  .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,.5) !important; }
  .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,.6) !important; }
  .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0,0,0,.7) !important; }
  * { transition: background-color 0.15s, border-color 0.15s, color 0.15s; }
`

export default function DarkModeProvider() {
  useEffect(() => {
    function apply() {
      const isDark = localStorage.getItem('dark_mode') === '1'
      let el = document.getElementById('dark-mode-styles')
      if (isDark) {
        if (!el) {
          el = document.createElement('style')
          el.id = 'dark-mode-styles'
          document.head.appendChild(el)
        }
        el.textContent = DARK_CSS
        document.documentElement.classList.add('dark')
      } else {
        el?.remove()
        document.documentElement.classList.remove('dark')
      }
    }

    apply()

    // Listen for changes from other tabs or the toggle
    window.addEventListener('storage', apply)
    window.addEventListener('dark-mode-changed', apply)
    return () => {
      window.removeEventListener('storage', apply)
      window.removeEventListener('dark-mode-changed', apply)
    }
  }, [])

  return null
}
