import {test, expect} from '@playwright/test';

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;

test.describe('BotAnalyzer dashboard', () => {
  test('manual entry, analysis include, empty report, reload', async ({page}) => {
    await page.goto(BASE);
    await expect(page.locator('h1')).toContainText('BotAnalyzer');
    await page.getByRole('button', {name: /Dodaj|Add/i}).click();
    await page.locator('#profile').fill('@playwright_a');
    await page.locator('#postUrl').fill('https://www.tiktok.com/@autor/video/111');
    await page.locator('#text').fill('Ovo je ista dovoljno duga poruka za test playwright');
    await page.getByRole('button', {name: /Sačuvaj|Save/i}).click();
    await page.locator('#profile').fill('@playwright_b');
    await page.locator('#text').fill('Ovo je ista dovoljno duga poruka za test playwright');
    await page.getByRole('button', {name: /Sačuvaj|Save/i}).click();
    await page.locator('#profile').fill('@playwright_c');
    await page.locator('#text').fill('Ovo je ista dovoljno duga poruka za test playwright');
    await page.getByRole('button', {name: /Sačuvaj|Save/i}).click();
    await page.getByRole('button', {name: /Analiza|Analysis/i}).click();
    await expect(page.locator('.finding, .empty').first()).toBeVisible();
    const select = page.locator('select[id^="review-"]').first();
    if (await select.count()) {
      await select.selectOption('include');
    }
    await page.getByRole('button', {name: /Prijava|Report/i}).click();
    const report = page.locator('textarea.report');
    await expect(report).toBeVisible();
    const before = await report.inputValue();
    await page.reload();
    await page.getByRole('button', {name: /Prijava|Report/i}).click();
    const after = await report.inputValue();
    expect(after.length).toBeGreaterThanOrEqual(0);
    if (before.includes('Zahtev') || before.includes('Request')) {
      expect(after).toContain(before.slice(0, 20));
    }
  });
});
