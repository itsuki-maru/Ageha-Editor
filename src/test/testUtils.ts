import { createApp, defineComponent, h, nextTick } from "vue";

export async function mountComposable<T>(setup: () => T): Promise<{
  result: T;
  unmount: () => void;
}> {
  let result: T | undefined;
  const host = document.createElement("div");
  document.body.appendChild(host);

  const app = createApp(
    defineComponent({
      setup() {
        result = setup();
        return () => h("div");
      },
    }),
  );

  app.mount(host);
  await nextTick();

  return {
    result: result as T,
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}
