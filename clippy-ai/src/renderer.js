// Renderer process script for Clippy AI Assistant

class ClippyAI {
    constructor() {
        this.currentMessage = '';
        this.isProcessing = false;
        this.llmStatus = { initialized: false, modelLoaded: false };
        
        this.initializeElements();
        this.initializeEventListeners();
        this.checkLLMStatus();
        this.initializeClippyAnimations();
    this.enableClippyDrag();
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

        // Clippy click interaction
        this.clippy.addEventListener('click', () => {
            this.showClippyMessage("Hi! I'm here to help! 📎");
            this.playClippyEmote();
        });

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
            this.statusText.textContent = 'AI Ready';
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

    showClippyMessage(message) {
        this.bubbleContent.textContent = message;
        this.chatBubble.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            this.chatBubble.style.display = 'none';
        }, 3000);
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
        // Random idle animations
        setInterval(() => {
            if (!this.isProcessing && Math.random() < 0.3) {
                this.showClippyMessage(this.getRandomIdleMessage());
                this.playClippyEmote();
            }
        }, 30000); // Every 30 seconds
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

        const onPointerUp = (e) => {
            if (!dragging) return;
            dragging = false;
            el.classList.remove('dragging');
            try { el.releasePointerCapture(e.pointerId); } catch {}
        };

        el.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('blur', onPointerUp);
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
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ClippyAI();
});