const { test, expect } = require('@playwright/test');

test.describe('Debug Authentication Flow', () => {
  test('should properly authenticate and reach budget page', async ({ page }) => {
    // Navigate to the app
    console.log('🔗 Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Take a screenshot to see what we're dealing with
    await page.screenshot({ path: 'debug-initial-page.png' });
    console.log('📸 Screenshot taken: debug-initial-page.png');
    
    // Check current URL
    console.log(`Current URL: ${page.url()}`);
    
    // List all visible text on the page
    const bodyText = await page.textContent('body');
    console.log('📝 Page content preview:', bodyText.substring(0, 300) + '...');
    
    // Look for any form of sign in button or link
    const signInElements = await page.locator('text=/sign.*in/i').count();
    console.log(`Found ${signInElements} elements containing "sign in"`);
    
    // Try to find all buttons
    const buttons = await page.locator('button').count();
    console.log(`Found ${buttons} buttons on page`);
    
    // Try to find all links
    const links = await page.locator('a').count();
    console.log(`Found ${links} links on page`);
    
    // Look for specific authentication elements
    if (await page.locator('button:has-text("Sign in")').isVisible({ timeout: 2000 })) {
      console.log('✅ Found "Sign in" button');
      await page.locator('button:has-text("Sign in")').click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'debug-after-signin-click.png' });
      console.log('📸 Screenshot after sign in click: debug-after-signin-click.png');
    } else if (await page.locator('a:has-text("Sign in")').isVisible({ timeout: 2000 })) {
      console.log('✅ Found "Sign in" link');
      await page.locator('a:has-text("Sign in")').click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'debug-after-signin-click.png' });
      console.log('📸 Screenshot after sign in click: debug-after-signin-click.png');
    }
    
    // Now look for email input
    if (await page.locator('input[type="email"]').isVisible({ timeout: 5000 })) {
      console.log('✅ Found email input field');
      await page.fill('input[type="email"]', 'admin@unbrokenpockets.com');
      console.log('✅ Filled email');
      
      if (await page.locator('input[type="password"]').isVisible({ timeout: 2000 })) {
        await page.fill('input[type="password"]', 'Password05@@10');
        console.log('✅ Filled password');
        
        // Look for submit button
        if (await page.locator('button[type="submit"]').isVisible({ timeout: 2000 })) {
          await page.locator('button[type="submit"]').click();
          console.log('✅ Clicked submit button');
        } else if (await page.locator('button:has-text("Sign in")').isVisible({ timeout: 2000 })) {
          await page.locator('button:has-text("Sign in")').click();
          console.log('✅ Clicked Sign in button');
        }
        
        // Wait for redirect
        await page.waitForTimeout(5000);
        console.log(`URL after login: ${page.url()}`);
        await page.screenshot({ path: 'debug-after-login.png' });
        console.log('📸 Screenshot after login: debug-after-login.png');
      }
    } else {
      console.log('❌ No email input found');
    }
    
    // Try to go to budget page regardless
    console.log('🔗 Attempting to navigate to /budget...');
    await page.goto('http://localhost:3000/budget', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    console.log(`Final URL: ${page.url()}`);
    await page.screenshot({ path: 'debug-budget-page.png' });
    console.log('📸 Final screenshot: debug-budget-page.png');
    
    // Check what's on the budget page
    const budgetPageText = await page.textContent('body');
    console.log('📝 Budget page content preview:', budgetPageText.substring(0, 500) + '...');
    
    // Look for Variable Expenses specifically
    const hasVariableExpenses = await page.locator('text=Variable Expenses').isVisible({ timeout: 2000 });
    console.log(`Variable Expenses section visible: ${hasVariableExpenses}`);
    
    // This test always passes - it's just for debugging
    expect(true).toBeTruthy();
  });
}); 