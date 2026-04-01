# USThB Mosque Platform

A full-stack web application for managing a mosque community platform, featuring a library system, event management, articles/news, and user authentication.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **CMS** | Payload CMS 3 |
| **Database** | PostgreSQL (Local Supabase) / Remote Supabase |
| **File Storage** | Supabase S3 (Local & Remote) |
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
- Media uploads via Supabase S3

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

### Environment Setup

This project uses Supabase for both database and storage:

| Environment | Database | File Storage | Config File |
|-------------|----------|--------------|-------------|
| **Development** | Local Supabase (via CLI) | Local Supabase S3 | `.env.local` |
| **Preview/Production** | Remote Supabase | Remote Supabase S3 | `.env` |

The configuration uses `@payloadcms/db-postgres` and `@payloadcms/storage-s3` for all environments.

### Prerequisites

- Node.js 18+
- pnpm (recommended)
- Docker (required for Supabase CLI)
- Remote Supabase account (for preview/production)

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

3. **Start local Supabase**
   ```bash
   pnpm supabase:start
   ```

4. **Create storage bucket** (first time only)
   ```bash
   pnpm supabase:bucket
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

   This will start:
   - Local Supabase stack (PostgreSQL, Storage, etc.)
   - Next.js development server
   
   The app will be available at http://localhost:3000

### Environment Variables

#### Development (`.env.local`)
```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
S3_ENDPOINT=http://127.0.0.1:54321/storage/v1/s3
S3_ACCESS_KEY_ID=625729a08b95bf1b7ff351a663f3a23c
S3_SECRET_ACCESS_KEY=850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
S3_BUCKET=media
S3_REGION=local
```

#### Preview/Production (`.env`)
```env
NODE_ENV=preview
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres
S3_ENDPOINT=https://[PROJECT-REF].supabase.co/storage/v1/s3
S3_ACCESS_KEY_ID=[YOUR-ACCESS-KEY-ID]
S3_SECRET_ACCESS_KEY=[YOUR-SECRET-ACCESS-KEY]
S3_BUCKET=media
S3_REGION=[YOUR-REGION]
```

   For **preview/production** (`.env`):
   ```env
   NODE_ENV=preview
   POSTGRES_URL=your_vercel_postgres_connection_string
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
   BLOB_STORE_ID=your_vercel_blob_store_id
   ```

4. **Start local PostgreSQL**
   ```bash
   # Using Docker (single container)
   docker run -d \
     --name postgres \
     -p 5432:5432 \
     -e POSTGRES_DB=usthb_mosque \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     postgres:16-alpine
   
   # Or using system PostgreSQL service
   sudo service postgresql start
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Open the application**
   - Frontend: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

### Running with Preview Environment

To test the preview/production setup locally:

1. **Ensure you have the `.env` file configured** with remote Supabase credentials
2. **Run the build and start commands**
   ```bash
   pnpm build
   pnpm start
   ```

This will use remote Supabase for database and storage.

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
| `pnpm dev` | Start local Supabase + Next.js dev server |
| `pnpm dev:stop` | Stop local Supabase |
| `pnpm dev:preview` | Start dev server with preview config (uses `.env`) |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm payload:importmap` | Regenerate import map |
| `pnpm payload:migrate` | Run database migrations |
| `pnpm supabase:start` | Start local Supabase stack |
| `pnpm supabase:stop` | Stop local Supabase stack |
| `pnpm supabase:status` | View local Supabase status |

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
2. Configure environment variables in Vercel dashboard (use `.env` format)
3. Deploy automatically on push to main

### Required Environment Variables (Preview/Production)

```env
NEXT_PUBLIC_SERVER_URL=https://yourdomain.com
PAYLOAD_SECRET=<random-64-chars>
DATABASE_URL=<supabase-postgres-connection-string>
S3_ENDPOINT=<supabase-s3-endpoint>
S3_ACCESS_KEY_ID=<supabase-s3-access-key>
S3_SECRET_ACCESS_KEY=<supabase-s3-secret-key>
S3_BUCKET=media
S3_REGION=<supabase-region>
EMAIL_USER=<production-email>
EMAIL_PASSWORD=<app-password>
NODE_ENV=preview  # or 'production'
```

### Environment Configuration Summary

| Environment | NODE_ENV | Database | Storage | Config File |
|-------------|----------|----------|---------|-------------|
| **Local Dev** | `development` | Local Supabase | Local Supabase S3 | `.env.local` |
| **Vercel Preview** | `preview` | Remote Supabase | Remote Supabase S3 | `.env` |
| **Vercel Production** | `production` | Remote Supabase | Remote Supabase S3 | `.env` |

The app uses `@payloadcms/db-postgres` and `@payloadcms/storage-s3` for all environments.

## License

This project is for educational purposes.

## Support

- Open an issue for bugs or feature requests
- Contact maintainers for questions
