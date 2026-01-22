const { EmbedBuilder } = require("discord.js");
const { getEvents, getEventParticipantsByDate } = require("./DataBase");
const { formatJoinDate } = require("./utils");

/**
 * Генерирует ежедневный отчет о событиях и их участниках
 * @param {Client} client - Discord клиент
 * @returns {Promise<EmbedBuilder>} - Embed с отчетом
 */
async function generateDailyReport(client) {
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
                .setTitle("📊 Ежедневный отчет о событиях")
                .setDescription("События не найдены.")
                .setColor("#ff6b6b")
                .setTimestamp()
                .setFooter({ text: `Сформирован ${todayString}` });
        }

        const embed = new EmbedBuilder()
            .setTitle("📊 Ежедневный отчет о событиях")
            .setDescription(`Отчет за ${todayString}`)
            .setColor("#4ecdc4")
            .setTimestamp()
            .setFooter({ text: `Сформирован ${todayString}` });

        let totalParticipants = 0;
        let activeEvents = 0;
        
        // Создаем Map для подсчета событий каждого участника
        const participantEventCount = new Map();
        const eventParticipants = new Map();
        const eventsWithParticipants = [];

        // Проверяем все события на наличие участников за сегодня
        for (const event of allEvents) {
            // Получаем участников только за сегодня
            const participants = await getEventParticipantsByDate(event.id, today);
            
            if (participants.length > 0) {
                activeEvents++;
                totalParticipants += participants.length;
                eventParticipants.set(event.id, participants);
                eventsWithParticipants.push(event);
                
                // Подсчитываем события для каждого участника
                for (const participant of participants) {
                    const currentCount = participantEventCount.get(participant.username) || 0;
                    participantEventCount.set(participant.username, currentCount + 1);
                }
            }
        }

        // Если нет событий с участниками за сегодня, возвращаем пустой отчет
        if (eventsWithParticipants.length === 0) {
            return new EmbedBuilder()
                .setTitle("📊 Ежедневный отчет о событиях")
                .setDescription("Сегодня не было активных событий с участниками.")
                .setColor("#ff6b6b")
                .setTimestamp()
                .setFooter({ text: `Сформирован ${todayString}` });
        }

        // Добавляем информацию о событиях
        for (const event of eventsWithParticipants) {
            const participants = eventParticipants.get(event.id);
            
            if (participants && participants.length > 0) {
                const participantList = participants
                    .map(p => {
                        // Форматируем тег участника
                        let participantTag = p.username;
                        if (/^\d+$/.test(p.user_id)) {
                            // Если это Discord ID, создаем тег
                            participantTag = `<@${p.user_id}>`;
                        } else if (!p.username.startsWith('<@') && !p.username.endsWith('>')) {
                            // Если это не тег и не ID, оставляем как есть
                            participantTag = p.username;
                        }
                        return `• ${participantTag} (${formatJoinDate(p.join_date)})`;
                    })
                    .join('\n');
                
                const participantCount = participants.length;
                
                // Форматируем время создания события
                const eventTime = event.created_at ? 
                    new Date(event.created_at).toLocaleString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }) : 'Не указано';
                
                embed.addFields({
                    name: `🎯 ${event.name} (${participantCount} участников) - ${eventTime}`,
                    value: participantList.length > 1024 
                        ? `${participantList.substring(0, 1021)}...` 
                        : participantList || "Нет участников",
                    inline: false
                });
            }
        }

        // Создаем статистику по участникам
        const participantStats = Array.from(participantEventCount.entries())
            .sort((a, b) => b[1] - a[1]) // Сортируем по убыванию количества событий
            .map(([username, count]) => {
                // Форматируем тег участника для статистики
                let participantTag = username;
                // Проверяем, есть ли у нас user_id для этого участника
                const participant = Array.from(eventParticipants.values())
                    .flat()
                    .find(p => p.username === username);
                
                if (participant && /^\d+$/.test(participant.user_id)) {
                    participantTag = `<@${participant.user_id}>`;
                } else if (!username.startsWith('<@') && !username.endsWith('>')) {
                    participantTag = username;
                }
                return `• ${participantTag}: ${count} событий`;
            })
            .join('\n');

        // Добавляем статистику участников
        if (participantStats) {
            embed.addFields({
                name: "👥 Статистика участников",
                value: participantStats.length > 1024 
                    ? `${participantStats.substring(0, 1021)}...` 
                    : participantStats,
                inline: false
            });
        }

        // Добавляем общую статистику
        const mostActiveParticipant = participantEventCount.size > 0 ? 
            Array.from(participantEventCount.entries()).sort((a, b) => b[1] - a[1])[0] : null;
        
        let mostActiveTag = 'Нет';
        if (mostActiveParticipant) {
            const [username, count] = mostActiveParticipant;
            // Форматируем тег самого активного участника
            const participant = Array.from(eventParticipants.values())
                .flat()
                .find(p => p.username === username);
            
            if (participant && /^\d+$/.test(participant.user_id)) {
                mostActiveTag = `<@${participant.user_id}>`;
            } else if (!username.startsWith('<@') && !username.endsWith('>')) {
                mostActiveTag = username;
            } else {
                mostActiveTag = username;
            }
        }
        
        embed.addFields({
            name: "📈 Сводка",
            value: `• Активных событий: ${activeEvents}\n• Всего участников: ${totalParticipants}\n• Среднее на событие: ${activeEvents > 0 ? (totalParticipants / activeEvents).toFixed(1) : 0}\n• Самый активный участник: ${mostActiveTag}`,
            inline: false
        });

        return embed;
    } catch (error) {
        console.error("Error generating daily report:", error);
        return new EmbedBuilder()
            .setTitle("❌ Ошибка генерации отчета")
            .setDescription("Произошла ошибка при создании ежедневного отчета.")
            .setColor("#ff6b6b")
            .setTimestamp();
    }
}

/**
 * Отправляет ежедневный отчет в указанный канал
 * @param {Client} client - Discord клиент
 * @param {string} channelId - ID канала для отправки отчета
 */
async function sendDailyReport(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            console.error(`Channel with ID ${channelId} not found`);
            return;
        }

        const reportEmbed = await generateDailyReport(client);
        
        await channel.send({
            content: "📊 **Ежедневный отчет о событиях** - Вот сводка сегодняшних событий и участников:",
            embeds: [reportEmbed]
        });

        console.log(`Daily report sent to channel ${channelId}`);
    } catch (error) {
        console.error("Error sending daily report:", error);
    }
}

module.exports = {
    generateDailyReport,
    sendDailyReport
}; 