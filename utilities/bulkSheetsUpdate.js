const { getEventParticipants, getEvents } = require('./data/DataBase');
const googleSheetsManager = require('./googleSheets');
const { log } = require('./data/utils');

class BulkSheetsUpdater {
    constructor() {
        this.googleSheets = googleSheetsManager;
    }

    // Обновить Google Sheets участниками конкретного события
    async updateEventParticipants(eventId, date = null) {
        try {
            log(`Начинаем обновление Google Sheets для события ${eventId}`);
            
            // Получаем участников события
            const participants = await getEventParticipants(eventId);
            
            if (participants.length === 0) {
                log(`Событие ${eventId} не имеет участников`);
                return { success: true, updated: 0, errors: [] };
            }

            const targetDate = date || this.googleSheets.getCurrentDate();
            const results = [];
            const errors = [];

            // Обновляем каждого участника
            for (const participant of participants) {
                try {
                    const success = await this.googleSheets.markParticipation(participant.username, targetDate);
                    results.push({
                        username: participant.username,
                        success: success
                    });
                    
                    if (!success) {
                        errors.push(`Не удалось обновить ${participant.username}`);
                    }
                } catch (error) {
                    errors.push(`Ошибка для ${participant.username}: ${error.message}`);
                }
            }

            const successCount = results.filter(r => r.success).length;
            log(`Обновление завершено. Успешно: ${successCount}/${participants.length}`);

            return {
                success: true,
                updated: successCount,
                total: participants.length,
                errors: errors
            };
        } catch (error) {
            log(`Ошибка при массовом обновлении: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Обновить Google Sheets всеми активными событиями
    async updateAllActiveEvents(date = null) {
        try {
            log('Начинаем обновление Google Sheets для всех активных событий');
            
            // Получаем все события
            const events = await getEvents();
            
            if (events.length === 0) {
                log('Нет активных событий для обновления');
                return { success: true, eventsUpdated: 0, totalParticipants: 0 };
            }

            const targetDate = date || this.googleSheets.getCurrentDate();
            let totalParticipants = 0;
            let totalErrors = 0;
            const eventResults = [];

            // Обновляем каждое событие
            for (const event of events) {
                try {
                    const result = await this.updateEventParticipants(event.id, targetDate);
                    eventResults.push({
                        eventId: event.id,
                        eventName: event.name,
                        ...result
                    });
                    
                    if (result.success) {
                        totalParticipants += result.updated;
                        totalErrors += result.errors.length;
                    }
                } catch (error) {
                    eventResults.push({
                        eventId: event.id,
                        eventName: event.name,
                        success: false,
                        error: error.message
                    });
                }
            }

            log(`Массовое обновление завершено. Событий: ${events.length}, Участников: ${totalParticipants}`);

            return {
                success: true,
                eventsUpdated: events.length,
                totalParticipants: totalParticipants,
                totalErrors: totalErrors,
                eventResults: eventResults
            };
        } catch (error) {
            log(`Ошибка при массовом обновлении всех событий: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Синхронизировать участников из базы данных с Google Sheets
    async syncParticipantsFromDatabase(date = null) {
        try {
            log('Начинаем синхронизацию участников из базы данных с Google Sheets');
            
            // Получаем всех участников из Google Sheets
            const sheetsParticipants = await this.googleSheets.getAllParticipants();
            log(`Найдено участников в Google Sheets: ${sheetsParticipants.length}`);

            // Получаем все события и их участников
            const events = await getEvents();
            const databaseParticipants = new Set();

            for (const event of events) {
                const participants = await getEventParticipants(event.id);
                participants.forEach(p => databaseParticipants.add(p.username));
            }

            const dbParticipantsArray = Array.from(databaseParticipants);
            log(`Найдено участников в базе данных: ${dbParticipantsArray.length}`);

            const targetDate = date || this.googleSheets.getCurrentDate();
            const results = [];
            const errors = [];

            // Обновляем участников, которых нет в Google Sheets
            for (const username of dbParticipantsArray) {
                if (!sheetsParticipants.includes(username)) {
                    try {
                        const success = await this.googleSheets.markParticipation(username, targetDate);
                        results.push({
                            username: username,
                            action: 'added',
                            success: success
                        });
                        
                        if (!success) {
                            errors.push(`Не удалось добавить ${username}`);
                        }
                    } catch (error) {
                        errors.push(`Ошибка для ${username}: ${error.message}`);
                    }
                }
            }

            const successCount = results.filter(r => r.success).length;
            log(`Синхронизация завершена. Добавлено: ${successCount}/${results.length}`);

            return {
                success: true,
                added: successCount,
                total: results.length,
                errors: errors,
                sheetsParticipants: sheetsParticipants.length,
                databaseParticipants: dbParticipantsArray.length
            };
        } catch (error) {
            log(`Ошибка при синхронизации: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Получить статистику синхронизации
    async getSyncStats() {
        try {
            const sheetsParticipants = await this.googleSheets.getAllParticipants();
            const events = await getEvents();
            const databaseParticipants = new Set();

            for (const event of events) {
                const participants = await getEventParticipants(event.id);
                participants.forEach(p => databaseParticipants.add(p.username));
            }

            const dbParticipantsArray = Array.from(databaseParticipants);
            const missingInSheets = dbParticipantsArray.filter(p => !sheetsParticipants.includes(p));
            const extraInSheets = sheetsParticipants.filter(p => !dbParticipantsArray.includes(p));

            return {
                sheetsParticipants: sheetsParticipants.length,
                databaseParticipants: dbParticipantsArray.length,
                missingInSheets: missingInSheets.length,
                extraInSheets: extraInSheets.length,
                missingList: missingInSheets,
                extraList: extraInSheets
            };
        } catch (error) {
            log(`Ошибка при получении статистики: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = BulkSheetsUpdater; 