// Wallet and payment functionality
class WalletManager {
    constructor() {
        this.tonPrice = 6.5; // Current TON price in USD for demo
    }

    showDepositMenu() {
        const amount = prompt('Введите сумму для пополнения (TON):');
        if (amount && !isNaN(amount) && amount > 0) {
            this.simulateDeposit(parseFloat(amount));
        }
    }

    simulateDeposit(amount) {
        // In real app, this would integrate with TON wallet
        app.showNotification(`Имитация пополнения на ${amount} TON...`, 'info');
        
        // Simulate transaction delay
        setTimeout(() => {
            app.updateBalance(amount);
            app.showNotification(`✅ Баланс пополнен на ${amount} TON!`, 'success');
        }, 2000);
    }

    showWithdrawMenu() {
        const amount = prompt('Введите сумму для вывода (TON):');
        if (amount && !isNaN(amount) && amount > 0) {
            if (amount <= app.balance) {
                this.simulateWithdrawal(parseFloat(amount));
            } else {
                app.showNotification('Недостаточно средств!', 'error');
            }
        }
    }

    simulateWithdrawal(amount) {
        app.showNotification(`Запрос на вывод ${amount} TON...`, 'info');
        
        setTimeout(() => {
            app.updateBalance(-amount);
            app.showNotification(`✅ Запрос на вывод ${amount} TON принят! Обработка 1-2 часа.`, 'success');
        }, 1000);
    }

    showNFTGifts() {
        app.showNotification('Функция NFT-подарков в разработке...', 'info');
        // Integration with Telegram Fragment would go here
    }
}

const walletManager = new WalletManager();
