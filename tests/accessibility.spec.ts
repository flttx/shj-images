import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("展厅、档案与移动图鉴满足基础可访问性", async ({ page }) => {
  await page.goto("/?beast=yinglong");
  await expect(page.getByText("三维实景")).toBeVisible({ timeout: 90_000 });
  const exhibit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(exhibit.violations).toEqual([]);
  await page.getByRole("button", { name: "展开异兽志" }).click();
  const dossier = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(dossier.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole("button", { name: "异兽图鉴" }).click();
  const catalog = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(catalog.violations).toEqual([]);
});
