const { sendDailyReport } = require("./data/dailyReport");
const { sendOrganizerReport } = require("./data/organizerReport");
const { getSettings } = require("./data/DataBase");

class Scheduler {
    constructor(client) {
        this.client = client;
        this.dailyReportInterval = null;
        this.isInitialized = false;
    }

    /**
     * Инициализирует планировщик
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Запускаем планировщик ежедневных отчетов
            this.scheduleDailyReport();
            
            this.isInitialized = true;
            console.log("Scheduler initialized successfully");
        } catch (error) {
            console.error("Error initializing scheduler:", error);
        }
    }

    /**
     * Планирует отправку ежедневного отчета в 23:59
     */
    scheduleDailyReport() {
        const now = new Date();
        const targetTime = new Date();
        targetTime.setHours(23, 59, 0, 0);

        // Если уже прошло 23:59, планируем на завтра
        if (now > targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }

        const timeUntilTarget = targetTime.getTime() - now.getTime();

        // Запускаем первый таймер
        setTimeout(() => {
            this.sendDailyReport();
            this.sendOrganizerReport();
            // Затем устанавливаем интервал на каждые 24 часа
            this.dailyReportInterval = setInterval(() => {
                this.sendDailyReport();
                this.sendOrganizerReport();
            }, 24 * 60 * 60 * 1000); // 24 часа в миллисекундах
        }, timeUntilTarget);

        console.log(`Daily report scheduled for ${targetTime.toLocaleString()}`);
    }

    /**
     * Отправляет ежедневный отчет
     */
    async sendDailyReport() {
        try {
            const settings = await getSettings();
            const reportChannelId = settings.channels?.dailyReport || "1350442007981719643"; // ID канала по умолчанию
            
            await sendDailyReport(this.client, reportChannelId);
        } catch (error) {
            console.error("Error in scheduled daily report:", error);
        }
    }

    /**
     * Отправляет ежедневный отчет организаторов
     */
    async sendOrganizerReport() {
        try {
            const settings = await getSettings();
            // Используем отдельный канал для отчетов организаторов, если настроен, иначе используем общий канал отчетов
            const reportChannelId = settings.channels?.organizerReport || settings.channels?.dailyReport || "1350442007981719643";
            
            await sendOrganizerReport(this.client, reportChannelId);
        } catch (error) {
            console.error("Error in scheduled organizer report:", error);
        }
    }

    /**
     * Останавливает планировщик
     */
    stop() {
        if (this.dailyReportInterval) {
            clearInterval(this.dailyReportInterval);
            this.dailyReportInterval = null;
        }
        this.isInitialized = false;
        console.log("Scheduler stopped");
    }

    /**
     * Перезапускает планировщик
     */
    async restart() {
        this.stop();
        await this.initialize();
    }
}

module.exports = Scheduler; 