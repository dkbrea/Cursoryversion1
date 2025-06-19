const { test, expect } = require('@playwright/test');

test.describe('Variable Expense Update Debugging', () => {
  test('should debug variable expense update flow', async ({ page }) => {
    // Capture console logs
    const consoleLogs = [];
    page.on('console', (msg) => {
      const text = msg.text();
      console.log(`🖥️  ${text}`);
      consoleLogs.push(text);
    });

    try {
      // Navigate to the app
      console.log('🚀 Starting variable expense debugging test...');
      await page.goto('http://localhost:3000');
      
      // Check for authentication
      const signInButton = page.locator('button:has-text("Sign In"), button:has-text("Get Started")');
      
      if (await signInButton.isVisible({ timeout: 5000 })) {
        console.log('📝 Need to authenticate first');
        await signInButton.click();
        
        // Fill in test credentials
        await page.fill('input[type="email"]', 'test@test.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        
        // Wait for redirect to dashboard
        await page.waitForURL('**/dashboard', { timeout: 10000 });
      }
      
      console.log('✅ Authentication completed');
      
      // Navigate to budget page
      await page.click('a[href="/budget"], button:has-text("Budget")');
      await page.waitForURL('**/budget');
      console.log('✅ Navigated to budget page');
      
      // Wait for data to load
      await page.waitForTimeout(3000);
      
      // Look for variable expense section
      const variableExpenseSection = page.locator('h3:has-text("Variable Expenses"), h2:has-text("Variable Expenses")');
      await expect(variableExpenseSection).toBeVisible({ timeout: 10000 });
      console.log('✅ Variable expense section found');
      
      // Wait for inputs to load
      await page.waitForTimeout(2000);
      
      // Find variable expense inputs
      const expenseInputs = page.locator('input[type="number"]');
      const inputCount = await expenseInputs.count();
      console.log(`📝 Found ${inputCount} variable expense inputs`);
      
      if (inputCount > 0) {
        const firstInput = expenseInputs.first();
        
        // Check if input is enabled
        const isEnabled = await firstInput.isEnabled();
        console.log(`📝 First input enabled: ${isEnabled}`);
        
        if (isEnabled) {
          // Get current value
          const currentValue = await firstInput.inputValue();
          console.log(`📝 Current value: ${currentValue}`);
          
          // Try to update the value
          console.log('📝 Attempting to update value to 123...');
          await firstInput.fill('123');
          await firstInput.blur();
          
          // Wait for processing
          await page.waitForTimeout(3000);
          
          // Check for update dialog
          const updateAllButton = page.locator('button:has-text("Update All Months")');
          const overrideButton = page.locator('button:has-text("Override Current Month Only")');
          
          if (await updateAllButton.isVisible({ timeout: 3000 })) {
            console.log('✅ Update scope dialog appeared - clicking Update All Months');
            await updateAllButton.click();
            await page.waitForTimeout(2000);
          } else if (await overrideButton.isVisible({ timeout: 3000 })) {
            console.log('✅ Update scope dialog appeared - clicking Override Current Month Only');
            await overrideButton.click();
            await page.waitForTimeout(2000);
          } else {
            console.log('❌ No update dialog appeared');
          }
          
          // Check final value
          const finalValue = await firstInput.inputValue();
          console.log(`📝 Final value: ${finalValue}`);
        } else {
          console.log('❌ Input is disabled');
        }
      } else {
        console.log('❌ No variable expense inputs found');
      }
      
    } catch (error) {
      console.log(`❌ Test error: ${error.message}`);
    }
    
    // Give time for console logs to be captured
    await page.waitForTimeout(2000);
    
    // Analyze debugging logs
    console.log('\n📊 DEBUGGING ANALYSIS:');
    console.log('======================');
    
    const relevantLogs = consoleLogs.filter(log => 
      log.includes('🔍 DEBUG:') || 
      log.includes('🎯 DEBUG:') ||
      log.includes('✅ DEBUG:') ||
      log.includes('❌') ||
      log.includes('ERROR')
    );
    
    if (relevantLogs.length > 0) {
      console.log('📝 Relevant debugging logs found:');
      relevantLogs.forEach(log => console.log(`  ${log}`));
    } else {
      console.log('❌ No debugging logs found - this suggests the functions are not being called');
    }
    
    // The test doesn't need to assert anything - it's for debugging
    console.log('\n🔍 Debugging test completed');
  });
}); 