self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  const isCall = data.data?.type === 'incoming-call'

  const options = {
    body: data.body ?? '',
    icon: '/dochatlogo.png',
    badge: '/dochatlogo.png',
    tag: data.tag ?? 'do-chat',
    renotify: true,
    requireInteraction: isCall, // keep call notification visible until dismissed
    data: data.data ?? {},
    actions: isCall ? [
      { action: 'answer', title: '✅ Contestar' },
      { action: 'decline', title: '❌ Rechazar' },
    ] : [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'DO Chat', options)
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const d = event.notification.data ?? {}

  if (event.action === 'decline') return // just close

  // For call notifications or tap: open the room
  const url = d.type === 'incoming-call' && d.userId && d.roomId
    ? `/demo/${d.userId}/${d.roomId}?incoming_call=1`
    : (d.url ?? '/demo')

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Focus existing window if open
      for (const client of list) {
        if (client.url.includes('/demo') && 'focus' in client) {
          client.focus()
          client.postMessage({ type: 'incoming-call', roomId: d.roomId, callerName: d.callerName, hasVideo: d.hasVideo })
          return
        }
      }
      return clients.openWindow(url)
    })
  )
})
