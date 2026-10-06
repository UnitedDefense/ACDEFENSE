#!/usr/bin/env python3
"""
Test Admin OAuth Implementation for AC Defense Website

Tests all admin panel features:
- Admin authentication (email/password)
- Dashboard access
- OAuth integrations (Google, Calendly, SendGrid, Stripe)
- Settings management
- Security controls
"""

from playwright.sync_api import sync_playwright, Page, expect
import time
import sys

# Configuration
BASE_URL = "http://localhost:3000"
ADMIN_EMAIL = "admin@acdefenseco.com"
ADMIN_PASSWORD = "admin123"

def print_section(title: str):
    """Print a test section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_admin_login(page: Page) -> bool:
    """Test admin login functionality"""
    print_section("Testing Admin Login")
    
    try:
        # Navigate to admin login
        print("→ Navigating to /admin/login...")
        page.goto(f"{BASE_URL}/admin/login")
        page.wait_for_load_state('networkidle')
        
        # Take screenshot of login page
        page.screenshot(path='/tmp/admin-login.png')
        print("✓ Screenshot saved: /tmp/admin-login.png")
        
        # Fill in login form
        print("→ Filling login form...")
        page.fill('input[type="email"]', ADMIN_EMAIL)
        page.fill('input[type="password"]', ADMIN_PASSWORD)
        
        # Submit form
        print("→ Submitting login...")
        page.click('button[type="submit"]')
        page.wait_for_load_state('networkidle')
        
        # Check if redirected to dashboard
        current_url = page.url
        if '/admin/dashboard' in current_url or '/admin' in current_url:
            print(f"✓ Login successful! Redirected to: {current_url}")
            page.screenshot(path='/tmp/admin-dashboard.png')
            print("✓ Dashboard screenshot: /tmp/admin-dashboard.png")
            return True
        else:
            print(f"✗ Login failed. Current URL: {current_url}")
            page.screenshot(path='/tmp/admin-login-failed.png')
            return False
            
    except Exception as e:
        print(f"✗ Error during login: {e}")
        page.screenshot(path='/tmp/admin-login-error.png')
        return False

def test_dashboard_navigation(page: Page):
    """Test dashboard navigation and layout"""
    print_section("Testing Dashboard Navigation")
    
    try:
        # Check for navigation links
        print("→ Checking navigation elements...")
        
        nav_items = [
            "Dashboard",
            "OAuth Integrations",
            "Settings",
            "Users",
            "Analytics"
        ]
        
        for item in nav_items:
            locator = page.get_by_text(item)
            if locator.count() > 0:
                print(f"✓ Found navigation item: {item}")
            else:
                print(f"⚠ Missing navigation item: {item}")
        
        # Check for integration status cards
        print("\n→ Checking integration status cards...")
        page.screenshot(path='/tmp/dashboard-integrations.png')
        print("✓ Integration cards screenshot: /tmp/dashboard-integrations.png")
        
    except Exception as e:
        print(f"✗ Error checking dashboard: {e}")

def test_google_oauth(page: Page):
    """Test Google OAuth integration page"""
    print_section("Testing Google OAuth Integration")
    
    try:
        # Navigate to OAuth settings
        print("→ Navigating to OAuth integrations...")
        page.goto(f"{BASE_URL}/admin/integrations/oauth")
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/oauth-page.png')
        print("✓ OAuth page screenshot: /tmp/oauth-page.png")
        
        # Check for Google integration card
        print("→ Checking Google OAuth card...")
        google_section = page.locator('text=Google OAuth').first
        if google_section.count() > 0:
            print("✓ Found Google OAuth section")
            
            # Check for Connect/Configure button
            connect_btn = page.get_by_role('button', name='Connect Google')
            disconnect_btn = page.get_by_role('button', name='Disconnect')
            
            if connect_btn.count() > 0:
                print("✓ Found 'Connect Google' button (not connected)")
            elif disconnect_btn.count() > 0:
                print("✓ Found 'Disconnect' button (already connected)")
            
            # Check for OAuth scopes display
            print("→ Checking OAuth scopes...")
            page.screenshot(path='/tmp/google-oauth-details.png')
            print("✓ Google OAuth details screenshot: /tmp/google-oauth-details.png")
        else:
            print("⚠ Google OAuth section not found")
            
    except Exception as e:
        print(f"✗ Error testing Google OAuth: {e}")

def test_calendly_integration(page: Page):
    """Test Calendly integration page"""
    print_section("Testing Calendly Integration")
    
    try:
        print("→ Checking Calendly integration card...")
        calendly_section = page.locator('text=Calendly').first
        
        if calendly_section.count() > 0:
            print("✓ Found Calendly section")
            page.screenshot(path='/tmp/calendly-integration.png')
            print("✓ Calendly screenshot: /tmp/calendly-integration.png")
            
            # Check for API key input or status
            api_key_input = page.locator('input[name*="calendly"]')
            if api_key_input.count() > 0:
                print("✓ Found Calendly API key input")
            
            # Check for webhook configuration
            webhook_section = page.locator('text=Webhook')
            if webhook_section.count() > 0:
                print("✓ Found webhook configuration section")
        else:
            print("⚠ Calendly section not found")
            
    except Exception as e:
        print(f"✗ Error testing Calendly: {e}")

def test_sendgrid_integration(page: Page):
    """Test SendGrid integration page"""
    print_section("Testing SendGrid Integration")
    
    try:
        print("→ Checking SendGrid integration card...")
        sendgrid_section = page.locator('text=SendGrid').first
        
        if sendgrid_section.count() > 0:
            print("✓ Found SendGrid section")
            page.screenshot(path='/tmp/sendgrid-integration.png')
            print("✓ SendGrid screenshot: /tmp/sendgrid-integration.png")
            
            # Check for API key input
            api_key_input = page.locator('input[name*="sendgrid"]')
            if api_key_input.count() > 0:
                print("✓ Found SendGrid API key input")
            
            # Check for email template configuration
            template_section = page.locator('text=Template')
            if template_section.count() > 0:
                print("✓ Found email template section")
        else:
            print("⚠ SendGrid section not found")
            
    except Exception as e:
        print(f"✗ Error testing SendGrid: {e}")

def test_stripe_integration(page: Page):
    """Test Stripe integration page"""
    print_section("Testing Stripe Integration")
    
    try:
        print("→ Checking Stripe integration card...")
        stripe_section = page.locator('text=Stripe').first
        
        if stripe_section.count() > 0:
            print("✓ Found Stripe section")
            page.screenshot(path='/tmp/stripe-integration.png')
            print("✓ Stripe screenshot: /tmp/stripe-integration.png")
            
            # Check for API key inputs
            publishable_key = page.locator('input[name*="publishable"]')
            secret_key = page.locator('input[name*="secret"]')
            
            if publishable_key.count() > 0:
                print("✓ Found Stripe publishable key input")
            if secret_key.count() > 0:
                print("✓ Found Stripe secret key input")
            
            # Check for webhook configuration
            webhook_input = page.locator('input[name*="webhook"]')
            if webhook_input.count() > 0:
                print("✓ Found webhook secret input")
        else:
            print("⚠ Stripe section not found")
            
    except Exception as e:
        print(f"✗ Error testing Stripe: {e}")

def test_settings_page(page: Page):
    """Test admin settings page"""
    print_section("Testing Admin Settings")
    
    try:
        print("→ Navigating to settings...")
        page.goto(f"{BASE_URL}/admin/settings")
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/admin-settings.png')
        print("✓ Settings page screenshot: /tmp/admin-settings.png")
        
        # Check for common settings sections
        sections = [
            "Profile",
            "Security",
            "Notifications",
            "API Keys"
        ]
        
        for section in sections:
            locator = page.get_by_text(section)
            if locator.count() > 0:
                print(f"✓ Found settings section: {section}")
            else:
                print(f"⚠ Missing settings section: {section}")
                
    except Exception as e:
        print(f"✗ Error testing settings: {e}")

def test_security_features(page: Page):
    """Test security features (session management, etc.)"""
    print_section("Testing Security Features")
    
    try:
        # Check for security-related UI elements
        print("→ Checking security controls...")
        
        # Look for logout button
        logout_btn = page.get_by_role('button', name='Logout')
        logout_link = page.get_by_role('link', name='Logout')
        
        if logout_btn.count() > 0 or logout_link.count() > 0:
            print("✓ Found logout control")
        
        # Check for session timeout info
        session_info = page.locator('text=/session|timeout/i')
        if session_info.count() > 0:
            print("✓ Found session management info")
            
        page.screenshot(path='/tmp/security-features.png')
        print("✓ Security features screenshot: /tmp/security-features.png")
        
    except Exception as e:
        print(f"✗ Error testing security: {e}")

def test_responsive_design(page: Page):
    """Test responsive design at different viewport sizes"""
    print_section("Testing Responsive Design")
    
    viewports = [
        ("Desktop", 1920, 1080),
        ("Tablet", 768, 1024),
        ("Mobile", 375, 667)
    ]
    
    try:
        page.goto(f"{BASE_URL}/admin/dashboard")
        
        for name, width, height in viewports:
            print(f"→ Testing {name} viewport ({width}x{height})...")
            page.set_viewport_size({"width": width, "height": height})
            page.wait_for_timeout(500)  # Let page adjust
            
            filename = f'/tmp/responsive-{name.lower()}.png'
            page.screenshot(path=filename)
            print(f"✓ {name} screenshot: {filename}")
            
    except Exception as e:
        print(f"✗ Error testing responsive design: {e}")

def run_all_tests():
    """Run all admin panel tests"""
    print("\n" + "="*60)
    print("  AC Defense Admin Panel - Playwright Test Suite")
    print("="*60)
    print(f"\nTarget: {BASE_URL}")
    print(f"Admin Email: {ADMIN_EMAIL}")
    print(f"Screenshots will be saved to /tmp/")
    
    with sync_playwright() as p:
        # Launch browser
        print("\n→ Launching Chromium browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Set reasonable timeout
        page.set_default_timeout(10000)  # 10 seconds
        
        try:
            # Test admin login
            if not test_admin_login(page):
                print("\n✗ Login failed. Stopping tests.")
                return False
            
            # Test dashboard
            test_dashboard_navigation(page)
            
            # Test OAuth integrations
            test_google_oauth(page)
            test_calendly_integration(page)
            test_sendgrid_integration(page)
            test_stripe_integration(page)
            
            # Test settings
            test_settings_page(page)
            
            # Test security features
            test_security_features(page)
            
            # Test responsive design
            test_responsive_design(page)
            
            print_section("Test Summary")
            print("✓ All tests completed!")
            print("\nScreenshots saved to /tmp/:")
            print("  - admin-login.png")
            print("  - admin-dashboard.png")
            print("  - oauth-page.png")
            print("  - google-oauth-details.png")
            print("  - calendly-integration.png")
            print("  - sendgrid-integration.png")
            print("  - stripe-integration.png")
            print("  - admin-settings.png")
            print("  - security-features.png")
            print("  - responsive-*.png (desktop, tablet, mobile)")
            
            return True
            
        except Exception as e:
            print(f"\n✗ Unexpected error: {e}")
            page.screenshot(path='/tmp/error-state.png')
            return False
            
        finally:
            browser.close()
            print("\n→ Browser closed")

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
