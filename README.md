# USThB Mosque Platform

A full-stack web application for managing a mosque community platform, featuring a library system, event management, articles/news, and user authentication.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **CMS** | Payload CMS 3 |
| **Database** | Vercel Postgres |
| **File Storage** | Vercel Blob |
| **UI Components** | shadcn/ui |
| **Styling** | Tailwind CSS 4 |
| **State Management** | Zustand |
| **Server State** | React Query |
| **Authentication** | Payload Auth (JWT) |
| **Payments** | PayPal |
| **Email** | Nodemailer (Gmail SMTP) |

## Features

### Community Features
- **Activities/Events** - Browse and register for mosque events
- **Articles/News** - Islamic articles and community news
- **User Authentication** - Register, login, profile management

### Library System
- **Book Catalog** - Browse available books
- **Book Loans** - Borrow and return books
- **Reviews & Ratings** - Rate and review books
- **Favorites** - Save favorite books

### Admin Panel
- Full CMS powered by Payload
- Manage all content (books, events, articles, users)
- Media uploads via Vercel Blob

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── (frontend)/        # Public-facing pages
│   │   ├── activities/    # Events page
│   │   ├── articles/     # Articles/news page
│   │   ├── library/       # Book library
│   │   ├── auth/          # Login/register
│   │   ├── profile/       # User profile
│   │   └── ...
│   └── (payload)/         # Payload admin panel
│       └── admin/         # /admin routes
├── collections/           # Payload collection configs
│   ├── Admin.ts           # Admin users
│   ├── User.ts            # Community members
│   ├── Book.ts            # Library books
│   ├── Activity.ts        # Events
│   ├── Article.ts         # News/articles
│   ├── Loan.ts            # Book loans
│   ├── Media.ts           # File uploads
│   └── ...
├── components/            # React components
│   └── ui/                # shadcn/ui components
├── actions/               # Server Actions
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and helpers
├── interfaces/            # TypeScript interfaces
├── utils/                 # Utility functions
├── payload.config.ts     # Payload CMS configuration
└── next.config.ts         # Next.js configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended)
- Vercel account (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd usthb-mosque-plateform
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Required variables:
   ```env
   NEXT_PUBLIC_SERVER_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   PAYLOAD_SECRET=your_random_secret_string
   POSTGRES_URL=your_postgres_connection_string
   BLOB_READ_WRITE_TOKEN=your_blob_token
   BLOB_STORE_ID=your_blob_store_id
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   ```

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open the application**
   - Frontend: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

### Generating Types

After modifying Payload collections, regenerate TypeScript types:
```bash
pnpm payload:importmap
```

### Running Migrations

When database schema changes:
```bash
pnpm payload:migrate
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm payload:importmap` | Regenerate import map |
| `pnpm payload:migrate` | Run database migrations |

## Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Make** your changes
4. **Test** your changes locally
5. **Commit** with clear messages: `git commit -m "Add feature description"`
6. **Push** to your fork: `git push origin feature/your-feature`
7. **Create** a Pull Request

### Code Standards

- **TypeScript** - Use TypeScript for all new code
- **Naming** - Use descriptive names (camelCase for variables, PascalCase for components)
- **Components** - Use functional components with hooks
- **Styling** - Use Tailwind CSS classes; follow shadcn/ui patterns
- **Payload** - Follow Payload best practices (see AGENTS.md)

### Before Submitting

1. Run `pnpm lint` to check for issues
2. Test your changes thoroughly
3. Update documentation if needed
4. Ensure your branch is up to date with main

### Pull Request Guidelines

- Title: Clear, concise description
- Description: Explain what/why/how
- Link related issues
- Request review from maintainers

### Reporting Issues

- Use GitHub Issues
- Provide clear reproduction steps
- Include environment details

## Deployment

### Vercel (Recommended)

1. Connect repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Required Environment Variables (Production)

```env
NEXT_PUBLIC_SERVER_URL=https://yourdomain.com
PAYLOAD_SECRET=<random-64-chars>
POSTGRES_URL=<vercel-postgres-connection-string>
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>
BLOB_STORE_ID=<vercel-blob-store-id>
EMAIL_USER=<production-email>
EMAIL_PASSWORD=<app-password>
NODE_ENV=production
```

## License

This project is for educational purposes.

## Support

- Open an issue for bugs or feature requests
- Contact maintainers for questions
