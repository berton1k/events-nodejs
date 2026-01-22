const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { addEventParticipant, isUserParticipating, getEventParticipants } = require("../../utilities/data/DataBase");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("participate")
        .setLabel("✅ Участвую")
        .setStyle(ButtonStyle.Success),

    /**
     * @param {ButtonInteraction} interaction
     * @param {Client} client
     * @param {string|null} eventId - ID события (указывается при создании кнопки)
     */
    execute: async (interaction, client, eventId) => {
        try {
            console.log('=== PARTICIPATE BUTTON START ===');
            console.log('Button clicked:', interaction.customId);
            console.log('User:', interaction.user.tag);
            console.log('Event ID from args:', eventId);
            
            await interaction.deferUpdate();
            console.log('Deferred update successfully');

            if (!eventId) {
                // Извлекаем ID события из customId кнопки
                const customIdParts = interaction.customId.split('_');
                if (customIdParts.length >= 2) {
                    // Убираем 'participate' и берем все остальное как eventId
                    eventId = customIdParts.slice(1).join('_');
                } else {
                    console.error('Invalid customId format:', interaction.customId);
                    await interaction.followUp({
                        content: "❌ Ошибка: не удалось определить ID события.",
                        flags: [MessageFlags.Ephemeral]
                    });
                    return;
                }
            }
            
            console.log('Extracted eventId:', eventId);

            const userId = interaction.user.id;
            const username = interaction.user.username;

            // Проверяем, является ли пользователь организатором
            const currentEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
            const organizerField = currentEmbed.data.fields?.find(field => field.name === '👤 Организатор');
            
            if (organizerField) {
                const organizerValue = organizerField.value;
                // Извлекаем ID организатора из тега
                const organizerIdMatch = organizerValue.match(/<@(\d+)>/);
                if (organizerIdMatch && organizerIdMatch[1] === userId) {
                    await interaction.followUp({
                        content: "❌ Организатор не может нажимать кнопку 'Участвую' - он уже автоматически добавлен как участник!",
                        flags: [MessageFlags.Ephemeral]
                    });
                    return;
                }
            }

            // Проверяем, участвует ли пользователь уже
            const isParticipating = await isUserParticipating(eventId, userId);

            if (isParticipating) {
                await interaction.followUp({
                    content: "❌ Вы уже участвуете в этом событии!",
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Добавляем участника
            await addEventParticipant(eventId, userId, username);

            // Получаем обновленный список участников
            const participants = await getEventParticipants(eventId);

            // Обновляем сообщение с новым списком участников
            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            
            // Получаем ID организатора для исключения из отображения
            const organizerFieldForDisplay = embed.data.fields?.find(field => field.name === '👤 Организатор');
            let organizerId = null;
            if (organizerFieldForDisplay) {
                const organizerValue = organizerFieldForDisplay.value;
                const organizerIdMatch = organizerValue.match(/<@(\d+)>/);
                if (organizerIdMatch) {
                    organizerId = organizerIdMatch[1];
                }
            }
            
            // Создаем список участников с тегами (исключая организатора)
            let participantsList;
            if (participants.length > 0) {
                // Фильтруем организатора из списка отображения
                const displayParticipants = participants.filter(p => p.user_id !== organizerId);
                if (displayParticipants.length > 0) {
                    participantsList = displayParticipants.map(p => `<@${p.user_id}>`).join(', ');
                } else {
                    participantsList = 'Пока нет участников';
                }
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
                content: "✅ Вы успешно присоединились к событию!",
                flags: [MessageFlags.Ephemeral]
            });

            console.log('=== PARTICIPATE BUTTON END ===');

        } catch (error) {
            console.error("=== ERROR IN PARTICIPATE BUTTON ===");
            console.error("Error:", error);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            
            try {
                await interaction.followUp({
                    content: "❌ Произошла ошибка при участии в событии.",
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (followUpError) {
                console.error("FollowUp error:", followUpError);
            }
        }
    }
}; 