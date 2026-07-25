import { defineConfig } from "tsup";
import * as preset from "tsup-preset-solid";
import { dtsPlugin } from "esbuild-plugin-d.ts";

const preset_options: preset.PresetOptions = {
  // array or single object
  entries: [
    // default entry (index)
    {
      entry: "src/solid/index.tsx",
      // set `true` or pass a specific path to generate a development-only entry
      dev_entry: true,
      // set `true` or pass a specific path to generate a server-only entry
      server_entry: true,
    },
  ],
  out_dir: "dist/solid",
  // Set to `true` to remove all `console.*` calls and `debugger` statements in prod builds
  // drop_console: true,
  // Set to `true` to generate a CommonJS build alongside ESM
  cjs: false,
  esbuild_plugins: [dtsPlugin()],
  modify_esbuild_options(options) {
    options.minify = true;
    return options;
  },
};

export default defineConfig((config) => {
  const watching = !!config.watch;

  const parsed_data = preset.parsePresetOptions(preset_options, watching);

  const options = preset.generateTsupOptions(parsed_data);

  console.log(JSON.stringify(options, null, 2));

  return [
    {
      entry: {
        "core/index": "src/core/index.ts",
        "react/index": "src/react/index.ts",
        "server/index": "src/server/index.ts",
      },
      format: ["esm"],
      dts: true,
      clean: true,
      treeshake: true,
      splitting: false,
      minify: true,
      external: ["react", "@chenglou/pretext"],
    },
    ...options,
  ];
});
