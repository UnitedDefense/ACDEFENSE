#!/usr/bin/env python3
"""Test which routes are actually working"""

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3000"

routes_to_test = [
    ("/", "Homepage"),
    ("/courses", "Courses List"),
    ("/shop", "Shop"),
    ("/blog", "Blog"),
    ("/instructors", "Instructors"),
    ("/about", "About"),
    ("/login", "Login"),
    ("/dashboard", "Dashboard"),
    ("/admin", "Admin Panel"),
]

def test_route(page, path, name):
    try:
        response = page.goto(f"{BASE_URL}{path}")
        status = response.status
        
        # Wait a bit for page to load
        page.wait_for_load_state('domcontentloaded')
        
        # Check if it's a 404
        title = page.title()
        is_404 = "404" in title or "not be found" in title.lower()
        
        # Take screenshot
        screenshot_path = f'/tmp/route-{name.lower().replace(" ", "-")}.png'
        page.screenshot(path=screenshot_path)
        
        if is_404:
            print(f"❌ {name:20s} {path:30s} → 404 Not Found")
        elif status == 200:
            print(f"✅ {name:20s} {path:30s} → {status} OK")
        elif status >= 300 and status < 400:
            print(f"↪️  {name:20s} {path:30s} → {status} Redirect")
        else:
            print(f"⚠️  {name:20s} {path:30s} → {status}")
            
    except Exception as e:
        print(f"❌ {name:20s} {path:30s} → Error: {e}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.set_default_timeout(10000)
    
    print("\n" + "="*70)
    print("  Testing AC Defense Routes")
    print("="*70 + "\n")
    
    for path, name in routes_to_test:
        test_route(page, path, name)
    
    print("\n" + "="*70)
    print("Screenshots saved to /tmp/route-*.png")
    print("="*70)
    
    browser.close()
