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
- `yarn db:migrate` - Run Prisma migrations
- `yarn db:reset` - Reset database with fresh migrations  
- `yarn db:studio` - Open Prisma Studio

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

1. Connect your GitHub repository to Vercel
2. Set up Vercel Postgres database in your project dashboard
3. Copy the `DATABASE_URL` from Vercel Postgres to your environment variables
4. Generate a strong JWT secret and add it to environment variables
5. Deploy your application

### Database Migration

After deploying to Vercel, you need to run the database migration:

```bash
# Install Vercel CLI
npm i -g vercel

# Run migration on production database
vercel env pull .env.production
npx prisma migrate deploy
```

The application will automatically generate Prisma Client during the build process with optimized settings for production.
