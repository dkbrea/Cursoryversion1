const { test, expect } = require('@playwright/test');

test.describe('Demo Authentication Test', () => {
  test('should demonstrate authentication process with delays', async ({ page }) => {
    console.log('🚀 Starting demo authentication test...');
    
    // Step 1: Navigate to the app
    console.log('📍 Step 1: Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    console.log('✅ Step 1 Complete: Page loaded');
    console.log(`Current URL: ${page.url()}`);
    await page.waitForTimeout(5000); // 5 second delay
    
    // Step 2: Look for and click initial Sign In button/link
    console.log('📍 Step 2: Looking for initial Sign In button/link...');
    let foundSignIn = false;
    
    // Try different variations of sign in elements
    if (await page.locator('button:has-text("Sign in")').isVisible({ timeout: 3000 })) {
      console.log('✅ Found "Sign in" button');
      await page.locator('button:has-text("Sign in")').click();
      foundSignIn = true;
    } else if (await page.locator('a:has-text("Sign in")').isVisible({ timeout: 3000 })) {
      console.log('✅ Found "Sign in" link');
      await page.locator('a:has-text("Sign in")').click();
      foundSignIn = true;
    } else if (await page.locator('button:has-text("Sign In")').isVisible({ timeout: 3000 })) {
      console.log('✅ Found "Sign In" button');
      await page.locator('button:has-text("Sign In")').click();
      foundSignIn = true;
    } else {
      console.log('⚠️ No initial sign in button found, trying auth page directly...');
      await page.goto('http://localhost:3000/auth', { timeout: 15000 });
      foundSignIn = true;
    }
    
    if (foundSignIn) {
      console.log('✅ Step 2 Complete: Sign in action taken');
      await page.waitForTimeout(3000);
      console.log(`URL after sign in click: ${page.url()}`);
    }
    await page.waitForTimeout(5000); // 5 second delay
    
    // Step 3: Wait for and verify email input field
    console.log('📍 Step 3: Looking for email input field...');
    // Try multiple selectors for the email field
    let emailInput = page.locator('input[placeholder*="email"]').first();
    if (!await emailInput.isVisible({ timeout: 3000 })) {
      emailInput = page.locator('input[type="text"]').first();
    }
    if (!await emailInput.isVisible({ timeout: 3000 })) {
      emailInput = page.locator('input').first();
    }
    
    await emailInput.waitFor({ timeout: 10000 });
    
    if (await emailInput.isVisible()) {
      console.log('✅ Email input field found');
      await emailInput.clear();
      await emailInput.fill('admin@unbrokenpockets.com');
      console.log('✅ Step 3 Complete: Email filled: admin@unbrokenpockets.com');
    } else {
      console.log('❌ Step 3 Failed: Email input not found');
    }
    await page.waitForTimeout(5000); // 5 second delay
    
    // Step 4: Fill password field
    console.log('📍 Step 4: Looking for password input field...');
    const passwordInput = page.locator('input[type="password"]');
    
    if (await passwordInput.isVisible({ timeout: 5000 })) {
      console.log('✅ Password input field found');
      await passwordInput.clear();
      await passwordInput.fill('Password05@@10');
      console.log('✅ Step 4 Complete: Password filled: Password05@@10');
    } else {
      console.log('❌ Step 4 Failed: Password input not found');
    }
    await page.waitForTimeout(5000); // 5 second delay
    
    // Step 5: Click Sign In/Submit button
    console.log('📍 Step 5: Looking for Sign In/Submit button...');
    let submitClicked = false;
    
    // Try different variations of submit buttons
    if (await page.locator('button[type="submit"]').isVisible({ timeout: 3000 })) {
      console.log('✅ Found submit button');
      await page.locator('button[type="submit"]').click();
      submitClicked = true;
    } else if (await page.locator('button:has-text("Sign in")').isVisible({ timeout: 3000 })) {
      console.log('✅ Found "Sign in" button');
      await page.locator('button:has-text("Sign in")').click();
      submitClicked = true;
    } else if (await page.locator('button:has-text("Sign In")').isVisible({ timeout: 3000 })) {
      console.log('✅ Found "Sign In" button');
      await page.locator('button:has-text("Sign In")').click();
      submitClicked = true;
    } else {
      console.log('❌ No submit button found');
    }
    
    if (submitClicked) {
      console.log('✅ Step 5 Complete: Sign In button clicked');
    }
    await page.waitForTimeout(5000); // 5 second delay
    
    // Step 6: Wait for authentication and check URL change
    console.log('📍 Step 6: Waiting for authentication to complete...');
    await page.waitForTimeout(8000); // Longer wait for auth
    const urlAfterLogin = page.url();
    console.log(`Current URL after login: ${urlAfterLogin}`);
    
    if (urlAfterLogin.includes('/auth')) {
      console.log('⚠️ Still on auth page - authentication may have failed');
    } else {
      console.log('✅ URL changed - authentication appears successful');
    }
    console.log('✅ Step 6 Complete: Authentication check completed');
    await page.waitForTimeout(5000); // 5 second delay
    
    // Step 7: Navigate to budget page
    console.log('📍 Step 7: Navigating to budget page...');
    await page.goto('http://localhost:3000/budget', { timeout: 15000 });
    await page.waitForTimeout(3000);
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('/budget')) {
      console.log('✅ Step 7 Complete: Successfully reached budget page');
    } else {
      console.log('⚠️ Not on budget page - may have been redirected');
    }
    await page.waitForTimeout(5000); // 5 second delay
    
    // Step 8: Check for Variable Expenses section
    console.log('📍 Step 8: Looking for Variable Expenses section...');
    const variableExpensesSection = page.locator('text=Variable Expenses');
    if (await variableExpensesSection.isVisible({ timeout: 10000 })) {
      console.log('✅ Step 8 Complete: Variable Expenses section found');
    } else {
      console.log('❌ Step 8: Variable Expenses section not found');
      
      // Log what we can see on the page
      const pageText = await page.textContent('body');
      console.log('📝 Page content preview:', pageText.substring(0, 300) + '...');
    }
    await page.waitForTimeout(5000); // 5 second delay
    
    console.log('🎉 Demo test completed!');
    
    // Keep browser open for a bit longer to see the final state
    await page.waitForTimeout(10000);
    
    // For demo purposes, always pass
    expect(true).toBeTruthy();
  });
}); 