// Gemini-powered Floating Chatbot Widget
class GeminiChatbot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.isTyping = false;
        this.init();
    }

    init() {
        // Create chatbot HTML structure
        this.createChatbotUI();
        this.attachEventListeners();
        this.addWelcomeMessage();
    }

    createChatbotUI() {
        const chatbotHTML = `
            <!-- Chatbot Toggle Button -->
            <button id="chatbot-toggle" class="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center group" aria-label="Open chatbot">
                <svg class="w-8 h-8 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
                <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </button>

            <!-- Chatbot Window -->
            <div id="chatbot-window" class="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] hidden">
                <div class="bg-gradient-to-br from-slate-900/95 via-purple-950/95 to-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
                    <!-- Header -->
                    <div class="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-white font-bold text-lg">AI Assistant</h3>
                                <p class="text-white/80 text-xs">Powered by Gemini</p>
                            </div>
                        </div>
                        <button id="chatbot-close" class="text-white/80 hover:text-white transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <!-- Messages Container -->
                    <div id="chatbot-messages" class="h-96 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        <!-- Messages will be inserted here -->
                    </div>

                    <!-- Typing Indicator -->
                    <div id="chatbot-typing" class="hidden px-4 py-2">
                        <div class="flex items-center gap-2 text-purple-300 text-sm">
                            <div class="flex gap-1">
                                <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0ms;"></div>
                                <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 150ms;"></div>
                                <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 300ms;"></div>
                            </div>
                            <span>AI is thinking...</span>
                        </div>
                    </div>

                    <!-- Input Area -->
                    <div class="p-4 border-t border-white/10">
                        <form id="chatbot-form" class="flex gap-2">
                            <input 
                                type="text" 
                                id="chatbot-input" 
                                placeholder="Ask about pricing, services..." 
                                class="flex-1 px-4 py-3 bg-white/5 backdrop-blur-sm text-white placeholder-gray-400 rounded-xl border border-white/10 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                                autocomplete="off"
                            />
                            <button 
                                type="submit" 
                                class="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                id="chatbot-send"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                </svg>
                            </button>
                        </form>
                        
                        <!-- Quick Actions -->
                        <div class="mt-3 flex flex-wrap gap-2">
                            <button class="chatbot-quick-action text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-full border border-white/10 hover:border-white/20 transition-all" data-prompt="What services do you offer?">
                                💼 Services
                            </button>
                            <button class="chatbot-quick-action text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-full border border-white/10 hover:border-white/20 transition-all" data-prompt="Tell me about your pricing packages">
                                💰 Pricing
                            </button>
                            <button class="chatbot-quick-action text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-full border border-white/10 hover:border-white/20 transition-all" data-prompt="What's included in the Standard package?">
                                📦 Packages
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }

    attachEventListeners() {
        // Toggle button
        document.getElementById('chatbot-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        // Close button
        document.getElementById('chatbot-close').addEventListener('click', () => this.close());
        
        // Form submission
        document.getElementById('chatbot-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Quick action buttons
        document.querySelectorAll('.chatbot-quick-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                document.getElementById('chatbot-input').value = prompt;
                this.sendMessage();
            });
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Prevent clicks inside chatbot window from closing it
        document.getElementById('chatbot-window').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Close when clicking outside the chatbot
        document.addEventListener('click', (e) => {
            if (this.isOpen) {
                const chatbotWindow = document.getElementById('chatbot-window');
                const chatbotToggle = document.getElementById('chatbot-toggle');
                if (!chatbotWindow.contains(e.target) && !chatbotToggle.contains(e.target)) {
                    this.close();
                }
            }
        });
    }

    addWelcomeMessage() {
        const welcomeText = `👋 Hi! I'm your AI assistant powered by Gemini. I can help you with:

• Information about our services
• Details on pricing packages (Basic, Standard, Premium)
• What's included in each package
• Technology stack and capabilities
• Getting started with your project

What would you like to know?`;
        
        this.addMessage(welcomeText, 'bot');
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        document.getElementById('chatbot-window').classList.remove('hidden');
        document.getElementById('chatbot-window').classList.add('animate-fade-in');
        document.getElementById('chatbot-input').focus();
    }

    close() {
        this.isOpen = false;
        document.getElementById('chatbot-window').classList.add('hidden');
    }

    addMessage(text, sender = 'user') {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`;
        
        const bgClass = sender === 'user' 
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
            : 'bg-white/10 backdrop-blur-sm text-gray-200 border border-white/10';
        
        // Convert markdown-style formatting to HTML
        const formattedText = this.formatMessage(text);
        
        messageDiv.innerHTML = `
            <div class="${bgClass} rounded-2xl px-4 py-3 max-w-[85%] shadow-lg ${sender === 'bot' ? 'rounded-tl-sm' : 'rounded-tr-sm'}">
                ${sender === 'bot' ? '<div class="flex items-center gap-2 mb-2 text-purple-300"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg><span class="text-xs font-semibold">AI Assistant</span></div>' : ''}
                <div class="text-sm leading-relaxed whitespace-pre-wrap">${formattedText}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        this.messages.push({ text, sender, timestamp: new Date() });
    }

    formatMessage(text) {
        // Convert basic markdown to HTML
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/•/g, '•') // Keep bullet points
            .replace(/\n/g, '<br>'); // Line breaks
    }

    scrollToBottom() {
        const container = document.getElementById('chatbot-messages');
        container.scrollTop = container.scrollHeight;
    }

    showTyping() {
        this.isTyping = true;
        document.getElementById('chatbot-typing').classList.remove('hidden');
        document.getElementById('chatbot-send').disabled = true;
        this.scrollToBottom();
    }

    hideTyping() {
        this.isTyping = false;
        document.getElementById('chatbot-typing').classList.add('hidden');
        document.getElementById('chatbot-send').disabled = false;
    }

    async sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        
        // Show typing indicator
        this.showTyping();
        
        try {
            // Enhanced prompt with business context
            const contextPrompt = `You are a helpful AI assistant for Inhouse Africa Technologies, a South African digital solutions company. 

Our Services:
- Web Development (React, Next.js, Node.js)
- Mobile Apps (React Native, Flutter)
- AI Solutions (OpenAI, RAG, Automation)
- Branding & Design (Figma, UI/UX)
- E-Commerce (Shopify, WooCommerce, Custom)
- Tech Consulting (Strategy, Cloud, Architecture)

Our Pricing Packages:
1. BASIC (ZAR 3,250): 1 Website/Landing Page, Basic SEO, Responsive Design, 3 Months Support, 5 Email Accounts, Hosting & Domain Setup
2. STANDARD (ZAR 6,500 - Most Popular): Up to 5 Pages, Responsive Web & Mobile Ready, 9 Months Support, SEO Optimization, Basic AI/Automation, 10 Email Accounts, Performance Optimization, Hosting & Domain Setup
3. PREMIUM (ZAR 15,500+): 10+ Pages, Web/Mobile/AI Solutions, Advanced SEO, 15 Email Accounts, Unlimited Support, Priority Delivery, Dedicated Account Manager, Custom Solutions

Contact: kevinkutoane@ymail.com, WhatsApp: +27 76 534 6323

User question: ${message}

Provide a helpful, concise response. Be friendly and professional. If asked about pricing, explain what's included in each package. If they want to start a project, encourage them to contact us via the quote form or WhatsApp.`;
            
            const response = await fetch('https://inhouse-africa-tech.onrender.com/api/gemini', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: contextPrompt })
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Hide typing and add bot response
            this.hideTyping();
            this.addMessage(data.text || "I'm sorry, I couldn't process that. Please try again.", 'bot');
            
        } catch (error) {
            console.error('Chatbot error:', error);
            this.hideTyping();
            this.addMessage("I'm having trouble connecting right now. Please try again or contact us directly at kevinkutoane@ymail.com", 'bot');
        }
    }
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.geminiChatbot = new GeminiChatbot();
    });
} else {
    window.geminiChatbot = new GeminiChatbot();
}
