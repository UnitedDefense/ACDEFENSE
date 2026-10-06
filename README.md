# ACDefenseCo Website

Professional firearms training and tactical gear e-commerce platform for American Civil Defense Company.

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Database**: PostgreSQL 16 (via Docker) / Turso (production)
- **ORM**: Drizzle ORM 0.45.1
- **Authentication**: NextAuth v5
- **Password Hashing**: bcryptjs
- **Runtime**: Node.js 20

## Features

### Phase 1 (Foundation) - ✅ Complete

- ✅ Next.js 14+ with TypeScript and App Router
- ✅ Docker Compose with PostgreSQL 16
- ✅ Complete database schema with Drizzle ORM (14 tables)
- ✅ Tactical-themed Tailwind CSS + shadcn/ui components
- ✅ NextAuth v5 authentication with protected routes
- ✅ Professional layout (Header + Footer)
- ✅ Database seed script with sample data

### Database Schema

The application uses a comprehensive relational database schema:

**Authentication**
- `users` - User accounts with roles (user/admin)
- `accounts` - OAuth provider accounts
- `sessions` - User sessions

**E-Commerce**
- `product_categories` - Product organization
- `products` - Inventory items (ammo, gear, accessories)
- `cart_items` - Shopping cart contents
- `orders` - Order records with Stripe integration
- `order_items` - Order line items

**Training Courses**
- `courses` - Training course catalog
- `course_schedules` - Upcoming course sessions
- `bookings` - Course enrollments
- `booking_status_history` - Booking status tracking
- `instructor_profiles` - Instructor information

**Content**
- `blog_posts` - Blog articles

## Getting Started

### Prerequisites

- Node.js 20 or higher
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd acdefense-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your configuration:
   ```env
   DATABASE_URL=postgresql://acdefense:dev_password_change_in_prod@localhost:5432/acdefense
   NEXTAUTH_SECRET=your-nextauth-secret-here
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Start PostgreSQL database**
   ```bash
   docker-compose up -d
   ```

5. **Push database schema**
   ```bash
   npm run db:push
   ```

6. **Seed the database** (optional but recommended for development)
   ```bash
   npm run db:seed
   ```

7. **Start development server**
   ```bash
   npm run dev
   ```

8. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Development Workflow

### Database Management

```bash
# Generate migration files
npm run db:generate

# Push schema changes to database
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio

# Seed database with sample data
npm run db:seed
```

### Testing Credentials

After running `npm run db:seed`, you can use these test accounts:

**Admin Account**
- Email: `admin@acdefenseco.com`
- Password: `password123`

**Regular User**
- Email: `user@example.com`
- Password: `password123`

### Build and Deploy

```bash
# Create production build
npm run build

# Start production server
npm run start
```

### Linting

```bash
npm run lint
```

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   └── auth/         # NextAuth API routes
│   ├── login/            # Login page
│   ├── test/             # Component test page
│   ├── layout.tsx        # Root layout with Header/Footer
│   ├── page.tsx          # Homepage
│   ├── globals.css       # Global styles with tactical color palette
│   └── providers.tsx     # SessionProvider wrapper
├── components/            # React components
│   ├── layout/           # Layout components (Header, Footer)
│   └── ui/               # shadcn/ui components
├── lib/                   # Utility libraries
│   ├── db/               # Database configuration
│   │   ├── index.ts      # Drizzle client
│   │   └── schema.ts     # Database schema
│   └── utils.ts          # Utility functions
├── scripts/              # Utility scripts
│   └── seed.ts           # Database seeding script
├── types/                # TypeScript type definitions
│   └── next-auth.d.ts    # NextAuth type extensions
├── auth.ts               # NextAuth configuration
├── middleware.ts         # Authentication middleware
├── drizzle.config.ts     # Drizzle ORM configuration
└── docker-compose.yml    # PostgreSQL container setup
```

## Color Palette

The application uses a tactical-inspired color palette:

**Light Mode**
- Primary: Tactical olive green (`oklch(0.35 0.08 145)`)
- Secondary: Dark slate blue (`oklch(0.45 0.02 240)`)
- Accent: Military green (`oklch(0.4 0.1 150)`)

**Dark Mode**
- Primary: Brighter tactical green (`oklch(0.5 0.12 145)`)
- Secondary: Dark slate (`oklch(0.3 0.03 240)`)
- Accent: Military green accent (`oklch(0.5 0.15 150)`)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://acdefense:dev_password_change_in_prod@localhost:5432/acdefense` |
| `NEXTAUTH_SECRET` | NextAuth session secret | *Required* |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | *Optional* |
| `STRIPE_SECRET_KEY` | Stripe secret key | *Optional* |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | *Optional* |
| `CC_API_KEY` | ConstantContact API key | *Optional* |
| `CC_ACCESS_TOKEN` | ConstantContact access token | *Optional* |

## Docker Services

The `docker-compose.yml` defines the following services:

### PostgreSQL
- **Image**: `postgres:16-alpine`
- **Port**: `5432:5432`
- **Database**: `acdefense`
- **User**: `acdefense`
- **Password**: `dev_password_change_in_prod` (change in production!)
- **Health Check**: Enabled

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f postgres

# Access database shell
docker exec -it acdefense-postgres psql -U acdefense -d acdefense
```

## Authentication

The application uses NextAuth v5 with the following features:

- **Credentials Provider**: Email/password authentication
- **JWT Sessions**: Stateless session management
- **Protected Routes**: Middleware-based route protection
  - `/dashboard`, `/profile`, `/cart`, `/checkout`, `/orders`, `/bookings` - User authentication required
  - `/admin/*` - Admin role required
- **Custom Callbacks**: Extended session with user ID and role

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Copyright © 2024 American Civil Defense Company. All rights reserved.

## Support

For questions or issues, please contact: admin@acdefenseco.com
