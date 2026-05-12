'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { RoomView } from '../RoomView'

export default function ChatRoomPage({ params }: { params: Promise<{ userId: string; roomId: string }> }) {
  const { userId, roomId } = use(params)
  const router = useRouter()
  return <RoomView userId={userId} roomId={roomId} onBack={() => router.push(`/chat/${userId}`)} />
}
