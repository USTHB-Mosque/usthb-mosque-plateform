import { seedBooks } from '@/actions/seed/book'
import { seedMedias } from '@/actions/seed/media'
import { Button } from '@/components/ui/button'

const Seeding = async () => {
  return (
    <div className="p-8 flex flex-wrap gap-8">
      <Button
        onClick={async function () {
          'use server'
          seedBooks(50)
        }}
      >
        Seed Books
      </Button>

      <Button
        onClick={async function () {
          'use server'
          seedMedias(50)
        }}
      >
        Seed Medias
      </Button>
    </div>
  )
}

export default Seeding
