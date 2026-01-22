const { cleanupOldLogs } = require('./data/logging');
const { log } = require('./data/utils');

class LogCleanupScheduler {
    constructor(client) {
        this.client = client;
        this.cleanupInterval = null;
        this.cleanupDays = 30; // По умолчанию очищаем логи старше 30 дней
        this.isInitialized = false;
    }

    // Инициализация планировщика
    async initialize() {
        try {
            // Запускаем очистку каждый день в 3:00 утра
            this.scheduleDailyCleanup();
            
            // Запускаем первую очистку через 1 час после запуска
            setTimeout(() => {
                this.performCleanup();
            }, 60 * 60 * 1000);
            
            this.isInitialized = true;
            log('Log cleanup scheduler initialized');
        } catch (error) {
            log(`Error initializing log cleanup scheduler: ${error.message}`);
        }
    }

    // Планирование ежедневной очистки
    scheduleDailyCleanup() {
        const now = new Date();
        const nextCleanup = new Date();
        
        // Устанавливаем время на 3:00 утра
        nextCleanup.setHours(3, 0, 0, 0);
        
        // Если уже прошло 3:00, планируем на завтра
        if (now >= nextCleanup) {
            nextCleanup.setDate(nextCleanup.getDate() + 1);
        }
        
        const timeUntilCleanup = nextCleanup.getTime() - now.getTime();
        
        // Планируем первую очистку
        setTimeout(() => {
            this.performCleanup();
            // Затем планируем повторную очистку каждые 24 часа
            this.cleanupInterval = setInterval(() => {
                this.performCleanup();
            }, 24 * 60 * 60 * 1000);
        }, timeUntilCleanup);
        
        log(`Next log cleanup scheduled for ${nextCleanup.toLocaleString()}`);
    }

    // Выполнение очистки
    async performCleanup() {
        try {
            log('Starting scheduled log cleanup...');
            const deletedCount = await cleanupOldLogs(this.cleanupDays);
            log(`Scheduled log cleanup completed. Deleted ${deletedCount} old entries.`);
        } catch (error) {
            log(`Error during scheduled log cleanup: ${error.message}`);
        }
    }

    // Ручная очистка с указанием количества дней
    async manualCleanup(days) {
        try {
            log(`Starting manual log cleanup for logs older than ${days} days...`);
            const deletedCount = await cleanupOldLogs(days);
            log(`Manual log cleanup completed. Deleted ${deletedCount} old entries.`);
            return deletedCount;
        } catch (error) {
            log(`Error during manual log cleanup: ${error.message}`);
            throw error;
        }
    }

    // Остановка планировщика
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            log('Log cleanup scheduler stopped');
        }
    }

    // Получение статуса планировщика
    getStatus() {
        return {
            isRunning: this.isInitialized && (this.cleanupInterval !== null || this.isInitialized),
            cleanupDays: this.cleanupDays,
            nextCleanup: this.getNextCleanupTime()
        };
    }

    // Получение времени следующей очистки
    getNextCleanupTime() {
        if (!this.cleanupInterval) {
            return null;
        }
        
        const now = new Date();
        const nextCleanup = new Date();
        nextCleanup.setHours(3, 0, 0, 0);
        
        if (now >= nextCleanup) {
            nextCleanup.setDate(nextCleanup.getDate() + 1);
        }
        
        return nextCleanup;
    }

    // Изменение настроек очистки
    updateSettings(cleanupDays) {
        this.cleanupDays = cleanupDays;
        log(`Log cleanup settings updated: ${cleanupDays} days`);
    }
}

module.exports = LogCleanupScheduler;
