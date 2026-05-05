export async function broadcastToRoom(roomId: string) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({
        messages: [{ topic: `realtime:room:${roomId}`, event: 'msg', payload: { room_id: roomId } }],
      }),
    })
  } catch { /* non-critical — client will fallback poll */ }
}
