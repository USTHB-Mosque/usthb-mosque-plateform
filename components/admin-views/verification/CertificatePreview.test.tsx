import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Media } from '@/payload-types'

import CertificatePreview from './CertificatePreview'

function media(overrides: Partial<Media> = {}): Media {
  return {
    id: 3,
    url: '/api/media/file/certificate.png',
    mimeType: 'image/png',
    filename: 'certificate.png',
    ...overrides,
  } as unknown as Media
}

/** Every src/href the component rendered, wherever it is in the tree. */
function renderedUrls(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('img, a, iframe, embed, object')).flatMap((node) =>
    [node.getAttribute('src'), node.getAttribute('href'), node.getAttribute('data')].filter(
      (value): value is string => Boolean(value),
    ),
  )
}

describe('CertificatePreview', () => {
  it('previews the document inline through the protected media route', () => {
    const { container } = render(<CertificatePreview document={media()} />)

    const preview = screen.getByTestId('certificate-preview-image')
    expect(preview).toHaveAttribute('src', '/api/media/file/certificate.png')
    expect(renderedUrls(container).every((url) => url.startsWith('/api/media/file/'))).toBe(true)
  })

  it('refuses to render a storage bucket URL and says so instead', () => {
    const { container } = render(
      <CertificatePreview
        document={media({ url: 'http://127.0.0.1:9000/media/media/cert.png' })}
      />,
    )

    expect(screen.queryByTestId('certificate-preview-image')).toBeNull()
    expect(screen.getByText('تعذر عرض الوثيقة')).toBeInTheDocument()
    expect(renderedUrls(container)).toEqual([])
  })

  it('offers a full-size view that still points at the protected route', async () => {
    render(<CertificatePreview document={media()} />)

    await userEvent.click(screen.getByRole('button', { name: 'عرض الوثيقة' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('certificate-dialog-image')).toHaveAttribute(
      'src',
      '/api/media/file/certificate.png',
    )
  })

  it('opens a PDF through the protected route rather than an <iframe> of a bucket URL', async () => {
    render(
      <CertificatePreview
        document={media({ url: '/api/media/file/certificate.pdf', mimeType: 'application/pdf' })}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'عرض الوثيقة' }))

    expect(screen.getByRole('link', { name: /فتح الوثيقة/ })).toHaveAttribute(
      'href',
      '/api/media/file/certificate.pdf',
    )
    expect(screen.queryByTestId('certificate-dialog-image')).toBeNull()
  })

  it('renders nothing actionable when the member uploaded no document', () => {
    const { container } = render(<CertificatePreview document={undefined} />)

    expect(screen.queryByRole('button', { name: 'عرض الوثيقة' })).toBeNull()
    expect(screen.getByText('لا توجد وثيقة مرفقة')).toBeInTheDocument()
    expect(renderedUrls(container)).toEqual([])
  })
})
