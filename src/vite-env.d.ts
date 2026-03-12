/// <reference types="vite/client" />

// `.vue` ファイルを各所でそのまま import できるようにするための宣言。
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
