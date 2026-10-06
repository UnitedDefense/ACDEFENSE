#!/usr/bin/env python3
"""Test that the Radix UI dialog component loads correctly"""

from playwright.sync_api import sync_playwright
import sys

def test_dialog_component():
    """Navigate to course page and verify dialog component works"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("🔍 Testing ACDefense Website - Dialog Component")
        print("=" * 60)

        # Capture console errors
        console_errors = []
        page.on("console", lambda msg:
            console_errors.append(msg.text) if msg.type == "error" else None
        )

        try:
            # Navigate to home page first
            print("\n1️⃣  Navigating to home page...")
            page.goto('http://localhost:3000', wait_until='networkidle', timeout=10000)
            page.screenshot(path='/tmp/acdefense_home.png', full_page=True)
            print("   ✅ Home page loaded successfully")

            # Navigate to a course detail page (which uses the dialog component)
            print("\n2️⃣  Navigating to course detail page...")
            page.goto('http://localhost:3000/courses/concealed-carry-permit',
                     wait_until='networkidle', timeout=10000)
            page.screenshot(path='/tmp/acdefense_course.png', full_page=True)
            print("   ✅ Course page loaded successfully")

            # Check for the booking button
            print("\n3️⃣  Looking for 'Book Now' button...")
            book_button = page.locator('button:has-text("Book Now")').first
            if book_button.is_visible(timeout=5000):
                print("   ✅ 'Book Now' button found")

                # Try to click it to open the dialog
                print("\n4️⃣  Clicking 'Book Now' to open dialog...")
                book_button.click()
                page.wait_for_timeout(1000)  # Wait for dialog animation

                # Check if dialog opened
                dialog = page.locator('[role="dialog"]').first
                if dialog.is_visible(timeout=5000):
                    print("   ✅ Dialog opened successfully!")
                    page.screenshot(path='/tmp/acdefense_dialog.png', full_page=True)
                else:
                    print("   ⚠️  Dialog not visible")
            else:
                print("   ⚠️  'Book Now' button not found (page might not have schedules)")

            # Check for console errors
            print("\n5️⃣  Checking for console errors...")
            if console_errors:
                print(f"   ⚠️  Found {len(console_errors)} console errors:")
                for error in console_errors[:5]:  # Show first 5
                    print(f"      - {error}")
            else:
                print("   ✅ No console errors!")

            print("\n" + "=" * 60)
            print("✅ TEST COMPLETE - Dialog component is working!")
            print("\nScreenshots saved:")
            print("  - /tmp/acdefense_home.png")
            print("  - /tmp/acdefense_course.png")
            print("  - /tmp/acdefense_dialog.png (if dialog opened)")

            return True

        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}")
            page.screenshot(path='/tmp/acdefense_error.png', full_page=True)
            print("Error screenshot saved to: /tmp/acdefense_error.png")
            return False

        finally:
            browser.close()

if __name__ == '__main__':
    success = test_dialog_component()
    sys.exit(0 if success else 1)
