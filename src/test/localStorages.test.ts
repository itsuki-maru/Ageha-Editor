import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";

const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }));
vi.mock("@tauri-apps/plugin-store", () => ({ load: async () => mocks }));

describe("style preference persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it.each([{}, { stylePackFromLocalStorage: "unknown" }])(
    "loads old or invalid settings as standard",
    async (value) => {
      mocks.get.mockResolvedValue(value);
      const { useLocalStorageStore } = await import("@/stores/localStorages");
      const store = useLocalStorageStore();
      await store.init();
      expect(store.stylePackFromLocalStorage).toBe("standard");
    },
  );

  it("saves a selection and restores it in a new instance", async () => {
    mocks.get.mockResolvedValue({});
    const { useLocalStorageStore } = await import("@/stores/localStorages");
    const store = useLocalStorageStore();
    await store.init();
    store.setStylePack("paper");
    await nextTick();
    await Promise.resolve();
    expect(mocks.set).toHaveBeenCalledWith(
      "localState@v1",
      expect.objectContaining({ stylePackFromLocalStorage: "paper" }),
    );
    mocks.get.mockResolvedValue(mocks.set.mock.calls[0][1]);
    setActivePinia(createPinia());
    const restored = useLocalStorageStore();
    await restored.init();
    expect(restored.stylePackFromLocalStorage).toBe("paper");
  });
});
