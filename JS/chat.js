class HuggingFaceChatbot {
    constructor() {
        this.API_TOKEN = "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";//API KEY
        this.MODEL = "mistralai/Mistral-7B-Instruct-v0.1";
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 3000; // 3 seconds
        this.initElements();
        this.initState();
        this.setupEventListeners();
        this.renderWelcomeMessage();
        this.renderChatHistory();
    }

    initElements() {
        this.messageInput = document.querySelector('.message-input');
        this.chatBody = document.querySelector('#chat-body');
        this.chatForm = document.querySelector('.chat-form');
        this.fileUpload = document.querySelector('#file-upload');
        this.fileInputButton = document.querySelector('#file-input');
        this.emojiButton = document.querySelector('#emoji-btn');
        this.sendMessageButton = document.querySelector('#send-message');
        this.newChatButton = document.querySelector('#new-chat');
        this.toggleSidebarButton = document.querySelector('#toggle-sidebar');
        this.clearHistoryButton = document.querySelector('#clear-history');
        this.chatSidebar = document.querySelector('.chat-sidebar');
        this.historyList = document.querySelector('#history-list');
        this.filePreview = document.querySelector('#file-preview');
    }

    initState() {
        this.state = {
            message: null,
            files: [],
            currentChat: [],
            chatHistory: JSON.parse(localStorage.getItem('chatHistory')) || [],
            currentChatId: null
        };
    }

    setupEventListeners() {
        this.chatForm.addEventListener('submit', (e) => this.handleOutgoingMessage(e));
        this.fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        this.fileInputButton.addEventListener('click', () => this.fileUpload.click());
        this.emojiButton.addEventListener('click', () => this.toggleEmojiPicker());
        this.newChatButton.addEventListener('click', () => this.startNewChat());
        this.toggleSidebarButton.addEventListener('click', () => this.toggleSidebar());
        this.clearHistoryButton.addEventListener('click', () => this.clearChatHistory());
        
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleOutgoingMessage(e);
            }
        });
    }

    addMessageToChat(content, isUser = false) {
        const messageClass = isUser ? 'user-message' : 'bot-message';
        const avatar = isUser ? '' : `
            <div class="bot-avatar">
                <span class="material-icons">smart_toy</span>
            </div>`;
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', messageClass);
        messageDiv.innerHTML = `
            ${avatar}
            <div class="message-text">${content}</div>
        `;
        
        this.chatBody.appendChild(messageDiv);
        this.chatBody.scrollTop = this.chatBody.scrollHeight;
        
        this.state.currentChat.push({
            content,
            isUser,
            timestamp: new Date().toISOString()
        });
    }

    addFileMessageToChat(file, isUser = false) {
        const messageClass = isUser ? 'user-message' : 'bot-message';
        const avatar = isUser ? '' : `
            <div class="bot-avatar">
                <span class="material-icons">smart_toy</span>
            </div>`;
        
        let fileContent;
        if (file.type.startsWith('image/')) {
            fileContent = `<img src="${URL.createObjectURL(file)}" class="message-image" alt="${file.name}">`;
        } else {
            const fileIcon = this.getFileIcon(file);
            fileContent = `
                <a href="${URL.createObjectURL(file)}" download="${file.name}" class="message-file">
                    <span class="material-icons message-file-icon">${fileIcon}</span>
                    <span>${file.name}</span>
                </a>`;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', messageClass);
        messageDiv.innerHTML = `
            ${avatar}
            <div class="message-text">${fileContent}</div>
        `;
        
        this.chatBody.appendChild(messageDiv);
        this.chatBody.scrollTop = this.chatBody.scrollHeight;
        
        this.state.currentChat.push({
            content: file.name,
            isUser,
            isFile: true,
            fileType: file.type,
            timestamp: new Date().toISOString()
        });
    }

    getFileIcon(file) {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.includes('pdf')) return 'picture_as_pdf';
        if (file.type.includes('word')) return 'description';
        if (file.type.includes('excel')) return 'table_chart';
        if (file.type.includes('powerpoint')) return 'slideshow';
        return 'insert_drive_file';
    }

    showThinkingIndicator() {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.classList.add('message', 'bot-message', 'thinking');
        thinkingDiv.innerHTML = `
            <div class="bot-avatar">
                <span class="material-icons">smart_toy</span>
            </div>
            <div class="message-text">
                <div class="thinking-indicator">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
        `;
        
        this.chatBody.appendChild(thinkingDiv);
        this.chatBody.scrollTop = this.chatBody.scrollHeight;
        
        return thinkingDiv;
    }

    removeThinkingIndicator() {
        const thinkingDiv = document.querySelector('.message.thinking');
        if (thinkingDiv) {
            thinkingDiv.remove();
        }
    }

    async handleOutgoingMessage(e) {
        e.preventDefault();
        
        const message = this.messageInput.value.trim();
        if (!message && this.state.files.length === 0) return;
        
        this.state.message = message;
        this.messageInput.value = '';
        
        if (message) {
            this.addMessageToChat(message, true);
        }
        
        this.state.files.forEach(file => {
            this.addFileMessageToChat(file, true);
        });
        
        this.state.files = [];
        this.filePreview.innerHTML = '';
        
        await this.generateBotResponse();
    }

    async generateBotResponse() {
        const thinkingDiv = this.showThinkingIndicator();
        let retries = this.MAX_RETRIES;
        
        try {
            if (!this.API_TOKEN) {
                throw new Error("API token not configured");
            }

            const prompt = `<s>[INST] ${this.state.message || "Hello"} [/INST]`;
            let response, data;

            while (retries > 0) {
                try {
                    response = await fetch(
                        `https://api-inference.huggingface.co/models/${this.MODEL}`,
                        {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${this.API_TOKEN}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                inputs: prompt,
                                parameters: {
                                    max_new_tokens: 250,
                                    temperature: 0.7,
                                    return_full_text: false
                                }
                            })
                        }
                    );

                    // Handle rate limiting and model loading
                    if (response.status === 429 || response.status === 503) {
                        const waitTime = parseInt(response.headers.get('Retry-After')) || this.RETRY_DELAY;
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        retries--;
                        continue;
                    }

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`API Error: ${response.status} - ${errorText}`);
                    }

                    data = await response.json();
                    break;
                } catch (error) {
                    if (retries === 1) throw error;
                    retries--;
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                }
            }

            // Process successful response
            let botResponse;
            if (Array.isArray(data) && data[0]?.generated_text) {
                botResponse = data[0].generated_text;
            } else if (data?.error) {
                throw new Error(data.error);
            } else {
                throw new Error("Unexpected response format");
            }

            this.removeThinkingIndicator();
            this.addMessageToChat(botResponse, false);
            this.saveChatHistory();

        } catch (error) {
            console.error('Error generating bot response:', error);
            this.removeThinkingIndicator();
            
            let errorMessage = "Sorry, I encountered an error";
            if (error.message.includes("rate limit")) {
                errorMessage = "I'm getting too many requests. Please wait a moment and try again.";
            } else if (error.message.includes("loading")) {
                errorMessage = "The AI model is still loading. Please try again in 20-30 seconds.";
            }
            
            this.addMessageToChat(`${errorMessage}: ${error.message}`, false);
        }
    }

    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        
        files.forEach(file => {
            this.state.files.push(file);
            this.renderFilePreview(file);
        });
        
        e.target.value = '';
    }

    renderFilePreview(file) {
        const previewItem = document.createElement('div');
        previewItem.classList.add('file-preview-item');
        
        if (file.type.startsWith('image/')) {
            previewItem.innerHTML = `
                <img src="${URL.createObjectURL(file)}" alt="${file.name}">
                <button class="remove-file" data-name="${file.name}">&times;</button>
            `;
        } else {
            const fileIcon = this.getFileIcon(file);
            previewItem.innerHTML = `
                <div class="file-icon">
                    <span class="material-icons">${fileIcon}</span>
                    <span>${file.name}</span>
                </div>
                <button class="remove-file" data-name="${file.name}">&times;</button>
            `;
        }
        
        this.filePreview.appendChild(previewItem);
        
        previewItem.querySelector('.remove-file').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeFile(file.name);
        });
    }

    removeFile(fileName) {
        this.state.files = this.state.files.filter(file => file.name !== fileName);
        const items = this.filePreview.querySelectorAll('.file-preview-item');
        
        items.forEach(item => {
            if (item.querySelector('.remove-file').dataset.name === fileName) {
                item.remove();
            }
        });
        
        if (this.state.files.length === 0) {
            this.filePreview.innerHTML = '';
        }
    }

    saveChatHistory() {
        if (this.state.currentChat.length > 0) {
            // If this is a new chat, create a new entry
            if (!this.state.currentChatId) {
                this.state.currentChatId = Date.now().toString();
                
                const chatEntry = {
                    id: this.state.currentChatId,
                    date: new Date().toISOString(),
                    messages: [...this.state.currentChat]
                };
                
                this.state.chatHistory.unshift(chatEntry);
            } else {
                // Update existing chat
                const chatIndex = this.state.chatHistory.findIndex(entry => entry.id === this.state.currentChatId);
                if (chatIndex !== -1) {
                    this.state.chatHistory[chatIndex].messages = [...this.state.currentChat];
                }
            }
            
            localStorage.setItem('chatHistory', JSON.stringify(this.state.chatHistory));
            this.renderChatHistory();
        }
    }

    renderChatHistory() {
        this.historyList.innerHTML = '';
        
        if (this.state.chatHistory.length === 0) {
            this.historyList.innerHTML = '<div class="empty-history">No chat history available</div>';
            return;
        }
        
        this.state.chatHistory.forEach(entry => {
            const historyItem = document.createElement('div');
            historyItem.classList.add('history-item');
            if (entry.id === this.state.currentChatId) {
                historyItem.classList.add('active');
            }
            historyItem.dataset.id = entry.id;
            
            const userMessage = entry.messages.find(msg => msg.isUser);
            const previewText = userMessage ? userMessage.content : 'No messages';
            
            const date = new Date(entry.date);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            historyItem.innerHTML = `
                <div class="history-item-date">${formattedDate}</div>
                <div class="history-item-preview">${previewText}</div>
            `;
            
            historyItem.addEventListener('click', () => this.loadChatHistory(entry.id));
            this.historyList.appendChild(historyItem);
        });
    }

    loadChatHistory(chatId) {
        const chatEntry = this.state.chatHistory.find(entry => entry.id === chatId);
        if (!chatEntry) return;
        
        // Clear current chat
        this.chatBody.innerHTML = '';
        this.state.currentChat = [];
        this.state.currentChatId = chatId;
        
        // Load messages from history
        chatEntry.messages.forEach(msg => {
            if (msg.isFile) {
                const fileContent = msg.fileType.startsWith('image/') 
                    ? `<div class="message-text">[Image: ${msg.content}]</div>`
                    : `<div class="message-text">[File: ${msg.content}]</div>`;
                
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('message', msg.isUser ? 'user-message' : 'bot-message');
                messageDiv.innerHTML = `
                    <div class="bot-avatar">
                        <span class="material-icons">smart_toy</span>
                    </div>
                    ${fileContent}
                `;
                this.chatBody.appendChild(messageDiv);
            } else {
                this.addMessageToChat(msg.content, msg.isUser);
            }
        });
        
        // Update active state in history list
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === chatId);
        });
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            this.toggleSidebar();
        }
    }

    startNewChat() {
        // Save current chat if it has messages
        if (this.state.currentChat.length > 0) {
            this.saveChatHistory();
        }
        
        // Reset for new chat
        this.chatBody.innerHTML = '';
        this.state.currentChat = [];
        this.state.currentChatId = null;
        this.state.files = [];
        this.filePreview.innerHTML = '';
        
        // Render welcome message
        this.renderWelcomeMessage();
        
        // Update history list
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    clearChatHistory() {
        if (confirm('Are you sure you want to clear all chat history?')) {
            this.state.chatHistory = [];
            localStorage.removeItem('chatHistory');
            this.renderChatHistory();
            
            // If we're currently viewing a history item, clear the chat
            if (this.state.currentChatId) {
                this.startNewChat();
            }
        }
    }

    toggleSidebar() {
        this.chatSidebar.classList.toggle('visible');
    }

    toggleEmojiPicker() {
        alert('Emoji picker would appear here in a full implementation');
    }

    renderWelcomeMessage() {
        this.addMessageToChat("Hello! Meet Your Smart AI Assistant! <br> How can I help you today?", false);
    }
}

// Initialize the chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const chatbot = new HuggingFaceChatbot();
});


// Disable right click and keyboard shortcuts
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

document.addEventListener('keydown', function(e) {
    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') || 
        (e.ctrlKey && e.shiftKey && e.key === 'J') || 
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
    }
});