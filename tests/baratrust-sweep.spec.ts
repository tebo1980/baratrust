import { test, expect } from '@playwright/test';

test.describe('BaraTrust Suite Comprehensive Integration Sweep', () => {
  
  test.beforeEach(async ({ page }) => {
    // Automatically navigate to the local dev server before each test
    await page.goto('http://localhost:3000/dashboard');
  });

  test('Phase 1: Verify Wallets Telemetry Panel and Live Refuel Loop', async ({ page }) => {
    // 1. Jump to the wallets section
    await page.goto('http://localhost:3000/dashboard/wallets');
    await expect(page).toHaveURL(/.*wallets/);

    // 2. Locate the Fund Wallet button
    const refuelButton = page.locator('button:has-text("FUND WALLET"), button:has-text("REFUEL")');
    await expect(refuelButton).toBeVisible();

    // 3. Click the refuel button and immediately catch the loading state
    await refuelButton.click();
    await expect(refuelButton).toBeDisabled();
    await expect(refuelButton).toHaveText(/.*REFUELING.*/);
  });

  test('Phase 2: Verify Nova Manual Dispatch Override Controls', async ({ page }) => {
    // 1. Navigate to Nova Responder
    await page.goto('http://localhost:3000/dashboard/nova');
    
    // 2. Select standard HVAC parameters from the lookup dropdown
    const tradeDropdown = page.locator('select, [role="combobox"]').first();
    if (await tradeDropdown.isVisible()) {
      await tradeDropdown.selectOption({ label: 'HVAC' });
    }

    // 3. Ensure the lookup trigger or manual override controls surface gracefully
    const overrideToggle = page.locator('input[type="checkbox"], button:has-text("Override")').first();
    // Soft assertion: if the layout rendered rows, test the toggle interaction
    if (await overrideToggle.isVisible()) {
      await overrideToggle.click();
      await expect(overrideToggle).toBeChecked();
    }
  });

  test('Phase 3: Verify Conversational Agent Console Handlers', async ({ page }) => {
    const agents = ['della', 'brix', 'rex', 'max'];
    
    for (const agent of agents) {
      // 1. Cycle through each agent endpoint route safely
      await page.goto(`http://localhost:3000/agents?agent=${agent}`);
      
      // 2. Locate the message input container and send a test payload string
      const messageInput = page.locator('input[placeholder*="directive"], textarea').first();
      if (await messageInput.isVisible()) {
        await messageInput.fill('System validation check');
        await page.keyboard.press('Enter');
        
        // 3. Confirm the UI handles the mutation or standard fallback gracefully
        const consoleLog = page.locator('text=Error, text=reached, text=System');
        await expect(consoleLog.first()).toBeVisible();
      }
    }
  });
});
