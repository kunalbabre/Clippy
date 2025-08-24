// Renderer process script for Clippy AI Assistant

class ClippyAI {
    constructor() {
        this.currentMessage = '';
        this.isProcessing = false;
        this.llmStatus = { initialized: false, modelLoaded: false };
        
        this.initializeElements();
        this.initializeEventListeners();
    this.checkLLMStatus();
    // Apply saved theme on startup
    this.loadAndApplyTheme();
        this.initializeClippyAnimations();
    this.enableClippyDrag();
    // Prefetch a few LLM facts on startup (non-blocking)
    this.factQueue = [];
    this.prefetching = false;
    this.topUpFactQueue(3);
    }

    initializeElements() {
        this.chatHistory = document.getElementById('chatHistory');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatForm = document.getElementById('chatForm');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.clippy = document.getElementById('clippy');
    this.clippyContainer = document.querySelector('.clippy-container');
        this.chatBubble = document.getElementById('chatBubble');
        this.bubbleContent = document.getElementById('bubbleContent');
    this.bubbleTimer = null;
    this.lastFactIndex = -1;
    // Settings UI
    this.settingsBtn = document.getElementById('settingsBtn');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.modelSelect = document.getElementById('modelSelect');
    this.tempSlider = document.getElementById('tempSlider');
    this.tempValue = document.getElementById('tempValue');
    this.maxTokens = document.getElementById('maxTokens');
    this.applySettingsBtn = document.getElementById('applySettingsBtn');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.settingsStatus = document.getElementById('settingsStatus');
    this.themeSelect = document.getElementById('themeSelect');
    }

    initializeEventListeners() {
        // Form submission
        this.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Enter key handling
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Clippy click interaction on container (works with pointer capture)
        this.clickCooldown = false;
    this.clippyContainer.addEventListener('click', async () => {
            if (this.clickCooldown) return;
            this.clickCooldown = true;
            try {
        await this.showQueuedOrFetchFact();
            } finally {
                setTimeout(() => { this.clickCooldown = false; }, 400);
            }
        });

        // Direct listeners to be extra robust
        this.clippy.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showRandomFact();
        });
        const clippySvg = document.querySelector('.clippy-svg');
        if (clippySvg) {
            clippySvg.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showRandomFact();
            });
        }

        // Hover interaction (subtle eyebrow raise)
        this.clippy.addEventListener('mouseenter', () => {
            this.addTempClass(this.clippy, 'raise-brows', 650);
            this.addTempClass(this.clippy, 'eyes-raise', 520);
        });

        // Listen for partial responses from main process
        window.electronAPI.onPartialResponse((token) => {
            this.appendToCurrentResponse(token);
        });

        // Title bar controls
        document.getElementById('minimizeBtn').addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });

        document.getElementById('closeBtn').addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });

        // Settings toggle
        this.settingsBtn.addEventListener('click', () => {
            const visible = this.settingsPanel.style.display !== 'none';
            if (visible) {
                this.settingsPanel.style.display = 'none';
            } else {
                this.openSettingsPanel();
            }
        });
        this.closeSettingsBtn.addEventListener('click', () => {
            this.settingsPanel.style.display = 'none';
        });
        this.tempSlider.addEventListener('input', () => {
            this.tempValue.textContent = this.tempSlider.value;
        });
        this.applySettingsBtn.addEventListener('click', async () => {
            const payload = {
                llm: {
                    defaultModel: this.modelSelect.value || null,
                    temperature: Number(this.tempSlider.value),
                    maxTokens: Number(this.maxTokens.value)
                },
                ui: { theme: this.themeSelect.value }
            };
            this.settingsStatus.textContent = 'Applying settings...';
            const res = await window.electronAPI.applySettings(payload);
            if (res.ok) {
                this.settingsStatus.textContent = res.reloaded ? 'Model reloaded successfully.' : 'Settings saved.';
                // Update status to reflect possible model change
                await this.checkLLMStatus();
                this.applyTheme(this.themeSelect.value);
                // Close panel after a short delay for feedback
                setTimeout(() => { this.settingsPanel.style.display = 'none'; }, 250);
            } else {
                this.settingsStatus.textContent = `Failed to apply settings: ${res.error}`;
            }
        });
    }

    async checkLLMStatus() {
        try {
            this.llmStatus = await window.electronAPI.checkLLMStatus();
            this.updateStatusIndicator();
            
            if (this.llmStatus.initialized) {
                this.enableInput();
            } else {
                this.showSystemMessage("⚠️ No LLM model found. Please place a GGUF model file in the 'models' directory and restart the application.");
            }
        } catch (error) {
            console.error('Failed to check LLM status:', error);
            this.showSystemMessage("❌ Failed to initialize AI model. Please check the console for details.");
        }
    }

    updateStatusIndicator() {
        const statusDot = this.statusIndicator.querySelector('.status-dot');
        
        if (this.llmStatus.initialized) {
            statusDot.classList.add('connected');
            const name = this.llmStatus.modelName ? ` (${this.llmStatus.modelName})` : '';
            this.statusText.textContent = this.llmStatus.demoMode ? `Demo Mode${name}` : `AI Ready${name}`;
        } else {
            statusDot.classList.remove('connected');
            this.statusText.textContent = 'No Model';
        }
    }

    enableInput() {
        this.messageInput.disabled = false;
        this.sendButton.disabled = false;
        this.messageInput.placeholder = "Type your message here...";
        this.messageInput.focus();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isProcessing) return;

        this.isProcessing = true;
        this.messageInput.value = '';
        this.showLoading(true);
        this.setClippyThinking(true);

        // Add user message to chat
        this.addMessage(message, 'user');

        try {
            // Prepare for streaming response
            this.currentResponseElement = this.addMessage('', 'bot');
            this.currentMessage = '';

            // Send message to main process
            const result = await window.electronAPI.sendMessage(message);

            if (result.success) {
                // The response has been streamed via partial-response events
                this.finalizeResponse();
            } else {
                this.updateCurrentResponse(`❌ Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.updateCurrentResponse('❌ Failed to get response from AI model.');
        } finally {
            this.showLoading(false);
            this.setClippyThinking(false);
            this.isProcessing = false;
        }
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        this.chatHistory.appendChild(messageDiv);
        
        // Scroll to bottom
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        
        return contentDiv;
    }

    appendToCurrentResponse(token) {
        if (this.currentResponseElement) {
            this.currentMessage += token;
            this.currentResponseElement.textContent = this.currentMessage;
            this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        }
    }

    updateCurrentResponse(content) {
        if (this.currentResponseElement) {
            this.currentMessage = content;
            this.currentResponseElement.textContent = content;
            this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        }
    }

    finalizeResponse() {
        // Clean up any extra whitespace and finalize the response
        if (this.currentResponseElement && this.currentMessage) {
            this.currentResponseElement.textContent = this.currentMessage.trim();
            this.showClippyMessage("There you go! 😊");
        }
        this.currentResponseElement = null;
        this.currentMessage = '';
    }

    async showQueuedOrFetchFact() {
        // Serve instantly from queue if available
        const next = this.factQueue.shift();
        if (next) {
            this.showClippyMessage(next);
            this.playClippyEmote();
            this.topUpFactQueue(2); // keep queue warm
            return;
        }
        // Otherwise attempt single fetch
        try {
            const res = await window.electronAPI.generateFunFact();
            if (res && res.success && res.text) {
                this.showClippyMessage(res.text);
                this.playClippyEmote();
                // Prefill additional in background
                this.topUpFactQueue(3);
                return;
            }
        } catch {}
        // Fallback local
        this.showClippyMessage(this.getRandomFunFact());
        this.playClippyEmote();
        this.topUpFactQueue(3);
    }

    async topUpFactQueue(minCount = 3) {
        try {
            if (this.prefetching) return;
            if (this.factQueue.length >= minCount) return;
            this.prefetching = true;
            const needed = Math.max(1, minCount - this.factQueue.length);
            const res = await window.electronAPI.generateFunFacts(Math.min(5, needed + 1));
            if (res && res.success && Array.isArray(res.facts)) {
                // Deduplicate trivial repeats
                const existing = new Set(this.factQueue);
                res.facts.forEach(f => { if (f && !existing.has(f)) this.factQueue.push(f); });
            }
        } catch {}
        finally {
            this.prefetching = false;
        }
    }

    showSystemMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = message;
        contentDiv.style.background = '#ffe0e0';
        contentDiv.style.borderColor = '#ff8080';
        
        messageDiv.appendChild(contentDiv);
        this.chatHistory.appendChild(messageDiv);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }

    showClippyMessage(message, durationMs = 12000) {
        this.bubbleContent.textContent = message;
        this.chatBubble.style.display = 'block';
        // Reset any existing hide timer to avoid flicker
        if (this.bubbleTimer) {
            clearTimeout(this.bubbleTimer);
        }
        // Hide after specified duration
        this.bubbleTimer = setTimeout(() => {
            this.chatBubble.style.display = 'none';
            this.bubbleTimer = null;
        }, durationMs);
    }

    showLoading(show) {
        this.loadingIndicator.style.display = show ? 'flex' : 'none';
        this.sendButton.disabled = show || !this.llmStatus.initialized;
        this.messageInput.disabled = show || !this.llmStatus.initialized;
    }

    setClippyThinking(thinking) {
        if (thinking) {
            this.clippy.classList.add('thinking');
        } else {
            this.clippy.classList.remove('thinking');
        }
    }

    initializeClippyAnimations() {
        // Say a nostalgic greeting shortly after start
        setTimeout(() => {
            this.showClippyMessage(this.getRandomNostalgicMessage());
            this.playClippyEmote();
        }, 900);

        // Random idle animations/messages
        setInterval(() => {
            if (!this.isProcessing && Math.random() < 0.5) {
                const msg = Math.random() < 0.6 ? this.getRandomNostalgicMessage() : this.getRandomIdleMessage();
                this.showClippyMessage(msg);
                this.playClippyEmote();
            }
        }, 26000); // ~26s cadence
    }

    // Allow dragging Clippy anywhere inside the window
    enableClippyDrag() {
        const el = this.clippyContainer;
        if (!el) return;

        let startX = 0, startY = 0;
        let baseX = 0, baseY = 0; // accumulated translation
        let dragging = false;

        const getMatrixTranslate = () => {
            const style = window.getComputedStyle(el);
            const t = style.transform;
            if (t && t !== 'none') {
                const m = new DOMMatrix(t);
                return { x: m.m41, y: m.m42 };
            }
            return { x: 0, y: 0 };
        };

        const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

        const onPointerDown = (e) => {
            // ignore right/middle clicks
            if (e.button && e.button !== 0) return;
            dragging = true;
            el.classList.add('dragging');
            el.setPointerCapture(e.pointerId);
            startX = e.clientX;
            startY = e.clientY;
            const { x, y } = getMatrixTranslate();
            baseX = x; baseY = y;
        };

        const onPointerMove = (e) => {
            if (!dragging) return;
            // delta from pointer origin
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;

            // compute bounds so the container stays on-screen
            const rect = el.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;

            let targetX = baseX + dx;
            let targetY = baseY + dy;

            // Clamp based on the element's current offset rect relative to transform
            const leftNow = rect.left + (targetX - (getMatrixTranslate().x));
            const topNow = rect.top + (targetY - (getMatrixTranslate().y));

            const minX = -rect.left + 8; // allow small margin
            const maxX = viewportW - rect.right - 8;
            const minY = -rect.top + 8;
            const maxY = viewportH - rect.bottom - 8;

            targetX = clamp(targetX, baseX + minX, baseX + maxX);
            targetY = clamp(targetY, baseY + minY, baseY + maxY);

            el.style.transform = `translate(${targetX}px, ${targetY}px)`;
        };

        const persistPosition = () => {
            try {
                const style = window.getComputedStyle(el);
                const t = style.transform;
                if (t && t !== 'none') {
                    const m = new DOMMatrix(t);
                    localStorage.setItem('clippyTranslate', JSON.stringify({ x: m.m41, y: m.m42 }));
                } else {
                    localStorage.removeItem('clippyTranslate');
                }
            } catch {}
        };

        const onPointerUp = (e) => {
            if (!dragging) return;
            dragging = false;
            el.classList.remove('dragging');
            try { el.releasePointerCapture(e.pointerId); } catch {}
            persistPosition();
        };

        el.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('blur', onPointerUp);

        // Restore persisted position
        try {
            const saved = localStorage.getItem('clippyTranslate');
            if (saved) {
                const { x, y } = JSON.parse(saved);
                if (Number.isFinite(x) && Number.isFinite(y)) {
                    el.style.transform = `translate(${x}px, ${y}px)`;
                }
            }
        } catch {}
    }

    getRandomIdleMessage() {
        const messages = [
            "Need any help? 📎",
            "I'm here if you need me!",
            "What would you like to know?",
            "Feel free to ask me anything!",
            "Ready to assist you! 😊",
            "How can I make your day better?",
            "I'm your friendly AI assistant!"
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    getRandomNostalgicMessage() {
        const msgs = [
            "It looks like you're writing a letter. Would you like help? ✉️",
            "Need help with formatting? I can lend a loop! 📎",
            "I noticed you’re trying to be productive. Should I distract you? 😄",
            "Tip: Press Ctrl+S often. Not that I ever crashed anything…",
            "Pro tip: The best docs start with a cheerful greeting!",
            "I can make bulleted lists… • Like • This • One",
            "It looks like you’re asking a question. Want some suggestions?",
            "Fun fact: I once lived in Office. Now I live rent‑free here!"
        ];
        return msgs[Math.floor(Math.random() * msgs.length)];
    }

    getRandomFunFact() {
        const facts = [
            "Fun fact: I auditioned for a job as a paperclip… nailed it. 📎",
            "Did you know? The first paperclip patent dates back to 1867. I’m timeless!",
            "Tip: Ctrl+Z is the real MVP. I prefer Ctrl+Snacks, though. 🍪",
            "I’m 100% recyclable. My jokes? Also recyclable. ♻️",
            "I once saved a document by glaring at the power cable. Intense.",
            "On a scale of 1–10, my helpfulness is a solid loop-de-loop.",
            "I bend, therefore I am. – Clippius, 1997",
            "Paperclips unite sheets. I unite hearts. Aww. 💜",
            "Legend says if you press Save 3 times, I wink. Try it. 😉",
            "My favorite font? Clip Sans. Totally real. Trust me."
        ];
        // Avoid repeating the last fact back-to-back
        let idx;
        do { idx = Math.floor(Math.random() * facts.length); } while (facts.length > 1 && idx === this.lastFactIndex);
        this.lastFactIndex = idx;
        return facts[idx];
    }

    playClippyEmote() {
        // Randomize a quick emote: brows, eyes lift, or blink
        const choices = ['raise-brows', 'eyes-raise', 'blink-once'];
        const pick = choices[Math.floor(Math.random() * choices.length)];
        this.addTempClass(this.clippy, pick, pick === 'blink-once' ? 160 : 700);
    }

    addTempClass(el, cls, ms) {
        if (!el) return;
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), ms);
    }

    async openSettingsPanel() {
        // Load models and current settings
        try {
            const [models, settings] = await Promise.all([
                window.electronAPI.listModels(),
                window.electronAPI.getSettings()
            ]);

            // Populate model select
            this.modelSelect.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = models.length ? 'Select model…' : 'No models found';
            this.modelSelect.appendChild(placeholder);
            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m; opt.textContent = m;
                if (settings?.llm?.defaultModel === m) opt.selected = true;
                this.modelSelect.appendChild(opt);
            });

            // Set temperature and tokens
            const temp = settings?.llm?.temperature ?? 0.7;
            this.tempSlider.value = String(temp);
            this.tempValue.textContent = String(temp);
            this.maxTokens.value = String(settings?.llm?.maxTokens ?? 512);
            this.themeSelect.value = settings?.ui?.theme || 'classic';
            this.applyTheme(this.themeSelect.value);

            this.settingsStatus.textContent = settings?.status?.demoMode ? 'Demo mode: model library not active.' : (settings?.status?.modelName ? `Loaded: ${settings.status.modelName}` : 'Ready');
            this.settingsPanel.style.display = 'block';
        } catch (e) {
            this.settingsStatus.textContent = `Failed to load settings: ${e.message}`;
            this.settingsPanel.style.display = 'block';
        }
    }

    applyTheme(theme) {
        const root = document.body;
        root.classList.toggle('theme-modern', theme === 'modern');
    }

    async loadAndApplyTheme() {
        try {
            const settings = await window.electronAPI.getSettings();
            this.applyTheme(settings?.ui?.theme || 'classic');
        } catch {}
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ClippyAI();
});