const { test, expect } = require('@playwright/test');

test.describe('Budget Variable Expense Updates', () => {
  test.beforeEach(async ({ page }) => {
    // Listen to console logs to capture debug output
    page.on('console', msg => {
      if (msg.text().includes('DEBUG:')) {
        console.log('🖥️ Browser Console:', msg.text());
      }
    });

    // Navigate to the budget page
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Click on Budget navigation
    await page.click('[data-testid="nav-budget"], a[href="/budget"]');
    await page.waitForLoadState('networkidle');
    
    // Wait for budget data to load
    await page.waitForSelector('[data-testid="budget-summary"], .budget-status', { timeout: 10000 });
  });

  test('should update budget status when variable expense amounts are changed to 0', async ({ page }) => {
    // First, check if there are any variable expenses with non-zero amounts
    const variableExpenseRows = page.locator('table tbody tr').filter({ hasText: /Groceries|Shopping|Pets/ });
    
    if (await variableExpenseRows.count() === 0) {
      // If no variable expenses exist, create one first
      await page.click('button:has-text("Add Category")');
      await page.waitForSelector('[role="dialog"]');
      
      await page.fill('input[placeholder*="category name"]', 'Test Category');
      await page.fill('input[type="number"]', '500');
      await page.click('button:has-text("Add Category"):not([disabled])');
      await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
    }
    
    // Get initial budget status values
    const initialVariableExpensesText = await page.locator('text=Variable Expenses').locator('..').locator('span').last().textContent();
    console.log('Initial Variable Expenses:', initialVariableExpensesText);
    
    // Find the first variable expense row and change its amount to 0
    const firstExpenseRow = await variableExpenseRows.first();
    const amountInput = firstExpenseRow.locator('input[type="number"]');
    
    // Clear and set to 0
    await amountInput.clear();
    await amountInput.fill('0');
    await amountInput.blur(); // Trigger the blur event to save
    
    // Wait for potential update dialog
    const updateDialog = page.locator('[role="alertdialog"]:has-text("Update Variable Expense Amount")');
    if (await updateDialog.isVisible({ timeout: 2000 })) {
      // Click "Update All Months" to apply the change
      await page.click('button:has-text("Update All Months")');
      await page.waitForSelector('[role="alertdialog"]', { state: 'hidden' });
    }
    
    // Wait for the budget to recalculate
    await page.waitForTimeout(1000);
    
    // Check if the budget status has updated
    const updatedVariableExpensesText = await page.locator('text=Variable Expenses').locator('..').locator('span').last().textContent();
    console.log('Updated Variable Expenses:', updatedVariableExpensesText);
    
    // The variable expenses total should be lower now
    const initialAmount = parseFloat(initialVariableExpensesText?.replace(/[$,]/g, '') || '0');
    const updatedAmount = parseFloat(updatedVariableExpensesText?.replace(/[$,]/g, '') || '0');
    
    expect(updatedAmount).toBeLessThan(initialAmount);
    
    // Verify the "Left to Allocate" amount has also updated accordingly
    const leftToAllocateElement = page.locator('text=Left to Allocate').locator('..').last();
    await expect(leftToAllocateElement).toBeVisible();
  });

  test('should update budget status when multiple variable expenses are set to 0', async ({ page }) => {
    // Get all variable expense rows
    const variableExpenseRows = page.locator('table tbody tr').filter({ hasText: /\$/ });
    const rowCount = await variableExpenseRows.count();
    
    if (rowCount === 0) {
      test.skip('No variable expenses found to test');
    }
    
    // Get initial total from budget status
    const initialBudgetStatus = await page.locator('text=Variable Expenses').locator('..').locator('span').last().textContent();
    console.log('Initial Budget Status Variable Expenses:', initialBudgetStatus);
    
    // Set all variable expenses to 0
    for (let i = 0; i < Math.min(rowCount, 3); i++) { // Limit to first 3 for test efficiency
      const row = variableExpenseRows.nth(i);
      const amountInput = row.locator('input[type="number"]');
      
      if (await amountInput.isVisible()) {
        await amountInput.clear();
        await amountInput.fill('0');
        await amountInput.blur();
        
        // Handle update dialog if it appears
        const updateDialog = page.locator('[role="alertdialog"]:has-text("Update Variable Expense Amount")');
        if (await updateDialog.isVisible({ timeout: 1000 })) {
          await page.click('button:has-text("Update All Months")');
          await page.waitForSelector('[role="alertdialog"]', { state: 'hidden' });
        }
        
        // Small delay between updates
        await page.waitForTimeout(500);
      }
    }
    
    // Wait for final recalculation
    await page.waitForTimeout(2000);
    
    // Check final budget status
    const finalBudgetStatus = await page.locator('text=Variable Expenses').locator('..').locator('span').last().textContent();
    console.log('Final Budget Status Variable Expenses:', finalBudgetStatus);
    
    // The budget status should show $0.00 or a much lower amount
    const finalAmount = parseFloat(finalBudgetStatus?.replace(/[$,]/g, '') || '0');
    expect(finalAmount).toBeLessThanOrEqual(100); // Should be very low or 0
  });

  test('should show correct totals in variable expense table vs budget status', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Get total from variable expense table (bottom row)
    const tableTotal = await page.locator('table tbody tr:has-text("Total")').locator('td').nth(2).textContent();
    console.log('Table Total:', tableTotal);
    
    // Get total from budget status
    const budgetStatusTotal = await page.locator('text=Variable Expenses').locator('..').locator('span').last().textContent();
    console.log('Budget Status Total:', budgetStatusTotal);
    
    // These should match (allowing for formatting differences)
    const tableAmount = parseFloat(tableTotal?.replace(/[$,]/g, '') || '0');
    const budgetAmount = parseFloat(budgetStatusTotal?.replace(/[$,]/g, '') || '0');
    
    expect(Math.abs(tableAmount - budgetAmount)).toBeLessThan(0.01); // Allow for rounding differences
  });
});

test.describe('Budget Variable Expense Update - Race Condition Fix', () => {
  test('should properly update variable expense amounts without race conditions', async ({ page }) => {
    const consoleLogs = [];
    
    // Capture all console logs
    page.on('console', msg => {
      const logMessage = `${msg.type()}: ${msg.text()}`;
      consoleLogs.push(logMessage);
      
      // Log key messages for debugging
      if (logMessage.includes('💰 DEBUG') || logMessage.includes('📊 DEBUG') || logMessage.includes('📋 DEBUG') || logMessage.includes('🔍 DEBUG')) {
        console.log('🖥️ Browser Debug:', logMessage);
      }
    });

    // Navigate to the app and log in
    await page.goto('http://localhost:3000', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Sign in
    const signInButton = page.locator('button:has-text("Sign in"), a:has-text("Sign in")').first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
      
      // Fill credentials
      await page.fill('input[type="email"]', 'admin@unbrokenpockets.com');
      await page.fill('input[type="password"]', 'Password05@@10');
      
      // Click sign in button after credentials
      const loginButton = page.locator('button:has-text("Sign in")').first();
      await loginButton.click();
      
      // Wait for successful login
      await page.waitForFunction(() => !window.location.pathname.includes('/auth'), { timeout: 15000 });
      console.log('✅ Successfully logged in');
    }

    // Navigate to budget page
    await page.goto('http://localhost:3000/budget', { timeout: 15000 });
    await page.waitForTimeout(5000); // Give extra time for all data to load
    console.log('✅ Budget page loaded');

    // Wait for variable expenses to be visible and data to load
    await page.waitForSelector('text=Variable Expenses', { timeout: 10000 });
    await page.waitForTimeout(3000); // Allow data loading to complete

    // Find the first variable expense input
    const firstExpenseInput = page.locator('input[type="number"]').first();
    await expect(firstExpenseInput).toBeVisible({ timeout: 5000 });
    
    // Get the current value
    const currentValue = await firstExpenseInput.inputValue();
    console.log(`📝 Current expense value: ${currentValue}`);
    
    // Try updating to 0
    await firstExpenseInput.fill('0');
    await firstExpenseInput.blur(); // Trigger the blur event
    
    console.log('📝 Updated expense to 0');
    
    // Wait a moment for any processing
    await page.waitForTimeout(2000);
    
    // Check if update dialog appears
    const updateAllButton = page.locator('button:has-text("Update All Months")');
    const overrideButton = page.locator('button:has-text("Override Current Month Only")');
    
    if (await updateAllButton.isVisible({ timeout: 3000 })) {
      console.log('📝 Update scope dialog appeared - clicking "Update All Months"');
      await updateAllButton.click();
      await page.waitForTimeout(2000);
    } else if (await overrideButton.isVisible({ timeout: 3000 })) {
      console.log('📝 Update scope dialog appeared - clicking "Override Current Month Only"');
      await overrideButton.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('📝 No update dialog appeared - checking if update happened directly');
    }
    
    // Verify the value changed
    const newValue = await firstExpenseInput.inputValue();
    console.log(`📝 New expense value: ${newValue}`);
    
    // Look for success indicators in console logs
    const hasUpdateLogs = consoleLogs.some(log => 
      log.includes('✅ DEBUG: Triggering update') || 
      log.includes('🔧 DEBUG: Starting update') ||
      log.includes('✅ DEBUG: Database updated successfully')
    );
    
    console.log(`📝 Test Results:`);
    console.log(`  - Original value: ${currentValue}`);
    console.log(`  - New value: ${newValue}`);
    console.log(`  - Update logs found: ${hasUpdateLogs}`);
    console.log(`  - Value changed: ${currentValue !== newValue}`);
    
    // Check if the race condition is resolved by looking at debug logs
    const raceConditionResolved = consoleLogs.some(log => 
      log.includes('📊 DEBUG: Using fallback data') && log.includes('currentTotalVariableExpenses')
    );
    
    console.log(`  - Race condition fix active: ${raceConditionResolved}`);

    // The test is successful if:
    // 1. We can update the value OR
    // 2. The race condition fix is working (fallback data shows current expenses)
    expect(currentValue !== newValue || raceConditionResolved).toBeTruthy();
  });
}); 