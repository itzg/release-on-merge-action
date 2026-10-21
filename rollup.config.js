import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const config = {
  input: "src/index.ts",
  output: {
    esModule: true,
    file: "dist/index.js",
    format: "es",
    sourcemap: true,
  },
  plugins: [
    typescript(),
    commonjs(),
    nodeResolve({ preferBuiltins: true }),
  ],
  // Suppress non-actionable diagnostic noise from third-party dependencies in node_modules
  // (such as TypeScript helpers using `this` at the top level or circular imports in @actions/*)
  // to preserve developer attention for genuine build warnings in first-party code.
  onwarn(warning, warn) {
    if (
      (warning.code === "THIS_IS_UNDEFINED" &&
        (warning.id?.includes("node_modules") ||
          warning.loc?.file?.includes("node_modules"))) ||
      (warning.code === "CIRCULAR_DEPENDENCY" &&
        warning.ids?.some((id) => id.includes("node_modules")))
    ) {
      return;
    }
    warn(warning);
  },
};

export default config;
