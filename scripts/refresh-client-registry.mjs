// One-shot maintenance plugin for an isolated DSH 0.2.2-rc.1 trial host.
// Use only when the served workbench build remains stale after a versioned release.
// Retire this Loader entry after it runs; it does not restart the DSH process or agents.
export const inject = ['loader'];
export async function apply(ctx) {
  const entry = [...ctx.loader.entries()].find(value => value.options.name === '@deepseek-ai/dsh-client-modules');
  if (!entry?.fiber) throw Error('The host client module registry is unavailable');
  await entry.fiber.restart();
  await entry.fiber?.await();
}
