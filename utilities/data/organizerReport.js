const { EmbedBuilder } = require("discord.js");
const { getEvents, getEventParticipantsByDate } = require("./DataBase");

/**
 * Генерирует ежедневный отчет о событиях и их организаторах
 * @param {Client} client - Discord клиент
 * @returns {Promise<EmbedBuilder>} - Embed с отчетом
 */
async function generateOrganizerReport(client) {
    try {
        const today = new Date();
        const todayString = today.toLocaleString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Получаем все события (не только созданные сегодня)
        const allEvents = await getEvents();
        
        if (allEvents.length === 0) {
            return new EmbedBuilder()
                .setTitle("👤 Ежедневный отчет организаторов")
                .setDescription("События на сегодня не найдены.")
                .setColor("#ff6b6b")
                .setTimestamp()
                .setFooter({ text: `Сформирован ${todayString}` });
        }

        const embed = new EmbedBuilder()
            .setTitle("👤 Ежедневный отчет организаторов")
            .setDescription(`Отчет за ${todayString}`)
            .setColor("#ff9ff3")
            .setTimestamp()
            .setFooter({ text: `Сформирован ${todayString}` });

        let totalEvents = 0;
        let eventsWithOrganizers = 0;
        
        // Создаем Map для подсчета событий каждого организатора
        const organizerEventCount = new Map();
        const organizerEvents = new Map();
        const eventsWithParticipants = [];

        // Собираем данные о событиях с участниками за сегодня
        for (const event of allEvents) {
            // Получаем участников только за сегодня
            const participants = await getEventParticipantsByDate(event.id, today);
            
            if (participants.length > 0) {
                totalEvents++;
                eventsWithParticipants.push(event);
                
                if (event.organizer) {
                    eventsWithOrganizers++;
                    const currentCount = organizerEventCount.get(event.organizer) || 0;
                    organizerEventCount.set(event.organizer, currentCount + 1);
                    
                    if (!organizerEvents.has(event.organizer)) {
                        organizerEvents.set(event.organizer, []);
                    }
                    organizerEvents.get(event.organizer).push({
                        name: event.name,
                        participants: participants.length,
                        time: event.created_at ? 
                            new Date(event.created_at).toLocaleString('ru-RU', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            }) : 'Не указано'
                    });
                }
            }
        }

        // Если нет событий с участниками за сегодня, возвращаем пустой отчет
        if (eventsWithParticipants.length === 0) {
            return new EmbedBuilder()
                .setTitle("👤 Ежедневный отчет организаторов")
                .setDescription("Сегодня не было активных событий с участниками.")
                .setColor("#ff6b6b")
                .setTimestamp()
                .setFooter({ text: `Сформирован ${todayString}` });
        }

        // Добавляем информацию об организаторах
        for (const [organizer, events] of organizerEvents) {
            const eventList = events
                .map(e => `• ${e.name} (${e.participants} участников) - ${e.time}`)
                .join('\n');
            
            embed.addFields({
                name: `👤 ${organizer} (${events.length} событий)`,
                value: eventList.length > 1024 
                    ? `${eventList.substring(0, 1021)}...` 
                    : eventList,
                inline: false
            });
        }

        // Добавляем общую статистику
        const mostActiveOrganizer = organizerEventCount.size > 0 ? 
            Array.from(organizerEventCount.entries()).sort((a, b) => b[1] - a[1])[0] : null;
        
        const mostActiveName = mostActiveOrganizer ? mostActiveOrganizer[0] : 'Нет';
        
        embed.addFields({
            name: "📈 Сводка",
            value: `• Всего событий: ${totalEvents}\n• Событий с организаторами: ${eventsWithOrganizers}\n• Всего организаторов: ${organizerEventCount.size}\n• Самый активный организатор: ${mostActiveName}`,
            inline: false
        });

        return embed;
    } catch (error) {
        console.error("Error generating organizer report:", error);
        return new EmbedBuilder()
            .setTitle("❌ Ошибка генерации отчета")
            .setDescription("Произошла ошибка при создании отчета организаторов.")
            .setColor("#ff6b6b")
            .setTimestamp();
    }
}

/**
 * Отправляет ежедневный отчет организаторов в указанный канал
 * @param {Client} client - Discord клиент
 * @param {string} channelId - ID канала для отправки отчета
 */
async function sendOrganizerReport(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            console.error(`Channel with ID ${channelId} not found`);
            return;
        }

        const reportEmbed = await generateOrganizerReport(client);
        
        await channel.send({
            content: "👤 **Ежедневный отчет организаторов** - Вот сводка сегодняшних событий и их организаторов:",
            embeds: [reportEmbed]
        });

        console.log(`Organizer report sent to channel ${channelId}`);
    } catch (error) {
        console.error("Error sending organizer report:", error);
    }
}

module.exports = {
    generateOrganizerReport,
    sendOrganizerReport
};