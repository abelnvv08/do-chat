import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ handle: string }>
}

export default async function InvitePage({ params }: Props) {
  const { handle } = await params
  const clean = handle.replace(/^@/, '').toLowerCase()
  redirect(`/login?ref=${clean}`)
}
