const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("remove_participants")
        .setLabel("🗑️ Удалить из списка")
        .setStyle(ButtonStyle.Danger),

    /**
     * @param {ButtonInteraction} interaction
     * @param {Client} client
     * @param {string|null} eventId - ID события
     */
    execute: async (interaction, client, eventId) => {
        try {
            console.log('=== REMOVE PARTICIPANTS BUTTON START ===');
            console.log('Button clicked:', interaction.customId);
            console.log('User:', interaction.user.tag);
            console.log('Event ID:', eventId);
            
            if (!eventId) {
                // Извлекаем ID события из customId кнопки
                const customIdParts = interaction.customId.split('_');
                if (customIdParts.length >= 3) {
                    // Убираем 'remove' и 'participants' и берем все остальное как eventId
                    eventId = customIdParts.slice(2).join('_');
                } else {
                    console.error('Invalid customId format:', interaction.customId);
                    await interaction.reply({
                        content: "❌ Ошибка: не удалось определить ID события.",
                        flags: [MessageFlags.Ephemeral]
                    });
                    return;
                }
            }
            
            console.log('Extracted eventId:', eventId);

            // Создаем модальное окно для ввода номеров участников
            const modal = new ModalBuilder()
                .setCustomId(`remove_participants_modal_${eventId}`)
                .setTitle('Удаление участников из списка');

            const numbersInput = new TextInputBuilder()
                .setCustomId('participant_numbers')
                .setLabel('Номера участников для удаления')
                .setPlaceholder('Введите номера через запятую (например: 1, 3, 5)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const firstActionRow = new ActionRowBuilder().addComponents(numbersInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
            console.log('Modal shown successfully');

            console.log('=== REMOVE PARTICIPANTS BUTTON END ===');

        } catch (error) {
            console.error("=== ERROR IN REMOVE PARTICIPANTS ===");
            console.error("Error:", error);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            
            try {
                await interaction.followUp({
                    content: "❌ Произошла ошибка при открытии формы удаления.",
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (followUpError) {
                console.error("FollowUp error:", followUpError);
            }
        }
    }
}; 