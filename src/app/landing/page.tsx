'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/dochatlogo.png" alt="DO Chat" width={34} height={34} className="rounded-xl" />
            <Image src="/dologo.png" alt="DO Chat" width={100} height={30} className="object-contain" />
          </div>
          <Link href="/login"
            className="px-5 py-2.5 rounded-full bg-[#1a56db] text-white text-sm font-semibold hover:bg-[#1648c8] transition-colors shadow-sm">
            Abrir DO Chat
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#1a56db] pt-16">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-blue-400 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-indigo-400 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-0 flex flex-col lg:flex-row items-center gap-12">
          {/* Text */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-200 text-xs font-medium mb-6 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Disponible ahora — gratis
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              El chat donde<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">
                la IA trabaja
              </span>
              <br />por ti
            </h1>
            <p className="text-lg text-blue-100 mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed">
              Mensajes, tareas, recordatorios y un asistente inteligente — todo en un solo lugar. Simple, rápido y privado.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href="/login"
                className="px-8 py-4 rounded-full bg-[#1a56db] text-white font-bold text-base hover:bg-[#1648c8] transition-all shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5">
                Empezar gratis
              </Link>
              <a href="#features"
                className="px-8 py-4 rounded-full bg-white/10 text-white font-semibold text-base hover:bg-white/20 transition-all border border-white/20">
                Ver funciones
              </a>
            </div>
            <p className="text-blue-300 text-xs mt-4">Sin tarjeta de crédito · Sin anuncios</p>
          </div>

          {/* Phone mockup */}
          <div className="flex-1 flex justify-center lg:justify-end pb-0">
            <div className="relative w-[280px] sm:w-[300px]">
              {/* Phone frame */}
              <div className="relative bg-[#0f172a] rounded-[2.5rem] p-3 shadow-2xl shadow-black/50 border border-white/10">
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-white/20 rounded-full" />
                <div className="bg-[#f1f5f9] rounded-[2rem] overflow-hidden h-[540px] flex flex-col">
                  {/* Chat header */}
                  <div className="bg-[#0f172a] px-4 pt-10 pb-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white shrink-0">✦</div>
                    <div>
                      <p className="text-white text-sm font-semibold">do AI</p>
                      <p className="text-green-200 text-[10px]">en línea</p>
                    </div>
                  </div>
                  {/* Messages */}
                  <div className="flex-1 px-3 py-3 space-y-2 overflow-hidden">
                    <div className="flex justify-end">
                      <div className="bg-[#dbeafe] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%] shadow-sm">
                        <p className="text-gray-800 text-xs">¿Cuál es el precio del dólar hoy?</p>
                        <p className="text-[9px] text-gray-400 text-right mt-0.5">10:24 ✓✓</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white shrink-0 mt-auto">✦</div>
                      <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] shadow-sm">
                        <p className="text-gray-800 text-xs">El dólar cotiza hoy a <span className="font-semibold">$17.42 MXN</span> (compra) y <span className="font-semibold">$17.58 MXN</span> (venta).</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">10:24</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#dbeafe] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%] shadow-sm">
                        <p className="text-gray-800 text-xs">Agéndame una reunión mañana a las 9am</p>
                        <p className="text-[9px] text-gray-400 text-right mt-0.5">10:25 ✓✓</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white shrink-0 mt-auto">✦</div>
                      <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] shadow-sm">
                        <p className="text-gray-800 text-xs">✅ Reunión agendada para mañana a las <span className="font-semibold">9:00 AM</span>.</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">10:25</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#dbeafe] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%] shadow-sm">
                        <p className="text-gray-800 text-xs">Resume el chat con Luis</p>
                        <p className="text-[9px] text-gray-400 text-right mt-0.5">10:26 ✓✓</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white shrink-0 mt-auto">✦</div>
                      <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] shadow-sm">
                        <p className="text-gray-800 text-xs">Luis mencionó la entrega del proyecto para el viernes y preguntó por el presupuesto.</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">10:26</p>
                      </div>
                    </div>
                  </div>
                  {/* Input bar */}
                  <div className="bg-[#f0f2f5] px-3 py-2 flex items-center gap-2">
                    <div className="flex-1 bg-white rounded-full px-4 py-2">
                      <p className="text-gray-400 text-xs">Escribe un mensaje…</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#1a56db] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="relative mt-12">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full block" preserveAspectRatio="none" style={{ height: '60px' }}>
            <path d="M0 60 L0 30 Q360 0 720 30 Q1080 60 1440 30 L1440 60 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Todo lo que necesitas,<br />en un solo lugar</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">DO Chat combina mensajería real con inteligencia artificial que actúa por ti.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '✦',
                color: 'bg-blue-50 text-blue-600',
                title: 'IA que actúa',
                desc: 'Pídele a do AI que agende reuniones, busque información, resuma chats o envíe mensajes — y lo hace.',
              },
              {
                icon: '💬',
                color: 'bg-green-50 text-green-600',
                title: 'Mensajería real',
                desc: 'Chats individuales y grupales, reacciones, respuestas, archivos, imágenes y audio.',
              },
              {
                icon: '✅',
                color: 'bg-purple-50 text-purple-600',
                title: 'Gestión de tareas',
                desc: 'Crea, asigna y da seguimiento a tareas directamente desde tus conversaciones.',
              },
              {
                icon: '🔔',
                color: 'bg-amber-50 text-amber-600',
                title: 'Recordatorios',
                desc: 'Dile a la IA que te recuerde algo y lo agenda automáticamente.',
              },
              {
                icon: '📁',
                color: 'bg-rose-50 text-rose-600',
                title: 'Proyectos y archivos',
                desc: 'Organiza documentos, genera reportes en Excel y comparte archivos sin salir del chat.',
              },
              {
                icon: '🔒',
                color: 'bg-slate-50 text-slate-600',
                title: 'Privado y seguro',
                desc: 'Cifrado de extremo a extremo en chats directos. Tus conversaciones son solo tuyas.',
              },
            ].map(f => (
              <div key={f.title} className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-shadow border border-gray-100">
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center text-xl mb-4`}>{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-20 bg-gradient-to-r from-[#0f172a] to-[#1a56db]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Image src="/dochatlogo.png" alt="DO Chat" width={48} height={48} className="rounded-2xl" />
            <Image src="/dologo.png" alt="DO Chat" width={120} height={36} className="object-contain brightness-0 invert" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Empieza a chatear hoy</h2>
          <p className="text-blue-200 text-lg mb-8">Sin instalación. Sin tarjeta. Abre DO Chat desde cualquier dispositivo.</p>
          <Link href="/login"
            className="inline-block px-10 py-4 rounded-full bg-white text-[#1a56db] font-bold text-base hover:bg-blue-50 transition-all shadow-xl hover:-translate-y-0.5">
            Abrir DO Chat →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0f172a] py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/dochatlogo.png" alt="" width={28} height={28} className="rounded-lg opacity-60" />
            <Image src="/dologo.png" alt="DO Chat" width={90} height={28} className="object-contain brightness-0 invert opacity-60" />
          </div>
          <p className="text-gray-500 text-xs text-center">© 2026 DO Chat. Todos los derechos reservados.</p>
          <div className="flex gap-5 text-gray-500 text-xs">
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Términos</a>
            <a href="#" className="hover:text-white transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
