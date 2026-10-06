#!/usr/bin/env python3
"""Inspect admin login page structure"""

from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    print("→ Navigating to http://localhost:3000/admin/login...")
    page.goto('http://localhost:3000/admin/login')
    page.wait_for_load_state('networkidle')
    
    # Take screenshot
    page.screenshot(path='/tmp/admin-login-inspect.png', full_page=True)
    print("✓ Full page screenshot: /tmp/admin-login-inspect.png")
    
    # Get page HTML
    html = page.content()
    with open('/tmp/admin-login.html', 'w') as f:
        f.write(html)
    print("✓ HTML saved: /tmp/admin-login.html")
    
    # Find all input elements
    print("\n→ Finding input elements...")
    inputs = page.locator('input').all()
    print(f"  Found {len(inputs)} input elements:")
    for i, inp in enumerate(inputs):
        attrs = {
            'type': inp.get_attribute('type'),
            'name': inp.get_attribute('name'),
            'id': inp.get_attribute('id'),
            'placeholder': inp.get_attribute('placeholder'),
        }
        print(f"    {i+1}. {json.dumps(attrs, indent=8)}")
    
    # Find all buttons
    print("\n→ Finding button elements...")
    buttons = page.locator('button').all()
    print(f"  Found {len(buttons)} button elements:")
    for i, btn in enumerate(buttons):
        attrs = {
            'type': btn.get_attribute('type'),
            'text': btn.inner_text() if btn.is_visible() else '[hidden]',
        }
        print(f"    {i+1}. {json.dumps(attrs, indent=8)}")
    
    # Check for form
    print("\n→ Checking for forms...")
    forms = page.locator('form').all()
    print(f"  Found {len(forms)} form elements")
    
    # Check current URL
    print(f"\n→ Current URL: {page.url}")
    
    browser.close()
    print("\n✓ Inspection complete")
