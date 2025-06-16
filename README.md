# Schedule Service

A Next.js 15 schedule coordination service using Prisma Accelerate and JWT-based authentication.

## Features

- User authentication with JWT tokens
- Event management and participant coordination  
- Schedule availability management
- Automatic matching engine for event scheduling
- Real-time schedule coordination
- High-performance database access with Prisma Accelerate

## Local Development

### Prerequisites

- Node.js 18+
- Yarn package manager
- Prisma Accelerate account and API key

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```

3. Set up environment variables:
   Create a `.env` file with your Prisma Accelerate connection string:
   ```bash
   DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY"
   JWT_SECRET="your-jwt-secret"
   ```

4. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

5. Start the development server:
   ```bash
   yarn dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Database Commands

- `yarn db:studio` - Open Prisma Studio (http://localhost:5555)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment on Vercel

### Prerequisites

- Prisma Accelerate account with a configured database
- Environment variables configured in Vercel project settings

### Setup Instructions

1. **Connect Repository**: Connect your GitHub repository to Vercel

2. **Set Environment Variables**:
   - Go to "Settings" → "Environment Variables" in your Vercel project
   - Add the following variables:
     - `DATABASE_URL`: Your Prisma Accelerate connection string (starts with `prisma+postgres://`)
     - `JWT_SECRET`: Strong random value for JWT signing

3. **Deploy Application**: Push to main branch or trigger manual deployment

### Database Setup

Since we're using Prisma Accelerate, database schema is managed through Prisma Accelerate's interface:

1. Set up your database schema in Prisma Accelerate dashboard
2. The application will automatically connect using the provided `DATABASE_URL`

### Verification

Test your deployment by visiting your Vercel app URL and verifying authentication and data operations work correctly.
