const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let llama;
let model;
let context;
let chatSession; // LlamaChatSession instance
let modelDetected = false; // a model file exists
let modelLoaded = false;   // model and session are ready
let currentAbortController = null; // cancel in-flight generations

// Initialize the LLM
async function initializeLLM() {
  try {
    console.log('Initializing LLM...');
    
    // Check for models first
    const modelPath = path.join(__dirname, '../models');
    const fs = require('fs');
    
    console.log('Looking for models in:', modelPath);
    
    if (!fs.existsSync(modelPath)) {
      console.log('Models directory not found');
      return false;
    }
    
    const allFiles = fs.readdirSync(modelPath);
    console.log('All files in models directory:', allFiles);
    
    const modelFiles = fs.readdirSync(modelPath).filter(file => file.endsWith('.gguf'));
    console.log('GGUF files found:', modelFiles);
    
    if (modelFiles.length === 0) {
      console.log('No GGUF model found in models directory');
      return false;
    }
    
    try {
      // Try to initialize node-llama-cpp with the detected model
      console.log('Model file detected successfully:', modelFiles[0]);
      console.log('Attempting to import/require node-llama-cpp...');

      // Robust import that works in CJS/Electron
      let mod;
      try {
        // Prefer require when available in Electron main
        // eslint-disable-next-line global-require
        mod = require('node-llama-cpp');
      } catch (e) {
        const esm = await import('node-llama-cpp');
        mod = esm?.default ?? esm;
      }

      const getLlama = mod?.getLlama;
      const LlamaChatSession = mod?.LlamaChatSession;
      const LlamaModel = mod?.LlamaModel;
      const LlamaContext = mod?.LlamaContext;

      const selectedModel = path.join(modelPath, modelFiles[0]);
      console.log(`Using model: ${selectedModel}`);

      if (typeof getLlama === 'function' && LlamaChatSession) {
        console.log('Initializing via getLlama API...');
        llama = await getLlama();
        model = await llama.loadModel({ modelPath: selectedModel });
        context = await model.createContext();
        chatSession = new LlamaChatSession({
          contextSequence: context.getSequence(),
          systemPrompt: 'You are Clippy, the friendly Microsoft Office assistant from the 1990s. Be concise, helpful, and cheerful. A tiny touch of nostalgia is welcome.'
        });
      } else if (LlamaModel && LlamaContext && LlamaChatSession) {
        console.log('Initializing via class constructors API...');
        model = new LlamaModel({ modelPath: selectedModel });
        context = new LlamaContext({ model });
        chatSession = new LlamaChatSession({
          contextSequence: context.getSequence(),
          systemPrompt: 'You are Clippy, the friendly Microsoft Office assistant from the 1990s. Be concise, helpful, and cheerful. A tiny touch of nostalgia is welcome.'
        });
      } else {
        const keys = mod ? Object.keys(mod) : [];
        throw new Error(`node-llama-cpp API mismatch. Missing getLlama and constructors. Available keys: ${keys.join(', ')}`);
      }

      console.log('LLM initialized successfully with model:', modelFiles[0]);
      modelDetected = true;
      modelLoaded = true;
      return true;
    } catch (importError) {
      console.error('Failed to initialize node-llama-cpp:', importError.message);
      console.log('Continuing with enhanced demo mode...');
      modelDetected = true; // we have a model file, but library init failed
      modelLoaded = false;
      return true;
  }
  } catch (error) {
    console.error('Failed to initialize LLM:', error);
    return false;
  }
}

function createWindow() {
  // Create the browser window - Clippy-style floating window
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'Clippy AI Assistant',
    frame: false, // Remove window frame for authentic Clippy look
    transparent: false, // Keep opaque for better compatibility
    resizable: true,
    minimizable: true,
    maximizable: false, // Clippy shouldn't maximize
    alwaysOnTop: true, // Stay on top like the original
    skipTaskbar: false // Still show in taskbar for modern usability
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// Handle app events
app.whenReady().then(async () => {
  await initializeLLM();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for communication with renderer process
ipcMain.handle('send-message', async (event, message) => {
  try {
  if (!modelLoaded || !chatSession) {
      // Enhanced demo responses when model file exists but LLM isn't loaded
      console.log('Processing message (enhanced demo mode):', message);
      
      let responsePool;
      
      if (modelDetected) {
        // Better responses when we know a model file exists
        responsePool = [
          `Hi there! I'm Clippy with AI capabilities! 🤖📎 You asked about "${message}". I found your model file, but I'm running in enhanced demo mode. I can still help with enthusiasm and personality!`,
          `Great question about "${message}"! 🌟 I have my AI model file ready, and while the full LLM processing isn't active right now, I'm still here to assist with my classic Clippy charm!`,
          `Interesting! You mentioned "${message}" 🤔 My AI brain is ready (model file detected!), but I'm currently in demo mode. Still, I'm excited to help however I can!`,
          `Hello! Thanks for asking about "${message}"! 📎✨ I'm Clippy with AI enhancements ready to go. Even in demo mode, I bring the same helpful spirit you remember!`
        ];
      } else {
        // Original demo responses when no model
        responsePool = [
          "Hi there! I'm Clippy, your friendly assistant! 📎 I see you asked about \"" + message + "\". While I don't have a language model loaded right now, I'm here to help with a cheerful attitude!",
          "That's an interesting question about \"" + message + "\"! 🤔 I'd love to help you with that. To use my full AI capabilities, please add a GGUF model file to the models directory.",
          "Thanks for asking about \"" + message + "\"! I'm ready to assist, though I'll need a proper AI model to give you the best answers. For now, I'm just happy to chat! 😊",
          "Great question! You mentioned \"" + message + "\" - I wish I could give you a detailed AI-powered response, but I'm running in demo mode right now. Still, I'm here with my classic Clippy enthusiasm! 📎✨"
        ];
      }
      
      const randomResponse = responsePool[Math.floor(Math.random() * responsePool.length)];
      
      // Simulate streaming response
      for (let i = 0; i < randomResponse.length; i += 3) {
        const chunk = randomResponse.slice(i, i + 3);
        mainWindow.webContents.send('partial-response', chunk);
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to simulate streaming
      }
      
      return {
        success: true,
        response: randomResponse
      };
    }

    console.log('Processing message with LLM:', message);

    // Cancel any previous generation
    if (currentAbortController) {
      try { currentAbortController.abort(); } catch {}
    }
    currentAbortController = new AbortController();
    const abortSignal = currentAbortController.signal;

    // Hard timeout safety (e.g., 45s)
    const timeout = setTimeout(() => {
      try { currentAbortController.abort(); } catch {}
    }, 45_000);

    let full = '';
    const res = await chatSession.prompt(message, {
      temperature: 0.8,
      topK: 40,
      topP: 0.95,
      maxTokens: 256,
      stopStrings: ['</s>', '<|eot_id|>', '<|im_end|>', '\nUser:', 'User:', '\nAssistant:', 'Assistant:'],
      stopOnAbortSignal: true,
      signal: abortSignal,
      onTextChunk: (chunk) => {
        full += chunk;
        mainWindow.webContents.send('partial-response', chunk);
      }
    }).finally(() => {
      clearTimeout(timeout);
      currentAbortController = null;
    });

    return { success: true, response: (full || res || '').trim() };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('check-llm-status', async () => {
  return {
  initialized: modelDetected || modelLoaded,
  modelLoaded: modelLoaded
  };
});

// Window control handlers
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});