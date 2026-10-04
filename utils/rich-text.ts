import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

/**
 * Serialize plain text (as edited in a textarea dialog) into a minimal
 * Payload lexical (richText) state with one paragraph per line.
 */
export function plainTextToLexical(text: string): SerializedEditorState {
  const paragraphs = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      type: 'paragraph',
      version: 1,
      textFormat: 0,
      direction: null,
      format: '',
      indent: 0,
      children: [
        { type: 'text', version: 1, detail: 0, format: 0, mode: 'normal', style: '', text: line },
      ],
    }))

  return {
    root: {
      type: 'root',
      version: 1,
      direction: 'rtl',
      format: '',
      indent: 0,
      children: paragraphs,
    },
  } as unknown as SerializedEditorState
}

/**
 * Flatten a Payload lexical (richText) state back to plain text for textarea pre-fill.
 */
export function lexicalToPlainText(data: SerializedEditorState | null | undefined): string {
  const parts: string[] = []
  const walk = (node: unknown) => {
    const n = node as { type?: string; text?: string; children?: unknown[] } | null
    if (!n) return
    if (n.type === 'text') parts.push(n.text ?? '')
    else if (n.type === 'linebreak') parts.push('\n')
    else if (Array.isArray(n.children)) for (const child of n.children) walk(child)
  }
  const children = (data?.root as { children?: unknown[] } | undefined)?.children ?? []
  for (const child of children) {
    walk(child)
    const type = (child as { type?: string } | null)?.type
    if (type !== 'linebreak') parts.push('\n')
  }
  return parts.join('').replace(/\n+$/, '')
}
