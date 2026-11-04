import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const prototypeUrl = pathToFileURL(resolve('apps/prototype/index.html')).href;

test('prototype loads the overview', async ({ page }) => {
  await page.goto(prototypeUrl);
  await expect(page).toHaveTitle(/NomadNetOps Prototype/);
  await expect(page.locator('.logo')).toHaveText('NomadNetOps');
  await expect(page.getByRole('heading', { name: 'Good morning!' })).toBeVisible();
});
