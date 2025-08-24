# Clippy AI Assistant

A nostalgic desktop assistant with a high‑fidelity Clippy, a modern glass theme, and on‑device AI chat powered by node‑llama‑cpp. Click Clippy for fun facts, drag him around, and tweak settings like model, temperature, and theme.

<!-- Screenshot placeholder: replace src with your image path -->
<p align="center">
  <img src="docs/screenshot.png" alt="Clippy AI Assistant" width="640" />
</p>

## Features
- Local LLM chat with streaming replies (no cloud required)
- Classic and Modern themes, settings panel, and quick actions menu
- Draggable Clippy with eye‑tracking; glow/particles when thinking
- Fun facts on click with background prefetch and fallback
- Auto model fetch on build; easy model switching via Settings

## Prerequisites
- Node.js 18 or 20 (LTS recommended)
- Windows 10/11. A Vulkan‑capable GPU is recommended but optional (CPU fallback works)
- ~0.5 GB disk for the default TinyLlama model (more for larger models)

## Quick start (PowerShell)
```powershell
# From the project root (clippy-ai)
# 1) Install dependencies
npm install

# 2) Download a starter model (if models/ is empty)
npm run download-model

# 3) Start the app in dev mode
npm start
```
First run will initialize the model; subsequent runs are faster.

## Quick start (bash)
```bash
# From the project root (clippy-ai)
# 1) Install dependencies
npm install

# 2) Download a starter model (if models/ is empty)
npm run download-model

# 3) Start the app in dev mode
npm start
```
First run will initialize the model; subsequent runs are faster.

## Build installers
The build auto‑fetches a default model if none exists and bundles `models/` as an extra resource.
```powershell
# Windows installer
npm run build:win

# Other targets (run on their respective OS)
npm run build:mac
npm run build:linux
```

## Settings and tips
- Open the Settings (gear icon):
  - Pick a GGUF model from `models/`
  - Adjust temperature and max tokens
  - Toggle Classic/Modern theme
- Right‑click in the chat for quick actions (summarize, rewrite, bullets, explain)
- Click Clippy to show a fun fact; a small queue is prefetched for instant popups

## Models
- Default: TinyLlama 1.1B Chat (Q4_K_M). Small and fast for demos.
- Use a different model:
  1) Place a `.gguf` file in `models/`
  2) Open Settings → choose your model
  3) Optionally tune temperature/max tokens

Tip: For better quality, try a 7B Q4_K_M chat model (larger/slower than TinyLlama).

## Troubleshooting
- Model not found or won’t load:
  - Ensure a `.gguf` exists under `models/`
  - Use Settings to select the correct file
- Slow or GPU issues:
  - Update GPU drivers. App falls back to CPU if needed
- Build problems:
  - Use Node 18/20; delete `node_modules` and run `npm install` again

## License
MIT