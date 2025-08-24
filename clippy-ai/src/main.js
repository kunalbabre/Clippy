const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let llama;
let model;
let context;
let chatSession; // LlamaChatSession instance
let modelDetected = false; // a model file exists
let modelLoaded = false;   // model and session are ready
let currentAbortController = null; // cancel in-flight generations
let modelName = null; // current loaded model filename
let LlamaChatSessionClass = null; // constructor reference for ad-hoc sessions

// Config paths and helpers
const appRoot = path.join(__dirname, '..');
const configPath = path.join(appRoot, 'config.json');

function loadConfig() {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      llm: { defaultModel: null, contextSize: 4096, temperature: 0.7, maxTokens: 512 },
      ui: { theme: 'classic', animations: true, chatBubbles: true },
      privacy: { storeConversations: false, analytics: false, telemetry: false }
    };
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save config:', e.message);
  }
}

// Initialize the LLM
async function initializeLLM(selectedModelOverride) {
  try {
    console.log('Initializing LLM...');
    
    // Check for models first
    const modelPath = path.join(__dirname, '../models');
    
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
    
    // Pick model based on override -> config -> first available
    const cfg = loadConfig();
    const desiredModel = selectedModelOverride || cfg?.llm?.defaultModel || null;
    const chosen = desiredModel && modelFiles.includes(desiredModel) ? desiredModel : modelFiles[0];

    try {
      // Try to initialize node-llama-cpp with the detected model
      console.log('Model file detected successfully:', chosen);
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

  const selectedModel = path.join(modelPath, chosen);
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
  LlamaChatSessionClass = LlamaChatSession;
      } else if (LlamaModel && LlamaContext && LlamaChatSession) {
        console.log('Initializing via class constructors API...');
        model = new LlamaModel({ modelPath: selectedModel });
        context = new LlamaContext({ model });
        chatSession = new LlamaChatSession({
          contextSequence: context.getSequence(),
          systemPrompt: 'You are Clippy, the friendly Microsoft Office assistant from the 1990s. Be concise, helpful, and cheerful. A tiny touch of nostalgia is welcome.'
        });
  LlamaChatSessionClass = LlamaChatSession;
      } else {
        const keys = mod ? Object.keys(mod) : [];
        throw new Error(`node-llama-cpp API mismatch. Missing getLlama and constructors. Available keys: ${keys.join(', ')}`);
      }

      console.log('LLM initialized successfully with model:', chosen);
      modelDetected = true;
      modelLoaded = true;
      modelName = chosen;
      // Persist chosen model if it differs from config
      if (cfg?.llm) {
        if (cfg.llm.defaultModel !== chosen) {
          cfg.llm.defaultModel = chosen;
          saveConfig(cfg);
        }
      }
      return true;
    } catch (importError) {
      console.error('Failed to initialize node-llama-cpp:', importError.message);
      console.log('Continuing with enhanced demo mode...');
      modelDetected = true; // we have a model file, but library init failed
      modelLoaded = false;
      modelName = chosen;
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
    width: 560,
    height: 620,
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

    // Pull generation params from config with sensible defaults
    const cfg = loadConfig();
    const temperature = cfg?.llm?.temperature ?? 0.8;
    const maxTokens = cfg?.llm?.maxTokens ?? 256;

    let full = '';
    const res = await chatSession.prompt(message, {
      temperature,
      topK: 40,
      topP: 0.95,
      maxTokens,
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
  modelLoaded: modelLoaded,
  modelName: modelName || null,
  demoMode: !modelLoaded
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

// List models in models directory
ipcMain.handle('list-models', async () => {
  const dir = path.join(__dirname, '../models');
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => f.endsWith('.gguf'));
  } catch {
    return [];
  }
});

// Get current settings
ipcMain.handle('get-settings', async () => {
  const cfg = loadConfig();
  return {
    llm: {
      defaultModel: cfg?.llm?.defaultModel || null,
      temperature: cfg?.llm?.temperature ?? 0.7,
      maxTokens: cfg?.llm?.maxTokens ?? 512
    },
    ui: {
      animations: cfg?.ui?.animations !== false,
      theme: cfg?.ui?.theme || 'classic'
    },
    status: {
      modelLoaded,
      modelName: modelName || null,
      demoMode: !modelLoaded
    }
  };
});

// Apply settings and optionally reload model
ipcMain.handle('apply-settings', async (event, newSettings) => {
  const cfg = loadConfig();
  const prevModel = cfg?.llm?.defaultModel || null;
  cfg.llm = {
    ...cfg.llm,
    defaultModel: newSettings?.llm?.defaultModel ?? cfg?.llm?.defaultModel ?? null,
    temperature: typeof newSettings?.llm?.temperature === 'number' ? newSettings.llm.temperature : (cfg?.llm?.temperature ?? 0.7),
    maxTokens: typeof newSettings?.llm?.maxTokens === 'number' ? newSettings.llm.maxTokens : (cfg?.llm?.maxTokens ?? 512)
  };
  cfg.ui = {
    ...cfg.ui,
    animations: !!(newSettings?.ui?.animations ?? cfg?.ui?.animations ?? true),
    theme: newSettings?.ui?.theme || cfg?.ui?.theme || 'classic'
  };
  saveConfig(cfg);

  let reloaded = false;
  let error = null;
  if (cfg.llm.defaultModel !== prevModel) {
    // Attempt to (re)load the requested model
    try {
      // best effort: free existing references for GC
      llama = null; model = null; context = null; chatSession = null;
      modelLoaded = false;
      reloaded = await initializeLLM(cfg.llm.defaultModel);
    } catch (e) {
      error = e.message;
    }
  }
  return { ok: !error, reloaded, error, status: { modelLoaded, modelName, demoMode: !modelLoaded } };
});

// Generate a short fun fact via LLM without interrupting main chat
ipcMain.handle('generate-fun-fact', async () => {
  try {
    if (!modelLoaded || !model || !LlamaChatSessionClass) {
      return { success: false, error: 'Model not loaded' };
    }
    // Create an isolated temporary context/session to avoid interfering with chat
    const tempCtx = await model.createContext();
    const tmpSession = new LlamaChatSessionClass({
      contextSequence: tempCtx.getSequence(),
      systemPrompt: 'You are Clippy the paperclip. Generate witty, playful, family-friendly one-liners as fun facts. Keep them short and charming.'
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      try { controller.abort(); } catch {}
    }, 7000); // 7s safety

    let text = '';
    const prompt = 'Give a single short, witty “fun fact” in Clippy’s voice (one sentence, 15–25 words). No hashtags. Include one fitting emoji at the end.';
    await tmpSession.prompt(prompt, {
      temperature: 0.9,
      topK: 40,
      topP: 0.9,
      maxTokens: 60,
      stopStrings: ['\n', '</s>', '<|eot_id|>', '<|im_end|>'],
      signal: controller.signal,
      onTextChunk: (chunk) => { text += chunk; }
    }).finally(() => clearTimeout(timeout));

    const result = (text || '').trim().replace(/^"|"$/g, '');
    if (!result) return { success: false, error: 'Empty result' };
    return { success: true, text: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Generate multiple fun facts at once
ipcMain.handle('generate-fun-facts', async (event, count) => {
  try {
    if (!modelLoaded || !model || !LlamaChatSessionClass) {
      return { success: false, error: 'Model not loaded' };
    }
    const n = Math.max(1, Math.min(Number(count) || 1, 5));
    const tempCtx = await model.createContext();
    const tmpSession = new LlamaChatSessionClass({
      contextSequence: tempCtx.getSequence(),
      systemPrompt: 'You are Clippy the paperclip. Generate witty, playful, family-friendly one-liners as fun facts. Keep each short and charming.'
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => { try { controller.abort(); } catch {} }, 9000);
    let text = '';
    const prompt = `Output exactly ${n} separate lines. Each line is a single short, witty fun fact in Clippy's voice (15–25 words) with exactly one fitting emoji at the end. No numbering, no bullets, no extra lines.`;
    await tmpSession.prompt(prompt, {
      temperature: 0.9,
      topK: 40,
      topP: 0.9,
      maxTokens: 180,
      stopStrings: ['</s>', '<|eot_id|>', '<|im_end|>'],
      signal: controller.signal,
      onTextChunk: (chunk) => { text += chunk; }
    }).finally(() => clearTimeout(timeout));

    const lines = (text || '')
      .split(/\r?\n/) 
      .map(s => s.trim().replace(/^[-*\d.\s]+/, '').replace(/^"|"$/g, ''))
      .filter(Boolean)
      .slice(0, n);
    if (!lines.length) return { success: false, error: 'Empty result' };
    return { success: true, facts: lines };
  } catch (e) {
    return { success: false, error: e.message };
  }
});