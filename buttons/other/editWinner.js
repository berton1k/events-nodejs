const { ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("edit_winner")
        .setLabel("✏️ Редактировать")
        .setStyle(ButtonStyle.Primary),

    /**
     * @param {ButtonInteraction} interaction
     * @param {Client} client
     */
    execute: async (interaction, client) => {
        try {
            console.log('=== EDIT WINNER BUTTON START ===');
            
            // Извлекаем ID сообщения из customId кнопки
            const customIdParts = interaction.customId.split('_');
            const messageId = customIdParts[2];
            
            if (!messageId) {
                await interaction.reply({
                    content: "❌ Ошибка: не удалось определить ID сообщения для редактирования.",
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Получаем текущий эмбед
            const currentEmbed = interaction.message.embeds[0];
            if (!currentEmbed) {
                await interaction.reply({
                    content: "❌ Ошибка: не удалось найти эмбед для редактирования.",
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Создаем модальное окно для редактирования
            const editModal = new ModalBuilder()
                .setTitle("Редактировать информацию о победителе")
                .setCustomId(`edit_winner_modal_${messageId}`)
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("event_name")
                            .setLabel("Название МП")
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                            .setValue(currentEmbed.title.replace('🏆 Победитель мероприятия ', '') || '')
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("winner_static")
                            .setLabel("Статик победителя")
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                            .setValue(currentEmbed.description.match(/#(\d+)/)?.[1] || '')
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("winner_discord_id")
                            .setLabel("Discord ID победителя")
                            .setRequired(false)
                            .setStyle(TextInputStyle.Short)
                            .setValue(currentEmbed.description.match(/<@(\d+)>/)?.[1] || '')
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("prize_amount")
                            .setLabel("Сколько выиграл")
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                            .setValue(currentEmbed.description.match(/\*\*Выигрыш\*\*: (.+)/)?.[1] || '')
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("photo_link")
                            .setLabel("Ссылка на фото")
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                            .setValue(currentEmbed.image?.url || '')
                    )
                );

            await interaction.showModal(editModal);
            console.log('=== EDIT WINNER BUTTON END ===');

        } catch (error) {
            console.error("=== ERROR IN EDIT WINNER BUTTON ===");
            console.error("Error:", error);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            
            try {
                await interaction.followUp({
                    content: "❌ Произошла ошибка при попытке редактирования.",
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (followUpError) {
                console.error("FollowUp error:", followUpError);
            }
        }
    }
};
