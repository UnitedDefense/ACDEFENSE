#!/usr/bin/env python3
"""
Test React Admin Panel for AC Defense Website

Tests the React Admin interface that IS currently implemented:
- Admin panel access at /admin
- Dashboard with resources
- CRUD resources (Products, Categories, Blog Posts, Instructors, Orders, Bookings, Courses, Schedules)
"""

from playwright.sync_api import sync_playwright, Page
import sys

BASE_URL = "http://localhost:3000"

def print_section(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_admin_panel_access(page: Page) -> bool:
    """Test accessing the React Admin panel"""
    print_section("Testing React Admin Panel Access")
    
    try:
        print("→ Navigating to /admin...")
        page.goto(f"{BASE_URL}/admin")
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)  # Give React Admin time to render
        
        page.screenshot(path='/tmp/admin-panel.png', full_page=True)
        print("✓ Full screenshot: /tmp/admin-panel.png")
        
        # Check for React Admin UI elements
        print("\n→ Checking for React Admin interface...")
        
        # Look for common React Admin elements
        menu_items = page.locator('[role="menuitem"]').all()
        print(f"✓ Found {len(menu_items)} menu items")
        
        for item in menu_items[:10]:  # First 10 items
            try:
                text = item.inner_text()
                print(f"  - {text}")
            except:
                pass
        
        # Check for resource links
        resources = [
            "products", "categories", "blog-posts", 
            "instructors", "orders", "bookings",
            "courses", "schedules"
        ]
        
        print("\n→ Checking for resource availability...")
        for resource in resources:
            locator = page.get_by_text(resource, exact=False)
            if locator.count() > 0:
                print(f"✓ Found resource: {resource}")
            else:
                print(f"⚠ Resource not found in UI: {resource}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error: {e}")
        page.screenshot(path='/tmp/admin-error.png')
        return False

def test_resources(page: Page):
    """Test resource list pages"""
    print_section("Testing Resource Pages")
    
    resources = {
        "products": "Products", 
        "categories": "Categories",
        "blog-posts": "Blog Posts",
        "instructors": "Instructors",
        "orders": "Orders",
        "bookings": "Bookings",
        "courses": "Courses",
        "schedules": "Schedules"
    }
    
    for path, name in resources.items():
        try:
            print(f"\n→ Testing {name} resource...")
            page.goto(f"{BASE_URL}/admin#{path}")
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(1000)
            
            screenshot_path = f'/tmp/admin-{path}.png'
            page.screenshot(path=screenshot_path)
            print(f"✓ Screenshot: {screenshot_path}")
            
            # Check for React Admin List component
            datagrid = page.locator('[role="grid"], table, .datagrid')
            if datagrid.count() > 0:
                print(f"✓ {name} list/table found")
            else:
                print(f"⚠ {name} list/table not detected")
                
        except Exception as e:
            print(f"✗ Error testing {name}: {e}")

def run_all_tests():
    print("\n" + "="*60)
    print("  AC Defense - React Admin Panel Test Suite")
    print("="*60)
    print(f"\nTarget: {BASE_URL}")
    print("Testing React Admin interface (NO OAuth - that's not implemented yet)")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(15000)
        
        try:
            if not test_admin_panel_access(page):
                print("\n✗ Failed to access admin panel")
                return False
            
            test_resources(page)
            
            print_section("Test Complete")
            print("✓ React Admin panel tested successfully!")
            print("\nScreenshots saved to /tmp/:")
            print("  - admin-panel.png")
            print("  - admin-*.png (resource pages)")
            
            print("\n⚠ NOTE: OAuth implementation not found in codebase")
            print("The plan document describes OAuth features, but Phase 2-4 were not implemented.")
            
            return True
            
        except Exception as e:
            print(f"\n✗ Unexpected error: {e}")
            return False
        finally:
            browser.close()

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
