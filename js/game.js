// Game management logic
class GameManager {
    constructor() {
        this.roundTime = 30; // seconds
        this.timeLeft = this.roundTime;
        this.isRoundActive = true;
        this.players = [];
        this.totalBank = 0;
        this.timerInterval = null;
        this.currentUserBet = 0;
    }

    startGameLoop() {
        this.updateTimer();
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimer();
            
            if (this.timeLeft <= 0) {
                this.finishRound();
            }
        }, 1000);

        // Simulate other players joining
        this.simulateOtherPlayers();
    }

    updateTimer() {
        const timerEl = document.getElementById('timer');
        timerEl.textContent = `0:${this.timeLeft.toString().padStart(2, '0')}`;
        
        // Visual feedback when time is running out
        if (this.timeLeft <= 10) {
            timerEl.style.color = '#ff6b6b';
            timerEl.classList.add('pulse');
        } else {
            timerEl.style.color = 'white';
            timerEl.classList.remove('pulse');
        }
    }

    updateUserChance() {
        const betAmount = parseInt(document.getElementById('betAmount').value) || 0;
        const chanceEl = document.getElementById('userChance');
        
        if (this.totalBank + betAmount === 0) {
            chanceEl.textContent = '0%';
            return;
        }
        
        const chance = (betAmount / (this.totalBank + betAmount)) * 100;
        chanceEl.textContent = chance.toFixed(1) + '%';
    }

    placeBet() {
        const betInput = document.getElementById('betAmount');
        const betAmount = parseInt(betInput.value) || 0;
        
        if (betAmount < 1) {
            app.showNotification('Минимальная ставка: 1 TON', 'error');
            return;
        }
        
        if (betAmount > app.balance) {
            app.showNotification('Недостаточно средств!', 'error');
            return;
        }

        // Check if user already placed a bet
        const existingBetIndex = this.players.findIndex(p => p.isCurrentUser);
        
        if (existingBetIndex !== -1) {
            // Update existing bet
            const oldBet = this.players[existingBetIndex].bet;
            this.totalBank -= oldBet;
            this.players[existingBetIndex].bet = betAmount;
        } else {
            // Add new bet
            this.players.push({
                id: app.user.id,
                name: app.user.first_name || 'Вы',
                bet: betAmount,
                isCurrentUser: true
            });
        }
        
        this.totalBank += betAmount;
        this.currentUserBet = betAmount;
        app.updateBalance(-betAmount);
        
        this.updateGameDisplay();
        app.showNotification(`Ставка ${betAmount} TON принята!`, 'success');
        
        // Disable bet button until next round
        document.getElementById('placeBetBtn').disabled = true;
    }

    simulateOtherPlayers() {
        // Simulate random players joining the game
        const fakePlayers = [
            { name: 'CryptoWolf', bet: 15 },
            { name: 'LuckyStar', bet: 25 },
            { name: 'TonHunter', bet: 10 },
            { name: 'DiamondHand', bet: 30 }
        ];

        setInterval(() => {
            if (this.isRoundActive && Math.random() > 0.7) {
                const randomPlayer = fakePlayers[Math.floor(Math.random() * fakePlayers.length)];
                const betAmount = randomPlayer.bet + Math.floor(Math.random() * 20);
                
                this.players.push({
                    id: Math.random().toString(36),
                    name: randomPlayer.name,
                    bet: betAmount,
                    isCurrentUser: false
                });
                
                this.totalBank += betAmount;
                this.updateGameDisplay();
            }
        }, 5000);
    }

    updateGameDisplay() {
        // Update total bank
        document.getElementById('totalBank').textContent = this.totalBank + ' TON';
        
        // Update players list
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = this.players.map(player => {
            const chance = (player.bet / this.totalBank) * 100;
            return `
                <div class="player-item ${player.isCurrentUser ? 'player-you' : ''}">
                    <span>${player.name}</span>
                    <span>${player.bet} TON (${chance.toFixed(1)}%)</span>
                </div>
            `;
        }).join('');
        
        this.updateUserChance();
    }

    finishRound() {
        this.isRoundActive = false;
        clearInterval(this.timerInterval);
        
        if (this.players.length === 0) {
            this.startNewRound();
            return;
        }

        // Calculate winner based on bet weights
        const winner = this.calculateWinner();
        const commission = this.totalBank * 0.05; // 5% commission
        const winAmount = this.totalBank - commission;
        
        // Show winner animation
        this.showWinner(winner, winAmount);
        
        // Start new round after delay
        setTimeout(() => {
            this.startNewRound();
        }, 5000);
    }

    calculateWinner() {
        // Weighted random selection based on bet amounts
        const totalWeight = this.players.reduce((sum, player) => sum + player.bet, 0);
        let random = Math.random() * totalWeight;
        
        for (const player of this.players) {
            if (random <= player.bet) {
                return player;
            }
            random -= player.bet;
        }
        
        return this.players[this.players.length - 1];
    }

    showWinner(winner, winAmount) {
        // Highlight winner in the list
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = this.players.map(player => {
            const chance = (player.bet / this.totalBank) * 100;
            const isWinner = player.id === winner.id;
            return `
                <div class="player-item ${player.isCurrentUser ? 'player-you' : ''} ${isWinner ? 'winner-animation' : ''}">
                    <span>${player.name} ${isWinner ? '👑' : ''}</span>
                    <span>${player.bet} TON (${chance.toFixed(1)}%)</span>
                </div>
            `;
        }).join('');

        // Show winner notification
        if (winner.isCurrentUser) {
            app.showNotification(`🎉 ПОБЕДА! Вы выиграли ${winAmount} TON! (комиссия 5%)`, 'success');
            app.updateBalance(winAmount);
        } else {
            app.showNotification(`Победитель: ${winner.name} - ${winAmount} TON!`, 'info');
        }

        // Add to recent winners
        this.addToRecentWinners(winner.name, winAmount);
    }

    addToRecentWinners(name, amount) {
        const winnersList = document.getElementById('recentWinners');
        const newWinner = document.createElement('div');
        newWinner.className = 'winner-item';
        newWinner.innerHTML = `
            <span>${name}</span>
            <span>+${amount} TON</span>
            <span>только что</span>
        `;
        
        winnersList.insertBefore(newWinner, winnersList.firstChild);
        
        // Keep only last 5 winners
        if (winnersList.children.length > 5) {
            winnersList.removeChild(winnersList.lastChild);
        }
    }

    startNewRound() {
        this.players = [];
        this.totalBank = 0;
        this.timeLeft = this.roundTime;
        this.isRoundActive = true;
        this.currentUserBet = 0;
        
        document.getElementById('placeBetBtn').disabled = false;
        this.updateGameDisplay();
        this.startGameLoop();
    }
}

// Initialize game manager
const gameManager = new GameManager();

// Global function for placing bet
function placeBet() {
    gameManager.placeBet();
}
