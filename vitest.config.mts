import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    // El mismo alias que `tsconfig.json`. Hasta ahora no hacía falta porque todo
    // lo testeado vivía en `lib/` con imports relativos, pero un test que
    // importa algo de `components/` cae en los `@/` que ese código usa adentro.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
