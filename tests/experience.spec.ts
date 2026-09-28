import { test, expect } from "@playwright/test";

test("图鉴搜索、种属筛选与收藏跨刷新保存", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "异兽图鉴" }).click();
  await expect(page.locator(".beast-card")).toHaveCount(20);
  await page.getByRole("textbox", { name: "搜索异兽" }).fill("九尾");
  await expect(page.locator(".beast-card")).toHaveCount(2);
  await expect(page.locator(".beast-card h2")).toHaveText(["陆吾", "九尾狐"]);
  await page.getByRole("textbox", { name: "搜索异兽" }).fill("九尾狐");
  await expect(page.locator(".beast-card")).toHaveCount(1);
  await expect(page.locator(".beast-card h2")).toHaveText("九尾狐");
  await page.getByRole("button", { name: "收藏九尾狐", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "我的收藏" }).click();
  await expect(page.locator(".beast-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "取消收藏九尾狐", exact: true })
    .click();
  await expect(page.getByText("此卷尚待相遇")).toBeVisible();
  await page.getByRole("button", { name: "前往异兽图鉴" }).click();
  await page.getByRole("button", { name: "水族", exact: true }).click();
  await expect(page.locator(".beast-card")).toHaveCount(2);
  await page.getByRole("textbox", { name: "搜索异兽" }).fill("不存在的异兽");
  await expect(page.getByText("山海之中，暂未寻见")).toBeVisible();
  await page.getByRole("button", { name: "查看全部异兽" }).click();
  await expect(page.locator(".beast-card")).toHaveCount(20);
  await page.getByRole("textbox", { name: "搜索异兽" }).fill("zhu long");
  await expect(page.locator(".beast-card h2")).toHaveText("烛龙");
});

test("深链、档案焦点与键盘换兽", async ({ page }) => {
  await page.goto("/?beast=dijiang");
  await expect(page.locator("h1")).toHaveText("帝江");
  const trigger = page.getByRole("button", { name: "展开异兽志" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "关闭异兽志" })).toBeFocused();
  await expect(page.getByRole("dialog")).toContainText("无");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.locator("main").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("h1")).toHaveText("开明兽");
  await expect(page).toHaveURL(/beast=kaiming/);
  await page.goto("/?beast=invalid");
  await expect(page.locator("h1")).toHaveText("烛龙");
});

test("模型失败可恢复且不阻塞档案", async ({ page }) => {
  await page.route("**/models/*.glb", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByText("形体暂未载入")).toBeVisible();
  await page.getByRole("button", { name: "展开异兽志" }).click();
  await expect(page.getByRole("heading", { name: "观其形" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.unroute("**/models/*.glb");
  await page.getByRole("button", { name: "重新载入" }).click();
  await expect(page.getByText("三维实景")).toBeVisible({ timeout: 90_000 });
  await page.getByRole("button", { name: "开始环绕巡览" }).click();
  await expect(
    page.getByRole("button", { name: "暂停环绕巡览" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "暂停环绕巡览" }).click();
  await page.getByRole("button", { name: "放大模型" }).click();
  await page.getByRole("button", { name: "复位视角" }).click();
});

test("声景默认静音，开启、音量零、关闭可操作", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "开启声景", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "开启声景", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "关闭声景", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.locator("summary").click();
  await page.getByRole("slider", { name: "声景音量" }).fill("0");
  await expect(page.getByRole("slider", { name: "声景音量" })).toHaveValue("0");
  await page.getByRole("button", { name: "关闭声景", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "开启声景", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("真实模型与响应式布局截图", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("三维实景")).toBeVisible({ timeout: 90_000 });
  await page.screenshot({ path: "qa/desktop.png", fullPage: true });
  for (const width of [320, 375, 414, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator("h1")).toBeVisible();
    const noOverflow = await page.evaluate(
      () =>
        Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ) <= window.innerWidth,
    );
    expect(noOverflow, `viewport ${width} must not overflow`).toBe(true);
    if (width === 375)
      await page.screenshot({ path: "qa/mobile.png", fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "异兽图鉴" }).click();
  await expect(page.locator(".beast-card")).toHaveCount(20);
  await page.screenshot({ path: "qa/catalog.png", fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ path: "qa/catalog-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
