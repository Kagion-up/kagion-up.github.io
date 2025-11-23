class RouletteGame {
    constructor() {
        this.balance = 1000;
        this.currentBet = 100;
        this.currentMultiplier = 10;
        this.isSpinning = false;
        this.history = [];
        
        this.sectors = [
            { color: '#e74c3c', multiplier: 10 }, // Красный
            { color: '#2c3e50', multiplier: 0 },   // Черный (проигрыш)
            { color: '#e74c3c', multiplier: 2 },   // Красный
            { color: '#2c3e50', multiplier: 0 },   // Черный (проигрыш)
            { color: '#e74c3c', multiplier: 5 },   // Красный
            { color: '#2c3e50', multiplier: 0 },   // Черный (проигрыш)
            { color: '#e74c3c', multiplier: 10 },  // Красный
            { color: '#2c3e50', multiplier: 0 }    // Черный (проигрыш)
        ];
        
        this.init();
    }
    
    init() {
        this.initTelegram();
        this.createWheel();
        this.updateDisplay();
    }
    
    initTelegram() {
        this.tg = window.Telegram.WebApp;
        this.tg.expand();
        this.tg.enableClosingConfirmation();
        
        // Используем данные пользователя если есть
        if (this.tg.initDataUnsafe.user) {
            const user = this.tg.initDataUnsafe.user;
            document.querySelector('h1').textContent += ` 👋 ${user.first_name}`;
        }
    }
    
    createWheel() {
        const wheelNumbers = document.getElementById('wheelNumbers');
        const sectorAngle = 360 / this.sectors.length;
        
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
    
    changeBet(amount) {
        if (this.isSpinning) return;
        
        const newBet = this.currentBet + amount;
        if (newBet >= 10 && newBet <= this.balance) {
            this.currentBet = newBet;
            this.updateDisplay();
        }
    }
    
    selectMultiplier(multiplier) {
        if (this.isSpinning) return;
        
        this.currentMultiplier = multiplier;
        document.querySelectorAll('.multiplier-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-multiplier="${multiplier}"]`).classList.add('active');
    }
    
    spinWheel() {
        if (this.isSpinning || this.currentBet > this.balance) return;
        
        this.isSpinning = true;
        this.balance -= this.currentBet;
        this.updateDisplay();
        
        const spinBtn = document.getElementById('spinBtn');
        spinBtn.disabled = true;
        spinBtn.textContent = '🌀 Крутится...';
        
        // Анимация вращения
        const wheel = document.getElementById('wheel');
        wheel.classList.add('spinning');
        
        // Случайный результат
        const resultIndex = Math.floor(Math.random() * this.sectors.length);
        const result = this.sectors[resultIndex];
        
        // Рассчитываем угол для остановки на выбранном секторе
        const sectorAngle = 360 / this.sectors.length;
        const extraRotations = 5 * 360; // 5 дополнительных полных оборотов
        const targetAngle = extraRotations + (resultIndex * sectorAngle);
        
        wheel.style.transform = `rotate(${targetAngle}deg)`;
        
        // Показываем результат после анимации
        setTimeout(() => {
            this.showResult(result, resultIndex);
        }, 3000);
    }
    
    showResult(result, index) {
        this.isSpinning = false;
        
        const wheel = document.getElementById('wheel');
        wheel.classList.remove('spinning');
        
        const spinBtn = document.getElementById('spinBtn');
        spinBtn.disabled = false;
        spinBtn.textContent = '🎰 КРУТИТЬ!';
        
        const resultText = document.getElementById('resultText');
        const winAmount = document.getElementById('winAmount');
        
        if (result.multiplier > 0) {
            const win = this.currentBet * result.multiplier;
            this.balance += win;
            
            resultText.textContent = `🎉 ПОБЕДА! ${result.multiplier}x`;
            resultText.style.color = '#2ecc71';
            winAmount.textContent = `+${win} 🪙`;
            
            // Анимация выигрыша
            resultText.classList.add('winning');
            setTimeout(() => resultText.classList.remove('winning'), 500);
            
            // Вибрация если доступна
            if (navigator.vibrate) navigator.vibrate(200);
            
            this.addToHistory(true, win);
        } else {
            resultText.textContent = '💥 ПРОИГРЫШ';
            resultText.style.color = '#e74c3c';
            winAmount.textContent = `-${this.currentBet} 🪙`;
            
            this.addToHistory(false, 0);
        }
        
        this.updateDisplay();
        
        // Авто-сброс через 2 секунды
        setTimeout(() => {
            resultText.textContent = '';
            winAmount.textContent = '';
        }, 2000);
    }
    
    addToHistory(isWin, amount) {
        this.history.unshift({
            win: isWin,
            amount: amount,
            timestamp: new Date()
        });
        
        // Ограничиваем историю 10 последними результатами
        if (this.history.length > 10) {
            this.history = this.history.slice(0, 10);
        }
        
        this.updateHistory();
    }
    
    updateHistory() {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        
        this.history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = `history-item ${item.win ? 'win' : 'lose'}`;
            historyItem.textContent = item.win ? `+${item.amount}` : '0';
            historyList.appendChild(historyItem);
        });
    }
    
    updateDisplay() {
        document.getElementById('balance').textContent = this.balance;
        document.getElementById('currentBet').textContent = this.currentBet;
        
        const spinBtn = document.getElementById('spinBtn');
        if (this.currentBet > this.balance) {
            spinBtn.disabled = true;
            spinBtn.style.background = '#7f8c8d';
        } else {
            spinBtn.disabled = false;
            spinBtn.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
        }
    }
}

// Инициализация игры когда страница загружена
document.addEventListener('DOMContentLoaded', () => {
    window.game = new RouletteGame();
});

// Вспомогательные функции для глобального доступа
function changeBet(amount) {
    window.game.changeBet(amount);
}

function selectMultiplier(multiplier) {
    window.game.selectMultiplier(multiplier);
}

function spinWheel() {
    window.game.spinWheel();
}
