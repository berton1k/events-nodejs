const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, EmbedBuilder, MessageFlags, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getSettingByKey, clearEventParticipants } = require("../../utilities/data/DataBase");
const axios = require("axios");

const isImageUrl = async (url) => {
    try {
        // Проверяем протокол URL
        const urlObj = new URL(url);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return false;
        }
        
        const response = await axios.head(url);
        return response.headers["content-type"].startsWith("image/");
    } catch (err) {
        return false;
    }
};

module.exports = {
    data: new ModalBuilder()
        .setTitle("Победители мероприятия")
        .setCustomId("winner")
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("event_name")
                    .setLabel("Название МП")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Введите название мероприятия")
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("winner_static")
                    .setLabel("Статики победителей")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Введите статик ID победителей")
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("winner_discord_id")
                    .setLabel("Discord ID победителей")
                    .setRequired(false)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Введите Discord ID победителей")
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("prize_amount")
                    .setLabel("Сколько выиграли")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Введите сумму выигрыша")
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("photo_link")
                    .setLabel("Ссылка на фото")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Введите ссылку на изображение")
            )
        ),

    /**
     * @param {ModalSubmitInteraction} interaction
     */
    execute: async (interaction) => {
        try {
            await interaction.deferReply({
                flags: [MessageFlags.Ephemeral]
            });

            const eventName = interaction.fields.getTextInputValue("event_name");
            const winnerStatic = interaction.fields.getTextInputValue("winner_static");
            const winnerDiscordId = interaction.fields.getTextInputValue("winner_discord_id");
            const prizeAmount = interaction.fields.getTextInputValue("prize_amount");
            const photoLink = interaction.fields.getTextInputValue("photo_link");

            // Проверяем ссылку на изображение
            if (!(await isImageUrl(photoLink))) {
                return await interaction.editReply({
                    content: "❌ Неверная ссылка на изображение. Убедитесь, что ссылка ведет на изображение."
                });
            }

            // Обрабатываем Discord ID - если не указан, используем пустую строку
            let discordMentions = "";
            if (winnerDiscordId && winnerDiscordId.trim()) {
                // Разбиваем ID по запятой и создаем упоминания
                const discordIds = winnerDiscordId.split(',').map(id => id.trim()).filter(id => id);
                if (discordIds.length > 0) {
                    discordMentions = discordIds.map(id => `<@${id}>`).join(' ');
                }
            }

            // Очищаем участников из базы данных
            const eventId = interaction.message.components[0]?.components[0]?.customId?.split('_').slice(2).join('_');
            if (eventId) {
                console.log('Clearing participants for event:', eventId);
                await clearEventParticipants(eventId);
                console.log('Participants cleared successfully');
            }

            // Создаем эмбед с информацией о победителе
            const embed = new EmbedBuilder()
                .setTitle(`🏆 Победители мероприятия ${eventName}`)
                .setDescription(`\nПоздравляем ${discordMentions} со статиками **#${winnerStatic}**!\n\n💰 **Выигрыш**: ${prizeAmount}`)
                .setColor("#009dbf")
                .setImage(photoLink)
                .setFooter({
                    text: `${interaction.user.tag} | ${new Date().toLocaleString()}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            // Получаем канал для публикации победителей из настроек
            const settingsData = await getSettingByKey("channels");
            let channels = {};
            if (settingsData) {
                try {
                    channels = JSON.parse(settingsData);
                } catch (e) {
                    channels = {};
                }
            }

            const winnersChannelId = channels.winners;
            
            if (!winnersChannelId) {
                return await interaction.editReply({
                    content: "❌ Ошибка: Канал для публикации победителей не настроен. Используйте `/settings setchannel` для настройки канала 'Победители мероприятий'."
                });
            }

            const winnersChannel = await interaction.guild.channels.fetch(winnersChannelId).catch(() => null);
            
            if (!winnersChannel) {
                return await interaction.editReply({
                    content: "❌ Ошибка: Не удалось найти канал для публикации победителей. Проверьте настройки каналов."
                });
            }

            // Отправляем информацию о победителе в канал
            const winnerMessage = await winnersChannel.send({ embeds: [embed] });

            // Создаем кнопку редактирования
            const editButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`edit_winner_${winnerMessage.id}`)
                    .setLabel('✏️ Редактировать')
                    .setStyle(ButtonStyle.Primary)
            );

            // Добавляем кнопку редактирования к сообщению
            await winnerMessage.edit({ 
                embeds: [embed], 
                components: [editButton] 
            });

            // Обновляем исходное сообщение - убираем кнопки и меняем эмбед
            if (interaction.message) {
                const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
                originalEmbed.setTitle('✅ Список участников подтвержден');
                originalEmbed.setColor("#43B581");
                originalEmbed.setTimestamp();

                await interaction.message.edit({
                    embeds: [originalEmbed],
                    components: []
                });
            }

            await interaction.editReply({
                content: "✅ Информация о победителе успешно опубликована!"
            });

        } catch (error) {
            console.error("Ошибка при обработке модального окна победителя:", error);
            await interaction.editReply({
                content: "❌ Произошла ошибка при обработке вашего запроса."
            });
        }
    }
}; 
