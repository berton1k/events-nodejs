const { ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("confirm_participants")
        .setLabel("✅ Подтвердить")
        .setStyle(ButtonStyle.Success),

    /**
     * @param {ButtonInteraction} interaction
     * @param {Client} client
     * @param {string|null} eventId - ID события
     */
    execute: async (interaction, client, eventId) => {
        try {
            console.log('=== CONFIRM PARTICIPANTS BUTTON START ===');
            console.log('Button clicked:', interaction.customId);
            console.log('User:', interaction.user.tag);
            console.log('Event ID:', eventId);

            if (!eventId) {
                // Извлекаем ID события из customId кнопки
                const customIdParts = interaction.customId.split('_');
                if (customIdParts.length >= 3) {
                    // Убираем 'confirm' и 'participants' и берем все остальное как eventId
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

            // Показываем модальное окно для заполнения информации о победителе
            const winnerModal = interaction.client.modals.get("winner");
            if (winnerModal) {
                await interaction.showModal(winnerModal.data);
            } else {
                console.error("Модальное окно winner не найдено");
                await interaction.reply({
                    content: "❌ Ошибка: Модальное окно для заполнения информации о победителе не найдено.",
                    flags: [MessageFlags.Ephemeral]
                });
            }

            console.log('=== CONFIRM PARTICIPANTS BUTTON END ===');

        } catch (error) {
            console.error("=== ERROR IN CONFIRM PARTICIPANTS ===");
            console.error("Error:", error);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            
            try {
                await interaction.followUp({
                    content: "❌ Произошла ошибка при подтверждении списка.",
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (followUpError) {
                console.error("FollowUp error:", followUpError);
            }
        }
    }
}; 