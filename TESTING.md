# Testing Instructions - Register Page & Booking Flow

## ✅ Implementation Status: COMPLETE

All code has been implemented and committed (commit: b7b329f):
- ✅ User registration page and API
- ✅ Guest and registered user checkout
- ✅ Booking API with atomic seat decrement
- ✅ Stripe payment integration
- ✅ Admin panel integration

## 🔧 Required: Fix Server Permissions

The `.next` directory is owned by root. Fix this in your terminal:

```bash
cd /home/chicagojoe/PyCharmProjects/acdefense-website
sudo chown -R chicagojoe:chicagojoe .next
# OR if that fails:
sudo rm -rf .next
```

## 🚀 Start Development Server

```bash
npm run dev
```

Server should start on http://localhost:3000 (or 3001 if 3000 is busy)

## 🔑 Required Environment Variables

Add to `.env.local`:

```env
# Stripe API Keys (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Base URL for Stripe redirects
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Database already configured in .env.local
```

## 📋 Manual Testing Checklist

### Test 1: User Registration
- [ ] Navigate to http://localhost:3000/register
- [ ] Fill in form:
  - Name: "Test User"
  - Email: "test@example.com"
  - Password: "testpass123"
  - Confirm Password: "testpass123"
- [ ] Click "Create Account"
- [ ] **Expected**: Auto-login and redirect to /dashboard
- [ ] **Verify**: User appears in admin panel Users table

### Test 2: Guest Checkout Flow
- [ ] **Log out** if logged in
- [ ] Navigate to http://localhost:3000/courses/concealed-carry-permit
- [ ] Note the current "Available Seats" number (e.g., 20)
- [ ] Click "Book Now" button
- [ ] **Expected**: Modal opens with guest/sign-in options
- [ ] Fill guest form:
  - Name: "Guest User"
  - Email: "guest@example.com"
- [ ] Click "Proceed to Payment"
- [ ] **Expected**: Redirected to Stripe checkout
- [ ] **Important**: Complete or cancel the Stripe checkout
- [ ] Return to course page
- [ ] **Verify**: Available seats decreased by 1 (now 19)

### Test 3: Registered User Checkout
- [ ] **Login** at http://localhost:3000/login
  - Use the test user from Test 1
- [ ] Navigate to course page
- [ ] Click "Book Now"
- [ ] **Expected**: Modal shows your pre-filled name/email
- [ ] Click "Proceed to Payment"
- [ ] **Expected**: Redirected to Stripe checkout
- [ ] Complete checkout
- [ ] **Verify**: Available seats decreased by 1 again (now 18)

### Test 4: Admin Panel Verification
- [ ] Login as admin user
- [ ] Navigate to http://localhost:3000/admin
- [ ] Click "Schedules" resource
- [ ] **Verify**: Schedule shows correct availableSeats count (18)
- [ ] Click "Bookings" resource
- [ ] **Verify**: Both bookings appear with:
  - User email
  - Schedule ID
  - Payment status ("pending" or "completed")
  - Stripe payment ID

### Test 5: Booking Prevents Overbooking
- [ ] Create multiple bookings rapidly (open multiple browser tabs)
- [ ] Try to book last seat simultaneously from 2+ tabs
- [ ] **Expected**: Only one succeeds, others get "No seats available" error
- [ ] **Verify**: Schedule status changes to "full" when last seat taken

### Test 6: Payment Status Updates (Webhook)
**Note**: Requires Stripe webhook setup or manual database update

- [ ] Complete a Stripe checkout successfully
- [ ] **Expected**: Booking status updates from "pending" to "completed"
- [ ] **Verify**: Admin panel shows "completed" status
- [ ] **Verify**: bookingStatusHistory table has entry

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Check for running processes
ps aux | grep next | grep -v grep

# Kill any existing Next.js processes
pkill -f "next dev"

# Remove .next and restart
rm -rf .next
npm run dev
```

### Database Connection Issues
```bash
# Verify database credentials in .env.local
grep DATABASE .env.local

# Test database connection
psql "$DATABASE_URL" -c "SELECT 1"
```

### Stripe Payment Issues
- Ensure STRIPE_SECRET_KEY starts with `sk_test_`
- Use Stripe test card: 4242 4242 4242 4242
- Expiry: Any future date
- CVC: Any 3 digits

### Seat Count Not Decreasing
- Refresh the admin page (React Admin doesn't auto-refresh)
- Check browser console for API errors
- Verify booking was created: Admin → Bookings

## 🎯 Success Criteria

All tests pass when:
1. ✅ Users can register and auto-login
2. ✅ Guest users can book courses
3. ✅ Registered users can book courses
4. ✅ Available seats decrement by 1 per booking
5. ✅ Schedule status changes to "full" when last seat taken
6. ✅ Admin panel shows updated seat counts
7. ✅ Admin panel shows all bookings
8. ✅ Payment status updates on Stripe webhook

## 🔗 Key Implementation Details

### Atomic Seat Decrement
Location: `app/api/bookings/route.ts`

The booking API uses a database transaction with row locking:
- Locks the schedule row (`FOR UPDATE`)
- Creates the booking
- Decrements availableSeats in one atomic operation
- Prevents race conditions when multiple users book simultaneously

### Guest User Creation
Guests are stored as users with `password: null`:
- Allows tracking bookings
- Email can be used later to claim account
- No authentication required for guest checkout

### Stripe Integration Flow
1. User clicks "Book Now" → Booking created with status "pending"
2. Booking API returns booking ID
3. Frontend calls checkout API → Creates Stripe session
4. User completes payment → Stripe sends webhook
5. Webhook handler updates booking status to "completed"

## 📊 Database Schema

### Bookings Table
```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  schedule_id INTEGER REFERENCES course_schedules(id),
  payment_status TEXT DEFAULT 'pending',
  stripe_payment_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Course Schedules
```sql
available_seats INTEGER -- Decremented on booking
status TEXT -- Auto-set to 'full' when seats = 0
```

## 🎉 Next Steps

After all tests pass:
1. Set up Stripe webhook in production
2. Configure production environment variables
3. Deploy to production
4. Test with real Stripe checkout (test mode)
5. Monitor bookings and seat counts

---

**Implementation completed**: 2026-02-03
**Commit**: b7b329f
**Files changed**: 8 files, 1026 insertions
