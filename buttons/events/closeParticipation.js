const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { getEventParticipants } = require("../../utilities/data/DataBase");
const { formatJoinDate } = require("../../utilities/data/utils");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("close_participation")
        .setLabel("🔒 Закрыть участие")
        .setStyle(ButtonStyle.Danger),

    /**
     * @param {ButtonInteraction} interaction
     * @param {Client} client
     * @param {string|null} eventId - ID события (указывается при создании кнопки)
     */
    execute: async (interaction, client, eventId) => {
        try {
            console.log('=== CLOSE PARTICIPATION BUTTON START ===');
            console.log('Button clicked:', interaction.customId);
            console.log('User:', interaction.user.tag);
            
            await interaction.deferUpdate();
            console.log('Deferred update successfully');

            if (!eventId) {
                // Извлекаем ID события из customId кнопки
                const customIdParts = interaction.customId.split('_');
                if (customIdParts.length >= 3) {
                    // Убираем 'close' и 'participation' и берем все остальное как eventId
                    eventId = customIdParts.slice(2).join('_');
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

            // Получаем список участников
            console.log('Getting participants for event:', eventId);
            const participants = await getEventParticipants(eventId);
            console.log('Participants found:', participants.length);

            // Создаем эмбед с итоговым списком участников
            const participantsList = participants.length > 0 
                ? participants.map((p, index) => `${index + 1}. <@${p.user_id}> (${formatJoinDate(p.join_date)})`).join('\n')
                : 'Участников не было';

            console.log('Participants list length:', participantsList.length);

            // Проверяем длину описания эмбеда (лимит Discord: 4000 символов)
            const description = `**Итоговый список участников (${participants.length}):**\n\n${participantsList}`;
            if (description.length > 4000) {
                console.log('Description too long, truncating...');
                const truncatedDescription = description.substring(0, 3997) + '...';
                console.log('Truncated description length:', truncatedDescription.length);
            }

            const finalEmbed = new EmbedBuilder()
                .setTitle(`🏁 Участие в событии закрыто`)
                .setDescription(description.length > 4000 ? description.substring(0, 3997) + '...' : description)
                .setColor("#FF6B6B")
                .setTimestamp();

            console.log('Final embed created');

            // Создаем кнопки управления списком
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

            console.log('Management buttons created');

            // Обновляем сообщение с кнопками управления
            console.log('Editing message...');
            await interaction.message.edit({
                embeds: [finalEmbed],
                components: [managementButtons]
            });
            console.log('Message edited successfully');

            await interaction.followUp({
                content: "🔒 Участие в событии закрыто!",
                flags: [MessageFlags.Ephemeral]
            });

            console.log('=== CLOSE PARTICIPATION BUTTON END ===');

        } catch (error) {
            console.error("=== ERROR IN CLOSE PARTICIPATION ===");
            console.error("Error:", error);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            
            try {
                await interaction.followUp({
                    content: "❌ Произошла ошибка при закрытии участия.",
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (followUpError) {
                console.error("FollowUp error:", followUpError);
            }
        }
    }
}; 