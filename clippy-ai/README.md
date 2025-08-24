# Clippy AI Desktop Assistant

A nostalgic AI desktop assistant that brings the beloved Clippy character to life with modern local LLM capabilities.

## Features

- 🖇️ **Nostalgic Interface**: Authentic 1990s Microsoft Office assistant styling
- 🔒 **Complete Privacy**: All AI processing happens locally on your device
- 💬 **Interactive Chat**: Natural conversation with streaming responses
- 🎭 **Character Animations**: Clippy reacts and animates during conversations
- 📱 **Cross-Platform**: Runs on Windows, macOS, and Linux

## Prerequisites

- Node.js 16+ installed on your system
- At least 8GB RAM
- A compatible GGUF model file (see Model Setup below)

## Installation

1. **Clone or download this project**
   ```bash
   cd clippy-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up a language model** (see Model Setup section below)

4. **Run the application**
   ```bash
   npm start
   ```

## Model Setup

To use Clippy AI, you need to provide a compatible GGUF language model:

1. **Create the models directory** (if it doesn't exist):
   ```bash
   mkdir models
   ```

2. **Download a compatible model**. Here are some recommended options:

   **Lightweight Models (4-8GB RAM):**
   - [Llama 2 7B Chat GGUF](https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF)
   - [Mistral 7B Instruct GGUF](https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF)

   **Medium Models (12-16GB RAM):**
   - [Llama 2 13B Chat GGUF](https://huggingface.co/TheBloke/Llama-2-13B-Chat-GGUF)

3. **Place the `.gguf` file** in the `models/` directory

4. **Restart the application** - Clippy will automatically detect and load the model

### Example Download Commands

```bash
# For Llama 2 7B (Q4_K_M quantization - good balance of quality and speed)
curl -L -o models/llama-2-7b-chat.q4_k_m.gguf \
  "https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.q4_k_m.gguf"

# For Mistral 7B (Q4_K_M quantization)
curl -L -o models/mistral-7b-instruct-v0.1.q4_k_m.gguf \
  "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF/resolve/main/mistral-7b-instruct-v0.1.q4_k_m.gguf"
```

## Development

### Running in Development Mode
```bash
npm run dev
```
This opens the app with developer tools enabled.

### Building for Distribution
```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Project Structure

```
clippy-ai/
├── src/
│   ├── main.js           # Electron main process
│   ├── preload.js        # Secure IPC bridge
│   ├── index.html        # Application UI
│   ├── styles.css        # 1990s-inspired styling
│   └── renderer.js       # Frontend logic
├── assets/               # Icons and static assets
├── models/               # LLM model files (.gguf)
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## Troubleshooting

### Common Issues

**"No LLM model found" error:**
- Ensure you have a `.gguf` file in the `models/` directory
- Check that the file downloaded completely (should be several GB)
- Restart the application after adding the model

**Application runs out of memory:**
- Try a smaller quantized model (Q4_K_M instead of Q8_0)
- Close other memory-intensive applications
- Ensure your system meets the minimum RAM requirements

**Slow response times:**
- Use a smaller model or higher quantization
- Ensure no other CPU-intensive tasks are running
- Consider upgrading your hardware

### Performance Tips

- **Q4_K_M quantization** provides the best balance of quality and speed
- **7B parameter models** work well on most modern computers
- **Close unnecessary applications** to free up RAM and CPU resources

## Privacy & Security

- **No Data Collection**: No user conversations are stored or transmitted
- **Local Processing**: All AI inference happens on your device
- **No Internet Required**: Works completely offline after setup
- **Open Source**: Full source code available for inspection

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Inspired by the original Microsoft Office Clippy assistant
- Built with [Electron](https://electronjs.org/) and [node-llama-cpp](https://github.com/withcatai/node-llama-cpp)
- Designed with love for the 1990s computing aesthetic ❤️