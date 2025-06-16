# Schedule Service

A Next.js 15 schedule coordination service using PostgreSQL and Prisma ORM with JWT-based authentication.

## Features

- User authentication with JWT tokens
- Event management and participant coordination  
- Schedule availability management
- Automatic matching engine for event scheduling
- Real-time schedule coordination

## Local Development

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Yarn package manager

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```

3. Start PostgreSQL database:
   ```bash
   yarn db:up
   ```

4. Run database migrations:
   ```bash
   yarn db:migrate
   ```

5. Start the development server:
   ```bash
   yarn dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Database Commands

- `yarn db:up` - Start PostgreSQL database with Docker
- `yarn db:down` - Stop PostgreSQL database
- `yarn db:migrate` - Run Prisma migrations (development)
- `yarn db:reset` - Reset database with fresh migrations (force)
- `yarn db:reset:soft` - Reset database with confirmation prompt
- `yarn db:studio` - Open Prisma Studio (http://localhost:5555)
- `yarn db:seed` - Seed database with sample data (if configured)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment on Vercel

### Prerequisites

1. **Vercel Postgres Database**: Create a Postgres database in your Vercel project
2. **Environment Variables**: Set up the following in your Vercel project settings:

```bash
DATABASE_URL="postgresql://username:password@host:port/database"
JWT_SECRET="your-strong-jwt-secret-key"
```

### Setup Instructions

1. **Connect Repository**: Connect your GitHub repository to Vercel
2. **Create Database**: 
   - Go to your Vercel project dashboard
   - Navigate to "Storage" tab
   - Click "Create Database" → "Postgres"
   - Choose a database name (e.g., `schedule-service-db`)
3. **Set Environment Variables**:
   - Go to "Settings" → "Environment Variables"
   - Add the following variables:
     - `DATABASE_URL`: Prisma Accelerate URL (starts with `prisma+postgres://`)
     - `DIRECT_URL`: Direct PostgreSQL URL for migrations (from database Connect tab)
     - `JWT_SECRET`: Strong random value for JWT signing
4. **Deploy Application**: Push to main branch or trigger manual deployment

### Database Migration

After deploying to Vercel, you **MUST** run the database migration:

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Navigate to your project directory
cd your-project

# Option 1: Use the convenient script
yarn deploy:db

# Option 2: Manual steps
yarn vercel:env          # Pull environment variables
yarn vercel:migrate      # Run database migration
```

### Verification

Check if the migration was successful:

```bash
# View database with Prisma Studio (optional)
yarn vercel:studio

# Or check migration status
npx prisma migrate status
```

**Important**: The application will not work until the database migration is completed!
