const { test, expect } = require('@playwright/test');

test.describe('Budget Variable Expense Update (Authenticated)', () => {
  test('should login and test variable expense update with console debugging', async ({ page }) => {
    const consoleLogs = [];
    
    // Capture all console logs
    page.on('console', msg => {
      const logMessage = `${msg.type()}: ${msg.text()}`;
      consoleLogs.push(logMessage);
      console.log('🖥️ Browser Console:', logMessage);
    });

    // Navigate to the app
    await page.goto('http://localhost:3000', { timeout: 30000 });
    console.log('✅ Navigated to localhost:3000');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for and click the "Sign In" button
    const signInButton = page.locator('button:has-text("Sign In"), a:has-text("Sign In")').first();
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await signInButton.click();
    console.log('✅ Clicked Sign In button');

    // Wait for auth page to load
    await page.waitForLoadState('networkidle');

    // Fill in login credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    await emailInput.fill('admin@unbrokenpockets.com');
    await passwordInput.fill('Password05@@10');
    console.log('✅ Filled in credentials');

    // Click the "Sign in" button (the one that appears after entering credentials)
    const loginButton = page.locator('button:has-text("Sign in")').first();
    await expect(loginButton).toBeVisible({ timeout: 5000 });
    await loginButton.click();
    console.log('✅ Clicked "Sign in" button');

    // Wait for login to complete - check URL changes
    await page.waitForTimeout(2000); // Give time for login processing
    
    let loginUrl = page.url();
    console.log(`URL after clicking Sign in: ${loginUrl}`);
    
    try {
      // Wait for URL to change away from auth page
      await page.waitForFunction(() => !window.location.pathname.includes('/auth'), { timeout: 15000 });
      loginUrl = page.url();
      console.log(`✅ Login completed - redirected to: ${loginUrl}`);
    } catch (error) {
      loginUrl = page.url();
      console.log(`⚠️ Login timeout - still at: ${loginUrl}`);
      
      // Check if there are any error messages on the page
      const errorMessages = await page.locator('[role="alert"], .error, .text-red-500').allTextContents();
      if (errorMessages.length > 0) {
        console.log('Error messages found:', errorMessages);
      }
    }

    // Give time for any additional navigation/loading
    await page.waitForTimeout(2000);

    // Navigate to Budget page by going directly to the URL
    console.log('🔗 Navigating directly to budget page...');
    await page.goto('http://localhost:3000/budget', { timeout: 15000 });
    
    // Wait for the page to load basic content
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/budget')) {
      console.log('✅ Budget page loaded successfully');
    } else {
      console.log('❌ Failed to reach budget page');
    }

    // Wait for budget content to load
    await page.waitForTimeout(3000);

    // Look for variable expense table
    const variableExpenseSection = page.locator('text=Variable Expenses').first();
    if (await variableExpenseSection.isVisible({ timeout: 5000 })) {
      console.log('✅ Found Variable Expenses section');
    }

    // Find the debug button if it exists
    const debugButton = page.locator('button:has-text("🐛 Debug Current State")');
    if (await debugButton.isVisible({ timeout: 2000 })) {
      console.log('✅ Found debug button, clicking it...');
      await debugButton.click();
      await page.waitForTimeout(1000);
    }

    // Look for variable expense input fields
    const inputFields = page.locator('table input[type="number"], input[type="number"]');
    const inputCount = await inputFields.count();
    console.log(`Found ${inputCount} number input fields`);

    if (inputCount > 0) {
      // Get the first input field
      const firstInput = inputFields.first();
      
      // Get current value
      const currentValue = await firstInput.inputValue();
      console.log(`Current value of first input: "${currentValue}"`);

      // Clear and set to 0
      await firstInput.clear();
      await firstInput.fill('0');
      console.log('✅ Changed input value to 0');

      // Trigger blur event to simulate user leaving the field
      await firstInput.blur();
      console.log('✅ Blurred input field');

      // Wait for any updates/dialogs
      await page.waitForTimeout(2000);

      // Check for confirmation dialog
      const dialog = page.locator('[role="alertdialog"], [role="dialog"]');
      if (await dialog.isVisible({ timeout: 3000 })) {
        console.log('✅ Confirmation dialog appeared');
        
        const dialogText = await dialog.textContent();
        console.log(`Dialog content: ${dialogText}`);

        // Look for "Update All Months" button
        const updateAllButton = page.locator('button:has-text("Update All Months")');
        if (await updateAllButton.isVisible({ timeout: 2000 })) {
          await updateAllButton.click();
          console.log('✅ Clicked "Update All Months" button');
          
          // Wait for update to complete
          await page.waitForTimeout(3000);
        } else {
          console.log('❌ "Update All Months" button not found');
        }
      } else {
        console.log('ℹ️ No confirmation dialog appeared');
      }

      // Click debug button again if it exists to see updated state
      if (await debugButton.isVisible()) {
        console.log('🔄 Clicking debug button again to see updated state...');
        await debugButton.click();
        await page.waitForTimeout(1000);
      }

      // Check if the input value changed back or stayed at 0
      const finalValue = await firstInput.inputValue();
      console.log(`Final value of input: "${finalValue}"`);

      if (finalValue !== '0') {
        console.log(`⚠️ ISSUE DETECTED: Input value changed from 0 to "${finalValue}"`);
      } else {
        console.log('✅ Input value remained at 0');
      }

    } else {
      console.log('❌ No variable expense input fields found');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'debug-budget-page.png', fullPage: true });
      console.log('📸 Screenshot saved as debug-budget-page.png');
    }

    // Final wait to capture any late console logs
    await page.waitForTimeout(3000);

    console.log('\n📋 All Console Logs Summary:');
    consoleLogs.forEach((log, index) => {
      if (log.includes('DEBUG') || log.includes('Error') || log.includes('Warning')) {
        console.log(`⚠️ ${index + 1}. ${log}`);
      }
    });
  });
}); 