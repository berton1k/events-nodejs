const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { removeEventParticipant, getEventParticipants } = require("../../utilities/data/DataBase");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("leave_event")
        .setLabel("❌ Выйти из участия")
        .setStyle(ButtonStyle.Secondary),

    /**
     * @param {ButtonInteraction} interaction
     * @param {Client} client
     * @param {string|null} eventId - ID события (указывается при создании кнопки)
     */
    execute: async (interaction, client, eventId) => {
        try {
            console.log('=== LEAVE EVENT BUTTON START ===');
            console.log('Button clicked:', interaction.customId);
            console.log('User:', interaction.user.tag);
            console.log('Event ID from args:', eventId);
            
            await interaction.deferUpdate();
            console.log('Deferred update successfully');

            if (!eventId) {
                // Извлекаем ID события из customId кнопки
                const customIdParts = interaction.customId.split('_');
                eventId = customIdParts.slice(2).join('_');
            }

            const userId = interaction.user.id;

            // Удаляем участника
            await removeEventParticipant(eventId, userId);

            // Получаем обновленный список участников
            const participants = await getEventParticipants(eventId);

            // Обновляем сообщение с новым списком участников
            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            
            // Создаем список участников с тегами
            let participantsList;
            if (participants.length > 0) {
                participantsList = participants.map(p => `<@${p.user_id}>`).join(', ');
            } else {
                participantsList = 'Пока нет участников';
            }

            // Находим поле с участниками или создаем новое
            const existingFields = embed.data.fields || [];
            const participantsFieldIndex = existingFields.findIndex(field => field.name === '👥 Участники');
            
            if (participantsFieldIndex !== -1) {
                // Обновляем существующее поле
                existingFields[participantsFieldIndex].value = participantsList;
                existingFields[participantsFieldIndex].inline = false;
            } else {
                // Добавляем новое поле
                existingFields.push({
                    name: '👥 Участники',
                    value: participantsList,
                    inline: false
                });
            }

            embed.setFields(existingFields);

            await interaction.message.edit({
                embeds: [embed]
            });

            await interaction.followUp({
                content: "❌ Вы вышли из участия в событии!",
                flags: [MessageFlags.Ephemeral]
            });

            console.log('=== LEAVE EVENT BUTTON END ===');

        } catch (error) {
            console.error("=== ERROR IN LEAVE EVENT BUTTON ===");
            console.error("Error:", error);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            
            try {
                await interaction.followUp({
                    content: "❌ Произошла ошибка при выходе из участия.",
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (followUpError) {
                console.error("FollowUp error:", followUpError);
            }
        }
    }
}; 