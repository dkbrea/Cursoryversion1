# Pocket Ledger - Personal Finance Management App

A comprehensive personal finance management application built with Next.js and Supabase.

## Features

- 💰 Transaction tracking and categorization
- 📊 Account balance management
- 🎯 Financial goal setting and tracking
- 💳 Debt management and payoff strategies
- 📈 Financial forecasting
- 🔄 Recurring transaction management
- 📱 Responsive mobile-first design

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **UI Components**: Radix UI, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **AI Integration**: Google Genkit
- **State Management**: React Query
- **Form Handling**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pocket-ledger
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials and other required environment variables.

4. **Set up the database**
   ```bash
   # Run the schema creation
   node run_schema.js
   
   # Run migrations
   node run-migrations-supabase.js
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Environment Variables

Required environment variables (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for migrations)
- `SUPABASE_DB_PASSWORD` - Your database password
- `GOOGLE_AI_API_KEY` - Google AI API key (optional, for AI features)

## Production Deployment

### Deployment Checklist

- [ ] Environment variables configured in production
- [ ] Database migrations run
- [ ] SSL certificate configured
- [ ] Error monitoring set up
- [ ] Analytics configured
- [ ] Performance monitoring enabled

### Recommended Platforms

- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- **Docker** with any cloud provider

### Security Considerations

- Row Level Security (RLS) enabled on all database tables
- Authentication required for all user data
- Security headers configured
- CORS properly configured
- Environment variables secured

## Database Schema

The application uses a comprehensive PostgreSQL schema with:

- User management and authentication
- Financial accounts and transactions
- Categories and tags
- Debt tracking and management
- Goal setting and progress tracking
- Recurring transactions
- Investment tracking

## API Documentation

The application uses Supabase for all backend operations:

- Authentication: Supabase Auth
- Database: PostgreSQL with RLS
- Real-time: Supabase Realtime
- Storage: Supabase Storage (if needed)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks

### Code Style

- TypeScript for type safety
- ESLint + Prettier for code formatting
- Tailwind CSS for styling
- Component-based architecture

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

Private project - All rights reserved.
