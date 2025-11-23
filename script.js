// Ultimate TON Roulette - Complete JavaScript
class UltimateTONRoulette {
    constructor() {
        // Основные настройки
        this.balance = 0;
        this.currentBet = 1;
        this.currentMultiplier = 10;
        this.isConnected = false;
        this.wallet = null;
        this.tonWeb = null;
        this.tonConnectUI = null;
        
        // Игровые данные
        this.gameModes = ['classic', 'crash', 'jackpot', 'tournament'];
        this.currentMode = 'classic';
        this.isBettingPhase = true;
        this.isSpinning = false;
        
        // Джекпот система
        this.jackpotAmount = 1250;
        this.jackpotTimeLeft = 150; // 2.5 минуты
        this.jackpotBase = 250;
        
        // Таймер раунда
        this.roundTime = 30;
        this.timeLeft = this.roundTime;
        this.roundNumber = 1;
        
        // Реферальная система
        this.referralCode = this.generateReferralCode();
        this.referrals = [];
        this.refEarnings = 0;
        this.refBonusRate = 0.05; // 5%
        
        // Турниры и лидерборд
        this.tournaments = [];
        this.leaderboard = [];
        this.userStats = {
            totalWagered: 0,
            totalWon: 0,
            gamesPlayed: 0,
            biggestWin: 0
        };
        
        // Транзакции и история
        this.transactions = [];
        this.gameHistory = [];
        this.currentBets = [];
        
        // Multiplayer данные
        this.playersOnline = 1;
        this.players = [];
        
        // Сектора рулетки
        this.sectors = [
            { color: '#e74c3c', multiplier: 10, probability: 0.1, angle: 0 },
            { color: '#2c3e50', multiplier: 0, probability: 0.9, angle: 45 },
            { color: '#e74c3c', multiplier: 2, probability: 0.5, angle: 90 },
            { color: '#2c3e50', multiplier: 0, probability: 0.5, angle: 135 },
            { color: '#e74c3c', multiplier: 5, probability: 0.2, angle: 180 },
            { color: '#2c3e50', multiplier: 0, probability: 0.8, angle: 225 },
            { color: '#e74c3c', multiplier: 20, probability: 0.05, angle: 270 },
            { color: '#2c3e50', multiplier: 0, probability: 0.95, angle: 315 }
        ];
        
        this.init();
    }

    async init() {
        try {
            this.initTelegram();
            await this.initTON();
            this.setupEventListeners();
            this.createWheel();
            this.loadGameData();
            this.startTimers();
            this.updateDisplay();
            this.loadTournaments();
            this.simulateMultiplayer();
            
            this.showNotification('🎰 Добро пожаловать в TON Roulette!', 'info');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showNotification('Ошибка инициализации приложения', 'error');
        }
    }

    initTelegram() {
        try {
            this.tg = window.Telegram.WebApp;
            this.tg.expand();
            this.tg.enableClosingConfirmation();
            
            // Получаем данные пользователя Telegram
            if (this.tg.initDataUnsafe.user) {
                const user = this.tg.initDataUnsafe.user;
                this.userId = user.id;
                this.userName = user.first_name || 'Игрок';
                this.userAvatar = user.photo_url;
                
                // Обновляем приветствие
                document.querySelector('.header h1').textContent = `🎰 Привет, ${this.userName}!`;
            } else {
                this.userId = 'guest_' + Date.now();
                this.userName = 'Гость';
            }
            
            // Обработка реферальных ссылок
            if (this.tg.initDataUnsafe.start_param) {
                this.handleReferralStart(this.tg.initDataUnsafe.start_param);
            }
            
        } catch (error) {
            console.warn('Telegram Web App not available, running in standalone mode');
            this.userId = 'standalone_' + Date.now();
            this.userName = 'Игрок';
        }
    }

    async initTON() {
        return new Promise((resolve, reject) => {
            try {
                // Инициализация TON Connect
                this.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
                    manifestUrl: window.location.origin + '/tonconnect-manifest.json',
                    buttonRootId: 'connectWallet'
                });
                
                // Проверяем существующее подключение
                this.tonConnectUI.connectionRestored.then((wallet) => {
                    if (wallet) {
                        this.onWalletConnected(wallet);
                    }
                    resolve();
                }).catch(() => {
                    resolve(); // Продолжаем без кошелька
                });
                
                // Инициализация TON Web
                if (window.TonWeb) {
                    this.tonWeb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
                }
                
            } catch (error) {
                console.warn('TON initialization failed:', error);
                resolve(); // Продолжаем без TON
            }
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
        const betInput = document.getElementById('betInput');
        if (betInput) {
            betInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0.1) {
                    this.currentBet = Math.min(value, 1000); // Максимум 1000 TON
                    this.updateBetDisplay();
                }
            });
            
            betInput.addEventListener('blur', (e) => {
                if (this.currentBet < 0.1) {
                    this.currentBet = 0.1;
                    this.updateBetDisplay();
                }
            });
        }
        
        // Быстрые ставки
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-bet')) {
                const amount = parseFloat(e.target.dataset.amount);
                this.setQuickBet(amount);
            }
        });
        
        // Обработка клавиатуры
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.isBettingPhase) {
                this.placeBet();
            } else if (e.key === 'ArrowUp') {
                this.changeBet(0.1);
            } else if (e.key === 'ArrowDown') {
                this.changeBet(-0.1);
            }
        });
    }

    createWheel() {
        const wheelNumbers = document.getElementById('wheelNumbers');
        if (!wheelNumbers) return;
        
        wheelNumbers.innerHTML = '';
        const sectorAngle = 360 / this.sectors.length;
        
        this.sectors.forEach((sector, index) => {
            const sectorElement = document.createElement('div');
            sectorElement.className = 'wheel-sector';
            sectorElement.style.transform = `rotate(${index * sectorAngle}deg)`;
            sectorElement.style.background = sector.color;
            sectorElement.dataset.multiplier = sector.multiplier;
            
            const text = sector.multiplier > 0 ? `${sector.multiplier}x` : '0x';
            sectorElement.innerHTML = `<span style="transform: rotate(${sectorAngle/2}deg)">${text}</span>`;
            
            wheelNumbers.appendChild(sectorElement);
        });
    }

    // ===== TON КОШЕЛЁК =====
    async connectWallet() {
        try {
            const wallet = await this.tonConnectUI.connectWallet();
            this.onWalletConnected(wallet);
        } catch (error) {
            console.error('Wallet connection error:', error);
            this.showNotification('Ошибка подключения кошелька', 'error');
        }
    }

    onWalletConnected(wallet) {
        this.wallet = wallet;
        this.isConnected = true;
        
        this.showNotification('✅ TON кошелёк успешно подключен!', 'success');
        this.updateWalletDisplay();
        this.switchTab('wallet');
        
        // Автоматически загружаем баланс
        this.updateTONBalance();
    }

    async updateTONBalance() {
        if (!this.wallet || !this.tonWeb) return;
        
        try {
            const address = new TonWeb.utils.Address(this.wallet.account.address);
            const balance = await this.tonWeb.getBalance(address);
            const tonBalance = TonWeb.utils.fromNano(balance);
            
            document.getElementById('tonBalance').textContent = parseFloat(tonBalance).toFixed(2);
        } catch (error) {
            console.warn('Failed to fetch TON balance:', error);
        }
    }

    async deposit(amount) {
        if (!this.isConnected) {
            this.showNotification('Сначала подключите TON кошелёк', 'error');
            return;
        }
        
        if (amount <= 0) {
            this.showNotification('Неверная сумма депозита', 'error');
            return;
        }
        
        try {
            this.showNotification(`Инициируем депозит ${amount} TON...`, 'info');
            
            // В реальном приложении здесь будет вызов TON транзакции
            // Для демо используем симуляцию
            await this.simulateTONTransaction(amount, 'deposit');
            
            this.balance += amount;
            this.addTransaction('deposit', amount, this.wallet.account.address);
            this.showNotification(`✅ Депозит ${amount} TON успешен!`, 'success');
            this.updateDisplay();
            
        } catch (error) {
            console.error('Deposit error:', error);
            this.showNotification('Ошибка депозита', 'error');
        }
    }

    async withdraw() {
        const amountInput = document.getElementById('withdrawAmount');
        const addressInput = document.getElementById('withdrawAddress');
        
        if (!amountInput || !addressInput) return;
        
        const amount = parseFloat(amountInput.value);
        const address = addressInput.value.trim();
        
        if (!this.isConnected) {
            this.showNotification('Сначала подключите кошелёк', 'error');
            return;
        }
        
        if (!amount || amount <= 0 || amount > this.balance) {
            this.showNotification('Неверная сумма вывода', 'error');
            return;
        }
        
        if (!this.isValidTONAddress(address)) {
            this.showNotification('Неверный TON адрес', 'error');
            return;
        }
        
        try {
            this.showNotification(`Инициируем вывод ${amount} TON...`, 'info');
            
            // В реальном приложении здесь будет вызов TON транзакции
            await this.simulateTONTransaction(amount, 'withdraw', address);
            
            this.balance -= amount;
            this.addTransaction('withdraw', -amount, address);
            this.showNotification(`✅ Вывод ${amount} TON успешен!`, 'success');
            
            // Очищаем поля
            amountInput.value = '';
            addressInput.value = '';
            
            this.updateDisplay();
            
        } catch (error) {
            console.error('Withdraw error:', error);
            this.showNotification('Ошибка вывода', 'error');
        }
    }

    async simulateTONTransaction(amount, type, address = null) {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`TON Transaction: ${type} ${amount} TON ${address ? 'to ' + address : ''}`);
                
                // Имитация комиссии сети
                if (type === 'withdraw') {
                    const fee = Math.min(amount * 0.01, 0.1); // 1% комиссия, но не более 0.1 TON
                    console.log(`Network fee: ${fee} TON`);
                }
                
                resolve({
                    success: true,
                    hash: '0x' + Math.random().toString(16).substr(2, 64),
                    amount: amount,
                    type: type
                });
            }, 2000);
        });
    }

    isValidTONAddress(address) {
        // Базовая валидация TON адреса
        return address && /^EQ[0-9a-zA-Z]{48}$/.test(address);
    }

    // ===== ИГРОВОЙ ПРОЦЕСС =====
    switchTab(tabName) {
        // Скрываем все вкладки
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Показываем выбранную вкладку
        const targetTab = document.getElementById(tabName + 'Tab');
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        // Обновляем кнопки навигации
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Загружаем данные для вкладки
        this.loadTabData(tabName);
    }

    switchGameMode(mode) {
        if (!this.gameModes.includes(mode)) return;
        
        this.currentMode = mode;
        
        // Обновляем кнопки режимов
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-mode="${mode}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        this.showNotification(`🎯 Режим изменен: ${this.getModeName(mode)}`, 'info');
        
        // Особые настройки для режимов
        switch (mode) {
            case 'jackpot':
                this.currentMultiplier = 50;
                break;
            case 'tournament':
                this.currentMultiplier = 10;
                break;
        }
        
        this.updateMultiplierButtons();
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

    setQuickBet(amount) {
        if (amount === 0.5) {
            this.currentBet = this.balance * 0.5;
        } else if (amount === 2) {
            this.currentBet = Math.min(this.currentBet * 2, this.balance);
        } else {
            this.currentBet = amount;
        }
        
        this.currentBet = Math.max(0.1, Math.min(this.currentBet, 1000));
        this.updateBetDisplay();
    }

    changeBet(amount) {
        if (!this.isBettingPhase || this.isSpinning) return;
        
        const newBet = this.currentBet + amount;
        if (newBet >= 0.1 && newBet <= this.balance) {
            this.currentBet = parseFloat(newBet.toFixed(2));
            this.updateBetDisplay();
        }
    }

    selectMultiplier(multiplier) {
        if (!this.isBettingPhase || this.isSpinning) return;
        
        this.currentMultiplier = multiplier;
        this.updateMultiplierButtons();
        this.updatePotentialWin();
    }

    updateMultiplierButtons() {
        document.querySelectorAll('.mult-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-mult="${this.currentMultiplier}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    placeBet() {
        if (!this.isBettingPhase || this.isSpinning) {
            this.showNotification('Ставки в данный момент не принимаются', 'warning');
            return;
        }
        
        if (this.currentBet > this.balance) {
            this.showNotification('Недостаточно средств для ставки', 'error');
            return;
        }
        
        if (this.currentBet < 0.1) {
            this.showNotification('Минимальная ставка: 0.1 TON', 'error');
            return;
        }
        
        // Создаем ставку
        const bet = {
            id: Date.now(),
            userId: this.userId,
            userName: this.userName,
            amount: this.currentBet,
            multiplier: this.currentMultiplier,
            potentialWin: this.currentBet * this.currentMultiplier,
            mode: this.currentMode,
            timestamp: new Date(),
            status: 'pending'
        };
        
        this.currentBets.push(bet);
        this.balance -= this.currentBet;
        this.userStats.totalWagered += this.currentBet;
        this.userStats.gamesPlayed++;
        
        // Добавляем в джекпот
        this.jackpotAmount += this.currentBet * 0.01; // 1% от ставки
        
        this.updateBetsList();
        this.updateDisplay();
        this.addTransaction('bet', -this.currentBet);
        
        this.showNotification(`🎯 Ставка ${this.currentBet} TON принята!`, 'success');
        
        // Если это режим джекпота, добавляем билет
        if (this.currentMode === 'jackpot') {
            this.addJackpotTicket(this.currentBet);
        }
        
        // Авто-ставка для следующего раунда
        setTimeout(() => {
            this.currentBet = Math.max(0.1, this.currentBet); // Минимум 0.1
            this.updateBetDisplay();
        }, 1000);
    }

    spinWheel() {
        if (this.isSpinning || !this.isBettingPhase) return;
        
        this.isSpinning = true;
        this.isBettingPhase = false;
        
        const wheel = document.getElementById('wheel');
        const spinBtn = document.getElementById('placeBetBtn');
        
        if (wheel) wheel.classList.add('spinning');
        if (spinBtn) spinBtn.disabled = true;
        
        // Определяем результат
        const resultIndex = this.calculateResult();
        const result = this.sectors[resultIndex];
        
        // Анимация вращения
        const extraRotations = 5 * 360;
        const targetAngle = extraRotations + (resultIndex * (360 / this.sectors.length));
        
        if (wheel) {
            wheel.style.transform = `rotate(${targetAngle}deg)`;
        }
        
        // Обрабатываем результат после анимации
        setTimeout(() => {
            this.processRoundResult(result, resultIndex);
            this.isSpinning = false;
            
            if (wheel) wheel.classList.remove('spinning');
            if (spinBtn) spinBtn.disabled = false;
            
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
        const roundBets = [...this.currentBets];
        
        // Обрабатываем все ставки раунда
        roundBets.forEach(bet => {
            let isWin = false;
            let winAmount = 0;
            
            if (this.currentMode === 'classic') {
                isWin = (result.multiplier === bet.multiplier);
                winAmount = isWin ? bet.amount * bet.multiplier : 0;
            } else if (this.currentMode === 'jackpot') {
                // Логика джекпота
                isWin = Math.random() < 0.01; // 1% шанс выигрыша
                winAmount = isWin ? this.jackpotAmount : 0;
            }
            
            if (isWin && winAmount > 0) {
                winners.push({
                    userName: bet.userName,
                    winAmount: winAmount,
                    bet: bet.amount
                });
                
                // Зачисляем выигрыш если это наш пользователь
                if (bet.userId === this.userId) {
                    this.balance += winAmount;
                    this.userStats.totalWon += winAmount;
                    this.userStats.biggestWin = Math.max(this.userStats.biggestWin, winAmount);
                    
                    this.showNotification(`🎉 ПОБЕДА! +${winAmount} TON`, 'success');
                    this.addTransaction('win', winAmount);
                    
                    // Вибрация если доступна
                    if (navigator.vibrate) navigator.vibrate(200);
                }
                
                // Обновляем джекпот если был выигран
                if (this.currentMode === 'jackpot' && isWin) {
                    this.jackpotAmount = this.jackpotBase;
                }
            }
            
            // Обновляем статус ставки
            bet.status = isWin ? 'win' : 'lose';
            bet.winAmount = winAmount;
        });
        
        // Сохраняем в историю
        this.addToHistory(result, winners, roundBets);
        
        // Обновляем интерфейс
        this.updateDisplay();
        this.showRoundResult(result, winners);
        
        // Очищаем ставки и начинаем новый раунд
        setTimeout(() => {
            this.currentBets = [];
            this.startNewRound();
        }, 5000);
    }

    showRoundResult(result, winners) {
        let resultText = '';
        let resultType = 'info';
        
        if (result.multiplier > 0) {
            resultText = `🎉 Выпал множитель ${result.multiplier}x!`;
            resultType = 'success';
        } else {
            resultText = '💥 Проигрышный сектор!';
            resultType = 'error';
        }
        
        if (winners.length > 0) {
            const winnerNames = winners.map(w => `${w.userName} (+${w.winAmount} TON)`).join(', ');
            resultText += ` Победители: ${winnerNames}`;
        } else {
            resultText += ' Победителей нет';
        }
        
        this.showNotification(resultText, resultType);
    }

    startNewRound() {
        this.roundNumber++;
        this.isBettingPhase = true;
        this.currentBets = [];
        this.updateBetsList();
        this.updateDisplay();
        
        this.showNotification(`🎰 Раунд ${this.roundNumber} - Ставки принимаются!`, 'info');
    }

    // ===== РЕФЕРАЛЬНАЯ СИСТЕМА =====
    generateReferralCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    handleReferralStart(refCode) {
        if (refCode && refCode !== this.referralCode) {
            // Проверяем, не заходил ли уже этот реферал
            const existingRef = this.referrals.find(ref => ref.code === refCode);
            if (!existingRef) {
                this.showNotification('🎁 Вы зашли по реферальной ссылке! Бонус +1 TON', 'success');
                this.balance += 1;
                this.addTransaction('ref_bonus', 1);
                
                // Сохраняем реферала
                this.referrals.push({
                    code: refCode,
                    date: new Date(),
                    earned: 0,
                    status: 'active'
                });
                
                this.updateReferralsList();
            }
        }
    }

    copyRefLink() {
        const refLink = `https://t.me/your_bot?start=${this.referralCode}`;
        navigator.clipboard.writeText(refLink).then(() => {
            this.showNotification('📋 Реферальная ссылка скопирована!', 'success');
        }).catch(() => {
            // Fallback для старых браузеров
            const tempInput = document.createElement('input');
            tempInput.value = refLink;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            this.showNotification('📋 Реферальная ссылка скопирована!', 'success');
        });
    }

    addRefEarnings(amount, refCode) {
        const ref = this.referrals.find(r => r.code === refCode);
        if (ref) {
            const earnings = amount * this.refBonusRate;
            ref.earned += earnings;
            this.refEarnings += earnings;
            
            this.addTransaction('ref_earning', earnings);
            this.updateReferralsList();
        }
    }

    // ===== ТУРНИРЫ И ЛИДЕРБОРД =====
    loadTournaments() {
        // Загрузка турниров (заглушка с демо-данными)
        this.tournaments = [
            {
                id: 1,
                name: 'Уикенд Турнир',
                prize: '5,000 TON',
                prizeAmount: 5000,
                players: 124,
                maxPlayers: 200,
                endTime: Date.now() + 3 * 24 * 60 * 60 * 1000,
                entryFee: 5,
                type: 'weekly'
            },
            {
                id: 2,
                name: 'Ежедневный Джекпот',
                prize: '1,200 TON',
                prizeAmount: 1200,
                players: 89,
                maxPlayers: 150,
                endTime: Date.now() + 24 * 60 * 60 * 1000,
                entryFee: 1,
                type: 'daily'
            },
            {
                id: 3,
                name: 'VIP Турнир',
                prize: '10,000 TON',
                prizeAmount: 10000,
                players: 45,
                maxPlayers: 100,
                endTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
                entryFee: 25,
                type: 'vip'
            }
        ];
        
        this.updateTournamentsDisplay();
        this.updateLeaderboard();
    }

    joinTournament(tournamentId) {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) return;
        
        if (this.balance < tournament.entryFee) {
            this.showNotification(`Недостаточно средств. Взнос: ${tournament.entryFee} TON`, 'error');
            return;
        }
        
        if (tournament.players >= tournament.maxPlayers) {
            this.showNotification('Турнир уже заполнен', 'error');
            return;
        }
        
        this.balance -= tournament.entryFee;
        tournament.players++;
        
        this.showNotification(`🎯 Вы присоединились к турниру "${tournament.name}"!`, 'success');
        this.addTransaction('tournament_entry', -tournament.entryFee);
        
        this.switchTab('game');
        this.switchGameMode('tournament');
        
        this.updateDisplay();
        this.updateTournamentsDisplay();
    }

    updateLeaderboard() {
        // Демо-данные для лидерборда
        this.leaderboard = [
            { position: 1, name: 'CryptoWhale', profit: 12500, games: 89 },
            { position: 2, name: 'TonMaster', profit: 8920, games: 67 },
            { position: 3, name: 'RouletteKing', profit: 7450, games: 112 },
            { position: 4, name: this.userName, profit: Math.round(this.userStats.totalWon), games: this.userStats.gamesPlayed },
            { position: 5, name: 'LuckySpin', profit: 3200, games: 45 }
        ].sort((a, b) => b.profit - a.profit);
        
        this.leaderboard.forEach((item, index) => {
            item.position = index + 1;
        });
        
        const leaderboardList = document.getElementById('leaderboardList');
        if (leaderboardList) {
            leaderboardList.innerHTML = this.leaderboard.map(player => `
                <div class="leaderboard-item ${player.name === this.userName ? 'current-user' : ''}">
                    <span class="leaderboard-position">#${player.position}</span>
                    <span class="leaderboard-name">${player.name}</span>
                    <span class="leaderboard-profit" style="color: ${player.profit >= 0 ? '#28a745' : '#dc3545'}">
                        ${player.profit >= 0 ? '+' : ''}${player.profit} TON
                    </span>
                </div>
            `).join('');
        }
    }

    // ===== ТАЙМЕРЫ И АВТОМАТИЧЕСКИЕ ПРОЦЕССЫ =====
    startTimers() {
        // Таймер джекпота
        this.jackpotTimer = setInterval(() => {
            this.jackpotTimeLeft--;
            if (this.jackpotTimeLeft <= 0) {
                this.jackpotTimeLeft = 300; // 5 минут
                this.drawJackpot();
            }
            this.updateJackpotTimer();
        }, 1000);
        
        // Таймер раунда
        this.roundTimer = setInterval(() => {
            if (this.isBettingPhase && !this.isSpinning) {
                this.timeLeft--;
                
                if (this.timeLeft <= 0) {
                    if (this.currentBets.length > 0) {
                        this.spinWheel();
                    } else {
                        this.timeLeft = this.roundTime;
                    }
                }
                
                this.updateRoundTimer();
            }
        }, 1000);
        
        // Автосохранение
        this.autoSaveTimer = setInterval(() => {
            this.saveGameData();
        }, 30000);
        
        // Обновление онлайн игроков
        this.playersTimer = setInterval(() => {
            this.updateOnlinePlayers();
        }, 10000);
    }

    drawJackpot() {
        // Проверяем, есть ли активные билеты джекпота
        const hasJackpotTickets = this.currentBets.some(bet => bet.mode === 'jackpot');
        
        if (hasJackpotTickets && Math.random() < 0.3) { // 30% шанс выигрыша
            const winAmount = this.jackpotAmount * 0.8; // 80% джекпота
            
            // Находим победителя среди ставок джекпота
            const jackpotBets = this.currentBets.filter(bet => bet.mode === 'jackpot');
            const winner = jackpotBets[Math.floor(Math.random() * jackpotBets.length)];
            
            if (winner && winner.userId === this.userId) {
                this.balance += winAmount;
                this.jackpotAmount = this.jackpotBase;
                
                this.showNotification(`🎊 ДЖЕКПОТ! Вы выиграли ${winAmount} TON!`, 'success');
                this.addTransaction('jackpot', winAmount);
            }
        }
    }

    addJackpotTicket(amount) {
        // Добавляем билет в джекпот (1 билет за каждые 5 TON ставки)
        const tickets = Math.floor(amount / 5);
        for (let i = 0; i < tickets; i++) {
            // Логика добавления билетов джекпота
            this.jackpotAmount += 0.1; // Каждый билет увеличивает джекпот
        }
    }

    simulateMultiplayer() {
        // Имитация других игроков
        setInterval(() => {
            if (this.isBettingPhase && Math.random() > 0.7) {
                const fakePlayers = [
                    'Alex', 'Maria', 'John', 'Anna', 'Mike', 
                    'Sarah', 'David', 'Emma', 'James', 'Lisa'
                ];
                const randomPlayer = fakePlayers[Math.floor(Math.random() * fakePlayers.length)];
                
                const fakeBet = {
                    id: 'fake_' + Date.now() + Math.random(),
                    userId: 'fake_' + randomPlayer,
                    userName: randomPlayer,
                    amount: Math.floor(Math.random() * 5) + 1,
                    multiplier: [2, 5, 10, 20][Math.floor(Math.random() * 4)],
                    mode: this.currentMode,
                    timestamp: new Date(),
                    status: 'pending',
                    isFake: true
                };
                
                this.currentBets.push(fakeBet);
                this.updateBetsList();
                this.updateOnlinePlayers();
            }
        }, 3000 + Math.random() * 7000); // Случайные интервалы
    }

    updateOnlinePlayers() {
        const uniquePlayers = new Set(this.currentBets.map(bet => bet.userId));
        this.playersOnline = Math.max(1, uniquePlayers.size);
        
        const playersCountElement = document.getElementById('playersCount');
        if (playersCountElement) {
            playersCountElement.textContent = this.playersOnline;
        }
    }

    // ===== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА =====
    updateDisplay() {
        // Баланс
        this.updateBalanceDisplay();
        
        // Джекпот
        this.updateJackpotDisplay();
        
        // Ставка
        this.updateBetDisplay();
        
        // Потенциальный выигрыш
        this.updatePotentialWin();
        
        // Рефералы
        this.updateReferralsDisplay();
        
        // Кошелёк
        this.updateWalletDisplay();
    }

    updateBalanceDisplay() {
        const balanceElement = document.getElementById('balance');
        if (balanceElement) {
            balanceElement.textContent = this.balance.toFixed(2) + ' TON';
        }
    }

    updateJackpotDisplay() {
        const jackpotAmountElement = document.getElementById('jackpotAmount');
        if (jackpotAmountElement) {
            jackpotAmountElement.textContent = this.jackpotAmount.toLocaleString() + ' TON';
        }
    }

    updateJackpotTimer() {
        const minutes = Math.floor(this.jackpotTimeLeft / 60);
        const seconds = this.jackpotTimeLeft % 60;
        const timerElement = document.getElementById('jackpotTimer');
        
        if (timerElement) {
            timerElement.textContent = `Следующий розыгрыш: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateRoundTimer() {
        const progress = (this.timeLeft / this.roundTime) * 100;
        const progressElement = document.getElementById('timerProgress');
        const textElement = document.getElementById('timerText');
        
        if (progressElement) {
            progressElement.style.width = `${progress}%`;
        }
        
        if (textElement) {
            if (this.isBettingPhase) {
                textElement.textContent = `Ставки принимаются: ${this.timeLeft}с`;
                textElement.style.color = this.timeLeft <= 5 ? '#dc3545' : '#28a745';
            } else {
                textElement.textContent = `Вращение: ${this.timeLeft}с`;
            }
        }
    }

    updateBetDisplay() {
        const betDisplay = document.getElementById('betDisplay');
        const betInput = document.getElementById('betInput');
        
        if (betDisplay) {
            betDisplay.textContent = this.currentBet.toFixed(2);
        }
        
        if (betInput) {
            betInput.value = this.currentBet.toFixed(2);
        }
    }

    updatePotentialWin() {
        const potentialWin = this.currentBet * this.currentMultiplier;
        const potentialWinElement = document.getElementById('potentialWin');
        const winChanceElement = document.getElementById('winChance');
        
        if (potentialWinElement) {
            potentialWinElement.textContent = potentialWin.toFixed(2) + ' TON';
        }
        
        if (winChanceElement) {
            const winChance = Math.round((1 / this.currentMultiplier) * 100);
            winChanceElement.textContent = winChance + '%';
        }
    }

    updateBetsList() {
        const betsList = document.getElementById('betsList');
        if (!betsList) return;
        
        if (this.currentBets.length === 0) {
            betsList.innerHTML = '<div class="no-bets">Ставок пока нет</div>';
            return;
        }
        
        // Показываем только последние 10 ставок
        const recentBets = this.currentBets.slice(-10).reverse();
        
        betsList.innerHTML = recentBets.map(bet => `
            <div class="bet-item ${bet.isFake ? 'fake-bet' : ''} ${bet.status === 'win' ? 'win' : bet.status === 'lose' ? 'lose' : ''}">
                <span class="bet-user">${bet.userName}</span>
                <span class="bet-amount">${bet.amount} TON</span>
                <span class="bet-multiplier">${bet.multiplier}x</span>
                ${bet.winAmount ? `<span class="bet-win">+${bet.winAmount} TON</span>` : ''}
            </div>
        `).join('');
    }

    updateReferralsDisplay() {
        const refCountElement = document.getElementById('refCount');
        const refEarnedElement = document.getElementById('refEarned');
        const refBonusElement = document.getElementById('refBonus');
        const refLinkElement = document.getElementById('refLink');
        
        if (refCountElement) refCountElement.textContent = this.referrals.length;
        if (refEarnedElement) refEarnedElement.textContent = this.refEarnings.toFixed(2) + ' TON';
        if (refBonusElement) refBonusElement.textContent = (this.refBonusRate * 100) + '%';
        if (refLinkElement) {
            refLinkElement.value = `https://t.me/your_bot?start=${this.referralCode}`;
        }
    }

    updateReferralsList() {
        const refList = document.getElementById('refList');
        if (!refList) return;
        
        if (this.referrals.length === 0) {
            refList.innerHTML = '<div class="no-refs">Пока нет приглашённых друзей</div>';
            return;
        }
        
        refList.innerHTML = this.referrals.map(ref => `
            <div class="ref-item">
                <span class="ref-code">${ref.code}</span>
                <span class="ref-date">${ref.date.toLocaleDateString()}</span>
                <span class="ref-earned">+${ref.earned.toFixed(2)} TON</span>
            </div>
        `).join('');
    }

    updateWalletDisplay() {
        const walletAddressElement = document.getElementById('walletAddress');
        const connectButton = document.getElementById('connectWallet');
        
        if (this.isConnected && this.wallet) {
            if (walletAddressElement) {
                walletAddressElement.textContent = 
                    this.wallet.account.address.slice(0, 8) + '...' + 
                    this.wallet.account.address.slice(-8);
            }
            
            if (connectButton) {
                connectButton.textContent = '✅ Кошелёк подключен';
                connectButton.disabled = true;
                connectButton.style.background = '#28a745';
            }
        }
    }

    updateTournamentsDisplay() {
        const tournamentsList = document.getElementById('tournamentsList');
        if (!tournamentsList) return;
        
        tournamentsList.innerHTML = this.tournaments.map(tournament => {
            const timeLeft = tournament.endTime - Date.now();
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            return `
                <div class="tournament-item tournament-${tournament.type}">
                    <h4>${tournament.name}</h4>
                    <div class="tournament-prize">🏆 ${tournament.prize}</div>
                    <div class="tournament-info">
                        <span>👥 ${tournament.players}/${tournament.maxPlayers}</span>
                        <span>🎫 ${tournament.entryFee} TON</span>
                        <span>⏰ ${days}д ${hours}ч</span>
                    </div>
                    <button onclick="game.joinTournament(${tournament.id})" 
                            ${this.balance < tournament.entryFee ? 'disabled' : ''}>
                        Участвовать
                    </button>
                </div>
            `;
        }).join('');
    }

    // ===== ТРАНЗАКЦИИ И ИСТОРИЯ =====
    addTransaction(type, amount, address = null) {
        const transaction = {
            id: Date.now() + Math.random(),
            type: type,
            amount: amount,
            address: address,
            date: new Date(),
            status: 'completed'
        };
        
        this.transactions.unshift(transaction);
        
        // Сохраняем в localStorage
        this.saveGameData();
        
        this.updateTransactionsDisplay();
    }

    addToHistory(result, winners, bets) {
        const historyItem = {
            round: this.roundNumber,
            multiplier: result.multiplier,
            winners: winners,
            totalBets: bets.length,
            totalAmount: bets.reduce((sum, bet) => sum + bet.amount, 0),
            timestamp: new Date(),
            mode: this.currentMode
        };
        
        this.gameHistory.unshift(historyItem);
        
        // Сохраняем только последние 50 игр
        if (this.gameHistory.length > 50) {
            this.gameHistory = this.gameHistory.slice(0, 50);
        }
        
        this.updateHistoryDisplay();
    }

    updateTransactionsDisplay() {
        const txList = document.getElementById('txList');
        if (!txList) return;
        
        const recentTransactions = this.transactions.slice(0, 10);
        
        txList.innerHTML = recentTransactions.map(tx => `
            <div class="tx-item tx-${tx.type}">
                <span class="tx-type">${this.getTransactionType(tx.type)}</span>
                <span class="tx-amount" style="color: ${tx.amount > 0 ? '#28a745' : '#dc3545'}">
                    ${tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)} TON
                </span>
                <span class="tx-time">${tx.date.toLocaleTimeString()}</span>
            </div>
        `).join('');
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        const recentHistory = this.gameHistory.slice(0, 10);
        
        historyList.innerHTML = recentHistory.map(game => `
            <div class="history-item ${game.multiplier > 0 ? 'win' : 'lose'}">
                <span>Раунд ${game.round}</span>
                <span>${game.multiplier > 0 ? game.multiplier + 'x' : 'Проигрыш'}</span>
                <span>${game.winners.length} поб.</span>
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
            'ref_earning': '👥 Реферальный доход',
            'jackpot': '🎊 Джекпот',
            'tournament_entry': '🏆 Взнос в турнир'
        };
        return types[type] || type;
    }

    // ===== СОХРАНЕНИЕ И ЗАГРУЗКА ДАННЫХ =====
    saveGameData() {
        const gameData = {
            balance: this.balance,
            userStats: this.userStats,
            referralCode: this.referralCode,
            referrals: this.referrals,
            refEarnings: this.refEarnings,
            transactions: this.transactions.slice(0, 50), // Сохраняем только последние 50
            gameHistory: this.gameHistory,
            currentBet: this.currentBet,
            currentMultiplier: this.currentMultiplier,
            currentMode: this.currentMode,
            lastSave: new Date()
        };
        
        try {
            localStorage.setItem('tonRouletteData', JSON.stringify(gameData));
        } catch (error) {
            console.warn('Failed to save game data:', error);
        }
    }

    loadGameData() {
        try {
            const saved = localStorage.getItem('tonRouletteData');
            if (saved) {
                const data = JSON.parse(saved);
                
                this.balance = data.balance || 0;
                this.userStats = data.userStats || this.userStats;
                this.referralCode = data.referralCode || this.generateReferralCode();
                this.referrals = data.referrals || [];
                this.refEarnings = data.refEarnings || 0;
                this.transactions = data.transactions || [];
                this.gameHistory = data.gameHistory || [];
                this.currentBet = data.currentBet || 1;
                this.currentMultiplier = data.currentMultiplier || 10;
                this.currentMode = data.currentMode || 'classic';
                
                console.log('Game data loaded successfully');
            }
        } catch (error) {
            console.warn('Failed to load game data:', error);
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
            case 'game':
                this.updateBetsList();
                this.updateOnlinePlayers();
                break;
        }
    }

    // ===== УВЕДОМЛЕНИЯ =====
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        // Авто-скрытие
        setTimeout(() => {
            notification.classList.add('hidden');
        }, type === 'error' ? 5000 : 3000);
        
        // Логирование в консоль
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    // ===== СИСТЕМНЫЕ ФУНКЦИИ =====
    resetGame() {
        if (confirm('Вы уверены, что хотите сбросить все данные игры?')) {
            localStorage.removeItem('tonRouletteData');
            location.reload();
        }
    }

    exportData() {
        const gameData = {
            balance: this.balance,
            userStats: this.userStats,
            transactions: this.transactions,
            gameHistory: this.gameHistory,
            referrals: this.referrals
        };
        
        const dataStr = JSON.stringify(gameData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `ton-roulette-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    // ===== ГОРЯЧИЕ КЛАВИШИ =====
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt + 1-4 для переключения вкладок
            if (e.altKey && e.key >= '1' && e.key <= '4') {
                const tabs = ['game', 'tournament', 'referral', 'wallet'];
                this.switchTab(tabs[parseInt(e.key) - 1]);
            }
            
            // Space для ставки
            if (e.code === 'Space' && this.isBettingPhase) {
                e.preventDefault();
                this.placeBet();
            }
        });
    }
}

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ HTML =====
let game;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    game = new UltimateTONRoulette();
    
    // Глобальные функции для HTML атрибутов
    window.game = game;
    
    // Отладка
    window.debugGame = () => {
        console.log('Game State:', game);
        game.balance += 100;
        game.updateDisplay();
        game.showNotification('💸 +100 TON (debug)', 'success');
    };
});

// Функции для вызова из HTML
function changeBet(amount) {
    if (game) game.changeBet(amount);
}

function setQuickBet(amount) {
    if (game) game.setQuickBet(amount);
}

function selectMultiplier(multiplier) {
    if (game) game.selectMultiplier(multiplier);
}

function placeBet() {
    if (game) game.placeBet();
}

function deposit(amount) {
    if (game) game.deposit(amount);
}

function withdraw() {
    if (game) game.withdraw();
}

function customDeposit() {
    const input = document.getElementById('customAmount');
    if (input && game) {
        const amount = parseFloat(input.value);
        if (amount && amount > 0) {
            game.deposit(amount);
            input.value = '';
        }
    }
}

function copyRefLink() {
    if (game) game.copyRefLink();
}

function joinTournament(tournamentId) {
    if (game) game.joinTournament(tournamentId);
}

function connectWallet() {
    if (game) game.connectWallet();
}

// Service Worker для оффлайн-работы (опционально)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
}

// Обработка ошибок
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Сохранение при закрытии
window.addEventListener('beforeunload', () => {
    if (game) {
        game.saveGameData();
    }
});

// Восстановление при возврате
window.addEventListener('pageshow', (event) => {
    if (event.persisted && game) {
        game.loadGameData();
        game.updateDisplay();
    }
});
