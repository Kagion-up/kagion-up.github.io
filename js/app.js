// Main application logic
class KaRoTonApp {
    constructor() {
        this.user = null;
        this.balance = 100; // Starting balance for demo
        this.currentScreen = 'game';
        this.init();
    }

    init() {
        // Initialize Telegram Web App
        this.tg = window.Telegram.WebApp;
        this.tg.expand();
        this.tg.enableClosingConfirmation();

        // Get user data from Telegram
        this.user = this.tg.initDataUnsafe?.user || {
            id: Math.random().toString(36),
            first_name: 'Игрок',
            username: 'player'
        };

        this.updateUserInterface();
        this.loadGameData();
    }

    updateUserInterface() {
        // Update user info
        const avatarEl = document.getElementById('userAvatar');
        const balanceEl = document.getElementById('userBalance');
        
        if (this.user.photo_url) {
            avatarEl.src = this.user.photo_url;
        }
        
        balanceEl.textContent = this.balance;
    }

    loadGameData() {
        // Load recent winners
        this.loadRecentWinners();
        // Start game loop
        gameManager.startGameLoop();
    }

    loadRecentWinners() {
        const winners = [
            { name: 'Alex', amount: 45, time: '2 мин назад' },
            { name: 'Maria', amount: 120, time: '5 мин назад' },
            { name: 'John', amount: 78, time: '8 мин назад' }
        ];

        const winnersList = document.getElementById('recentWinners');
        winnersList.innerHTML = winners.map(winner => `
            <div class="winner-item">
                <span>${winner.name}</span>
                <span>+${winner.amount} TON</span>
                <span>${winner.time}</span>
            </div>
        `).join('');
    }

    updateBalance(amount) {
        this.balance += amount;
        document.getElementById('userBalance').textContent = this.balance;
    }

    showNotification(message, type = 'info') {
        // Simple notification implementation
        alert(message);
    }
}

// Global functions for HTML buttons
function showTop() {
    alert('Топ игроков за день:\n\n1. CryptoKing - 500 TON\n2. LuckyGirl - 320 TON\n3. TonMaster - 280 TON');
}

function showScreen(screen) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Here you would show/hide different screens
    app.currentScreen = screen;
    app.showNotification(`Переход на экран: ${screen}`);
}

function changeBet(delta) {
    const betInput = document.getElementById('betAmount');
    let currentBet = parseInt(betInput.value) || 5;
    currentBet += delta;
    
    if (currentBet < 1) currentBet = 1;
    if (currentBet > app.balance) currentBet = app.balance;
    
    betInput.value = currentBet;
    gameManager.updateUserChance();
}

function setQuickBet(amount) {
    if (amount <= app.balance) {
        document.getElementById('betAmount').value = amount;
        gameManager.updateUserChance();
    } else {
        app.showNotification('Недостаточно средств!', 'error');
    }
}

// Initialize app when page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new KaRoTonApp();
});
