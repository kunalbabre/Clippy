/*
  Fetch a default GGUF model if none exists in models/.
  Uses a compact, decent-quality TinyLlama chat model to keep size manageable.
*/
const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, '..', 'models');
const DEFAULT_URL = process.env.CLL_DEFAULT_GGUF_URL ||
  'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';
const DEFAULT_FILE = process.env.CLL_DEFAULT_GGUF_FILE || 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function anyGgufPresent(dir) {
  return fs.existsSync(dir) && fs.readdirSync(dir).some(f => f.toLowerCase().endsWith('.gguf'));
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const temp = dest + '.part';
    const file = fs.createWriteStream(temp);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // follow redirect
        https.get(res.headers.location, (res2) => pipe(res2));
        return;
      }
      pipe(res);
    }).on('error', reject);

    function pipe(res) {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: ${res.statusCode}`));
        return;
      }
      const total = Number(res.headers['content-length'] || 0);
      let downloaded = 0; let lastLog = Date.now();
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total && Date.now() - lastLog > 2500) {
          const pct = ((downloaded / total) * 100).toFixed(1);
          process.stdout.write(`\rDownloading model… ${pct}%`);
          lastLog = Date.now();
        }
      });
      res.pipe(file);
      file.on('finish', () => file.close(() => {
        try {
          fs.renameSync(temp, dest);
          console.log('\nModel downloaded.');
          resolve();
        } catch (e) {
          reject(e);
        }
      }));
      res.on('error', (err) => {
        try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {}
        reject(err);
      });
    }
  });
}

(async () => {
  try {
    ensureDir(modelsDir);
    if (anyGgufPresent(modelsDir)) {
      console.log('A GGUF model already exists. Skipping download.');
      return;
    }
    const dest = path.join(modelsDir, DEFAULT_FILE);
    console.log(`No model found. Fetching default model to: ${dest}`);
    await download(DEFAULT_URL, dest);
  } catch (e) {
    console.error('Model download failed:', e.message);
    // Do not fail the build; allow app to run in demo mode
  }
})();
