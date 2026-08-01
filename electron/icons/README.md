# Application Icons

Place the following icon files in this directory before building:

## Required Files

| File | Platform | Size | Format |
|------|----------|------|--------|
| `icon.ico` | Windows | 256×256 (multi-size ICO) | ICO |
| `icon.png` | Linux | 512×512 | PNG |
| `icon.icns` | macOS | 512×512 | ICNS |

## How to Generate Icons

### From a PNG source image (recommended)

Start with a high-resolution PNG (at least 1024×1024) with a transparent background.

**Windows ICO** — using ImageMagick:
```bash
magick input.png -resize 256x256 icon.ico
# Or with multiple sizes:
magick input.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

**Linux PNG** — simply resize:
```bash
magick input.png -resize 512x512 icon.png
```

**macOS ICNS** — on macOS:
```bash
mkdir icon.iconset
sips -z 16 16     input.png --out icon.iconset/icon_16x16.png
sips -z 32 32     input.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     input.png --out icon.iconset/icon_32x32.png
sips -z 64 64     input.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   input.png --out icon.iconset/icon_128x128.png
sips -z 256 256   input.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   input.png --out icon.iconset/icon_256x256.png
sips -z 512 512   input.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   input.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 input.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o icon.icns
```

### Online Tools

- https://www.icoconverter.com/ — PNG to ICO
- https://cloudconvert.com/png-to-icns — PNG to ICNS
- https://redketchup.io/icon-converter — All formats

## Design Guidelines

- Use a simple, bold icon that's recognizable at small sizes
- Avoid thin lines and complex gradients that won't render well at 16×16
- The Legacy Business ERP uses a dark indigo/purple brand color (#6366f1)
- Recommended: use the "LB" monogram on a rounded rectangle background

## Current Status

⚠️ **Placeholder icons not included.** You must add icon files before building.

The build will fail with an error if icon files are missing when running
`electron-builder --win`.
