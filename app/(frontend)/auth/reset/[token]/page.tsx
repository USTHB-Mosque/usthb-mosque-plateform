import ResetPasswordForm from '@/features/auth/components/ResetPasswordForm'

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return <ResetPasswordForm token={token} />
}
