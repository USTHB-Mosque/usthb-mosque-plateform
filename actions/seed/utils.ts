import { fakerAR as faker } from '@faker-js/faker'

export const generateLexicalRichText = () => {
  return {
    root: {
      type: 'root',
      format: 'right',
      indent: 0,
      version: 1,
      direction: 'rtl',
      children: [
        {
          type: 'heading',
          tag: 'h1',
          direction: 'rtl',
          format: 'right',
          version: 1,
          children: [{ text: faker.lorem.sentence(), type: 'text', version: 1 }],
        },
        {
          type: 'paragraph',
          direction: 'rtl',
          format: 'right',
          version: 1,
          children: [{ text: faker.lorem.paragraph(), type: 'text', version: 1 }],
        },
        {
          type: 'list',
          listType: 'bullet',
          direction: 'rtl',
          version: 1,
          children: Array.from({ length: 3 }).map(() => ({
            type: 'listitem',
            version: 1,
            children: [{ text: faker.lorem.sentence(), type: 'text', version: 1 }],
          })),
        },
        {
          type: 'heading',
          tag: 'h2',
          direction: 'rtl',
          format: 'right',
          version: 1,
          children: [{ text: faker.lorem.words(3), type: 'text', version: 1 }],
        },
        {
          type: 'paragraph',
          direction: 'rtl',
          format: 'right',
          version: 1,
          children: [
            { text: 'كلمة مهمة جدا: ', type: 'text', version: 1 },
            {
              text: faker.lorem.words(2),
              type: 'text',
              format: 1,
              version: 1,
            },
            { text: ' ثم نواصل النص بشكل عادي ', type: 'text', version: 1 },
            {
              text: faker.lorem.words(2),
              type: 'text',
              format: 2,
              version: 1,
            },
          ],
        },
      ],
    },
  }
}
