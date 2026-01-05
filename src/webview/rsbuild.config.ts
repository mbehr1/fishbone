import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'

export default defineConfig({
  html: {
    template: './public/index.html',
  },
  plugins: [pluginReact()],
  output:{
    manifest: "asset-manifest.json",
  }
})
