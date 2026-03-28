import { seedActivities } from '@/actions/seed/activities'
import { seedArticles } from '@/actions/seed/articles'
import { seedBooks } from '@/actions/seed/book'
import { updateRichText } from '@/actions/seed/helpers'
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

      <Button
        onClick={async function () {
          'use server'
          seedArticles(50)
        }}
      >
        Seed Articles
      </Button>

      <Button
        onClick={async function () {
          'use server'
          updateRichText()
        }}
      >
        Update Rich Texts
      </Button>

      <Button
        onClick={async function () {
          'use server'
          seedActivities(50)
        }}
      >
        Seed Activities
      </Button>
    </div>
  )
}

export default Seeding
