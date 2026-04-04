'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'

const Seeding = () => {
  const [loading, setLoading] = useState<string | null>(null)

  const runSeed = async (action: string, count: number) => {
    setLoading(action)
    try {
      const res = await fetch(`/api/seed/${action}?count=${count}`, { method: 'POST' })
      const data = await res.json()
      console.log(data)
      alert(`Seeded ${data.seeded} ${action}`)
    } catch (err) {
      console.error(err)
      alert(`Failed to seed ${action}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-8 flex flex-wrap gap-8">
      <Button onClick={() => runSeed('books', 50)} disabled={loading !== null}>
        {loading === 'books' ? 'Seeding...' : 'Seed Books'}
      </Button>

      <Button onClick={() => runSeed('media', 50)} disabled={loading !== null}>
        {loading === 'media' ? 'Seeding...' : 'Seed Medias'}
      </Button>

      <Button onClick={() => runSeed('articles', 50)} disabled={loading !== null}>
        {loading === 'articles' ? 'Seeding...' : 'Seed Articles'}
      </Button>

      <Button onClick={() => runSeed('activities', 50)} disabled={loading !== null}>
        {loading === 'activities' ? 'Seeding...' : 'Seed Activities'}
      </Button>

      <Button onClick={() => runSeed('loans', 30)} disabled={loading !== null}>
        {loading === 'loans' ? 'Seeding...' : 'Seed Loans'}
      </Button>

      <Button onClick={() => runSeed('favorites', 30)} disabled={loading !== null}>
        {loading === 'favorites' ? 'Seeding...' : 'Seed Book Favorites'}
      </Button>

      <Button onClick={() => runSeed('registrations', 30)} disabled={loading !== null}>
        {loading === 'registrations' ? 'Seeding...' : 'Seed Activity Registrations'}
      </Button>

      <Button onClick={() => runSeed('all', 50)} disabled={loading !== null}>
        {loading === 'all' ? 'Seeding...' : 'Seed All'}
      </Button>
    </div>
  )
}

export default Seeding
