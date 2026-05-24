'use client'
import { createContext, useContext, useEffect, useState } from 'react'

export type Lang = 'en' | 'es'

const en = {
  appName: 'DO Chat',
  langToggle: 'EN',

  landing: {
    nav: { features: 'Features', pricing: 'Pricing', signIn: 'Sign in', getStarted: 'Get started free' },
    hero: {
      badge: 'Available now — free access',
      title: 'Professional messaging',
      titleHighlight: 'with AI that acts',
      subtitle: 'Team chats, task management, and a smart assistant that takes real actions — all in one platform.',
      ctaPrimary: 'Get started →',
      ctaSecondary: 'View plans',
      disclaimer: 'No credit card · No install · Encrypted messages',
    },
    trust: {
      encryption: 'AES-256-GCM Encryption',
      ai: 'AI that executes actions',
      device: 'Access from any device',
      noInstall: 'No installation required',
    },
    features: {
      sectionTitle: 'One platform. Everything your team needs.',
      sectionSub: 'Built for teams that need clarity, speed, and results.',
      items: [
        { tag: 'DO AI', title: 'An assistant that acts, not just answers', desc: 'Delegate tasks directly from chat. The assistant drafts, schedules, summarizes and manages — without switching apps.' },
        { tag: 'Chats', title: 'Centralized team communication', desc: 'Direct and group conversations with history, files, and search. No noise, no distractions.' },
        { tag: 'Tasks', title: 'Frictionless task management', desc: 'Turn any message into an assignable task. Priorities, deadlines, and real-time tracking.' },
        { tag: 'Projects', title: 'Documentation and files by project', desc: 'Organize contracts, reports, and resources in shared projects. Accessible from any conversation.' },
      ],
    },
    security: {
      badge: '🔒 Privacy first',
      title: 'Your messages belong to you',
      subtitle: 'Every message is encrypted with AES-256-GCM before being saved. Not even we can read them.',
      bullets: ['End-to-end encryption', 'No ads or tracking', 'Export or delete your data'],
    },
    pricingSection: { title: 'Plans coming soon', sub: 'For now, enjoy DO Chat completely free.', disclaimer: '' },
    plans: {
      free:     { name: 'Free',     price: '$0',    period: 'forever', cta: 'Get started free',  badge: '', features: ['DO AI · 15 queries per day', 'Unlimited messages and files', 'Encrypted messages', '500 MB storage'] },
      pro:      { name: 'Pro',      price: '',      period: '',        cta: 'Coming soon',        badge: '', features: [] },
      business: { name: 'Business', price: '',      period: '',        cta: 'Coming soon',        badge: '', features: [] },
    },
    cta: { title: 'Your team can work better today', subtitle: 'No installation. No credit card. Ready in seconds.', button: 'Get started free →' },
    footer: { features: 'Features', pricing: 'Pricing', privacy: 'Privacy', terms: 'Terms', copyright: '© 2026 DO Chat. All rights reserved.' },
  },

  pricing: {
    header: 'The AI assistant for your daily work',
    subtitle: 'Encrypted messages, specialized agents, and AI that acts — not just answers.',
    signIn: 'Sign in',
    redirecting: 'Redirecting…',
    disclaimer: 'Cancel anytime · Secure payment via Stripe · Prices in USD',
    plans: {
      free:     { name: 'Free',     period: 'forever', description: 'Try DO Chat',                    cta: 'Get started free',      badge: '', features: ['DO AI · 15 queries per day', 'Unlimited messages and files', 'Encrypted messages', '500 MB storage'] },
      pro:      { name: 'Pro',      period: 'month',   description: 'For professionals and teams',    cta: 'Subscribe to Pro',      badge: 'Most popular',    features: ['DO AI · 80 queries per day with higher capacity', 'Unlimited messages and files', 'Encrypted messages', '5 GB storage', 'Finance, Calendar, Writing, Search agents', '50 web searches per month', 'Daily proactive brief'] },
      business: { name: 'Business', period: 'month',   description: 'For companies and large teams',  cta: 'Subscribe to Business', badge: 'Maximum power',   features: ['DO AI · 200 queries per day at max capacity', 'Unlimited messages and files', 'Encrypted messages', '20 GB storage', 'All specialized agents', 'Unlimited web searches', 'Priority daily proactive brief'] },
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        ['Are my messages private?', 'Yes. All messages are encrypted with AES-256-GCM before being saved. Only you can read them.'],
        ['Can I cancel anytime?', 'Yes, without penalties. Your plan returns to Free at the end of the paid period.'],
        ['How smart is DO AI in each plan?', 'On Free, DO AI handles everyday tasks. On Pro and Business, DO AI operates with greater analysis, reasoning, and complex task execution capacity.'],
        ['Does the daily limit reset?', 'Yes, at midnight server time.'],
      ] as [string, string][],
    },
  },

  login: {
    phone: {
      title: 'Enter your number',
      subtitle: "We'll send you an SMS code to verify your account",
      placeholder: 'Phone number',
      searchPlaceholder: 'Search country or code',
      cancel: 'Cancel',
      continue: 'Continue',
      sending: 'Sending…',
      disclaimer: 'By continuing you accept the DO Chat Terms of Service and Privacy Policy',
      disclaimerPrefix: 'By continuing you agree to our',
      disclaimerTerms: 'Terms of Service',
      disclaimerAnd: 'and',
      disclaimerPrivacy: 'Privacy Policy',
      backHome: 'Back to home',
      errorShort: 'Enter a valid number',
      errorSMS: 'Error sending SMS',
    },
    otp: {
      title: 'Verification code',
      subtitle: 'We sent an SMS to',
      edit: 'Edit',
      back: 'Back',
      verifying: 'Verifying…',
      resendIn: 'Resend code in',
      resend: 'Resend code',
      smsHint: 'Check your SMS. The code is 6 digits and expires in 10 minutes. You can also paste the code directly.',
      errorCode: 'Enter the complete code',
      errorWrong: 'Incorrect code',
    },
    profile: {
      title: 'What is your name?',
      subtitle: 'This name will be visible to your contacts in DO Chat',
      photoLabel: 'Profile photo',
      photoOptional: '(optional)',
      placeholder: 'Your full name',
      creating: 'Creating profile…',
      enter: 'Enter DO Chat',
      almostDone: 'Almost there — this is the last step',
      errorShort: 'Minimum 2 characters',
      errorLong: 'Maximum 30 characters',
      errorExpired: 'Session expired, try again',
      errorGeneric: 'Error',
    },
  },

  app: {
    tabs: { contacts: 'Contacts', calls: 'Calls', files: 'Files', messages: 'Messages', you: 'You' },
    chat: { placeholder: 'Message…', send: 'Send', ai: 'DO AI', online: 'online', today: 'Today', yesterday: 'Yesterday', noMessages: 'No messages yet', typeMessage: 'Type a message',
      lastSeenRecently: 'last seen recently', lastSeenTodayAt: 'last seen today at', lastSeenYesterdayAt: 'last seen yesterday at',
      lastSeenOnAt: 'last seen on {day} at', lastSeenOn: 'last seen on {date}',
      smartAssistant: 'Smart assistant', participants: '{n} participants', isTyping: '{name} is typing…',
      taskAssignedMsg: '📋 Task assigned to {name}: {content}', taskDue: '📅 Due: {date}',
    },
    chats: {
      search: 'Search messages, chats…', newGroup: 'New group', newContact: 'New contact',
      aiSubtitle: 'Your smart assistant', aiSubtitleDefault: 'Your smart assistant · always on',
      todayPanel: 'What matters today',
      inviteTitle: 'Invite to DO Chat', inviteSubtitle: 'Share your personal link',
      shareLink: 'Share invite link', shareText: 'Join me on DO Chat — the business messenger with built-in AI.',
      copyLink: 'Link copied!',
      pinned: 'Pinned', allChats: 'All chats', archived: 'Archived',
      empty: 'Tap + to add contacts and start chatting',
      noResults: 'No results for', minChars: 'Type at least 2 characters to search',
      conversation: 'conversation', conversations: 'conversations',
      welcomeTitle: 'Welcome, {name}!',
      welcomeSubtitle: 'Your workspace is ready. Chat with DO AI or add your team.',
      welcomeCTAAI: 'Talk to @do AI',
      welcomeCTAAIHint: 'Your smart assistant',
      welcomeCTAContact: 'Add a contact',
      welcomeCTAContactHint: 'Invite your team',
    },
    files: {
      title: 'Files', search: 'Search…', select: 'Select', cancel: 'Cancel', newProject: '+ Project',
      filterAll: 'All', filterProjects: 'Projects', filterFiles: 'Files', filterImages: 'Images',
      empty: 'No content yet', emptyHint: 'Upload a file with + or ask DO AI to generate reports',
      projectsSection: 'Projects', filesSection: 'Files & images',
      askAI: 'Ask AI', delete: 'Delete', selected: 'selected',
      deleteOneFile: 'Delete this file?',
      deleteManyFiles: 'Delete {n} files?',
      deleteDesc: 'It will be removed from the chat and this list.',
      deleteUndoable: 'This action cannot be undone.',
      deleting: 'Deleting…',
    },
    contacts: {
      title: 'Contacts', search: 'Search contact…', empty: 'No contacts yet',
      emptyHint: 'Add contacts by phone or @username', add: 'Add contact', edit: 'Edit contact',
      cancel: 'Cancel', save: 'Save', saving: 'Saving…', firstName: 'First name', lastName: 'Last name',
      noResults: 'No results for',
    },
    profile: {
      yourPlan: 'Your plan', free: 'Free',
      doAIFree: '15 queries per day', doAIPro: '80 queries per day · extended capacity', doAIBusiness: '200 queries per day · max capacity',
      manageSub: 'Manage subscription', upgrade: 'Paid plans coming soon',
      logout: 'Log out', avatarTitle: 'Profile photo', openGallery: 'Open gallery',
      takePhoto: 'Take photo', deletePhoto: 'Delete profile photo', cancel: 'Cancel',
      plan: 'Plan', deleteAccount: 'Delete account', editProfile: 'Edit profile',
      title: 'Profile', nameLabel: 'Name', phoneLabel: 'Phone number',
      usernameLabel: 'Username', setUsername: 'Set your @username',
      appearance: 'Appearance', darkMode: 'Dark mode',
      edit: 'Edit', save: 'Save', saving: 'Saving…', checking: 'Checking…', uploading: 'Uploading…',
      usernameHint: 'Letters, numbers and underscores only',
      errorMin: 'Minimum 3 characters', errorTaken: 'Username not available', errorSave: 'Error saving',
    },
    daily: {
      title: 'What matters today', send: 'Share', all: 'All', received: 'Received', sent: 'Sent',
      addTask: 'Add task…', deadline: 'Due date:', remove: 'Remove',
      receivedSection: '📥 Received', sentSection: '📤 Sent', reminders: 'Reminders',
      todo: 'To do', completed: 'Completed', noReceived: 'No received tasks', noSent: 'No sent tasks',
      reminderBadge: 'Reminder', taskBadge: 'Task', reject: 'Decline', accept: 'Accept',
      sending: 'Sending…', sendButton: 'Send', sendTitle: 'Send task or reminder',
      sendTo: 'Send to', description: 'Description', due: 'Due date (optional)', dateTime: 'Date and time',
      taskType: '📋 Task', reminderType: '🔔 Reminder', to: 'To', now: 'Now · ',
      tasksReminders: 'Tasks and reminders',
      pending: 'Pending', overdueBy: 'Overdue by', daysLeft: 'd left', dueToday: 'Due today', dueTomorrow: 'Due tomorrow',
      statusPending: 'Waiting for acceptance', statusInProgress: 'In progress', statusCompleted: 'Completed ✓', statusRejected: 'Declined',
      dueLabel: 'Due: {date}', fromLabel: 'From', toLabel: 'To',
      evidence: 'View evidence', confirmComplete: 'Confirm', uploadEvidence: '+ Attach file / photo', cancelComplete: 'Cancel',
      markDone: 'Mark as done', nowDot: 'Now · ',
      invitePlaceholderTask: 'e.g.: Review the contract before Thursday',
      invitePlaceholderReminder: 'e.g.: Call the supplier at 10am',
      tasksTitle: 'Tasks', myTasks: 'My tasks', awaitingResponse: 'Awaiting your response',
      history: 'History', noPersonal: 'No pending tasks right now',
      noPersonalHint: 'Ask @do to extract tasks from your conversations',
      noReceivedHint: 'When someone assigns you a task it will appear here',
      noSentHint: 'Assign tasks from a chat to see them here',
      attachEvidence: 'Attach evidence? (optional)', taskRejected: 'Task declined',
      someone: 'Someone',
    },
    nav: { chats: 'Chats', tasks: 'Tasks', projects: 'Projects', docs: 'Docs' },
    actions: {
      clearConv: 'Clear conversation', pinChat: 'Pin chat', unpin: 'Unpin',
      maxPinned: 'Maximum 3 pinned', archiveChat: 'Archive chat', unarchive: 'Unarchive',
      enableNotifs: 'Enable notifications', muteFor: 'Mute for…',
      mute8h: '8 hours', mute1w: '1 week', muteAlways: 'Always',
      deleteContact: 'Remove contact', deleteChat: 'Delete chat',
    },
    newContact: {
      title: 'New contact', cancel: 'Cancel', add: 'Add', saving: 'Saving…',
      phone: '📞 Phone', username: '@ Username', phonePlaceholder: 'Phone number',
      usernamePlaceholder: 'username',
      phoneHint: 'If the number is registered in DO Chat, it will be added as a contact.',
      usernameHint: 'Enter the exact @username of your contact in DO Chat.',
      errorName: 'Enter at least a name', errorUsername: 'Enter a valid @username',
      errorUserNotFound: 'User not found', errorPhone: 'Enter a valid phone number', errorSave: 'Error saving',
    },
    newGroup: {
      title: 'New group', cancel: 'Cancel', create: 'Create', creating: 'Creating…',
      namePlaceholder: 'Group name', contactsSection: 'Contacts',
      noContacts: 'Add contacts first to create a group',
      errorName: 'Enter a group name', errorContacts: 'Select at least one contact',
      errorCreate: 'Error creating', participantSingular: 'participant selected', participantPlural: 'participants selected',
    },
    calls: {
      noContacts: 'No contacts to call', noContactsHint: 'Add contacts to make calls',
      tapToCall: 'Tap to call', noAnswer: 'No answer', declined: 'Declined',
      contactsSection: 'Contacts', recentSection: 'Recent', clearHistory: 'Clear', justNow: 'Now',
    },
    doScreen: {
      greeting: 'Hello, {name} 👋',
      workingOn: 'What are we working on?',
      taskTodaySub: "Review today's tasks",
      taskTomorrowSub: 'Plan for tomorrow',
    },
    aiLimit: { title: 'Daily limit reached', upgradeHint: 'Upgrade to Pro' },
    reminder: { title: 'Reminder' },
    camera: { takePhoto: 'Take photo' },
  },
}

const es: typeof en = {
  appName: 'DO Chat',
  langToggle: 'ES',

  landing: {
    nav: { features: 'Funciones', pricing: 'Precios', signIn: 'Iniciar sesión', getStarted: 'Empezar gratis' },
    hero: {
      badge: 'Disponible ahora — acceso gratuito',
      title: 'Mensajería profesional',
      titleHighlight: 'con IA que actúa',
      subtitle: 'Chats de equipo, gestión de tareas y un asistente inteligente que ejecuta acciones reales — todo en una sola plataforma.',
      ctaPrimary: 'Comenzar gratis →',
      ctaSecondary: 'Ver planes',
      disclaimer: 'Sin tarjeta de crédito · Sin instalación · Mensajes cifrados',
    },
    trust: {
      encryption: 'Cifrado AES-256-GCM',
      ai: 'IA que ejecuta acciones',
      device: 'Acceso desde cualquier dispositivo',
      noInstall: 'Sin instalación requerida',
    },
    features: {
      sectionTitle: 'Una plataforma. Todo lo que necesita tu equipo.',
      sectionSub: 'Diseñada para equipos que necesitan claridad, velocidad y resultados.',
      items: [
        { tag: 'DO AI', title: 'Un asistente que ejecuta, no solo responde', desc: 'Delega tareas directamente desde el chat. El asistente redacta, agenda, resume y gestiona — sin cambiar de aplicación.' },
        { tag: 'Chats', title: 'Comunicación de equipo centralizada', desc: 'Conversaciones directas y grupales con historial, archivos y búsqueda. Sin ruido, sin distracciones.' },
        { tag: 'Pendientes', title: 'Gestión de tareas sin fricción', desc: 'Convierte cualquier mensaje en una tarea asignable. Prioridades, fechas límite y seguimiento en tiempo real.' },
        { tag: 'Proyectos', title: 'Documentación y archivos por proyecto', desc: 'Organiza contratos, reportes y recursos en proyectos compartidos. Accesibles desde cualquier conversación.' },
      ],
    },
    security: {
      badge: '🔒 Privacidad primero',
      title: 'Tus mensajes son solo tuyos',
      subtitle: 'Cada mensaje se cifra con AES-256-GCM antes de guardarse. Ni siquiera nosotros podemos leerlos.',
      bullets: ['Cifrado de extremo a extremo', 'Sin publicidad ni tracking', 'Exporta o elimina tus datos'],
    },
    pricingSection: { title: 'Planes próximamente', sub: 'Por ahora, disfruta DO Chat completamente gratis.', disclaimer: '' },
    plans: {
      free:     { name: 'Gratis',   price: '$0',  period: 'siempre', cta: 'Empezar gratis',   badge: '', features: ['DO AI · 15 consultas por día', 'Mensajes y archivos ilimitados', 'Mensajes cifrados', '500 MB de almacenamiento'] },
      pro:      { name: 'Pro',      price: '',    period: '',        cta: 'Próximamente',      badge: '', features: [] },
      business: { name: 'Business', price: '',    period: '',        cta: 'Próximamente',      badge: '', features: [] },
    },
    cta: { title: 'Tu equipo ya puede trabajar mejor', subtitle: 'Sin instalación. Sin tarjeta de crédito. Listo en segundos.', button: 'Comenzar gratis →' },
    footer: { features: 'Funciones', pricing: 'Precios', privacy: 'Privacidad', terms: 'Términos', copyright: '© 2026 DO Chat. Todos los derechos reservados.' },
  },

  pricing: {
    header: 'El asistente de IA para tu trabajo diario',
    subtitle: 'Mensajes cifrados, agentes especializados y IA que actúa — no solo responde.',
    signIn: 'Iniciar sesión',
    redirecting: 'Redirigiendo…',
    disclaimer: 'Cancela en cualquier momento · Pago seguro vía Stripe · Precios en USD',
    plans: {
      free:     { name: 'Gratis',   period: 'siempre', description: 'Para probar DO Chat',               cta: 'Empezar gratis',         badge: '', features: ['DO AI · 15 consultas por día', 'Mensajes y archivos ilimitados', 'Mensajes cifrados', '500 MB de almacenamiento'] },
      pro:      { name: 'Pro',      period: 'mes',     description: 'Para profesionales y equipos',      cta: 'Suscribirse a Pro',      badge: 'Más popular',    features: ['DO AI · 80 consultas por día con mayor capacidad', 'Mensajes y archivos ilimitados', 'Mensajes cifrados', '5 GB de almacenamiento', 'Agentes Finance, Agenda, Redacción, Búsqueda', '50 búsquedas web al mes', 'Brief proactivo diario'] },
      business: { name: 'Business', period: 'mes',     description: 'Para empresas y equipos grandes',   cta: 'Suscribirse a Business', badge: 'Máximo poder',   features: ['DO AI · 200 consultas por día en máxima capacidad', 'Mensajes y archivos ilimitados', 'Mensajes cifrados', '20 GB de almacenamiento', 'Todos los agentes especializados', 'Búsquedas web ilimitadas', 'Brief proactivo diario · prioritario'] },
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        ['¿Mis mensajes son privados?', 'Sí. Todos los mensajes se cifran con AES-256-GCM antes de guardarse. Solo tú puedes leerlos.'],
        ['¿Puedo cancelar cuando quiera?', 'Sí, sin penalizaciones. Tu plan vuelve a Gratis al final del período pagado.'],
        ['¿Qué tan inteligente es DO AI en cada plan?', 'En el plan Gratis, DO AI resuelve tareas del día a día. En Pro y Business, DO AI opera con mayor capacidad de análisis, razonamiento y ejecución de tareas complejas.'],
        ['¿El límite diario se reinicia?', 'Sí, a medianoche hora del servidor.'],
      ] as [string, string][],
    },
  },

  login: {
    phone: {
      title: 'Ingresa tu número',
      subtitle: 'Te enviaremos un código SMS para verificar tu cuenta',
      placeholder: 'Número de teléfono',
      searchPlaceholder: 'Buscar país o código',
      cancel: 'Cancelar',
      continue: 'Continuar',
      sending: 'Enviando…',
      disclaimer: 'Al continuar aceptas los Términos de servicio y la Política de privacidad de DO Chat',
      disclaimerPrefix: 'Al continuar aceptas nuestros',
      disclaimerTerms: 'Términos de servicio',
      disclaimerAnd: 'y la',
      disclaimerPrivacy: 'Política de privacidad',
      backHome: 'Volver al inicio',
      errorShort: 'Ingresa un número válido',
      errorSMS: 'Error enviando SMS',
    },
    otp: {
      title: 'Código de verificación',
      subtitle: 'Enviamos un SMS al',
      edit: 'Editar',
      back: 'Volver',
      verifying: 'Verificando…',
      resendIn: 'Reenviar código en',
      resend: 'Reenviar código',
      smsHint: 'Revisa tu SMS. El código tiene 6 dígitos y expira en 10 minutos. También funciona pegando el código directamente.',
      errorCode: 'Ingresa el código completo',
      errorWrong: 'Código incorrecto',
    },
    profile: {
      title: '¿Cómo te llamas?',
      subtitle: 'Este nombre será visible para tus contactos en DO Chat',
      photoLabel: 'Foto de perfil',
      photoOptional: '(opcional)',
      placeholder: 'Tu nombre completo',
      creating: 'Creando perfil…',
      enter: 'Entrar a DO Chat',
      almostDone: 'Ya casi listo — este es el último paso',
      errorShort: 'Mínimo 2 caracteres',
      errorLong: 'Máximo 30 caracteres',
      errorExpired: 'Sesión expirada, intenta de nuevo',
      errorGeneric: 'Error',
    },
  },

  app: {
    tabs: { contacts: 'Contactos', calls: 'Llamadas', files: 'Archivos', messages: 'Mensajes', you: 'Tú' },
    chat: { placeholder: 'Mensaje…', send: 'Enviar', ai: 'DO AI', online: 'en línea', today: 'Hoy', yesterday: 'Ayer', noMessages: 'Sin mensajes aún', typeMessage: 'Escribe un mensaje',
      lastSeenRecently: 'última vez hace poco', lastSeenTodayAt: 'última vez hoy a las', lastSeenYesterdayAt: 'última vez ayer a las',
      lastSeenOnAt: 'última vez el {day} a las', lastSeenOn: 'última vez el {date}',
      smartAssistant: 'Asistente inteligente', participants: '{n} participantes', isTyping: '{name} está escribiendo…',
      taskAssignedMsg: '📋 Tarea asignada a {name}: {content}', taskDue: '📅 Vence: {date}',
    },
    chats: {
      search: 'Buscar mensajes, chats…', newGroup: 'Nuevo grupo', newContact: 'Nuevo contacto',
      aiSubtitle: 'Tu asistente inteligente', aiSubtitleDefault: 'Tu asistente · siempre activo',
      todayPanel: 'Lo importante de hoy',
      inviteTitle: 'Invitar a DO Chat', inviteSubtitle: 'Comparte tu enlace personal',
      shareLink: 'Compartir enlace de invitación', shareText: 'Únete a DO Chat — el mensajero de negocios con IA integrada.',
      copyLink: '¡Link copiado!',
      pinned: 'Fijados', allChats: 'Todos los chats', archived: 'Archivadas',
      empty: 'Toca + para agregar contactos y empezar a chatear',
      noResults: 'Sin resultados para', minChars: 'Escribe al menos 2 caracteres para buscar',
      conversation: 'conversación', conversations: 'conversaciones',
      welcomeTitle: '¡Bienvenido, {name}!',
      welcomeSubtitle: 'Tu espacio de trabajo está listo. Habla con DO AI o agrega a tu equipo.',
      welcomeCTAAI: 'Hablar con @do',
      welcomeCTAAIHint: 'Tu asistente de IA',
      welcomeCTAContact: 'Agregar contacto',
      welcomeCTAContactHint: 'Invita a tu equipo',
    },
    files: {
      title: 'Archivos', search: 'Buscar…', select: 'Seleccionar', cancel: 'Cancelar', newProject: '+ Proyecto',
      filterAll: 'Todo', filterProjects: 'Proyectos', filterFiles: 'Archivos', filterImages: 'Imágenes',
      empty: 'Sin contenido aún', emptyHint: 'Sube un archivo con + o pídele a do AI que genere reportes',
      projectsSection: 'Proyectos', filesSection: 'Archivos e imágenes',
      askAI: 'Preguntar a IA', delete: 'Eliminar', selected: 'seleccionado',
      deleteOneFile: '¿Eliminar este archivo?',
      deleteManyFiles: '¿Eliminar {n} archivos?',
      deleteDesc: 'Se eliminará del chat y de esta lista.',
      deleteUndoable: 'Esta acción no se puede deshacer.',
      deleting: 'Eliminando…',
    },
    contacts: {
      title: 'Contactos', search: 'Buscar contacto…', empty: 'Sin contactos aún',
      emptyHint: 'Agrega contactos por teléfono o @usuario', add: 'Agregar contacto', edit: 'Editar contacto',
      cancel: 'Cancelar', save: 'Guardar', saving: 'Guardando…', firstName: 'Nombre', lastName: 'Apellido',
      noResults: 'Sin resultados para',
    },
    profile: {
      yourPlan: 'Tu plan', free: 'Gratis',
      doAIFree: '15 consultas por día', doAIPro: '80 consultas por día · capacidad extendida', doAIBusiness: '200 consultas por día · máxima capacidad',
      manageSub: 'Administrar suscripción', upgrade: 'Planes de pago próximamente',
      logout: 'Cerrar sesión', avatarTitle: 'Foto de perfil', openGallery: 'Abrir galería',
      takePhoto: 'Tomar foto', deletePhoto: 'Eliminar foto de perfil', cancel: 'Cancelar',
      plan: 'Plan', deleteAccount: 'Eliminar cuenta', editProfile: 'Editar perfil',
      title: 'Perfil', nameLabel: 'Nombre', phoneLabel: 'Número de teléfono',
      usernameLabel: 'Usuario', setUsername: 'Configura tu @usuario',
      appearance: 'Apariencia', darkMode: 'Modo oscuro',
      edit: 'Editar', save: 'Guardar', saving: 'Guardando…', checking: 'Verificando…', uploading: 'Subiendo…',
      usernameHint: 'Solo letras, números y guión bajo',
      errorMin: 'Mínimo 3 caracteres', errorTaken: 'Nombre de usuario no disponible', errorSave: 'Error guardando',
    },
    daily: {
      title: 'Lo importante de hoy', send: 'Enviar', all: 'Todos', received: 'Recibidas', sent: 'Enviadas',
      addTask: 'Agregar tarea…', deadline: 'Fecha límite:', remove: 'Quitar',
      receivedSection: '📥 Recibidas', sentSection: '📤 Enviadas', reminders: 'Recordatorios',
      todo: 'Por hacer', completed: 'Completadas', noReceived: 'Sin tareas recibidas', noSent: 'Sin tareas enviadas',
      reminderBadge: 'Recordatorio', taskBadge: 'Tarea', reject: 'Rechazar', accept: 'Aceptar',
      sending: 'Enviando…', sendButton: 'Enviar', sendTitle: 'Enviar tarea o recordatorio',
      sendTo: 'Enviar a', description: 'Descripción', due: 'Fecha límite (opcional)', dateTime: 'Fecha y hora',
      taskType: '📋 Tarea', reminderType: '🔔 Recordatorio', to: 'Para', now: 'Ahora · ',
      tasksReminders: 'Tareas y recordatorios',
      pending: 'Pendiente', overdueBy: 'Vencida hace', daysLeft: 'd restantes', dueToday: 'Vence hoy', dueTomorrow: 'Vence mañana',
      invitePlaceholderTask: 'Ej: Revisar el contrato antes del jueves',
      invitePlaceholderReminder: 'Ej: Llamar al proveedor a las 10am',
      statusPending: 'Esperando aceptación', statusInProgress: 'En proceso', statusCompleted: 'Completada ✓', statusRejected: 'Rechazada',
      dueLabel: 'Vence: {date}', fromLabel: 'De', toLabel: 'Para',
      evidence: 'Ver evidencia', confirmComplete: 'Confirmar', uploadEvidence: '+ Adjuntar archivo / foto', cancelComplete: 'Cancelar',
      markDone: 'Marcar como terminada', nowDot: 'Ahora · ',
      tasksTitle: 'Tareas', myTasks: 'Mis tareas', awaitingResponse: 'Esperando tu respuesta',
      history: 'Historial', noPersonal: 'Sin pendientes por ahora',
      noPersonalHint: 'Pedile a @do que extraiga tareas de tus conversaciones',
      noReceivedHint: 'Cuando alguien te asigne una tarea aparecerá aquí',
      noSentHint: 'Asigna tareas desde un chat para verlas aquí',
      attachEvidence: '¿Adjuntar evidencia? (opcional)', taskRejected: 'Tarea rechazada',
      someone: 'Alguien',
    },
    nav: { chats: 'Chats', tasks: 'Pendientes', projects: 'Proyectos', docs: 'Docs' },
    actions: {
      clearConv: 'Borrar conversación', pinChat: 'Fijar chat', unpin: 'Quitar pin',
      maxPinned: 'Máximo 3 fijados', archiveChat: 'Archivar chat', unarchive: 'Desarchivar',
      enableNotifs: 'Activar notificaciones', muteFor: 'Silenciar por…',
      mute8h: '8 horas', mute1w: '1 semana', muteAlways: 'Siempre',
      deleteContact: 'Eliminar contacto', deleteChat: 'Eliminar chat',
    },
    newContact: {
      title: 'Nuevo contacto', cancel: 'Cancelar', add: 'Agregar', saving: 'Guardando…',
      phone: '📞 Teléfono', username: '@ Usuario', phonePlaceholder: 'Número de teléfono',
      usernamePlaceholder: 'nombre_usuario',
      phoneHint: 'Si el número está registrado en do-chat, se agregará como contacto.',
      usernameHint: 'Ingresa el @usuario exacto de tu contacto en do-chat.',
      errorName: 'Ingresa al menos el nombre', errorUsername: 'Ingresa un @usuario válido',
      errorUserNotFound: 'No se encontró el usuario', errorPhone: 'Ingresa un número de teléfono válido', errorSave: 'Error al guardar',
    },
    newGroup: {
      title: 'Nuevo grupo', cancel: 'Cancelar', create: 'Crear', creating: 'Creando…',
      namePlaceholder: 'Nombre del grupo', contactsSection: 'Contactos',
      noContacts: 'Primero agrega contactos para crear un grupo',
      errorName: 'Ingresa un nombre para el grupo', errorContacts: 'Selecciona al menos un contacto',
      errorCreate: 'Error al crear', participantSingular: 'participante seleccionado', participantPlural: 'participantes seleccionados',
    },
    calls: {
      noContacts: 'Sin contactos para llamar', noContactsHint: 'Agrega contactos para hacer llamadas',
      tapToCall: 'Toca para llamar', noAnswer: 'Sin respuesta', declined: 'Rechazada',
      contactsSection: 'Contactos', recentSection: 'Recientes', clearHistory: 'Borrar', justNow: 'Ahora',
    },
    doScreen: {
      greeting: 'Hola, {name} 👋',
      workingOn: '¿En qué trabajamos?',
      taskTodaySub: 'Revisá tus tareas de hoy',
      taskTomorrowSub: 'Planificá el día de mañana',
    },
    aiLimit: { title: 'Límite diario alcanzado', upgradeHint: 'Mejora a Pro' },
    reminder: { title: 'Recordatorio' },
    camera: { takePhoto: 'Tomar foto' },
  },
}

export const translations = { en, es }
export type T = typeof en

type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: T }

const Ctx = createContext<LangCtx>({ lang: 'en', setLang: () => {}, t: en })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('dochat_lang') as Lang | null
    const userPicked = localStorage.getItem('dochat_lang_v2')
    // Only restore if the user explicitly chose a language after the i18n launch
    if (userPicked && (saved === 'en' || saved === 'es')) setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('dochat_lang', l)
    localStorage.setItem('dochat_lang_v2', '1')
  }

  return <Ctx.Provider value={{ lang, setLang, t: translations[lang] }}>{children}</Ctx.Provider>
}

export function useLanguage() {
  return useContext(Ctx)
}

export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage()
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${className}`}
    >
      <svg className="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
      <span className={lang === 'es' ? 'opacity-100' : 'opacity-40'}>ES</span>
      <span className="opacity-30">/</span>
      <span className={lang === 'en' ? 'opacity-100' : 'opacity-40'}>EN</span>
    </button>
  )
}
