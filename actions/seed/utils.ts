import { fakerAR as faker } from '@faker-js/faker'

export const generateLexicalRichText = () => {
  const nodes = [
    {
      type: 'heading',
      tag: 'h1',
      format: 'right',
      indent: 0,
      version: 1,
      children: [
        {
          text: faker.lorem.sentence(),
          type: 'text',
          version: 1,
        },
      ],
    },

    {
      type: 'paragraph',
      format: 'right',
      indent: 0,
      version: 1,
      children: [
        {
          text: 'هذا نص عادي ',
          type: 'text',
          version: 1,
        },
        {
          text: 'وهذا نص غامق ومهم جداً',
          type: 'text',
          format: 1,
          version: 1,
        },
        {
          text: ` ${faker.lorem.sentence()}`,
          type: 'text',
          version: 1,
        },
      ],
    },

    {
      type: 'list',
      listType: 'bullet',
      tag: 'ul',
      format: 'right',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'listitem',
          value: 1,
          version: 1,
          children: [{ text: faker.lorem.sentence(), type: 'text', version: 1 }],
        },
        {
          type: 'listitem',
          value: 2,
          version: 1,
          children: [{ text: faker.lorem.sentence(), type: 'text', version: 1 }],
        },
      ],
    },

    {
      type: 'quote',
      format: 'right',
      indent: 0,
      version: 1,
      children: [
        {
          text: faker.lorem.paragraph(),
          type: 'text',
          version: 1,
        },
      ],
    },

    {
      type: 'heading',
      tag: 'h2',
      format: 'right',
      indent: 0,
      version: 1,
      children: [
        {
          text: faker.lorem.words(3),
          type: 'text',
          version: 1,
        },
      ],
    },
  ]

  return {
    root: {
      type: 'root',
      format: 'right',
      indent: 0,
      version: 1,
      direction: 'rtl',
      children: nodes,
    },
  }
}
