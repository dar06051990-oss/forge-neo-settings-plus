# Forge Neo Settings++

Additional display controls for **[Forge Neo](https://github.com/Haoming02/sd-webui-forge-classic)**, without modifying Forge's core files.

**Current version: v0.2.6** · Tested with Forge Neo (`neo` branch) on Windows.

## Features

### Extra Networks display modes

Use the three compact toolbar buttons beside the built-in search and sort controls in **txt2img** or **img2img**:

- **Cards** — normal preview tiles (images or videos).
- **No Preview** — compact text-only tiles with previews hidden.
- **List** — one model per row, with model actions still accessible.

The selected mode is stored locally in your browser, separately for each Extra Networks category (Checkpoints, LoRA, Textual Inversion and other categories), and shared between the txt2img/img2img views. **Cards** is the default mode.

Native model selection, search, sorting, refresh, Edit/Info/Copy actions and optional folder/tree navigation are preserved.

**Privacy limitation:** No Preview and List hide previews visually and pause playing videos, but the browser may still download preview images or video files. This is a display option, *not* a network-level content blocker.

### Settings → Forge Neo Settings++

| Setting | Options |
| --- | --- |
| Card Icon Size | 10–32 px; instant preview, saved with Apply settings |
| Maximum Resolution | Forge default / 2048 / 4096 / 8192 px |
| Card Name Position | Over preview / Below preview / Only on hover |
| Card Name Lines | 1 / 2 / Full name |
| Card Spacing | 0–24 px |
| Cards per Row | Automatic / 2 / 3 / 4 / 5 / 6 |
| Card Aspect Ratio | Forge defaults / Square / Portrait (3:4) / Landscape (16:9) |
| Preview Fitting | Fill / crop / Show full image |
| Slightly Enlarge Preview on Hover | On / Off |

**Cards per Row** limits how many tiles occupy a row **without enlarging** the native Forge card dimensions. In a narrow pane cards can shrink proportionally to fit. **Automatic** uses the standard Forge layout. Custom aspect ratios change the display proportions without changing Forge's saved card-size configuration.

**Maximum Resolution** changes only the upper bound of native Width and Height sliders in txt2img/img2img, after Apply settings and Reload UI. It does not bypass model, backend or VRAM constraints; `ui-config.json` is not modified.

## Install

1. Close Forge Neo.
2. Clone this repository into `Forge Neo/extensions/forge-neo-settings-plus`:

   ```bash
   git clone https://github.com/dar06051990-oss/forge-neo-settings-plus.git
   ```

   Alternatively, download the release ZIP and extract its included `forge-neo-settings-plus` folder into Forge's `extensions` directory.
3. Start Forge Neo. In txt2img or img2img, open Extra Networks to use the mode icons. Open **Settings → Forge Neo Settings++** for the other controls.

For upgrades from a manually installed ZIP, back up and **replace** the old `extensions/forge-neo-settings-plus` directory. Do not nest two folders with the same name. Restart Forge after an upgrade, and refresh the browser with Ctrl+F5 if the old JavaScript is cached.

This extension does not require extra Python packages, separate runtimes or model downloads.

## Compatibility and notes

- Designed for the **Forge Neo** UI, not guaranteed to work with Forge Classic, reForge or Automatic1111.
- The built-in Tree View is separate from this extension's List mode.
- Some third-party extensions create their own model-card HTML and may not follow the native Extra Networks display options.
- The toolbar modes are saved in browser localStorage; to show previews again, click the **Cards** icon.
- Appearance can be affected by custom themes or future changes to Forge's frontend HTML/CSS.

## License

MIT — see [LICENSE](LICENSE).
