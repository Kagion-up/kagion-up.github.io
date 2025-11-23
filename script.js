class MultiplayerRoulette {
    constructor() {
        this.balance = 0;
        this.currentBet = 1;
        this.currentMultiplier = 10;
        this.isConnected = false;
        this.wallet = null;
        this.roundTime = 30;
        this.timeLeft = this.roundTime;
        this.isBettingPhase = true;
        this.currentBets = [];
        this.players = [];
        this.gameHistory = [];
        this.roundNumber = 0;
        
        this.sectors = [
            { color: '#e74c3c', multiplier: 10, probability: 0.1 },
            { color: '#2c3e50', multiplier: 0, probability: 0.9 },
            { color: '#e74c3c', multiplier: 2, probability: 0.5 },
            { color: '#2c3e50', multiplier: 0, probability: 0.5 },
            { color: '#e74c3c', multiplier: 5, probability: 0.2 },
            { color: '#2c3e50', multiplier: 0, probability: 0.8 },
            { color: '#e74c3c', multiplier: 20, probability: 0.05 },
            { color: '#2c3e50', multiplier: 0, probability: 0.95 }
        ];
        
        this.tonConnectUI = null;
        this.init();
    }
    
    async init() {
        this.initTelegram();
        this.createWheel();
        this.initTON();
        this.startRoundTimer();
        this.updateDisplay();
        this.simulateMultiplayer();
    }
    
    initTelegram() {
        this.tg = window.Telegram.WebApp;
        this.tg.expand();
        this.tg.enableClosingConfirmation();
        
        if (this.tg.initDataUnsafe.user) {
            const user = this.tg.initDataUnsafe.user;
            this.userId = user.id;
            this.userName = user.first_name;
        }
    }
    
    async initTON() {
        this.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://your-domain.com/tonconnect-manifest.json'
        });
        
        this.tonConnectUI.connectionRestored.then(() => {
            this.showNotification('Кошелёк подключен!', 'success');
        });
        
        document.getElementById('connectWallet').addEventListener('click', () => {
            this.connectWallet();
        });
    }
    
    async connectWallet() {
        try {
            const wallet = await this.tonConnectUI.connectWallet();
            this.wallet = wallet;
            this.isConnected = true;
            this.showWalletSection();
            this.showNotification('TON кошелёк успешно подключен!', 'success');
        } catch (error) {
            this.showNotification('Ошибка подключения кошелька', 'error');
        }
    }
    
    showWalletSection() {
        document.getElementById('walletSection').classList.remove('hidden');
        if (this.wallet) {
            document.getElementById('walletAddress').textContent = 
                this.wallet.account.address.slice(0, 10) + '...' + 
                this.wallet.account.address.slice(-8);
        }
    }
    
    async deposit(amount) {
        if (!this.isConnected) {
            this.showNotification('Сначала подключите кошелёк', 'error');
            return;
        }
        
        // Здесь будет интеграция с TON API для депозита
        this.balance += amount;
        this.updateDisplay();
        this.showNotification(`Депозит ${amount} TON успешен!`, 'success');
        
        // В реальном приложении здесь будет вызов TON транзакции
        await this.simulateTONTransaction(amount, 'deposit');
    }
    
    async withdraw() {
        if (!this.isConnected || this.balance <= 0) {
            this.showNotification('Недостаточно средств', 'error');
            return;
        }
        
        const amount = this.balance;
        
        // Здесь будет интеграция с TON API для вывода
        this.showNotification(`Вывод ${amount} TON инициирован`, 'info');
        
        // В реальном приложении здесь будет вызов TON транзакции
        await this.simulateTONTransaction(amount, 'withdraw');
        
        this.balance = 0;
        this.updateDisplay();
    }
    
    async simulateTONTransaction(amount, type) {
        // Имитация TON транзакции
        return new Promise(resolve => {
            setTimeout(() => {
                console.log(`${type} transaction: ${amount} TON`);
                resolve();
            }, 1000);
        });
    }
    
    createWheel() {
        const wheelNumbers = document.getElementById('wheelNumbers');
        const sectorAngle = 360 / this.sectors.length;
        
        wheelNumbers.innerHTML = '';
        
        this.sectors.forEach((sector, index) => {
            const sectorElement = document.createElement('div');
            sectorElement.className = 'wheel-sector';
            sectorElement.style.transform = `rotate(${index * sectorAngle}deg)`;
            sectorElement.style.background = sector.color;
            
            const text = sector.multiplier > 0 ? `${sector.multiplier}x` : '0x';
            sectorElement.innerHTML = `<span>${text}</span>`;
            
            wheelNumbers.appendChild(sectorElement);
        });
    }
    
    startRoundTimer() {
        setInterval(() => {
            this.timeLeft--;
            
            if (this.timeLeft <= 0) {
                if (this.isBettingPhase) {
                    this.startSpinning();
                } else {
                    this.startNewRound();
                }
            }
            
            this.updateTimer();
        }, 1000);
    }
    
    updateTimer() {
        const progress = (this.timeLeft / this.roundTime) * 100;
        document.getElementById('timerProgress').style.width = `${progress}%`;
        
        if (this.isBettingPhase) {
            document.getElementById('timerText').textContent = 
                `Ставки принимаются: ${this.timeLeft}с`;
        } else {
            document.getElementById('timerText').textContent = 
                `Вращение: ${this.timeLeft}с`;
        }
    }
    
    startNewRound() {
        this.roundNumber++;
        this.timeLeft = this.roundTime;
        this.isBettingPhase = true;
        this.currentBets = [];
        this.updateBetsList();
        document.getElementById('placeBetBtn').disabled = false;
    }
    
    placeBet() {
        if (!this.isBettingPhase) {
            this.showNotification('Ставки не принимаются', 'error');
            return;
        }
        
        if (this.currentBet > this.balance) {
            this.showNotification('Недостаточно средств', 'error');
            return;
        }
        
        const bet = {
            userId: this.userId,
            userName: this.userName,
            amount: this.currentBet,
            multiplier: this.currentMultiplier,
            potentialWin: this.currentBet * this.currentMultiplier,
            timestamp: new Date()
        };
        
        this.currentBets.push(bet);
        this.balance -= this.currentBet;
        
        this.updateBetsList();
        this.updateDisplay();
        this.showNotification(`Ставка ${this.currentBet} TON принята!`, 'success');
    }
    
    startSpinning() {
        this.isBettingPhase = false;
        this.timeLeft = 5; // 5 секунд на анимацию вращения
        document.getElementById('placeBetBtn').disabled = true;
        
        if (this.currentBets.length === 0) {
            this.showNotification('Нет ставок в этом раунде', 'info');
            setTimeout(() => this.startNewRound(), 2000);
            return;
        }
        
        // Анимация вращения
        const wheel = document.getElementById('wheel');
        wheel.classList.add('spinning');
        
        // Определяем результат
        const resultIndex = this.calculateResult();
        const result = this.sectors[resultIndex];
        
        // Рассчитываем угол остановки
        const sectorAngle = 360 / this.sectors.length;
        const extraRotations = 5 * 360;
        const targetAngle = extraRotations + (resultIndex * sectorAngle);
        
        wheel.style.transform = `rotate(${targetAngle}deg)`;
        
        // Показываем результаты
        setTimeout(() => {
            this.processRoundResult(result, resultIndex);
            wheel.classList.remove('spinning');
        }, 3000);
    }
    
    calculateResult() {
        const random = Math.random();
        let cumulativeProbability = 0;
        
        for (let i = 0; i < this.sectors.length; i++) {
            cumulativeProbability += this.sectors[i].probability / this.sectors.length;
            if (random <= cumulativeProbability) {
                return i;
            }
        }
        
        return 0;
    }
    
    processRoundResult(result, resultIndex) {
        const winners = [];
        
        // Определяем победителей
        this.currentBets.forEach(bet => {
            if (result.multiplier === bet.multiplier) {
                const winAmount = bet.amount * result.multiplier;
                winners.push({
                    userName: bet.userName,
                    winAmount: winAmount
                });
                
                // Зачисляем выигрыш
                if (bet.userId === this.userId) {
                    this.balance += winAmount;
                    this.showNotification(`ПОБЕДА! +${winAmount} TON`, 'success');
                }
            }
        });
        
        // Сохраняем в историю
        this.addToHistory(result, winners);
        this.updateDisplay();
        
        // Показываем результаты раунда
        this.showRoundResult(result, winners);
    }
    
    showRoundResult(result, winners) {
        let resultText = result.multiplier > 0 ? 
            `🎉 Выпал множитель ${result.multiplier}x!` : 
            '💥 Проигрышный сектор!';
        
        if (winners.length > 0) {
            resultText += ` Победители: ${winners.map(w => w.userName).join(', ')}`;
        } else {
            resultText += ' Победителей нет';
        }
        
        this.showNotification(resultText, winners.length > 0 ? 'success' : 'info');
    }
    
    addToHistory(result, winners) {
        this.gameHistory.unshift({
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
