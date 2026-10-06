# Dynamic Route Pages Design - Courses, Products, Blog Posts

**Date:** 2026-02-02
**Status:** Approved
**Approach:** Server Components with Direct DB Queries

---

## Overview

Implement dynamic detail pages for courses, products, and blog posts using Next.js 14+ Server Components with direct database queries via Drizzle ORM. Update existing list pages to display actual data from the database instead of placeholder content.

**Goals:**
- Create detail pages accessible via `/courses/[slug]`, `/shop/[slug]`, `/blog/[slug]`
- Update list pages to display database content
- Implement proper SEO with dynamic metadata
- Handle errors and edge cases gracefully
- Maintain visual consistency with existing UI components

---

## Architecture

### File Structure

```
app/
├── courses/
│   ├── page.tsx                    # List page (update existing)
│   └── [slug]/
│       ├── page.tsx                # Detail page (new)
│       ├── not-found.tsx           # Custom 404 (new)
│       └── error.tsx               # Error boundary (new)
├── shop/
│   ├── page.tsx                    # List page (update existing)
│   └── [slug]/
│       ├── page.tsx                # Detail page (new)
│       ├── not-found.tsx           # Custom 404 (new)
│       └── error.tsx               # Error boundary (new)
└── blog/
    ├── page.tsx                    # List page (update existing)
    └── [slug]/
        ├── page.tsx                # Detail page (new)
        ├── not-found.tsx           # Custom 404 (new)
        └── error.tsx               # Error boundary (new)
```

### Key Architectural Decisions

1. **Server Components by default** - All pages are async Server Components that query database directly
2. **Static metadata** - Each detail page exports `generateMetadata` for SEO
3. **notFound() handling** - Invalid slugs return proper 404 pages using Next.js `notFound()`
4. **Consistent UI patterns** - Use existing shadcn/ui components (Card, Button, Badge)
5. **Image handling** - Next.js Image component with fallbacks for missing images

### Data Flow

1. Page receives `params.slug` from URL
2. Query database using Drizzle ORM: `where(eq(table.slug, slug))`
3. If no result found, call `notFound()`
4. If found, render detail page with data
5. Related data fetched in parallel with `Promise.all()`

---

## Course Pages Implementation

### Course Detail Page (`app/courses/[slug]/page.tsx`)

**Display Sections:**

1. **Hero Section**
   - Course name (h1 heading)
   - Tagline (subtitle, if available)
   - Price prominently displayed
   - "Book Now" CTA button

2. **Course Information Grid**
   - Duration (hours)
   - Max capacity (seats available)
   - Prerequisites (if any)
   - Full description with proper typography

3. **Visual Elements**
   - Course image with fallback to placeholder
   - Responsive layout (stacked mobile, side-by-side desktop)

4. **Upcoming Classes Section**
   - Query course schedules
   - Show next 3 upcoming sessions
   - Display dates, available seats, status

**Database Queries:**

```typescript
// Main course query
const [course] = await db
  .select()
  .from(courses)
  .where(eq(courses.slug, params.slug))
  .limit(1);

if (!course) notFound();

// Upcoming schedules for this course
const schedules = await db
  .select()
  .from(courseSchedules)
  .where(eq(courseSchedules.courseId, course.id))
  .where(gte(courseSchedules.startDate, new Date()))
  .orderBy(asc(courseSchedules.startDate))
  .limit(3);
```

**Metadata:**

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.slug, params.slug))
    .limit(1);

  if (!course) return { title: 'Course Not Found' };

  return {
    title: `${course.name} | ACDefenseCo`,
    description: course.tagline || course.description?.substring(0, 160),
    openGraph: {
      title: course.name,
      description: course.tagline,
      images: course.imageUrl ? [course.imageUrl] : [],
      type: 'website',
    },
  };
}
```

### Courses List Page (`app/courses/page.tsx`)

**Replace "Coming Soon" with actual course listing:**

1. **Fetch all courses from database**
   ```typescript
   const allCourses = await db
     .select()
     .from(courses)
     .orderBy(asc(courses.name));
   ```

2. **Display in responsive grid**
   - 1 column mobile
   - 2 columns tablet (md:grid-cols-2)
   - 3 columns desktop (lg:grid-cols-3)

3. **Each course card shows:**
   - Course image with fallback
   - Course name
   - Tagline (if available)
   - Price formatted as currency
   - Duration badge ("X hours")
   - "View Details" button → `/courses/[slug]`

4. **Empty state**
   - If `courses.length === 0`, show existing "Coming Soon" card
   - Graceful degradation

**Component Structure:**

```tsx
export default async function CoursesPage() {
  const courses = await db.select().from(courses).orderBy(asc(courses.name));

  if (courses.length === 0) {
    return <ComingSoonCard />; // Keep existing placeholder
  }

  return (
    <div className="container px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Training Courses</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
```

---

## Product Pages Implementation

### Product Detail Page (`app/shop/[slug]/page.tsx`)

**Display Sections:**

1. **Product Gallery**
   - Multiple images in carousel/gallery
   - Zoom on hover or click
   - Fallback to placeholder if no images

2. **Product Information**
   - Product name (h1)
   - Price prominently displayed
   - Category badge (linkable)
   - Stock status indicator:
     - "In Stock" (green) if inventoryCount > 10
     - "Low Stock" (yellow) if inventoryCount 1-10
     - "Out of Stock" (red) if inventoryCount = 0
   - Full description

3. **Actions**
   - "Add to Cart" button (placeholder for now)
   - Quantity selector
   - "Save for Later" option (future)

4. **Related Products** (future enhancement)
   - Query products in same category
   - Show 3-4 related items

**Database Query:**

```typescript
const [product] = await db
  .select({
    product: products,
    category: productCategories,
  })
  .from(products)
  .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
  .where(eq(products.slug, params.slug))
  .limit(1);

if (!product) notFound();
```

### Shop List Page (`app/shop/page.tsx`)

**Update to display products:**

1. **Fetch products with categories**
2. **Grid layout** (similar to courses)
3. **Each product card:**
   - First image from images array
   - Product name
   - Price
   - Category badge
   - Stock status
   - "View Details" button

4. **Optional filtering** (future)
   - Filter by category
   - Price range slider
   - Search functionality

---

## Blog Post Pages Implementation

### Blog Post Detail Page (`app/blog/[slug]/page.tsx`)

**Display Sections:**

1. **Article Header**
   - Post title (h1)
   - Author name
   - Published date (formatted nicely)
   - Reading time estimate (optional)

2. **Article Content**
   - Full content with prose typography classes
   - Proper paragraph spacing
   - Code blocks if present
   - Images inline if referenced

3. **Article Footer**
   - Author bio (if available)
   - Share buttons (future)
   - Related posts (future)

**Database Query:**

```typescript
const [post] = await db
  .select()
  .from(blogPosts)
  .where(eq(blogPosts.slug, params.slug))
  .where(isNotNull(blogPosts.publishedAt)) // Only published posts
  .limit(1);

if (!post) notFound();
```

### Blog List Page (`app/blog/page.tsx`)

**Update to display posts:**

1. **Fetch published posts only**
   ```typescript
   const posts = await db
     .select()
     .from(blogPosts)
     .where(isNotNull(blogPosts.publishedAt))
     .orderBy(desc(blogPosts.publishedAt));
   ```

2. **List or grid layout**
3. **Each post card:**
   - Title
   - Excerpt (first 150 chars of content)
   - Author
   - Published date
   - "Read More" link

---

## Error Handling & Edge Cases

### Database Connection Issues

- Next.js error boundary catches and displays error UI
- Create custom `error.tsx` for each route
- Provides "Try again" button that resets error boundary
- Errors logged for debugging

**Example `error.tsx`:**

```tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container py-12">
      <Card>
        <CardHeader>
          <CardTitle>Something went wrong!</CardTitle>
        </CardHeader>
        <CardContent>
          <p>We couldn't load this page. Please try again.</p>
          <Button onClick={reset} className="mt-4">Try again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Missing or Invalid Data

**Graceful fallbacks:**

```typescript
// Handle null/undefined fields
const displayPrice = course.price || "Contact for pricing";
const displayImage = course.imageUrl || "/images/course-placeholder.jpg";
const displayDescription = course.description || "Description coming soon.";
const displayTagline = course.tagline || "";
```

### Custom 404 Pages

**Example `not-found.tsx`:**

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CourseNotFound() {
  return (
    <div className="container py-12 text-center">
      <h1 className="text-4xl font-bold mb-4">Course Not Found</h1>
      <p className="text-muted-foreground mb-6">
        The course you're looking for doesn't exist or has been removed.
      </p>
      <Button asChild>
        <Link href="/courses">View All Courses</Link>
      </Button>
    </div>
  );
}
```

### Image Handling

**Next.js Image component with fallbacks:**

```tsx
<Image
  src={course.imageUrl || '/images/course-placeholder.jpg'}
  alt={course.name}
  width={800}
  height={400}
  className="rounded-lg object-cover"
  onError={(e) => {
    e.currentTarget.src = '/images/course-placeholder.jpg';
  }}
/>
```

### Concurrent Requests

**Parallelize related queries:**

```typescript
const [course, schedules] = await Promise.all([
  db.select().from(courses).where(eq(courses.slug, slug)).limit(1),
  db.select().from(courseSchedules).where(eq(courseSchedules.courseId, courseId))
]);
```

### TypeScript Safety

**Infer types from schema:**

```typescript
type Course = typeof courses.$inferSelect;
type CourseWithSchedules = Course & {
  schedules?: Array<typeof courseSchedules.$inferSelect>;
};
```

---

## SEO & Metadata

### Dynamic Metadata Generation

Each detail page exports `generateMetadata` for optimal SEO:

**Benefits:**
- Dynamic page titles in browser tabs and search results
- Open Graph tags for social media sharing (Twitter, Facebook, LinkedIn)
- Proper meta descriptions for search engines
- Crawlable by search engines (Server Components = HTML in initial response)

**Example for all routes:**

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const item = await fetchItem(params.slug); // Course, product, or post

  if (!item) {
    return { title: 'Not Found | ACDefenseCo' };
  }

  return {
    title: `${item.name || item.title} | ACDefenseCo`,
    description: item.description?.substring(0, 160),
    openGraph: {
      title: item.name || item.title,
      description: item.tagline || item.description,
      images: item.imageUrl ? [item.imageUrl] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: item.name || item.title,
      description: item.tagline || item.description,
      images: item.imageUrl ? [item.imageUrl] : [],
    },
  };
}
```

### Static Generation Strategy

- Pages dynamically rendered by default (good for frequently updated content)
- Next.js caches on CDN automatically in production
- Option to add `generateStaticParams()` later for common slugs (better performance)

**Future optimization:**

```typescript
export async function generateStaticParams() {
  const courses = await db.select({ slug: courses.slug }).from(courses);
  return courses.map(course => ({ slug: course.slug }));
}
```

### URL Structure

- Slugs validated by unique constraint in database
- Case-sensitive slugs (match database exactly)
- Invalid characters handled by Next.js routing (404)

---

## Performance Considerations

### Query Optimization

- Database queries fast (slug columns indexed)
- Use `.limit(1)` for single item queries
- Parallel queries with `Promise.all()` for related data
- Select only needed columns (not implemented initially, but easy to add)

### Client-Side Performance

- Server Components = no client-side hydration cost
- Minimal JavaScript shipped to browser
- Images lazy-loaded below the fold
- Use Next.js Image optimization

### Caching Strategy

- Next.js automatically caches on CDN in production
- Revalidation happens automatically
- Can add explicit revalidation tags later if needed

---

## UI Components

### Shared Components

**All routes will use existing shadcn/ui components:**

- `Card`, `CardHeader`, `CardTitle`, `CardContent` - Container components
- `Button` - CTAs and actions
- `Badge` - Status indicators, categories, tags
- Next.js `Image` - Optimized images
- Next.js `Link` - Client-side navigation

### Consistent Patterns

**Card structure:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>{title}</CardTitle>
    {subtitle && <CardDescription>{subtitle}</CardDescription>}
  </CardHeader>
  <CardContent>
    {/* Content here */}
  </CardContent>
</Card>
```

**Price display:**
```tsx
<p className="text-3xl font-bold">
  ${parseFloat(price).toFixed(2)}
</p>
```

**Status badges:**
```tsx
<Badge variant={status === 'open' ? 'default' : 'secondary'}>
  {status}
</Badge>
```

---

## Future Enhancements

**Out of scope for initial implementation:**

1. **Search functionality** - Add search bar to list pages
2. **Filtering** - Filter by category, price range, date
3. **Sorting** - Sort by price, date, popularity
4. **Reviews/Ratings** - User reviews for courses and products
5. **Shopping cart** - Full e-commerce cart functionality
6. **Wishlist** - Save items for later
7. **Related items** - "You might also like" sections
8. **Breadcrumb navigation** - Show page hierarchy
9. **Loading skeletons** - Better loading states with `loading.tsx`
10. **Pagination** - For list pages with many items

---

## Testing Strategy

### Manual Testing Checklist

**For each route type (courses, products, blog):**

- [ ] Valid slug loads correctly
- [ ] Invalid slug shows 404 page
- [ ] Metadata appears in page source (view source, check `<title>` and `<meta>` tags)
- [ ] Images load or show fallback
- [ ] Responsive layout works (mobile, tablet, desktop)
- [ ] Links work correctly
- [ ] Empty fields show graceful fallbacks
- [ ] Error boundary catches database errors
- [ ] List pages display items from database
- [ ] Empty list pages show appropriate message

### Automated Testing (Future)

- E2E tests with Playwright (already set up)
- Test valid/invalid slugs
- Test metadata generation
- Test error boundaries

---

## Implementation Notes

### Order of Implementation

1. **Course detail page** - Complete implementation with all sections
2. **Courses list page** - Update to display courses
3. **Product detail page** - Similar to courses, product-specific fields
4. **Shop list page** - Update to display products
5. **Blog post detail page** - Content-focused layout
6. **Blog list page** - Update to display posts
7. **Error pages** - `not-found.tsx` and `error.tsx` for each route
8. **Testing** - Manual testing with Playwright screenshots

### Database Access

**Import Drizzle client:**
```typescript
import { db } from '@/lib/db';
import { courses, courseSchedules } from '@/lib/db/schema';
import { eq, gte, asc, desc, isNotNull } from 'drizzle-orm';
```

### Common Imports

```typescript
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
```

---

## Success Criteria

Implementation is complete when:

1. ✅ All three detail page types are accessible via slug URLs
2. ✅ All three list pages display actual database content
3. ✅ Invalid slugs return proper 404 pages
4. ✅ Metadata is set correctly for SEO
5. ✅ Images display with fallbacks
6. ✅ Responsive layout works on all screen sizes
7. ✅ Error boundaries handle database errors
8. ✅ No TypeScript errors
9. ✅ Build completes successfully (`npm run build`)
10. ✅ Manual testing confirms all functionality works

---

## Conclusion

This design implements a modern, performant approach to dynamic content pages using Next.js 14+ Server Components. The pattern is consistent across all three content types (courses, products, blog posts) while respecting their unique data structures and display requirements.

The implementation prioritizes:
- **Performance** - Server Components, optimized queries, minimal client JS
- **SEO** - Dynamic metadata, crawlable HTML, social sharing
- **User Experience** - Graceful fallbacks, clear error messages, responsive design
- **Maintainability** - Consistent patterns, TypeScript safety, existing UI components
- **Extensibility** - Easy to add features like search, filtering, reviews later

Next step: Create implementation plan and execute.
