import type { Payload } from 'payload'
import { generateLexicalRichText } from './utils'

export async function updateRichText(payload: Payload) {
  console.log('Start updating')
  await payload.update({
    collection: 'books',
    where: {
      id: { exists: true },
    },
    data: {
      longDescription: generateLexicalRichText() as any,
    },
  })

  await payload.update({
    collection: 'articles',
    where: {
      id: { exists: true },
    },
    data: {
      content: generateLexicalRichText() as any,
    },
  })
  console.log('End updating')
}
