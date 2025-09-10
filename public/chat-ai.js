// Chat AI Overlay per SYNAPSE Platform
class SynapseAIChat {
    constructor() {
        this.isOpen = false;
        this.conversationHistory = [];
        this.isLoading = false;
        this.init();
    }

    init() {
        this.createChatOverlay();
        this.bindKeyboardShortcut();
        this.bindEvents();
    }

    createChatOverlay() {
        // Crea l'overlay della chat
        const overlay = document.createElement('div');
        overlay.id = 'synapse-ai-chat-overlay';
        overlay.innerHTML = `
            <div class="chat-container">
                <div class="chat-header">
                    <div class="chat-title">
                        <span class="chat-icon"></span>
                        <span>synapse AI Assistant</span>
                    </div>
                    <button class="chat-close" id="chat-close-btn">×</button>
                </div>
                <div class="chat-messages" id="chat-messages">
                    <div class="message ai-message">
                        <div class="message-content">
                            Ciao! Sono l'assistente AI di synapse. Come posso aiutarti oggi?
                        </div>
                        <div class="message-time">${this.getCurrentTime()}</div>
                    </div>
                </div>
                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <textarea 
                            id="chat-input" 
                            placeholder="Scrivi il tuo messaggio... (Ctrl+Space per aprire/chiudere)"
                            rows="1"
                        ></textarea>
                        <button id="chat-send-btn" class="chat-send-btn">
                            <span class="send-icon">➤</span>
                        </button>
                    </div>
                    <div class="chat-shortcuts">
                        <span>Ctrl+Space: Apri/Chiudi | Enter: Invia | Shift+Enter: Nuova riga</span>
                    </div>
                </div>
            </div>
        `;

        // Aggiungi gli stili CSS
        const styles = document.createElement('style');
        styles.textContent = `
            #synapse-ai-chat-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                display: none;
                justify-content: center;
                align-items: center;
                backdrop-filter: blur(5px);
                animation: fadeIn 0.3s ease;
            }

            #synapse-ai-chat-overlay.show {
                display: flex;
            }

            .chat-container {
                width: 90%;
                max-width: 600px;
                height: 70%;
                max-height: 600px;
                background: #ffffff;
                border-radius: 15px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: slideUp 0.3s ease;
            }

            .chat-header {
                background: linear-gradient(135deg,rgb(0, 47, 255) 0%,rgb(0, 47, 255) 100%);
                color: white;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .chat-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
                font-size: 16px;
            }

            .chat-icon {
                font-size: 20px;
            }

            .chat-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s;
            }

            .chat-close:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }

            .chat-messages {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                background: #f8f9fa;
            }

            .message {
                margin-bottom: 15px;
                animation: messageSlide 0.3s ease;
            }

            .message-content {
                padding: 12px 16px;
                border-radius: 18px;
                max-width: 80%;
                word-wrap: break-word;
                line-height: 1.4;
            }

            .user-message .message-content {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin-left: auto;
                border-bottom-right-radius: 5px;
            }

            .ai-message .message-content {
                background: white;
                color: #333;
                border: 1px solid #e9ecef;
                border-bottom-left-radius: 5px;
            }

            .message-time {
                font-size: 11px;
                color: #6c757d;
                margin-top: 5px;
                text-align: right;
            }

            .ai-message .message-time {
                text-align: left;
            }

            .chat-input-container {
                padding: 20px;
                background: white;
                border-top: 1px solid #e9ecef;
            }

            .chat-input-wrapper {
                display: flex;
                gap: 10px;
                align-items: flex-end;
            }

            #chat-input {
                flex: 1;
                border: 2px solid #e9ecef;
                border-radius: 20px;
                padding: 12px 16px;
                font-size: 14px;
                resize: none;
                outline: none;
                transition: border-color 0.2s;
                font-family: inherit;
                max-height: 100px;
            }

            #chat-input:focus {
                border-color: #667eea;
            }

            .chat-send-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                border-radius: 50%;
                width: 45px;
                height: 45px;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s;
            }

            .chat-send-btn:hover {
                transform: scale(1.05);
            }

            .chat-send-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            .send-icon {
                font-size: 16px;
            }

            .chat-shortcuts {
                margin-top: 10px;
                font-size: 11px;
                color: #6c757d;
                text-align: center;
            }

            .loading-message {
                display: flex;
                align-items: center;
                gap: 10px;
                color: #6c757d;
                font-style: italic;
            }

            .loading-dots {
                display: inline-flex;
                gap: 2px;
            }

            .loading-dots span {
                width: 4px;
                height: 4px;
                background: #6c757d;
                border-radius: 50%;
                animation: loadingDots 1.4s infinite;
            }

            .loading-dots span:nth-child(2) {
                animation-delay: 0.2s;
            }

            .loading-dots span:nth-child(3) {
                animation-delay: 0.4s;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            @keyframes messageSlide {
                from { transform: translateY(10px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            @keyframes loadingDots {
                0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                40% { transform: scale(1); opacity: 1; }
            }

            @media (max-width: 768px) {
                .chat-container {
                    width: 95%;
                    height: 80%;
                }
                
                .message-content {
                    max-width: 90%;
                }
            }
        `;

        document.head.appendChild(styles);
        document.body.appendChild(overlay);
    }

    bindKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Space per aprire/chiudere la chat
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                this.toggleChat();
            }

            // ESC per chiudere la chat
            if (e.key === 'Escape' && this.isOpen) {
                this.closeChat();
            }
        });
    }

    bindEvents() {
        const overlay = document.getElementById('synapse-ai-chat-overlay');
        const closeBtn = document.getElementById('chat-close-btn');
        const sendBtn = document.getElementById('chat-send-btn');
        const input = document.getElementById('chat-input');

        // Chiudi cliccando sull'overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeChat();
            }
        });

        // Chiudi con il pulsante X
        closeBtn.addEventListener('click', () => {
            this.closeChat();
        });

        // Invia messaggio
        sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        // Gestione input
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        });
    }

    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    openChat() {
        const overlay = document.getElementById('synapse-ai-chat-overlay');
        overlay.classList.add('show');
        this.isOpen = true;
        
        // Focus sull'input
        setTimeout(() => {
            document.getElementById('chat-input').focus();
        }, 300);
    }

    closeChat() {
        const overlay = document.getElementById('synapse-ai-chat-overlay');
        overlay.classList.remove('show');
        this.isOpen = false;
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message || this.isLoading) return;

        // Aggiungi messaggio utente
        this.addMessage(message, 'user');
        input.value = '';
        input.style.height = 'auto';

        // Mostra loading
        this.showLoading();
        this.isLoading = true;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    conversationHistory: this.conversationHistory
                })
            });

            const data = await response.json();

            if (data.success) {
                // Rimuovi loading e aggiungi risposta AI
                this.hideLoading();
                this.addMessage(data.response, 'ai');
                
                // Aggiorna cronologia conversazione
                this.conversationHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: data.response }
                );
                
                // Mantieni solo gli ultimi 10 messaggi per evitare token eccessivi
                if (this.conversationHistory.length > 20) {
                    this.conversationHistory = this.conversationHistory.slice(-20);
                }
            } else {
                this.hideLoading();
                this.addMessage('Scusa, si è verificato un errore. Riprova più tardi.', 'ai');
            }
        } catch (error) {
            console.error('Errore chat:', error);
            this.hideLoading();
            this.addMessage('Errore di connessione. Verifica la tua connessione internet.', 'ai');
        }

        this.isLoading = false;
    }

    addMessage(content, type) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(content)}</div>
            <div class="message-time">${this.getCurrentTime()}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showLoading() {
        const messagesContainer = document.getElementById('chat-messages');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai-message loading-message';
        loadingDiv.id = 'loading-message';
        
        loadingDiv.innerHTML = `
            <div class="message-content">
                <span>L'assistente sta scrivendo</span>
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideLoading() {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }
}

// Inizializza la chat quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SynapseAIChat();
    });
} else {
    new SynapseAIChat();
}