class UltimateTONRoulette {
    constructor() {
        this.balance = 0;
        this.currentBet = 1;
        this.currentMultiplier = 10;
        this.isConnected = false;
        this.wallet = null;
        this.tonWeb = null;
        
        // Игровые данные
        this.gameModes = ['classic', 'crash', 'jackpot', 'tournament'];
        this.currentMode = 'classic';
        this.jackpotAmount = 1250;
        this.jackpotTimeLeft = 150; // 2.5 минуты
        
        // Реферальная система
        this.referralCode = this.generateReferralCode();
        this.referrals = [];
        this.refEarnings = 0;
        
        // Турниры
        this.tournaments = [];
        this.leaderboard = [];
        
        // Транзакции
        this.transactions = [];
        
        this.init();
    }
    
    async init() {
        this.initTelegram();
        this.initTON();
        this.setupEventListeners();
        this.loadGameData();
        this.startTimers();
        this.updateDisplay();
    }
    
    initTelegram() {
        this.tg = window.Telegram.WebApp;
        this.tg.expand();
        this.tg.enableClosingConfirmation();
        
        // Получаем реферальные данные из Telegram
        if (this.tg.initDataUnsafe.start_param) {
            this.handleReferralStart(this.tg.initDataUnsafe.start_param);
        }
        
        if (this.tg.initDataUnsafe.user) {
            this.userId = this.tg.initDataUnsafe.user.id;
            this.userName = this.tg.initDataUnsafe.user.first_name;
        }
    }
    
    async initTON() {
        // Инициализация TON Connect
        this.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://your-domain.com/tonconnect-manifest.json'
        });
        
        // Инициализация TON Web
        this.tonWeb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
        
        this.tonConnectUI.connectionRestored.then(() => {
            this.onWalletConnected();
        });
        
        document.getElementById('connectWallet').addEventListener('click', () => {
            this.connectWallet();
        });
    }
    
    setupEventListeners() {
        // Навигация по вкладкам
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Режимы игры
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchGameMode(e.target.dataset.mode);
            });
        });
        
        // Ввод ставки
        document.getElementById('betInput').addEventListener('input', (e) => {
            this.currentBet = Math.max(0.1, parseFloat(e.target.value) || 0.1);
            this.updateBetDisplay();
        });
    }
    
    async connectWallet() {
        try {
            const wallet = await this.tonConnectUI.connectWallet();
            this.wallet = wallet;
            this.onWalletConnected();
        } catch (error) {
            this.showNotification('Ошибка подключения кошелька', 'error');
        }
    }
    
    onWalletConnected() {
        this.isConnected = true;
        this.showNotification('TON кошелёк успешно подключен!', 'success');
        this.updateWalletDisplay();
        this.switchTab('wallet');
    }
    
    async deposit(amount) {
        if (!this.isConnected) {
            this.showNotification('Сначала подключите кошелёк', 'error');
            return;
        }
        
        try {
            // Создаем транзакцию для депозита
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 300, // 5 минут
                messages: [
                    {
                        address: 'ВАШ_АДРЕС_КОНТРАКТА', // Заменить на реальный
                        amount: (amount * 1000000000).toString(), // TON в наноколичестве
                    }
                ]
            };
            
            // Отправляем транзакцию
            const result = await this.tonConnectUI.sendTransaction(transaction);
            
            if (result) {
                this.balance += amount;
                this.addTransaction('deposit', amount);
                this.showNotification(`Депозит ${amount} TON успешен!`, 'success');
                this.updateDisplay();
            }
        } catch (error) {
            this.showNotification('Ошибка депозита', 'error');
        }
    }
    
    async withdraw() {
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        const address = document.getElementById('withdrawAddress').value;
        
        if (!amount || amount > this.balance || !this.isValidTONAddress(address)) {
            this.showNotification('Проверьте данные для вывода', 'error');
            return;
        }
        
        try {
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 300,
                messages: [
                    {
                        address: address,
                        amount: (amount * 1000000000).toString(),
                    }
                ]
            };
            
            const result = await this.tonConnectUI.sendTransaction(transaction);
            
            if (result) {
                this.balance -= amount;
                this.addTransaction('withdraw', amount);
                this.showNotification(`Вывод ${amount} TON успешен!`, 'success');
                this.updateDisplay();
            }
        } catch (error) {
            this.showNotification('Ошибка вывода', 'error');
        }
    }
    
    isValidTONAddress(address) {
        // Базовая валидация TON адреса
        return address && address.length > 10 && address.startsWith('EQ');
    }
    
    switchTab(tabName) {
        // Скрываем все вкладки
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Показываем выбранную вкладку
        document.getElementById(tabName + 'Tab').classList.add('active');
        
        // Обновляем кнопки навигации
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Загружаем данные для вкладки
        this.loadTabData(tabName);
    }
    
    switchGameMode(mode) {
        this.currentMode = mode;
        
        // Обновляем кнопки режимов
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        this.showNotification(`Режим изменен: ${this.getModeName(mode)}`, 'info');
    }
    
    getModeName(mode) {
        const names = {
            'classic': 'Классик',
            'crash': 'Crash',
            'jackpot': 'Джекпот',
            'tournament': 'Турнир'
        };
        return names[mode] || mode;
    }
    
    placeBet() {
        if (this.currentBet > this.balance) {
            this.showNotification('Недостаточно средств', 'error');
            return;
        }
        
        // В зависимости от режима игры
        switch (this.currentMode) {
            case 'classic':
                this.playClassicMode();
                break;
            case 'crash':
                this.playCrashMode();
                break;
            case 'jackpot':
                this.playJackpotMode();
                break;
            case 'tournament':
                this.playTournamentMode();
                break;
        }
    }
    
    playClassicMode() {
        this.balance -= this.currentBet;
        
        // Имитация игры
        const isWin = Math.random() < (1 / this.currentMultiplier);
        const result = isWin ? this.currentBet * this.currentMultiplier : 0;
        
        if (isWin) {
            this.balance += result;
            this.showNotification(`🎉 ПОБЕДА! +${result} TON`, 'success');
            
            // Добавляем в джекпот
            this.jackpotAmount += this.currentBet * 0.01; // 1% от ставки
        } else {
            this.showNotification('💥 Проигрыш', 'error');
        }
        
        this.updateDisplay();
        this.addTransaction(isWin ? 'win' : 'bet', isWin ? result : -this.currentBet);
    }
    
    generateReferralCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    handleReferralStart(refCode) {
        // Обработка реферального запуска
        if (refCode && refCode !== this.referralCode) {
            this.showNotification('Вы зашли по реферальной ссылке! Бонус +1 TON', 'success');
            this.balance += 1;
            this.addTransaction('ref_bonus', 1);
            
            // Сохраняем реферала
            this.referrals.push({
                code: refCode,
                date: new Date(),
                earned: 0
            });
        }
    }
    
    copyRefLink() {
        const refLink = `https://t.me/your_bot?start=${this.referralCode}`;
        navigator.clipboard.writeText(refLink);
        this.showNotification('Реферальная ссылка скопирована!', 'success');
    }
    
    loadTournaments() {
        // Загрузка турниров (заглушка)
        this.tournaments = [
            {
                id: 1,
                name: 'Уикенд Турнир',
                prize: '5,000 TON',
                players: 124,
                endTime: Date.now() + 3 * 24 * 60 * 60 * 1000,
                entryFee: 5
            },
            {
                id: 2,
                name: 'Ежедневный Джекпот',
                prize: '1,200 TON',
                players: 89,
                endTime: Date.now() + 24 * 60 * 60 * 1000,
                entryFee: 1
            }
        ];
        
        this.updateTournamentsDisplay();
    }
    
    updateTournamentsDisplay() {
        const container = document.getElementById('tournamentsList');
        container.innerHTML = this.tournaments.map(tournament => `
            <div class="tournament-item">
                <h4>${tournament.name}</h4>
                <div class="tournament-prize">🏆 ${tournament.prize}</div>
                <div>👥 ${tournament.players} игроков</div>
                <div>🎫 Вход: ${tournament.entryFee} TON</div>
                <button onclick="joinTournament(${tournament.id})">Участвовать</button>
            </div>
        `).join('');
    }
    
    joinTournament(tournamentId) {
        if (this.balance < 5) { // Минимальная ставка для турнира
            this.showNotification('Недостаточно средств для участия', 'error');
            return;
        }
        
        this.showNotification('Вы присоединились к турниру!', 'success');
        this.switchTab('game');
        this.switchGameMode('tournament');
    }
    
    addTransaction(type, amount) {
        const transaction = {
            id: Date.now(),
            type: type,
            amount: amount,
            date: new Date(),
            status: 'completed'
        };
        
        this.transactions.unshift(transaction);
        
        // Сохраняем в localStorage
        this.saveGameData();
        
        this.updateTransactionsDisplay();
    }
    
    updateTransactionsDisplay() {
        const container = document.getElementById('txList');
        container.innerHTML = this.transactions.slice(0, 10).map(tx => `
            <div class="tx-item tx-${tx.type}">
                <span>${this.getTransactionType(tx.type)}</span>
                <span style="color: ${tx.amount > 0 ? '#28a745' : '#dc3545'}">
                    ${tx.amount > 0 ? '+' : ''}${tx.amount} TON
                </span>
                <span>${tx.date.toLocaleTimeString()}</span>
            </div>
        `).join('');
    }
    
    getTransactionType(type) {
        const types = {
            'deposit': '📥 Депозит',
            'withdraw': '📤 Вывод',
            'bet': '🎯 Ставка',
            'win': '🎉 Выигрыш',
            'ref_bonus': '👥 Реферальный бонус',
            'jackpot': '🎊 Джекпот'
        };
        return types[type] || type;
    }
    
    startTimers() {
        // Таймер джекпота
        setInterval(() => {
            this.jackpotTimeLeft--;
            if (this.jackpotTimeLeft <= 0) {
                this.jackpotTimeLeft = 300; // 5 минут
                this.drawJackpot();
            }
            this.updateJackpotTimer();
        }, 1000);
        
        // Автосохранение каждые 30 секунд
        setInterval(() => {
            this.saveGameData();
        }, 30000);
    }
    
    drawJackpot() {
        if (Math.random() < 0.3) { // 30% шанс выигрыша
            const winAmount = this.jackpotAmount * 0.8; // 80% джекпота
            this.balance += winAmount;
            this.jackpotAmount = 250; // Базовый джекпот
            
            this.showNotification(`🎊 ДЖЕКПОТ! Вы выиграли ${winAmount} TON!`, 'success');
            this.addTransaction('jackpot', winAmount);
        }
    }
    
    updateJackpotTimer() {
        const minutes = Math.floor(this.jackpotTimeLeft / 60);
        const seconds = this.jackpotTimeLeft % 60;
        document.getElementById('jackpotTimer').textContent = 
            `Следующий розыгрыш: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateDisplay() {
        // Баланс
        document.getElementById('balance').textContent = this.balance + ' TON';
        
        // Джекпот
        document.getElementById('jackpotAmount').textContent = 
            this.jackpotAmount.toLocaleString() + ' TON';
        
        // Рефералы
        document.getElementById('refCount').textContent = this.referrals.length;
        document.getElementById('refEarned').textContent = this.refEarnings + ' TON';
        document.getElementById('refBonus').textContent = '5%';
        document.getElementById('refLink').value = 
            `https://t.me/your_bot?start=${this.referralCode}`;
        
        // Ставка
        document.getElementById('betDisplay').textContent = this.currentBet;
        document.getElementById('potentialWin').textContent = 
            (this.currentBet * this.currentMultiplier) + ' TON';
        document.getElementById('winChance').textContent = 
            Math.round((1 / this.currentMultiplier) * 100) + '%';
    }
    
    updateWalletDisplay() {
        if (this.wallet) {
            document.getElementById('walletAddress').textContent = 
                this.wallet.account.address.slice(0, 8) + '...' + 
                this.wallet.account.address.slice(-8);
        }
    }
    
    loadTabData(tabName) {
        switch (tabName) {
            case 'tournament':
                this.loadTournaments();
                break;
            case 'referral':
                this.updateReferralsList();
                break;
            case 'wallet':
                this.updateTransactionsDisplay();
                break;
        }
    }
    
    updateReferralsList() {
        const container = document.getElementById('refList');
        if (this.referrals.length === 0) {
            container.innerHTML = '<div class="no-refs">Пока нет приглашённых друзей</div>';
        } else {
            container.innerHTML = this.referrals.map(ref => `
                <div class="ref-item">
                    <span>${ref.code}</span>
                    <span>${ref.date.toLocaleDateString()}</span>
                    <span>+${ref.earned} TON</span>
                </div>
            `).join('');
        }
    }
    
    saveGameData() {
        const gameData = {
            balance: this.balance,
            referralCode: this.referralCode,
            referrals: this.referrals,
            refEarnings: this.refEarnings,
            transactions: this.transactions
        };
        
        localStorage.setItem('tonRouletteData', JSON.stringify(gameData));
    }
    
    loadGameData() {
        const saved = localStorage.getItem('tonRouletteData');
        if (saved) {
            const data = JSON.parse(saved);
            this.balance = data.balance || 0;
            this.referralCode = data.referralCode || this.generateReferralCode();
            this.referrals = data.referrals || [];
            this.refEarnings = data.refEarnings || 0;
            this.transactions = data.transactions || [];
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 300this.gameHistory.unshift({
            round: this.roundNumber,
            multiplier: result.multiplier,
            winners: winners,
            timestamp: new Date(),
            totalBets: this.currentBets.length
        });
        
        if (this.gameHistory.length > 10) {
            this.gameHistory = this.gameHistory.slice(0, 10);
        }
        
        this.updateHistory();
    }
    
    updateBetsList() {
        const betsList = document.getElementById('betsList');
        
        if (this.currentBets.length === 0) {
            betsList.innerHTML = '<div class="no-bets">Ставок пока нет</div>';
            return;
        }
        
        betsList.innerHTML = this.currentBets.map(bet => `
            <div class="bet-item">
                <span>${bet.userName}</span>
                <span>${bet.amount} TON (${bet.multiplier}x)</span>
            </div>
        `).join('');
    }
    
    updateHistory() {
        const historyList = document.getElementById('historyList');
        
        historyList.innerHTML = this.gameHistory.map(game => `
            <div class="history-item ${game.multiplier > 0 ? 'win' : 'lose'}">
                <span>Раунд ${game.round}</span>
                <span>${game.multiplier > 0 ? game.multiplier + 'x' : 'Проигрыш'}</span>
                <span>${game.winners.length} поб.</span>
            </div>
        `).join('');
    }
    
    simulateMultiplayer() {
        // Имитация других игроков
        setInterval(() => {
            if (this.isBettingPhase && Math.random() > 0.7) {
                const fakePlayers = ['Alex', 'Maria', 'John', 'Anna', 'Mike'];
                const randomPlayer = fakePlayers[Math.floor(Math.random() * fakePlayers.length)];
                
                this.currentBets.push({
                    userId: 'fake_' + Date.now(),
                    userName: randomPlayer,
                    amount: Math.floor(Math.random() * 5) + 1,
                    multiplier: [2, 5, 10, 20][Math.floor(Math.random() * 4)],
                    timestamp: new Date()
                });
                
                this.updateBetsList();
                this.updatePlayersCount();
            }
        }, 5000);
    }
    
    updatePlayersCount() {
        const uniquePlayers = new Set(this.currentBets.map(bet => bet.userId));
        document.getElementById('playersCount').textContent = uniquePlayers.size;
    }
    
    changeBet(amount) {
        if (this.isBettingPhase) {
            const newBet = this.currentBet + amount;
            if (newBet >= 1 && newBet <= this.balance) {
                this.currentBet = newBet;
                this.updatePotentialWin();
                this.updateDisplay();
            }
        }
    }
    
    updatePotentialWin() {
        this.currentMultiplier = parseInt(document.getElementById('multiplierSelect').value);
        const potentialWin = this.currentBet * this.currentMultiplier;
        document.getElementById('potentialWin').textContent = potentialWin;
    }
    
    updateDisplay() {
        document.getElementById('balance').textContent = this.balance;
        document.getElementById('currentBet').textContent = this.currentBet;
        this.updatePotentialWin();
        this.updatePlayersCount();
        
        const betBtn = document.getElementById('placeBetBtn');
        if (this.currentBet > this.balance || !this.isBettingPhase) {
            betBtn.disabled = true;
        } else {
            betBtn.disabled = false;
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

// Глобальные функции для HTML
let game;

document.addEventListener('DOMContentLoaded', () => {
    game = new MultiplayerRoulette();
});

function changeBet(amount) {
    game.changeBet(amount);
}

function updatePotentialWin() {
    game.updatePotentialWin();
}

function placeBet() {
    game.placeBet();
}

function deposit(amount) {
    game.deposit(amount);
}

function withdraw() {
    game.withdraw();
}
