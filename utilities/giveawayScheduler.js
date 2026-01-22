const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { getActiveGiveaways, getGiveawayParticipants, deactivateGiveaway, getSettings } = require('./data/DataBase');

class GiveawayScheduler {
    constructor(client) {
        this.client = client;
        this.checkInterval = null;
        this.updateInterval = null;
        this.startScheduler();
    }

    startScheduler() {
        // Проверяем розыгрыши каждую минуту
        this.checkInterval = setInterval(() => {
            this.checkExpiredGiveaways();
        }, 60000); // 1 минута

        // Обновляем отсчет времени каждые 15 секунд
        this.updateInterval = setInterval(() => {
            this.updateGiveawayCountdowns();
        }, 15000); // 15 секунд

        console.log('Giveaway scheduler started');
    }

    // Функция для форматирования времени
    formatTimeRemaining(endDate) {
        const now = new Date();
        const end = new Date(endDate);
        const diff = end - now;

        if (diff <= 0) {
            return '**ЗАВЕРШЕН**';
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let timeString = '';
        if (days > 0) timeString += `${days}д `;
        if (hours > 0) timeString += `${hours}ч `;
        if (minutes > 0) timeString += `${minutes}м `;
        timeString += `${seconds}с`;

        return `**${timeString}**`;
    }

    async updateGiveawayCountdowns() {
        try {
            const activeGiveaways = await getActiveGiveaways();
            
            for (const giveaway of activeGiveaways) {
                if (giveaway.message_id) {
                    await this.updateGiveawayMessage(giveaway);
                }
            }
        } catch (error) {
            console.error('Ошибка при обновлении отсчета времени:', error);
        }
    }

    async updateGiveawayMessage(giveaway) {
        try {
            const settings = await getSettings();
            const giveawayNotificationsChannelId = settings?.channels?.giveawayNotifications || settings?.channels?.giveaways;
            
            if (!giveawayNotificationsChannelId) {
                console.log(`Розыгрыш ${giveaway.id}: канал уведомлений не настроен`);
                return;
            }

            const channel = this.client.channels.cache.get(giveawayNotificationsChannelId);
            if (!channel) {
                console.log(`Розыгрыш ${giveaway.id}: канал не найден`);
                return;
            }

            if (!giveaway.message_id) {
                console.log(`Розыгрыш ${giveaway.id}: ID сообщения не указан`);
                return;
            }

            try {
                const message = await channel.messages.fetch(giveaway.message_id);
                const embed = message.embeds[0];
                
                if (!embed) {
                    console.log(`Розыгрыш ${giveaway.id}: эмбед не найден в сообщении`);
                    return;
                }

                // Получаем текущее количество участников
                const participants = await getGiveawayParticipants(giveaway.id);
                const participantCount = participants.length;

                // Обновляем описание с живым отсчетом и количеством участников
                const timeRemaining = this.formatTimeRemaining(giveaway.end_date);
                let description = embed.description.replace(
                    /\*\*Дата окончания:\*\*.*?\n/,
                    `**Дата окончания:** ${new Date(giveaway.end_date).toLocaleString('ru-RU')} (${timeRemaining})\n`
                );
                
                // Обновляем количество участников
                description = description.replace(
                    /\*\*Участников:\*\* \d+\n/,
                    `**Участников:** ${participantCount}\n`
                );

                const newEmbed = EmbedBuilder.from(embed).setDescription(description);
                
                await message.edit({ embeds: [newEmbed] });
                console.log(`Розыгрыш ${giveaway.id}: обновлен успешно (участников: ${participantCount})`);

            } catch (fetchError) {
                if (fetchError.code === 10008) { // Unknown Message
                    console.log(`Розыгрыш ${giveaway.id}: сообщение удалено или недоступно, помечаем как неактивный`);
                    // Помечаем розыгрыш как неактивный, так как сообщение недоступно
                    try {
                        await deactivateGiveaway(giveaway.id);
                        console.log(`Розыгрыш ${giveaway.id}: помечен как неактивный`);
                    } catch (deactivateError) {
                        console.error(`Ошибка при деактивации розыгрыша ${giveaway.id}:`, deactivateError.message);
                    }
                } else {
                    console.log(`Розыгрыш ${giveaway.id}: ошибка при обновлении:`, fetchError.message);
                }
            }

        } catch (error) {
            console.error(`Критическая ошибка при обновлении розыгрыша ${giveaway.id}:`, error.message);
        }
    }

    async checkExpiredGiveaways() {
        try {
            const activeGiveaways = await getActiveGiveaways();
            const now = new Date();

            for (const giveaway of activeGiveaways) {
                const endDate = new Date(giveaway.end_date);
                
                if (endDate <= now) {
                    await this.endGiveaway(giveaway);
                }
            }
        } catch (error) {
            console.error('Ошибка при проверке розыгрышей:', error);
        }
    }

    async endGiveaway(giveaway) {
        try {
            console.log(`Завершаем розыгрыш ID: ${giveaway.id} - ${giveaway.prize}`);

            // Получаем участников
            const participants = await getGiveawayParticipants(giveaway.id);
            
            // Выбираем победителей
            const winners = this.selectWinners(participants, giveaway.spots);
            
            // Деактивируем розыгрыш
            await deactivateGiveaway(giveaway.id);
            
            // Отправляем сообщение о завершении
            await this.sendEndMessage(giveaway, participants, winners);
            
        } catch (error) {
            console.error(`Ошибка при завершении розыгрыша ${giveaway.id}:`, error);
        }
    }

    selectWinners(participants, spots) {
        if (participants.length === 0) {
            return [];
        }

        const shuffled = [...participants].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(spots, participants.length));
    }

    async sendEndMessage(giveaway, participants, winners) {
        try {
            const settings = await getSettings();
            const giveawayNotificationsChannelId = settings?.channels?.giveawayNotifications || settings?.channels?.giveaways;
            
            if (!giveawayNotificationsChannelId) {
                console.log('Канал уведомлений о розыгрышах не настроен');
                return;
            }

            const channel = this.client.channels.cache.get(giveawayNotificationsChannelId);
            if (!channel) {
                console.log('Канал уведомлений о розыгрышах не найден');
                return;
            }

            const embed = new EmbedBuilder()
                .setColor(winners.length > 0 ? 0x00FF00 : 0xFF0000)
                .setTitle('�� РОЗЫГРЫШ ЗАВЕРШЕН!')
                .setDescription(`**Приз:** ${giveaway.prize}\n` +
                    `**Участников:** ${participants.length}\n` +
                    `**Победителей:** ${winners.length}\n` +
                    `**Дата завершения:** ${new Date(giveaway.end_date).toLocaleString('ru-RU')}`);

            if (winners.length > 0) {
                const winnerMentions = winners.map(winner => `<@${winner.user_id}>`).join(', ');
                embed.addFields({
                    name: '🏆 ПОБЕДИТЕЛИ:',
                    value: winnerMentions,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '😔 Нет победителей',
                    value: 'К сожалению, никто не участвовал в розыгрыше.',
                    inline: false
                });
            }

            // Добавляем изображение, если оно есть
            if (giveaway.image) {
                embed.setImage(giveaway.image);
            }

            embed.setTimestamp()
                .setFooter({ text: `ID розыгрыша: ${giveaway.id}` });

            // Создаем неактивную кнопку в зависимости от типа розыгрыша
            const isBoosterGiveaway = giveaway.message_id && 
                (await channel.messages.fetch(giveaway.message_id).catch(() => null))?.embeds[0]?.footer?.text?.includes('Только для бустеров');
            
            const disabledButton = new ButtonBuilder()
                .setCustomId(isBoosterGiveaway ? 'join-booster-giveaway' : 'join-giveaway')
                .setLabel(isBoosterGiveaway ? '🚀 Розыгрыш завершен' : '🎉 Розыгрыш завершен')
                .setStyle(isBoosterGiveaway ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(true);

            const actionRow = new ActionRowBuilder().addComponents(disabledButton);

            // Если есть ID сообщения, обновляем его
            if (giveaway.message_id) {
                try {
                    const message = await channel.messages.fetch(giveaway.message_id);
                    await message.edit({
                        embeds: [embed],
                        components: [actionRow]
                    });
                } catch (error) {
                    console.log('Не удалось обновить сообщение розыгрыша, отправляем новое');
                    await channel.send({
                        content: winners.length > 0 ? `<@&1349493013293961348>` : '',
                        embeds: [embed],
                        components: [actionRow]
                    });
                }
            } else {
                await channel.send({
                    content: winners.length > 0 ? `<@&1349493013293961348>` : '',
                    embeds: [embed],
                    components: [actionRow]
                });
            }

        } catch (error) {
            console.error('Ошибка при отправке сообщения о завершении розыгрыша:', error);
        }
    }

    stopScheduler() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('Giveaway scheduler stopped');
    }
}

module.exports = GiveawayScheduler; 