import { fakerAR as faker } from '@faker-js/faker'

export const generateLexicalRichText = (nodesCount: number = 3) => {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: Array.from({ length: nodesCount }).map(() => ({
        type: 'paragraph',
        direction: 'rtl',
        format: 'right',
        indent: 0,
        version: 1,
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: faker.lorem.paragraph(),
            type: 'text',
            version: 1,
          },
        ],
      })),
    },
  }
}
