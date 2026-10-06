# ACDefenseCo Website - React Admin Implementation Context

**Date**: 2026-01-30
**Phase**: Phase 1 Foundation Complete + React Admin Addition
**Status**: Implementation Complete, Build Passing, Tests Pending

---

## Project Overview

### What We Built
A comprehensive Next.js 16 website for American Civil Defense Company (ACDefenseCo) with:
- Training course booking and calendar integration
- E-commerce shop for ammunition, gear, and accessories
- Web-based admin interface for content management
- Secure authentication with role-based access control
- PostgreSQL database with Drizzle ORM
- Docker Compose for local development

### Tech Stack
- **Frontend**: Next.js 16.1.6, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js App Router API routes, NextAuth v5 (beta)
- **Database**: PostgreSQL 16, Drizzle ORM 0.45.1
- **Admin**: React Admin 5.14.1
- **Dev Tools**: Docker Compose, tsx with --env-file
- **Future**: Stripe payments, ConstantContact integration, Cloudflare hosting

---

## Key Technical Decisions

### 1. React Admin SSR Fix Pattern

**Problem**: React Admin requires browser APIs (document, window) that aren't available during Next.js server-side rendering, causing "ReferenceError: document is not defined" during build.

**Solution**: Next.js dynamic import with `ssr: false`

**Implementation**:
```typescript
// app/admin/page.tsx
"use client";
import dynamic from "next/dynamic";

const AdminApp = dynamic(() => import("./AdminApp"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        <p className="text-muted-foreground">Loading admin interface...</p>
      </div>
    </div>
  ),
});

export default function AdminPage() {
  return <AdminApp />;
}
```

**Why This Works**:
- `ssr: false` tells Next.js to skip server-side rendering
- Component only renders on client side after hydration
- Loading spinner provides feedback during client-side load
- Build completes successfully without SSR errors
- Pattern applicable to any browser-only library

**Reference**: app/admin/page.tsx:1-20, app/admin/AdminApp.tsx:1-25

---

### 2. Next.js 16 Async Params Pattern

**Breaking Change**: Next.js 16 changed route handler params from synchronous to asynchronous.

**Old Pattern** (Next.js 15):
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const courseId = parseInt(params.id);
  // ...
}
```

**New Pattern** (Next.js 16):
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const courseId = parseInt(id);
  // ...
}
```

**Applied To**:
- app/api/admin/courses/[id]/route.ts:8-38 (GET)
- app/api/admin/courses/[id]/route.ts:40-84 (PUT)
- app/api/admin/courses/[id]/route.ts:86-118 (DELETE)
- app/api/admin/schedules/[id]/route.ts:8-38 (GET)
- app/api/admin/schedules/[id]/route.ts:40-80 (PUT)
- app/api/admin/schedules/[id]/route.ts:82-114 (DELETE)

**TypeScript Error Without This**:
```
Type '{ params: Promise<{ id: string; }>; }' is not assignable to type '{ params: { id: string; }; }'
```

---

### 3. React Admin Data Provider Architecture

**Purpose**: Bridge between React Admin UI and our REST API

**Implementation**: lib/dataProvider.ts

**Key Mappings**:
| React Admin Operation | HTTP Method | API Endpoint | Response Format |
|----------------------|-------------|--------------|-----------------|
| getList | GET | /api/admin/{resource} | `{ data: [], total: number }` |
| getOne | GET | /api/admin/{resource}/{id} | `{ data: {} }` |
| create | POST | /api/admin/{resource} | `{ data: {} }` |
| update | PUT | /api/admin/{resource}/{id} | `{ data: {} }` |
| delete | DELETE | /api/admin/{resource}/{id} | `{ data: {} }` |

**Code Example**:
```typescript
export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const url = `${apiUrl}/${resource}`;
    const { json } = await httpClient(url);
    return {
      data: json.data,
      total: json.total,
    };
  },
  // ... other operations
};
```

**Authentication**: All API endpoints verify admin role via NextAuth:
```typescript
const session = await auth();
if (!session || session.user.role !== "admin") {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Reference**: lib/dataProvider.ts:1-111

---

### 4. Database Schema Design

**Total Tables**: 14

**Core Tables**:
- **users**: Authentication, roles (admin/instructor/student)
- **courses**: Training course catalog (name, slug, description, price, duration, capacity)
- **courseSchedules**: Specific class dates and availability
- **bookings**: User enrollments in scheduled courses
- **products**: E-commerce items (ammo, gear, accessories)
- **orders**: Purchase transactions
- **orderItems**: Line items for orders

**Key Relationships**:
```typescript
// courseSchedules references courses
courseId: integer("course_id").notNull().references(() => courses.id)

// bookings references both users and schedules
userId: integer("user_id").notNull().references(() => users.id)
scheduleId: integer("schedule_id").notNull().references(() => courseSchedules.id)
```

**Seeded Data**:
- Admin user: `admin@acdefense.com` / `admin123`
- 3 sample courses (Defensive Pistol, Tactical Rifle, First Aid)
- 6 scheduled classes across courses
- 10 sample products

**Reference**: lib/db/schema.ts, scripts/seed.ts

---

## File Structure and Responsibilities

### Admin Interface
```
app/admin/
├── page.tsx              # Entry point, dynamic import wrapper
├── AdminApp.tsx          # React Admin setup, resources config
├── courses.tsx           # Course CRUD views
└── schedules.tsx         # Schedule CRUD views with course references
```

### API Routes
```
app/api/admin/
├── courses/
│   ├── route.ts          # GET (list), POST (create)
│   └── [id]/route.ts     # GET, PUT, DELETE (single course)
└── schedules/
    ├── route.ts          # GET (list with joins), POST (create)
    └── [id]/route.ts     # GET, PUT, DELETE (single schedule)
```

### Data Layer
```
lib/
├── db/
│   ├── index.ts          # Drizzle client
│   └── schema.ts         # Database schema definitions
└── dataProvider.ts       # React Admin API integration
```

### Configuration
```
├── .env.local            # Environment variables (DATABASE_URL, AUTH_SECRET)
├── docker-compose.yml    # PostgreSQL container
├── drizzle.config.ts     # Drizzle ORM config
└── package.json          # Dependencies and scripts
```

---

## Common Patterns and Recipes

### Pattern 1: Adding New Resource to React Admin

**Steps**:
1. **Create API routes**:
   ```
   app/api/admin/{resource}/route.ts       # List & create
   app/api/admin/{resource}/[id]/route.ts  # Get, update, delete
   ```

2. **Create views file**:
   ```typescript
   // app/admin/{resource}.tsx
   export const ResourceList = () => (
     <List>
       <Datagrid>
         <TextField source="id" />
         <TextField source="name" />
         <EditButton />
         <DeleteButton />
       </Datagrid>
     </List>
   );

   export const ResourceEdit = () => (
     <Edit>
       <SimpleForm>
         <TextInput source="name" validate={[required()]} />
       </SimpleForm>
     </Edit>
   );

   export const ResourceCreate = () => (
     <Create>
       <SimpleForm>
         <TextInput source="name" validate={[required()]} />
       </SimpleForm>
     </Create>
   );
   ```

3. **Register in AdminApp**:
   ```typescript
   // app/admin/AdminApp.tsx
   import { ResourceList, ResourceEdit, ResourceCreate } from "./resource";

   <Resource
     name="resource"
     list={ResourceList}
     edit={ResourceEdit}
     create={ResourceCreate}
   />
   ```

**Data provider automatically handles API integration** - no additional code needed!

---

### Pattern 2: Handling Foreign Key References

**Use Case**: Linking schedules to courses, orders to users, etc.

**Implementation**:
```typescript
// app/admin/schedules.tsx
<ReferenceInput source="courseId" reference="courses">
  <SelectInput optionText="name" fullWidth validate={[required()]} />
</ReferenceInput>
```

**Key Points**:
- `source="courseId"` matches database column name
- `reference="courses"` tells React Admin which resource to fetch
- `optionText="name"` specifies which field to display in dropdown
- **Validation goes on SelectInput, not ReferenceInput**

**Display in List View**:
```typescript
<ReferenceField source="courseId" reference="courses" label="Course">
  <TextField source="name" />
</ReferenceField>
```

**Reference**: app/admin/schedules.tsx:26-28, 44-46, 67-69

---

### Pattern 3: Client-Only Components

**Use Case**: Any library requiring browser APIs (window, document, localStorage, etc.)

**Generic Template**:
```typescript
import dynamic from "next/dynamic";

const ClientComponent = dynamic(
  () => import("./ClientComponent"),
  {
    ssr: false,
    loading: () => <LoadingState />
  }
);

export default function Page() {
  return <ClientComponent />;
}
```

**Variations**:
```typescript
// No loading state
const ClientComponent = dynamic(() => import("./ClientComponent"), {
  ssr: false
});

// With error handling
const ClientComponent = dynamic(() => import("./ClientComponent"), {
  ssr: false,
  loading: () => <LoadingState />,
  onError: (error) => <ErrorState error={error} />
});
```

**When to Use**:
- Chart libraries (Chart.js, Recharts with window)
- Map libraries (Leaflet, Mapbox)
- Rich text editors (TinyMCE, Quill)
- Any library with `document.querySelector()`, `window.addEventListener()`, etc.

**Reference**: app/admin/page.tsx:5-16

---

### Pattern 4: Environment Variable Loading

**Problem**: tsx doesn't automatically load .env files

**Solution**: Use `--env-file` flag

**package.json**:
```json
{
  "scripts": {
    "db:seed": "tsx --env-file=.env.local scripts/seed.ts",
    "db:migrate": "tsx --env-file=.env.local scripts/migrate.ts"
  }
}
```

**Why This Matters**:
- No need for manual `dotenv.config()`
- Works with TypeScript (.ts) files
- Consistent with Next.js environment variable handling
- Prevents "password authentication failed" errors

**Reference**: package.json:9, scripts/seed.ts

---

## Testing Instructions

### Setup
```bash
cd /home/chicagojoe/.config/superpowers/worktrees/acdefense-website/feature/initial-setup

# Start services
docker compose up -d

# Verify database connection
npm run db:push

# Seed test data
npm run db:seed

# Build application
npm run build

# Start development server (optional)
npm run dev
```

### Testing Admin Interface

1. **Access Application**:
   - URL: `http://localhost:3000/`
   - Should see homepage with navigation

2. **Sign In as Admin**:
   - Click "Sign In" in header
   - Email: `admin@acdefense.com`
   - Password: `admin123`
   - Should redirect to homepage with "Admin" button visible

3. **Access Admin Interface**:
   - Click "Admin" button in header
   - Should see React Admin dashboard
   - Left sidebar shows "Courses" and "Schedules"

4. **Test Course Management**:
   - Click "Courses" in sidebar
   - Should see 3 seeded courses in table
   - Click "Create" to add new course
   - Fill all fields, click "Save"
   - Verify new course appears in list
   - Click "Edit" on a course
   - Modify fields, click "Save"
   - Click "Delete" on test course (not the seeded ones)

5. **Test Schedule Management**:
   - Click "Schedules" in sidebar
   - Should see 6 seeded schedules with course names
   - Click "Create" to add new schedule
   - Select course from dropdown (ReferenceInput)
   - Choose dates, set seats and status
   - Click "Save"
   - Verify new schedule appears with correct course name
   - Click "Edit" on a schedule
   - Modify dates/status, click "Save"
   - Click "Delete" on test schedule

6. **Test Access Control**:
   - Sign out
   - Try to access `/admin` directly
   - Should redirect to login
   - Sign in with non-admin user (if available)
   - Should not see "Admin" button in header

### Expected Results
- ✅ Build completes without errors
- ✅ All pages render without 404s
- ✅ Admin interface loads (no "document is not defined" error)
- ✅ CRUD operations work for courses and schedules
- ✅ Course dropdown in schedule form shows all courses
- ✅ Access control prevents non-admin access

---

## Troubleshooting Guide

### Issue: "document is not defined" during build
**Cause**: Component using browser APIs during SSR
**Solution**: Use dynamic import with `ssr: false`
**Reference**: Pattern 3 above

### Issue: "Type 'Promise<{ id: string }>' is not assignable..."
**Cause**: Not using Next.js 16 async params pattern
**Solution**: Add `Promise<>` wrapper and `await params`
**Reference**: Pattern 2 in Key Technical Decisions

### Issue: "password authentication failed"
**Cause**: Environment variables not loaded
**Solution**: Use `tsx --env-file=.env.local`
**Reference**: Pattern 4 above

### Issue: ReferenceInput validation error
**Cause**: Validation prop on ReferenceInput instead of SelectInput
**Solution**: Move `validate={[required()]}` to child SelectInput
**Reference**: app/admin/schedules.tsx:44-46

### Issue: Missing imports in React Admin views
**Cause**: Forgot to import component from react-admin
**Solution**: Check imports, add missing components
**Common**: `TextInput`, `NumberInput`, `DateTimeInput`, `SelectInput`

---

## Next Steps and Future Work

### Phase 2: Booking System
- [ ] Calendar view for available classes
- [ ] User enrollment flow
- [ ] Seat availability tracking
- [ ] Waitlist functionality
- [ ] Email confirmations via ConstantContact

### Phase 3: E-Commerce
- [ ] Product catalog with categories
- [ ] Shopping cart functionality
- [ ] Stripe payment integration
- [ ] Order tracking
- [ ] Inventory management

### Phase 4: User Dashboard
- [ ] Enrolled courses view
- [ ] Upcoming classes
- [ ] Order history
- [ ] Certificate downloads

### Phase 5: Instructor Features
- [ ] Class roster management
- [ ] Attendance tracking
- [ ] Student progress notes
- [ ] Certificate issuance

### Admin Enhancements
- [ ] Add products resource to React Admin
- [ ] Add users resource to React Admin
- [ ] Add bookings resource to React Admin
- [ ] Bulk operations for schedules
- [ ] File upload for course images
- [ ] Export data to CSV
- [ ] Analytics dashboard

### Infrastructure
- [ ] Set up Cloudflare domain
- [ ] Configure production database
- [ ] Set up CI/CD pipeline
- [ ] Add monitoring and logging
- [ ] Configure backup strategy

---

## Git Commit History

### Most Recent Commits
1. `48b1efc` - feat: add React Admin interface for course and schedule management
2. `[previous]` - fix: create placeholder pages for navigation
3. `[previous]` - fix: update db:seed script to use tsx --env-file
4. `[previous]` - feat: complete Phase 1 foundation setup

### Branching Strategy
- **Main branch**: `main`
- **Current branch**: `feature/initial-setup`
- **Worktree location**: `~/.config/superpowers/worktrees/acdefense-website/feature/initial-setup`

---

## References and Resources

### Documentation
- [Next.js 16 Docs](https://nextjs.org/docs)
- [React Admin Docs](https://marmelab.com/react-admin/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [NextAuth v5 Docs](https://authjs.dev/)
- [shadcn/ui Components](https://ui.shadcn.com/)

### Key Files for Future Reference
- `app/admin/page.tsx` - SSR fix pattern
- `lib/dataProvider.ts` - React Admin integration pattern
- `app/api/admin/courses/[id]/route.ts` - Next.js 16 async params pattern
- `app/admin/schedules.tsx` - ReferenceInput pattern
- `scripts/seed.ts` - Database seeding example

### Design Reference
- Original inspiration: [Ghost Ring Tactical](https://ghostringtactical.com)
- Company info: [American Civil Defense Company](https://www.americancivildefensecompany.com/)

---

**Last Updated**: 2026-01-30
**Context Saved By**: Claude Sonnet 4.5
**Session**: feature/initial-setup worktree
