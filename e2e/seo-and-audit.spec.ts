import { test, expect } from '@playwright/test';

test.describe('SEO, Metadata, and Rendering Verification', () => {
  test('verifies metadata, canonical, OpenGraph, JSON-LD, and basic interactions', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // 1. Title and basic meta
    await expect(page).toHaveTitle(/Rohmatulloh.*(RHMT|R_HMT)/i);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description).toContain('Rohmatulloh');

    // 2. Canonical
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe('https://rhmt.biz.id/');

    // 3. Open Graph
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogImage).toContain('/images/pp.webp');
    expect(ogUrl).toBe('https://rhmt.biz.id/');

    // 4. JSON-LD structured data
    const jsonLdContent = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLdContent).toBeTruthy();
    const parsed = JSON.parse(jsonLdContent || '{}');
    expect(parsed['@graph']).toBeDefined();

    const person = parsed['@graph'].find((item: any) => item['@type'] === 'Person');
    expect(person).toBeDefined();
    expect(person.name).toBe('Rohmatulloh');
    expect(person.alternateName).toContain('RHMT');
    expect(person.alternateName).toContain('RHMT OFC');
    expect(person.alternateName).toContain('R_HMT OFC');
    expect(person.alternateName).toContain('Rahmat');
    expect(person.image).toBe('https://rhmt.biz.id/images/pp.webp');
    expect(person.sameAs.length).toBeGreaterThanOrEqual(4);

    // 5. Visual content rendering
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // 6. Check console errors (filter harmless webgl/audio warnings if any)
    const fatalErrors = consoleErrors.filter(err => !err.includes('AudioContext') && !err.includes('WEBGL'));
    expect(fatalErrors).toEqual([]);
  });
});
