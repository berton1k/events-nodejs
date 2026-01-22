const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, EmbedBuilder, MessageFlags } = require("discord.js");
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
        .setTitle("Редактировать информацию о победителях")
        .setCustomId("edit_winner_modal")
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
                    .setLabel("Статик победителей")
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

            // Создаем обновленный эмбед
            const updatedEmbed = new EmbedBuilder()
                .setTitle(`🏆 Победитель мероприятия ${eventName}`)
                .setDescription(`\nПоздравляем <@${winnerDiscordId}> со статиком **#${winnerStatic}**!\n\n💰 **Выигрыш**: ${prizeAmount}`)
                .setColor("#009dbf")
                .setImage(photoLink)
                .setFooter({
                    text: `${interaction.user.tag} | ${new Date().toLocaleString()}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            // Обновляем сообщение с победителем
            if (interaction.message) {
                await interaction.message.edit({
                    embeds: [updatedEmbed]
                });
            }

            await interaction.editReply({
                content: "✅ Информация о победителе успешно обновлена!"
            });

        } catch (error) {
            console.error("Ошибка при редактировании информации о победителе:", error);
            await interaction.editReply({
                content: "❌ Произошла ошибка при обработке вашего запроса."
            });
        }
    }
};
