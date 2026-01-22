const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getEventParticipants, removeEventParticipant } = require("../../utilities/data/DataBase");
const { formatJoinDate } = require("../../utilities/data/utils");

module.exports = {
    data: new ModalBuilder()
        .setCustomId("remove_participants_modal")
        .setTitle("Удаление участников из списка"),

    /**
     * @param {ModalSubmitInteraction} interaction
     * @param {Client} client
     * @param {string|null} eventId - ID события
     */
    execute: async (interaction, client, eventId) => {
        try {
            console.log('=== REMOVE PARTICIPANTS MODAL START ===');
            console.log('Modal submitted:', interaction.customId);
            console.log('User:', interaction.user.tag);
            console.log('Event ID:', eventId);

            if (!eventId) {
                // Извлекаем ID события из customId модального окна
                const customIdParts = interaction.customId.split('_');
                if (customIdParts.length >= 4) {
                    // Убираем 'remove', 'participants', 'modal' и берем все остальное как eventId
                    eventId = customIdParts.slice(3).join('_');
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

            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            // Получаем введенные номера участников
            const numbersInput = interaction.fields.getTextInputValue('participant_numbers');
            console.log('Numbers input:', numbersInput);

            // Парсим номера
            const numbers = numbersInput.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num));
            console.log('Parsed numbers:', numbers);

            if (numbers.length === 0) {
                await interaction.editReply({
                    content: "❌ Пожалуйста, введите корректные номера участников (например: 1, 3, 5)",
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Получаем текущий список участников
            const participants = await getEventParticipants(eventId);
            console.log('Current participants:', participants.length);

            if (participants.length === 0) {
                await interaction.editReply({
                    content: "❌ Список участников пуст",
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Проверяем, что номера не превышают количество участников
            const maxNumber = participants.length;
            const invalidNumbers = numbers.filter(num => num < 1 || num > maxNumber);
            
            if (invalidNumbers.length > 0) {
                await interaction.editReply({
                    content: `❌ Некорректные номера: ${invalidNumbers.join(', ')}. Максимальный номер: ${maxNumber}`,
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Удаляем участников по номерам
            const removedParticipants = [];
            for (const number of numbers) {
                const participant = participants[number - 1]; // Нумерация с 1
                if (participant) {
                    await removeEventParticipant(eventId, participant.user_id);
                    removedParticipants.push(participant);
                }
            }

            console.log('Removed participants:', removedParticipants.length);

            // Получаем обновленный список участников
            const updatedParticipants = await getEventParticipants(eventId);
            console.log('Updated participants:', updatedParticipants.length);

            // Создаем обновленный эмбед
            const participantsList = updatedParticipants.length > 0 
                ? updatedParticipants.map((p, index) => `${index + 1}. <@${p.user_id}> (${formatJoinDate(p.join_date)})`).join('\n')
                : 'Участников не осталось';

            const description = `**Обновленный список участников (${updatedParticipants.length}):**\n\n${participantsList}`;

            const updatedEmbed = new EmbedBuilder()
                .setTitle(`🏁 Участие в событии закрыто`)
                .setDescription(description.length > 4000 ? description.substring(0, 3997) + '...' : description)
                .setColor("#FF6B6B")
                .setTimestamp();

            // Создаем кнопки управления
            const managementButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_participants_${eventId}`)
                    .setLabel('✅ Подтвердить')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`remove_participants_${eventId}`)
                    .setLabel('🗑️ Удалить из списка')
                    .setStyle(ButtonStyle.Danger)
            );

            // Обновляем исходное сообщение
            await interaction.message.edit({
                embeds: [updatedEmbed],
                components: [managementButtons]
            });

            await interaction.editReply({
                content: `✅ Удалено участников: ${removedParticipants.length}. Обновленный список участников: ${updatedParticipants.length}`,
                flags: [MessageFlags.Ephemeral]
            });

            console.log('=== REMOVE PARTICIPANTS MODAL END ===');

        } catch (error) {
            console.error("=== ERROR IN REMOVE PARTICIPANTS MODAL ===");
            console.error("Error:", error);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            
            try {
                await interaction.editReply({
                    content: "❌ Произошла ошибка при удалении участников.",
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (followUpError) {
                console.error("FollowUp error:", followUpError);
            }
        }
    }
}; 