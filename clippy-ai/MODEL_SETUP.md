# Setting Up Your AI Model

Clippy AI needs a compatible language model to provide intelligent responses. Here's how to set it up:

## Quick Setup

1. **Download a model** (choose one):
   - **Recommended for most users**: [Llama 2 7B Chat (Q4_K_M)](https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.q4_k_m.gguf) (~4GB)
   - **For lower-end systems**: [TinyLlama 1.1B Chat](https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.q4_k_m.gguf) (~700MB)
   - **For high-end systems**: [Llama 2 13B Chat (Q4_K_M)](https://huggingface.co/TheBloke/Llama-2-13B-Chat-GGUF/resolve/main/llama-2-13b-chat.q4_k_m.gguf) (~7GB)

2. **Place the downloaded `.gguf` file** in the `models/` directory
3. **Restart Clippy AI** - it will automatically detect and load the model

## System Requirements by Model Size

| Model | RAM Required | CPU | Response Speed |
|-------|-------------|-----|----------------|
| TinyLlama 1.1B | 4GB+ | Any modern CPU | Very Fast |
| Llama 2 7B | 8GB+ | Modern CPU recommended | Fast |
| Llama 2 13B | 16GB+ | High-end CPU required | Moderate |

## Model Formats

Clippy AI supports **GGUF** format models only. Popular options:

### Llama 2 Models
- Best overall quality and helpfulness
- Excellent at following instructions
- Good conversation abilities

### Mistral Models  
- Fast and efficient
- Good coding assistance
- Smaller memory footprint

### Code Llama Models
- Specialized for programming help
- Great for code generation and debugging

## Quantization Levels

Choose the right quantization for your system:

- **Q4_K_M**: Best balance of quality and speed (recommended)
- **Q5_K_M**: Higher quality, needs more RAM
- **Q8_0**: Highest quality, needs significantly more RAM
- **Q2_K**: Fastest, lowest quality

## Downloading Models

### Using Browser
Visit the Hugging Face model page and download the `.gguf` file directly to the `models/` folder.

### Using Command Line

**Windows PowerShell:**
```powershell
# Create models directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "models"

# Download Llama 2 7B Chat (recommended)
Invoke-WebRequest -Uri "https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.q4_k_m.gguf" -OutFile "models/llama-2-7b-chat.q4_k_m.gguf"
```

**Linux/macOS:**
```bash
# Create models directory
mkdir -p models

# Download Llama 2 7B Chat (recommended)
curl -L -o models/llama-2-7b-chat.q4_k_m.gguf \
  "https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.q4_k_m.gguf"
```

## Troubleshooting

**Model won't load:**
- Check file size - incomplete downloads are common
- Ensure the file has a `.gguf` extension
- Try a smaller model if you're running out of memory

**Slow responses:**
- Try a smaller quantization (Q4_K_M instead of Q8_0)
- Close other applications to free up CPU and RAM
- Consider a smaller parameter model (7B instead of 13B)

**Application crashes:**
- You likely need more RAM
- Try the TinyLlama model first to test
- Check your system meets the minimum requirements

## Privacy Note

All models run completely locally on your device. No data is sent to external servers, ensuring complete privacy of your conversations with Clippy.