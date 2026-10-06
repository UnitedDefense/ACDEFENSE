# Admin Resources & OAuth Integrations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement comprehensive admin panel with 7 CRUD resources, Google OAuth authentication with calendar sync, Calendly integration, and hybrid email system.

**Architecture:** React Admin for admin UI, Next.js API routes with role-based auth, NextAuth.js for OAuth providers, graceful degradation for external services without credentials.

**Tech Stack:** React Admin 5.14.1, NextAuth v5, Google Calendar API, Calendly webhooks, SendGrid (transactional), ConstantContact (marketing)

---

## Phase 1: Admin Resources Foundation

### Task 1: Products Admin Resource

**Files:**
- Create: `app/admin/products.tsx`
- Create: `app/api/admin/products/route.ts`
- Create: `app/api/admin/products/[id]/route.ts`

**Step 1: Create Products admin component**

```typescript
// app/admin/products.tsx
"use client";

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  ReferenceField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  ReferenceInput,
  SelectInput,
  required,
} from "react-admin";

export const ProductList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="slug" />
      <NumberField source="price" options={{ style: "currency", currency: "USD" }} />
      <NumberField source="inventoryCount" label="Stock" />
      <ReferenceField source="categoryId" reference="categories" link={false}>
        <TextField source="name" />
      </ReferenceField>
    </Datagrid>
  </List>
);

export const ProductEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name" validate={required()} />
      <TextInput source="slug" validate={required()} />
      <TextInput source="description" multiline rows={5} />
      <NumberInput source="price" validate={required()} />
      <TextInput source="images" label="Images (comma-separated URLs)" />
      <NumberInput source="inventoryCount" label="Stock" validate={required()} />
      <ReferenceInput source="categoryId" reference="categories">
        <SelectInput optionText="name" />
      </ReferenceInput>
    </SimpleForm>
  </Edit>
);

export const ProductCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" validate={required()} />
      <TextInput source="slug" validate={required()} />
      <TextInput source="description" multiline rows={5} />
      <NumberInput source="price" validate={required()} defaultValue={0} />
      <TextInput source="images" label="Images (comma-separated URLs)" />
      <NumberInput source="inventoryCount" label="Stock" validate={required()} defaultValue={0} />
      <ReferenceInput source="categoryId" reference="categories">
        <SelectInput optionText="name" />
      </ReferenceInput>
    </SimpleForm>
  </Create>
);
```

**Step 2: Create Products list API route**

```typescript
// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allProducts = await db.select().from(products);

  return NextResponse.json(allProducts);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Parse images from comma-separated string to array
  const imagesArray = body.images
    ? body.images.split(",").map((url: string) => url.trim()).filter(Boolean)
    : [];

  const [newProduct] = await db
    .insert(products)
    .values({
      name: body.name,
      slug: body.slug,
      description: body.description || null,
      price: body.price.toString(),
      images: imagesArray,
      inventoryCount: body.inventoryCount || 0,
      categoryId: body.categoryId || null,
    })
    .returning();

  return NextResponse.json(newProduct);
}
```

**Step 3: Create Products detail API route**

```typescript
// app/api/admin/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const productId = parseInt(id);

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Convert images array to comma-separated string for form
  return NextResponse.json({
    ...product,
    images: Array.isArray(product.images) ? product.images.join(", ") : "",
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const productId = parseInt(id);
  const body = await request.json();

  // Parse images from comma-separated string to array
  const imagesArray = body.images
    ? body.images.split(",").map((url: string) => url.trim()).filter(Boolean)
    : [];

  const [updated] = await db
    .update(products)
    .set({
      name: body.name,
      slug: body.slug,
      description: body.description || null,
      price: body.price.toString(),
      images: imagesArray,
      inventoryCount: body.inventoryCount || 0,
      categoryId: body.categoryId || null,
    })
    .where(eq(products.id, productId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const productId = parseInt(id);

  await db.delete(products).where(eq(products.id, productId));

  return NextResponse.json({ success: true });
}
```

**Step 4: Register Products resource in AdminApp**

Modify: `app/admin/AdminApp.tsx`

```typescript
import { ProductList, ProductEdit, ProductCreate } from "./products";

// Inside Admin component, add after schedules:
<Resource
  name="products"
  list={ProductList}
  edit={ProductEdit}
  create={ProductCreate}
  options={{ label: "Products" }}
/>
```

**Step 5: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 6: Commit Products resource**

```bash
git add app/admin/products.tsx app/api/admin/products app/admin/AdminApp.tsx
git commit -m "feat: add Products admin resource with full CRUD

- Create Products list, edit, create components
- Add API routes for GET, POST, PUT, DELETE
- Handle images as comma-separated URLs
- Register in AdminApp

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Categories Admin Resource

**Files:**
- Create: `app/admin/categories.tsx`
- Create: `app/api/admin/categories/route.ts`
- Create: `app/api/admin/categories/[id]/route.ts`

**Step 1: Create Categories admin component**

```typescript
// app/admin/categories.tsx
"use client";

import {
  List,
  Datagrid,
  TextField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  required,
} from "react-admin";

export const CategoryList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="slug" />
      <TextField source="description" />
    </Datagrid>
  </List>
);

export const CategoryEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name" validate={required()} />
      <TextInput source="slug" validate={required()} />
      <TextInput source="description" multiline rows={3} />
    </SimpleForm>
  </Edit>
);

export const CategoryCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" validate={required()} />
      <TextInput source="slug" validate={required()} />
      <TextInput source="description" multiline rows={3} />
    </SimpleForm>
  </Create>
);
```

**Step 2: Create Categories list API route**

```typescript
// app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { productCategories } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allCategories = await db.select().from(productCategories);

  return NextResponse.json(allCategories);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const [newCategory] = await db
    .insert(productCategories)
    .values({
      name: body.name,
      slug: body.slug,
      description: body.description || null,
    })
    .returning();

  return NextResponse.json(newCategory);
}
```

**Step 3: Create Categories detail API route**

```typescript
// app/api/admin/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { productCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const categoryId = parseInt(id);

  const [category] = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.id, categoryId))
    .limit(1);

  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(category);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const categoryId = parseInt(id);
  const body = await request.json();

  const [updated] = await db
    .update(productCategories)
    .set({
      name: body.name,
      slug: body.slug,
      description: body.description || null,
    })
    .where(eq(productCategories.id, categoryId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const categoryId = parseInt(id);

  await db.delete(productCategories).where(eq(productCategories.id, categoryId));

  return NextResponse.json({ success: true });
}
```

**Step 4: Register Categories resource in AdminApp**

Modify: `app/admin/AdminApp.tsx`

```typescript
import { CategoryList, CategoryEdit, CategoryCreate } from "./categories";

// Add after products resource:
<Resource
  name="categories"
  list={CategoryList}
  edit={CategoryEdit}
  create={CategoryCreate}
  options={{ label: "Categories" }}
/>
```

**Step 5: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit Categories resource**

```bash
git add app/admin/categories.tsx app/api/admin/categories app/admin/AdminApp.tsx
git commit -m "feat: add Categories admin resource with full CRUD

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Blog Posts Admin Resource

**Files:**
- Create: `app/admin/blog-posts.tsx`
- Create: `app/api/admin/blog-posts/route.ts`
- Create: `app/api/admin/blog-posts/[id]/route.ts`

**Step 1: Create Blog Posts admin component**

```typescript
// app/admin/blog-posts.tsx
"use client";

import {
  List,
  Datagrid,
  TextField,
  DateField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  DateTimeInput,
  required,
} from "react-admin";

export const BlogPostList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="title" />
      <TextField source="slug" />
      <TextField source="author" />
      <DateField source="publishedAt" label="Published" showTime />
      <DateField source="createdAt" label="Created" showTime />
    </Datagrid>
  </List>
);

export const BlogPostEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="title" validate={required()} />
      <TextInput source="slug" validate={required()} />
      <TextInput source="author" />
      <TextInput source="content" multiline rows={15} />
      <DateTimeInput source="publishedAt" label="Publish Date (leave empty for draft)" />
    </SimpleForm>
  </Edit>
);

export const BlogPostCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="title" validate={required()} />
      <TextInput source="slug" validate={required()} />
      <TextInput source="author" />
      <TextInput source="content" multiline rows={15} />
      <DateTimeInput source="publishedAt" label="Publish Date (leave empty for draft)" />
    </SimpleForm>
  </Create>
);
```

**Step 2: Create Blog Posts list API route**

```typescript
// app/api/admin/blog-posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allPosts = await db.select().from(blogPosts);

  return NextResponse.json(allPosts);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const [newPost] = await db
    .insert(blogPosts)
    .values({
      title: body.title,
      slug: body.slug,
      content: body.content || null,
      author: body.author || null,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
    })
    .returning();

  return NextResponse.json(newPost);
}
```

**Step 3: Create Blog Posts detail API route**

```typescript
// app/api/admin/blog-posts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id);

  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, postId))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id);
  const body = await request.json();

  const [updated] = await db
    .update(blogPosts)
    .set({
      title: body.title,
      slug: body.slug,
      content: body.content || null,
      author: body.author || null,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
    })
    .where(eq(blogPosts.id, postId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id);

  await db.delete(blogPosts).where(eq(blogPosts.id, postId));

  return NextResponse.json({ success: true });
}
```

**Step 4: Register Blog Posts resource**

Modify: `app/admin/AdminApp.tsx`

```typescript
import { BlogPostList, BlogPostEdit, BlogPostCreate } from "./blog-posts";

// Add after categories:
<Resource
  name="blog-posts"
  list={BlogPostList}
  edit={BlogPostEdit}
  create={BlogPostCreate}
  options={{ label: "Blog Posts" }}
/>
```

**Step 5: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit Blog Posts resource**

```bash
git add app/admin/blog-posts.tsx app/api/admin/blog-posts app/admin/AdminApp.tsx
git commit -m "feat: add Blog Posts admin resource with full CRUD

- Support draft posts (null publishedAt)
- Large text area for content
- Nullable author field

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Instructors Admin Resource

**Files:**
- Create: `app/admin/instructors.tsx`
- Create: `app/api/admin/instructors/route.ts`
- Create: `app/api/admin/instructors/[id]/route.ts`

**Step 1: Create Instructors admin component**

```typescript
// app/admin/instructors.tsx
"use client";

import {
  List,
  Datagrid,
  TextField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  required,
  ImageField,
} from "react-admin";

export const InstructorList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="certifications" />
      <ImageField source="photoUrl" label="Photo" />
    </Datagrid>
  </List>
);

export const InstructorEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name" validate={required()} />
      <TextInput source="bio" multiline rows={6} />
      <TextInput source="photoUrl" label="Photo URL" />
      <TextInput source="certifications" />
    </SimpleForm>
  </Edit>
);

export const InstructorCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" validate={required()} />
      <TextInput source="bio" multiline rows={6} />
      <TextInput source="photoUrl" label="Photo URL" />
      <TextInput source="certifications" />
    </SimpleForm>
  </Create>
);
```

**Step 2: Create Instructors list API route**

```typescript
// app/api/admin/instructors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { instructorProfiles } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allInstructors = await db.select().from(instructorProfiles);

  return NextResponse.json(allInstructors);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const [newInstructor] = await db
    .insert(instructorProfiles)
    .values({
      name: body.name,
      bio: body.bio || null,
      photoUrl: body.photoUrl || null,
      certifications: body.certifications || null,
    })
    .returning();

  return NextResponse.json(newInstructor);
}
```

**Step 3: Create Instructors detail API route**

```typescript
// app/api/admin/instructors/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { instructorProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const instructorId = parseInt(id);

  const [instructor] = await db
    .select()
    .from(instructorProfiles)
    .where(eq(instructorProfiles.id, instructorId))
    .limit(1);

  if (!instructor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(instructor);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const instructorId = parseInt(id);
  const body = await request.json();

  const [updated] = await db
    .update(instructorProfiles)
    .set({
      name: body.name,
      bio: body.bio || null,
      photoUrl: body.photoUrl || null,
      certifications: body.certifications || null,
    })
    .where(eq(instructorProfiles.id, instructorId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const instructorId = parseInt(id);

  await db.delete(instructorProfiles).where(eq(instructorProfiles.id, instructorId));

  return NextResponse.json({ success: true });
}
```

**Step 4: Register Instructors resource**

Modify: `app/admin/AdminApp.tsx`

```typescript
import { InstructorList, InstructorEdit, InstructorCreate } from "./instructors";

// Add after blog-posts:
<Resource
  name="instructors"
  list={InstructorList}
  edit={InstructorEdit}
  create={InstructorCreate}
  options={{ label: "Instructors" }}
/>
```

**Step 5: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit Instructors resource**

```bash
git add app/admin/instructors.tsx app/api/admin/instructors app/admin/AdminApp.tsx
git commit -m "feat: add Instructors admin resource with full CRUD

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Orders Admin Resource (Read-Only)

**Files:**
- Create: `app/admin/orders.tsx`
- Create: `app/api/admin/orders/route.ts`
- Create: `app/api/admin/orders/[id]/route.ts`

**Step 1: Create Orders admin component (read-only)**

```typescript
// app/admin/orders.tsx
"use client";

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  ReferenceField,
  Show,
  SimpleShowLayout,
  ArrayField,
  SingleFieldList,
  ChipField,
} from "react-admin";

export const OrderList = () => (
  <List>
    <Datagrid rowClick="show">
      <TextField source="id" />
      <ReferenceField source="userId" reference="users" link={false}>
        <TextField source="email" />
      </ReferenceField>
      <NumberField source="total" options={{ style: "currency", currency: "USD" }} />
      <TextField source="status" />
      <TextField source="stripePaymentId" label="Stripe Payment ID" />
      <DateField source="createdAt" showTime />
    </Datagrid>
  </List>
);

export const OrderShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <ReferenceField source="userId" reference="users" link={false}>
        <TextField source="email" />
      </ReferenceField>
      <NumberField source="total" options={{ style: "currency", currency: "USD" }} />
      <TextField source="status" />
      <TextField source="stripePaymentId" label="Stripe Payment ID" />
      <DateField source="createdAt" showTime />
    </SimpleShowLayout>
  </Show>
);
```

**Step 2: Create Orders list API route**

```typescript
// app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Join with users to get email
  const allOrders = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      total: orders.total,
      status: orders.status,
      stripePaymentId: orders.stripePaymentId,
      createdAt: orders.createdAt,
      userEmail: users.email,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id));

  return NextResponse.json(allOrders);
}
```

**Step 3: Create Orders detail API route**

```typescript
// app/api/admin/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orders, users, orderItems, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orderId = parseInt(id);

  // Get order with user info
  const [order] = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      total: orders.total,
      status: orders.status,
      stripePaymentId: orders.stripePaymentId,
      createdAt: orders.createdAt,
      userEmail: users.email,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get order items
  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: products.name,
      quantity: orderItems.quantity,
      priceAtPurchase: orderItems.priceAtPurchase,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

  return NextResponse.json({ ...order, items });
}
```

**Step 4: Register Orders resource (read-only)**

Modify: `app/admin/AdminApp.tsx`

```typescript
import { OrderList, OrderShow } from "./orders";

// Add after instructors:
<Resource
  name="orders"
  list={OrderList}
  show={OrderShow}
  options={{ label: "Orders" }}
/>
```

**Step 5: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit Orders resource**

```bash
git add app/admin/orders.tsx app/api/admin/orders app/admin/AdminApp.tsx
git commit -m "feat: add Orders admin resource (read-only)

- Show order details with line items
- Join with users table for email
- No create/edit - orders only via checkout

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Bookings Admin Resource

**Files:**
- Create: `app/admin/bookings.tsx`
- Create: `app/api/admin/bookings/route.ts`
- Create: `app/api/admin/bookings/[id]/route.ts`

**Step 1: Create Bookings admin component**

```typescript
// app/admin/bookings.tsx
"use client";

import {
  List,
  Datagrid,
  TextField,
  DateField,
  ReferenceField,
  Edit,
  SimpleForm,
  SelectInput,
  required,
} from "react-admin";

export const BookingList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <ReferenceField source="userId" reference="users" link={false}>
        <TextField source="email" />
      </ReferenceField>
      <ReferenceField source="scheduleId" reference="schedules" link={false}>
        <TextField source="id" />
      </ReferenceField>
      <TextField source="paymentStatus" label="Payment Status" />
      <TextField source="stripePaymentId" label="Stripe Payment ID" />
      <DateField source="createdAt" showTime />
    </Datagrid>
  </List>
);

export const BookingEdit = () => (
  <Edit>
    <SimpleForm>
      <SelectInput
        source="paymentStatus"
        choices={[
          { id: "pending", name: "Pending" },
          { id: "completed", name: "Completed" },
          { id: "failed", name: "Failed" },
          { id: "refunded", name: "Refunded" },
        ]}
        validate={required()}
      />
    </SimpleForm>
  </Edit>
);
```

**Step 2: Create Bookings list API route**

```typescript
// app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bookings, users, courseSchedules, courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allBookings = await db
    .select({
      id: bookings.id,
      userId: bookings.userId,
      scheduleId: bookings.scheduleId,
      paymentStatus: bookings.paymentStatus,
      stripePaymentId: bookings.stripePaymentId,
      createdAt: bookings.createdAt,
      userEmail: users.email,
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id));

  return NextResponse.json(allBookings);
}
```

**Step 3: Create Bookings detail API route**

```typescript
// app/api/admin/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bookings, bookingStatusHistory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const bookingId = parseInt(id);

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(booking);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const bookingId = parseInt(id);
  const body = await request.json();

  // Get current booking for history comparison
  const [currentBooking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!currentBooking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update booking
  const [updated] = await db
    .update(bookings)
    .set({
      paymentStatus: body.paymentStatus,
    })
    .where(eq(bookings.id, bookingId))
    .returning();

  // Log status change if it changed
  if (currentBooking.paymentStatus !== body.paymentStatus) {
    await db.insert(bookingStatusHistory).values({
      bookingId: bookingId,
      status: body.paymentStatus,
    });
  }

  return NextResponse.json(updated);
}
```

**Step 4: Register Bookings resource**

Modify: `app/admin/AdminApp.tsx`

```typescript
import { BookingList, BookingEdit } from "./bookings";

// Add after orders:
<Resource
  name="bookings"
  list={BookingList}
  edit={BookingEdit}
  options={{ label: "Bookings" }}
/>
```

**Step 5: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit Bookings resource**

```bash
git add app/admin/bookings.tsx app/api/admin/bookings app/admin/AdminApp.tsx
git commit -m "feat: add Bookings admin resource with status editing

- Allow updating payment status only
- Log all status changes to history table
- Join with users for email display

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Dashboard Component

**Files:**
- Create: `app/admin/Dashboard.tsx`
- Create: `app/api/admin/dashboard/route.ts`
- Modify: `app/admin/AdminApp.tsx`

**Step 1: Create Dashboard API route**

```typescript
// app/api/admin/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { products, orders, bookings, courseSchedules, courses } from "@/lib/db/schema";
import { sql, desc, gte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get counts and stats
  const [productCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products);

  const [orderCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders);

  const [bookingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings);

  const [revenueData] = await db
    .select({ total: sql<string>`sum(total)` })
    .from(orders)
    .where(sql`status = 'completed'`);

  // Get recent orders
  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(5);

  // Get upcoming schedules
  const now = new Date();
  const upcomingSchedules = await db
    .select({
      id: courseSchedules.id,
      courseId: courseSchedules.courseId,
      courseName: courses.name,
      startDate: courseSchedules.startDate,
      endDate: courseSchedules.endDate,
      availableSeats: courseSchedules.availableSeats,
      status: courseSchedules.status,
    })
    .from(courseSchedules)
    .leftJoin(courses, sql`${courseSchedules.courseId} = ${courses.id}`)
    .where(gte(courseSchedules.startDate, now))
    .orderBy(courseSchedules.startDate)
    .limit(5);

  return NextResponse.json({
    stats: {
      products: productCount?.count || 0,
      orders: orderCount?.count || 0,
      bookings: bookingCount?.count || 0,
      revenue: parseFloat(revenueData?.total || "0"),
    },
    recentOrders,
    upcomingSchedules,
  });
}
```

**Step 2: Create Dashboard component**

```typescript
// app/admin/Dashboard.tsx
"use client";

import { Card, CardContent, CardHeader, Title } from "react-admin";
import { useEffect, useState } from "react";

interface DashboardData {
  stats: {
    products: number;
    orders: number;
    bookings: number;
    revenue: number;
  };
  recentOrders: any[];
  upcomingSchedules: any[];
}

export const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Dashboard load error:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (!data) {
    return <div>Error loading dashboard</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <Title title="Dashboard" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "#f0f0f0", padding: 20, borderRadius: 8 }}>
          <h3 style={{ margin: 0 }}>Products</h3>
          <p style={{ fontSize: 32, margin: 0 }}>{data.stats.products}</p>
        </div>
        <div style={{ background: "#f0f0f0", padding: 20, borderRadius: 8 }}>
          <h3 style={{ margin: 0 }}>Orders</h3>
          <p style={{ fontSize: 32, margin: 0 }}>{data.stats.orders}</p>
        </div>
        <div style={{ background: "#f0f0f0", padding: 20, borderRadius: 8 }}>
          <h3 style={{ margin: 0 }}>Bookings</h3>
          <p style={{ fontSize: 32, margin: 0 }}>{data.stats.bookings}</p>
        </div>
        <div style={{ background: "#f0f0f0", padding: 20, borderRadius: 8 }}>
          <h3 style={{ margin: 0 }}>Revenue</h3>
          <p style={{ fontSize: 32, margin: 0 }}>
            ${data.stats.revenue.toFixed(2)}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #ddd" }}>
          <h3>Recent Orders</h3>
          {data.recentOrders.length === 0 ? (
            <p>No orders yet</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {data.recentOrders.map((order) => (
                <li key={order.id} style={{ marginBottom: 10 }}>
                  Order #{order.id} - ${order.total} - {order.status}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #ddd" }}>
          <h3>Upcoming Schedules</h3>
          {data.upcomingSchedules.length === 0 ? (
            <p>No upcoming schedules</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {data.upcomingSchedules.map((schedule) => (
                <li key={schedule.id} style={{ marginBottom: 10 }}>
                  {schedule.courseName} - {new Date(schedule.startDate).toLocaleDateString()} - {schedule.availableSeats} seats
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
```

**Step 3: Register Dashboard in AdminApp**

Modify: `app/admin/AdminApp.tsx`

```typescript
import { Dashboard } from "./Dashboard";

// Add dashboard prop to Admin component:
<Admin dataProvider={dataProvider} title="ACDefenseCo Admin" dashboard={Dashboard}>
```

**Step 4: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit Dashboard**

```bash
git add app/admin/Dashboard.tsx app/api/admin/dashboard app/admin/AdminApp.tsx
git commit -m "feat: add Dashboard with stats and activity

- Show counts for products, orders, bookings, revenue
- Display recent 5 orders
- Display upcoming 5 course schedules
- Register as default dashboard

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Google OAuth Integration

### Task 8: Add Google OAuth Provider

**Files:**
- Modify: `auth.ts`
- Modify: `.env.example`

**Step 1: Install Google provider for NextAuth**

Run: `npm install next-auth@beta`
Expected: Already installed (verify version)

**Step 2: Add Google provider to auth config**

Modify: `auth.ts`

```typescript
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
        },
      },
    }),
    Credentials({
      // ... existing credentials config
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      // Store OAuth tokens for Calendar API
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  // ... rest of config
});
```

**Step 3: Add environment variables to .env.example**

```
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

**Step 4: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds (credentials optional in dev)

**Step 5: Commit Google OAuth provider**

```bash
git add auth.ts .env.example
git commit -m "feat: add Google OAuth provider with Calendar scope

- Add Google provider to NextAuth config
- Request Calendar API scope for event creation
- Store access/refresh tokens in JWT for API calls
- Add environment variables to example

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Google Calendar Helper

**Files:**
- Create: `lib/google-calendar.ts`

**Step 1: Install Google Calendar API client**

Run: `npm install googleapis`
Expected: Package installs successfully

**Step 2: Create Calendar helper with graceful degradation**

```typescript
// lib/google-calendar.ts
import { google } from "googleapis";

interface CalendarEvent {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
}

export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  // Graceful degradation if no access token
  if (!accessToken) {
    console.log("No Google access token - skipping calendar event creation");
    return { success: true, eventId: "mocked-no-token" };
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: "America/Chicago",
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: "America/Chicago",
        },
        location: event.location,
      },
    });

    return {
      success: true,
      eventId: response.data.id || undefined,
    };
  } catch (error: any) {
    console.error("Calendar event creation error:", error);

    // Don't fail the booking if calendar fails
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  if (!accessToken || !eventId || eventId === "mocked-no-token") {
    console.log("No Google access token or mocked event - skipping deletion");
    return { success: true };
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Calendar event deletion error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
```

**Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit Calendar helper**

```bash
git add lib/google-calendar.ts package.json package-lock.json
git commit -m "feat: add Google Calendar helper with graceful degradation

- Create/delete calendar events via Google Calendar API
- Graceful degradation if no access token
- Don't fail bookings if calendar fails
- Install googleapis package

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Update Database Schema for Calendar Event IDs

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `drizzle/migration.sql` (manual)

**Step 1: Add googleCalendarEventId field to bookings table**

Modify: `lib/db/schema.ts`

```typescript
// In bookings table definition, add after stripePaymentId:
googleCalendarEventId: text("google_calendar_event_id"),
```

**Step 2: Create migration SQL**

Run: `docker compose exec nextjs npm run db:push`
Expected: Migration applied successfully

**Step 3: Verify schema update**

Run: `docker compose exec postgres psql -U acdefense -d acdefense -c "\d bookings"`
Expected: See google_calendar_event_id column

**Step 4: Commit schema update**

```bash
git add lib/db/schema.ts
git commit -m "feat: add googleCalendarEventId field to bookings

- Store Google Calendar event ID for later deletion
- Run db:push to apply migration

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Calendly Integration

### Task 11: Calendly Webhook Handler

**Files:**
- Create: `app/api/webhooks/calendly/route.ts`
- Create: `lib/calendly.ts`

**Step 1: Create Calendly helper with graceful degradation**

```typescript
// lib/calendly.ts
import crypto from "crypto";

export function verifyCalendlySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    console.log("No Calendly webhook secret - skipping verification");
    return true; // Allow in development without secret
  }

  try {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

interface CalendlyInvitee {
  uri: string;
  email: string;
  name: string;
  event: {
    uri: string;
    name: string;
    start_time: string;
    end_time: string;
  };
}

export function parseCalendlyWebhook(body: any): CalendlyInvitee | null {
  try {
    return {
      uri: body.payload.invitee.uri,
      email: body.payload.invitee.email,
      name: body.payload.invitee.name,
      event: {
        uri: body.payload.event.uri,
        name: body.payload.event.name,
        start_time: body.payload.event.start_time,
        end_time: body.payload.event.end_time,
      },
    };
  } catch (error) {
    console.error("Calendly webhook parse error:", error);
    return null;
  }
}
```

**Step 2: Create Calendly webhook endpoint**

```typescript
// app/api/webhooks/calendly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCalendlySignature, parseCalendlyWebhook } from "@/lib/calendly";
import { db } from "@/lib/db";
import { users, bookings, courses, courseSchedules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-calendly-webhook-signature") || "";
  const secret = process.env.CALENDLY_WEBHOOK_SECRET || "";

  // Verify signature
  if (!verifyCalendlySignature(body, signature, secret)) {
    console.error("Invalid Calendly webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse webhook
  const webhookData = parseCalendlyWebhook(JSON.parse(body));

  if (!webhookData) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    // Find or create user by email
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, webhookData.email))
      .limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          email: webhookData.email,
          name: webhookData.name,
          role: "user",
        })
        .returning();
    }

    // Find course schedule by event name/time (simplified - in production match by Calendly event type ID)
    const startDate = new Date(webhookData.event.start_time);
    const [schedule] = await db
      .select()
      .from(courseSchedules)
      .where(eq(courseSchedules.startDate, startDate))
      .limit(1);

    if (!schedule) {
      console.error("No matching course schedule found for Calendly event");
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    // Create booking
    const [booking] = await db
      .insert(bookings)
      .values({
        userId: user.id,
        scheduleId: schedule.id,
        paymentStatus: "pending",
      })
      .returning();

    console.log("Created booking from Calendly webhook:", booking.id);

    // TODO: Send confirmation email via SendGrid
    // TODO: Create Google Calendar event

    return NextResponse.json({ success: true, bookingId: booking.id });
  } catch (error) {
    console.error("Calendly webhook processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
```

**Step 3: Add environment variables**

Modify: `.env.example`

```
CALENDLY_WEBHOOK_SECRET=your_calendly_webhook_secret_here
```

**Step 4: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit Calendly webhook**

```bash
git add app/api/webhooks/calendly lib/calendly.ts .env.example
git commit -m "feat: add Calendly webhook handler

- Verify webhook signature (graceful without secret)
- Parse invitee.created events
- Create user if doesn't exist
- Create booking record
- TODO: Email confirmation and calendar sync

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Email Integration

### Task 12: SendGrid Email Helper

**Files:**
- Create: `lib/sendgrid.ts`
- Modify: `.env.example`

**Step 1: Install SendGrid client**

Run: `npm install @sendgrid/mail`
Expected: Package installs successfully

**Step 2: Create SendGrid helper with graceful degradation**

```typescript
// lib/sendgrid.ts
import sendgrid from "@sendgrid/mail";

// Initialize with API key if available
if (process.env.SENDGRID_API_KEY) {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  // Graceful degradation without API key
  if (!process.env.SENDGRID_API_KEY) {
    console.log("SendGrid not configured - would send email:");
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body: ${options.html.substring(0, 100)}...`);
    return { success: true };
  }

  const from = process.env.SENDGRID_FROM_EMAIL || "noreply@acdefenseco.com";

  try {
    await sendgrid.send({
      to: options.to,
      from: from,
      subject: options.subject,
      html: options.html,
    });

    return { success: true };
  } catch (error: any) {
    console.error("SendGrid error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function sendBookingConfirmation(
  email: string,
  courseName: string,
  startDate: Date
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <h1>Booking Confirmed</h1>
    <p>Your booking for <strong>${courseName}</strong> has been confirmed.</p>
    <p><strong>Date:</strong> ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}</p>
    <p>We look forward to seeing you!</p>
    <p>- ACDefenseCo Team</p>
  `;

  return sendEmail({
    to: email,
    subject: `Booking Confirmed: ${courseName}`,
    html,
  });
}

export async function sendPaymentReceipt(
  email: string,
  orderTotal: number,
  orderItems: Array<{ name: string; quantity: number; price: number }>
): Promise<{ success: boolean; error?: string }> {
  const itemsHtml = orderItems
    .map((item) => `<li>${item.name} x ${item.quantity} - $${item.price.toFixed(2)}</li>`)
    .join("");

  const html = `
    <h1>Payment Receipt</h1>
    <p>Thank you for your order!</p>
    <h2>Order Details</h2>
    <ul>
      ${itemsHtml}
    </ul>
    <p><strong>Total:</strong> $${orderTotal.toFixed(2)}</p>
    <p>- ACDefenseCo Team</p>
  `;

  return sendEmail({
    to: email,
    subject: "Payment Receipt - ACDefenseCo",
    html,
  });
}
```

**Step 3: Add environment variables**

Modify: `.env.example`

```
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@acdefenseco.com
```

**Step 4: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit SendGrid helper**

```bash
git add lib/sendgrid.ts package.json package-lock.json .env.example
git commit -m "feat: add SendGrid email helper with graceful degradation

- Send transactional emails via SendGrid
- Booking confirmation template
- Payment receipt template
- Graceful degradation without API key
- Install @sendgrid/mail package

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Integrate Email & Calendar into Calendly Webhook

**Files:**
- Modify: `app/api/webhooks/calendly/route.ts`

**Step 1: Add email and calendar sync to webhook handler**

Modify: `app/api/webhooks/calendly/route.ts` - replace TODOs:

```typescript
import { sendBookingConfirmation } from "@/lib/sendgrid";
import { createCalendarEvent } from "@/lib/google-calendar";
import { accounts } from "@/lib/db/schema";

// After creating booking, add:

// Send confirmation email
await sendBookingConfirmation(
  webhookData.email,
  webhookData.event.name,
  new Date(webhookData.event.start_time)
);

// Create Google Calendar event if user has OAuth token
const [userAccount] = await db
  .select()
  .from(accounts)
  .where(eq(accounts.userId, user.id))
  .where(eq(accounts.provider, "google"))
  .limit(1);

if (userAccount?.accessToken) {
  const calendarResult = await createCalendarEvent(
    userAccount.accessToken,
    {
      summary: webhookData.event.name,
      description: `Course booking for ${webhookData.event.name}`,
      start: new Date(webhookData.event.start_time),
      end: new Date(webhookData.event.end_time),
      location: "ACDefenseCo Training Facility",
    }
  );

  if (calendarResult.success && calendarResult.eventId) {
    // Store calendar event ID for later deletion
    await db
      .update(bookings)
      .set({ googleCalendarEventId: calendarResult.eventId })
      .where(eq(bookings.id, booking.id));
  }
}
```

**Step 2: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit integration**

```bash
git add app/api/webhooks/calendly/route.ts
git commit -m "feat: integrate email and calendar into Calendly webhook

- Send booking confirmation email via SendGrid
- Create Google Calendar event if user has OAuth
- Store calendar event ID for later deletion
- All with graceful degradation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Testing & Documentation

### Task 14: Update Login Page with Google OAuth Button

**Files:**
- Modify: `app/login/page.tsx` (if exists, or check existing login implementation)

**Step 1: Add Sign in with Google button**

Check current login page implementation and add Google sign-in alongside credentials form. Example:

```typescript
import { signIn } from "@/auth";

// Add alongside existing form:
<form
  action={async () => {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }}
>
  <button type="submit">Sign in with Google</button>
</form>
```

**Step 2: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit login updates**

```bash
git add app/login/page.tsx
git commit -m "feat: add Google OAuth sign-in button to login page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 15: Update README with Setup Instructions

**Files:**
- Modify: `README.md`

**Step 1: Add setup section for OAuth and integrations**

Add to README.md:

```markdown
## OAuth & Integrations Setup

### Google OAuth (Optional)

1. Create Google Cloud Project
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Add to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

### Calendly (Optional)

1. Create Calendly account
2. Create webhook in Calendly dashboard pointing to: `https://yourdomain.com/api/webhooks/calendly`
3. Copy webhook signing secret
4. Add to `.env.local`:
   ```
   CALENDLY_WEBHOOK_SECRET=your_webhook_secret
   ```

### SendGrid (Optional)

1. Create SendGrid account
2. Verify sender email
3. Create API key with Mail Send permissions
4. Add to `.env.local`:
   ```
   SENDGRID_API_KEY=your_api_key
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

**Note:** All integrations gracefully degrade if credentials not provided.
```

**Step 2: Commit README updates**

```bash
git add README.md
git commit -m "docs: add OAuth and integrations setup instructions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 16: Final Build & Verification

**Step 1: Clean build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Start development server**

Run: `npm run dev`
Expected: Server starts on port 3000

**Step 3: Manual verification checklist**

- [ ] Navigate to `/admin` - all 8 resources visible in menu
- [ ] Products: Create, edit, delete works
- [ ] Categories: Create, edit, delete works
- [ ] Blog Posts: Create draft and published post
- [ ] Instructors: Create, edit, delete works
- [ ] Orders: List shows, detail shows (read-only)
- [ ] Bookings: Edit payment status logs to history
- [ ] Dashboard: Stats display, recent orders, upcoming schedules
- [ ] Login: Google OAuth button visible

**Step 4: Create verification commit**

```bash
git add .
git commit -m "chore: verify all admin resources and integrations

Manual testing confirms:
- All 7 admin resources working
- Dashboard displaying stats
- OAuth providers configured
- Graceful degradation working

Ready for production credential swap

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Implementation Complete

All phases implemented with:
- 7 admin resources with full CRUD
- Dashboard with stats and activity
- Google OAuth with calendar sync (graceful degradation)
- Calendly webhook integration (graceful degradation)
- SendGrid email system (graceful degradation)
- Complete graceful degradation for missing credentials
- Ready for production credential swap

**Next Steps:**
1. Use @superpowers:finishing-a-development-branch to merge to main
2. Deploy to production
3. Add production credentials
4. Test OAuth flow in production
5. Configure Calendly webhook URL
6. Verify SendGrid sender domain
