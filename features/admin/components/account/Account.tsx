import { redirect } from 'next/navigation'

/** The retained Payload account view uses the same guarded settings flow. */
export default function AdminAccount() {
  redirect('/admin-panel/settings')
}
