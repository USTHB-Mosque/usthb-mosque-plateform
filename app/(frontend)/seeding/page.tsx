import { seedActivities } from '@/utils/seed/activities'
import { seedArticles } from '@/utils/seed/articles'
import { seedBooks } from '@/utils/seed/book'
import { updateRichText } from '@/utils/seed/helpers'
import { seedMedias } from '@/utils/seed/media'
import { seedLoans } from '@/utils/seed/loans'
import { seedBookFavorites } from '@/utils/seed/book-favorites'
import { seedActivityRegistrations } from '@/utils/seed/activity-registrations'
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

      <Button
        onClick={async function () {
          'use server'
          seedLoans(30)
        }}
      >
        Seed Loans
      </Button>

      <Button
        onClick={async function () {
          'use server'
          seedBookFavorites(30)
        }}
      >
        Seed Book Favorites
      </Button>

      <Button
        onClick={async function () {
          'use server'
          seedActivityRegistrations(30)
        }}
      >
        Seed Activity Registrations
      </Button>
    </div>
  )
}

export default Seeding
