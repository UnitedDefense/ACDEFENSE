-- Check what data exists
SELECT 'Courses' as table_name, COUNT(*) as count FROM courses
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Categories', COUNT(*) FROM product_categories
UNION ALL
SELECT 'Blog Posts', COUNT(*) FROM blog_posts
UNION ALL
SELECT 'Instructors', COUNT(*) FROM instructor_profiles
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'Users', COUNT(*) FROM users;

-- Show some sample course data
SELECT id, name, slug, price FROM courses LIMIT 5;
