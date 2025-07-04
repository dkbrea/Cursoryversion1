const { test, expect } = require('@playwright/test');

test.describe('Debug Budget Variable Expenses', () => {
  test('should capture debug console output when updating variable expenses', async ({ page }) => {
    const consoleLogs = [];
    
    // Capture all console logs
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      if (msg.text().includes('DEBUG:')) {
        console.log('🖥️ Browser Debug:', msg.text());
      }
    });

    // Navigate to the app
    try {
      await page.goto('/dashboard', { timeout: 15000 });
      console.log('✅ Dashboard loaded');
    } catch (error) {
      console.log('❌ Failed to load dashboard:', error.message);
      // Try direct budget page
      await page.goto('/budget', { timeout: 15000 });
      console.log('✅ Budget page loaded directly');
    }

    await page.waitForLoadState('networkidle');

    // Try to find budget-related elements
    const budgetElements = await page.locator('text=Budget Status, text=Variable Expenses, [data-testid="budget-summary"]').count();
    console.log(`Found ${budgetElements} budget-related elements`);

    // Look for variable expense table
    const tableRows = await page.locator('table tbody tr').count();
    console.log(`Found ${tableRows} table rows`);

    if (tableRows > 0) {
      // Try to find and modify a variable expense
      const firstInput = page.locator('table input[type="number"]').first();
      
      if (await firstInput.isVisible({ timeout: 5000 })) {
        console.log('✅ Found variable expense input field');
        
        // Get current value
        const currentValue = await firstInput.inputValue();
        console.log(`Current input value: ${currentValue}`);
        
        // Try to change it to 0
        await firstInput.clear();
        await firstInput.fill('0');
        await firstInput.blur();
        
        console.log('✅ Changed input to 0 and blurred');
        
        // Wait a moment for any updates
        await page.waitForTimeout(2000);
        
        // Check for any dialogs
        const dialogVisible = await page.locator('[role="alertdialog"]').isVisible();
        console.log(`Update dialog visible: ${dialogVisible}`);
        
        if (dialogVisible) {
          const dialogText = await page.locator('[role="alertdialog"]').textContent();
          console.log(`Dialog content: ${dialogText}`);
          
          // Try to click "Update All Months" if it exists
          const updateButton = page.locator('button:has-text("Update All Months")');
          if (await updateButton.isVisible()) {
            await updateButton.click();
            console.log('✅ Clicked "Update All Months"');
            
            // Wait for the update to complete
            await page.waitForTimeout(3000);
          }
        }
      } else {
        console.log('❌ No variable expense input fields found');
      }
    } else {
      console.log('❌ No table rows found');
    }

    // Print all captured console logs at the end
    console.log('\n📋 All Console Logs:');
    consoleLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log}`);
    });

    // Wait a bit more to capture any final updates
    await page.waitForTimeout(2000);
  });
}); 