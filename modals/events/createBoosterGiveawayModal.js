const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createGiveaway, getSettings, updateGiveawayMessageId } = require("../../utilities/data/DataBase");

// Функция для форматирования времени
function formatTimeRemaining(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) {
        return 'ЗАВЕРШЕН';
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

    return timeString;
}

module.exports = {
    data: new ModalBuilder()
        .setCustomId('modal-booster-giveaway-create')
        .setTitle('Создать розыгрыш для бустеров')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('booster_giveaway_prize')
                    .setLabel('Что разыгрывается?')
                    .setPlaceholder('Например: Discord Nitro, Steam ключ, 1000$ и т.д.')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('booster_giveaway_spots')
                    .setLabel('Количество мест')
                    .setPlaceholder('Например: 1, 3, 5')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('booster_giveaway_end_date')
                    .setLabel('Дата окончания (ДД.ММ.ГГГГ ЧЧ:ММ)')
                    .setPlaceholder('Например: 25.12.2024 20:00')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('booster_giveaway_image')
                    .setLabel('Ссылка на фото (необязательно)')
                    .setPlaceholder('Например: https://example.com/image.jpg')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
            )
        ),
    async execute(interaction) {
        const prize = interaction.fields.getTextInputValue('booster_giveaway_prize');
        const spots = interaction.fields.getTextInputValue('booster_giveaway_spots');
        const endDate = interaction.fields.getTextInputValue('booster_giveaway_end_date');
        const imageUrl = interaction.fields.getTextInputValue('booster_giveaway_image');
        
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // Проверяем корректность количества мест
        const spotsNumber = parseInt(spots);
        if (isNaN(spotsNumber) || spotsNumber <= 0) {
            await interaction.editReply({
                content: 'Ошибка: количество мест должно быть положительным числом.'
            });
            return;
        }

        // Проверяем корректность даты
        const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})\s(\d{2}):(\d{2})$/;
        const match = endDate.match(dateRegex);
        
        if (!match) {
            await interaction.editReply({
                content: 'Ошибка: неправильный формат даты. Используйте формат ДД.ММ.ГГГГ ЧЧ:ММ (например: 25.12.2024 20:00)'
            });
            return;
        }

        const [, day, month, year, hour, minute] = match;
        const endDateTime = new Date(year, month - 1, day, hour, minute);
        
        if (endDateTime <= new Date()) {
            await interaction.editReply({
                content: 'Ошибка: дата окончания должна быть в будущем.'
            });
            return;
        }

        try {
            // Создаем розыгрыш в базе данных
            const giveawayId = await createGiveaway(prize, spotsNumber, endDateTime.toISOString(), interaction.member.id, imageUrl || null);
            
            // Получаем настройки для отправки уведомления
            const settings = await getSettings();
            const giveawayNotificationsChannelId = settings?.channels?.giveawayNotifications || settings?.channels?.giveaways;
            
            if (giveawayNotificationsChannelId) {
                const giveawayNotificationsChannel = interaction.guild.channels.cache.get(giveawayNotificationsChannelId);
                
                if (giveawayNotificationsChannel) {
                    // Отправляем уведомление о розыгрыше для бустеров
                    const embed = new EmbedBuilder()
                        .setColor(0x9B59B6) // Фиолетовый цвет для бустеров
                        .setTitle('🚀 РОЗЫГРЫШ ДЛЯ БУСТЕРОВ!')
                        .setDescription(`**Приз:** ${prize}\n` +
                            `**Количество мест:** ${spotsNumber}\n` +
                            `**Дата окончания:** ${endDate} (**${formatTimeRemaining(endDateTime.toISOString())}**)\n` +
                            `**Участников:** 0\n` +
                            `**Создал:** <@${interaction.member.id}>\n` +
                            `**Участники:** Только бустеры сервера\n\n` +
                            `🎊 Розыгрыш начался! Удачи всем бустерам!`)
                        .setTimestamp()
                        .setFooter({ text: `ID розыгрыша: ${giveawayId} | Только для бустеров` });
                    
                    // Добавляем изображение, если оно указано
                    if (imageUrl && imageUrl.trim() !== '') {
                        embed.setImage(imageUrl);
                    }
                    
                    // Создаем кнопку участия для бустеров
                    const joinButton = new ButtonBuilder()
                        .setCustomId('join-booster-giveaway')
                        .setLabel('🚀')
                        .setStyle(ButtonStyle.Success);

                    const actionRow = new ActionRowBuilder().addComponents(joinButton);

                    const message = await giveawayNotificationsChannel.send({
                        content: '<@&1351759870877241394>',
                        embeds: [embed],
                        components: [actionRow]
                    });

                    // Сохраняем ID сообщения в базе данных
                    await updateGiveawayMessageId(giveawayId, message.id);
                }
            }

            await interaction.editReply({
                content: `Розыгрыш для бустеров "${prize}" успешно создан! ID: ${giveawayId}`
            });
            
        } catch (error) {
            console.error('Ошибка при создании розыгрыша для бустеров:', error);
            await interaction.editReply({
                content: 'Произошла ошибка при создании розыгрыша. Попробуйте еще раз.'
            });
        }
    }
}; 