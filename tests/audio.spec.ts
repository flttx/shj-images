import { expect, test } from "@playwright/test";

test("soundscape respects opt-in, mute, visibility, and disposal", async ({
  page,
}) => {
  await page.route("**/audio-contract", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<button>Enable audio</button>",
    }),
  );
  await page.route("**/audio/*.mp3", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.goto("/audio-contract");
  await page.getByRole("button").click();
  const result = await page.evaluate(async () => {
    const contexts: AudioContext[] = [];
    const OriginalContext = window.AudioContext;
    class TrackedContext extends OriginalContext {
      constructor() {
        super();
        contexts.push(this);
      }
    }
    window.AudioContext = TrackedContext;
    let starts = 0;
    const originalStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (
      ...args: Parameters<AudioBufferSourceNode["start"]>
    ) {
      starts += 1;
      originalStart.apply(this, args);
    };
    const modulePath = "/src/lib/audio.ts";
    const { Soundscape } = (await import(
      modulePath
    )) as typeof import("../src/lib/audio");
    const soundscape = new Soundscape();
    soundscape.cue("roar");
    const beforeEnable = contexts.length;
    await soundscape.enable();
    await soundscape.enable();
    const afterEnable = contexts.length;
    const active = contexts[0].state;
    soundscape.setVolume(0);
    const startsBeforeMute = starts;
    soundscape.cue("roar");
    soundscape.cue("awaken");
    soundscape.cue("select");
    const mutedDidNotStart = startsBeforeMute === starts;
    let hidden = true;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((resolve) => setTimeout(resolve, 350));
    const hiddenState = contexts[0].state;
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((resolve) => setTimeout(resolve, 80));
    const restoredState = contexts[0].state;
    soundscape.disable();
    await new Promise((resolve) => setTimeout(resolve, 350));
    const disabledState = contexts[0].state;
    soundscape.dispose();
    soundscape.dispose();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const disposedState = contexts[0].state;
    let rejectsAfterDispose = false;
    try {
      await soundscape.enable();
    } catch {
      rejectsAfterDispose = true;
    }
    return {
      beforeEnable,
      afterEnable,
      active,
      mutedDidNotStart,
      hiddenState,
      restoredState,
      disabledState,
      disposedState,
      rejectsAfterDispose,
    };
  });
  expect(result).toEqual({
    beforeEnable: 0,
    afterEnable: 1,
    active: "running",
    mutedDidNotStart: true,
    hiddenState: "suspended",
    restoredState: "running",
    disabledState: "suspended",
    disposedState: "closed",
    rejectsAfterDispose: true,
  });
});

test("beast-specific recordings override broad categories", async ({
  page,
}) => {
  const requests = new Set<string>();
  await page.route("**/audio-contract", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<button>Enable audio</button>",
    }),
  );
  await page.route("**/audio/*.mp3", (route) => {
    requests.add(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto("/audio-contract");
  await page.getByRole("button").click();
  await page.evaluate(async () => {
    const modulePath = "/src/lib/audio.ts";
    const { Soundscape } = (await import(
      modulePath
    )) as typeof import("../src/lib/audio");
    const soundscape = new Soundscape();
    soundscape.setBeast("zhulong", "神祇");
    await soundscape.enable();
    soundscape.cue("roar");
    await new Promise((resolve) => setTimeout(resolve, 100));
    soundscape.setBeast("bifang", "翼兽");
    await new Promise((resolve) => setTimeout(resolve, 100));
    soundscape.setBeast("fuzhu", "灵兽");
    await new Promise((resolve) => setTimeout(resolve, 100));
    soundscape.dispose();
  });
  expect(requests).toEqual(
    new Set([
      "/audio/ambience.mp3",
      "/audio/dragon.mp3",
      "/audio/bird.mp3",
      "/audio/deer.mp3",
    ]),
  );
});
