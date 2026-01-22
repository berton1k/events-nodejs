const { ButtonBuilder, ButtonStyle } = require('discord.js');
const { addGiveawayParticipant, isUserInGiveaway, getGiveawayById, getGiveawayParticipants } = require("../../utilities/data/DataBase");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId('join-giveaway')
        .setLabel('🎉')
        .setStyle(ButtonStyle.Secondary),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Получаем ID розыгрыша из custom_id кнопки
            const giveawayId = interaction.message.embeds[0]?.footer?.text?.match(/ID розыгрыша: (\d+)/)?.[1];
            
            if (!giveawayId) {
                await interaction.editReply({
                    content: 'Ошибка: не удалось определить ID розыгрыша.'
                });
                return;
            }

            // Проверяем, существует ли розыгрыш
            const giveaway = await getGiveawayById(giveawayId);
            if (!giveaway || !giveaway.is_active) {
                await interaction.editReply({
                    content: 'Этот розыгрыш больше не активен.'
                });
                return;
            }

            // Проверяем, не истек ли срок розыгрыша
            const endDate = new Date(giveaway.end_date);
            if (endDate <= new Date()) {
                await interaction.editReply({
                    content: 'Время участия в этом розыгрыше истекло.'
                });
                return;
            }

            // Проверяем, участвует ли пользователь уже в розыгрыше
            const isParticipating = await isUserInGiveaway(giveawayId, interaction.user.id);
            
            if (isParticipating) {
                await interaction.editReply({
                    content: 'Вы уже участвуете в этом розыгрыше!'
                });
                return;
            }

            // Добавляем участника
            const wasAdded = await addGiveawayParticipant(giveawayId, interaction.user.id, interaction.user.username);
            
            if (wasAdded) {
                // Получаем обновленное количество участников
                const participants = await getGiveawayParticipants(giveawayId);
                
                // Обновляем эмбед с новым количеством участников
                try {
                    const embed = interaction.message.embeds[0];
                    if (embed) {
                        const newDescription = embed.description.replace(
                            /\*\*Участников:\*\* \d+\n/,
                            `**Участников:** ${participants.length}\n`
                        );
                        const newEmbed = embed.setDescription(newDescription);
                        await interaction.message.edit({ embeds: [newEmbed] });
                    }
                } catch (embedError) {
                    console.log('Не удалось обновить эмбед:', embedError.message);
                }
                
                await interaction.editReply({
                    content: `Вы успешно присоединились к розыгрышу "${giveaway.prize}"!\n\nУчастников: ${participants.length}/${giveaway.spots}`
                });
            } else {
                await interaction.editReply({
                    content: 'Произошла ошибка при добавлении к розыгрышу. Попробуйте еще раз.'
                });
            }
            
        } catch (error) {
            console.error('Ошибка при участии в розыгрыше:', error);
            await interaction.editReply({
                content: 'Произошла ошибка при участии в розыгрыше. Попробуйте еще раз.'
            });
        }
    }
}; 