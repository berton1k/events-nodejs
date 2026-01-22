const { ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
    data: new ButtonBuilder()
        .setCustomId('mapping_delete_cancel')
        .setLabel('❌ Отменить')
        .setStyle(ButtonStyle.Secondary),

    async execute(interaction, client) {
        try {
            await interaction.reply({
                content: '❌ Удаление маппинга отменено',
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Ошибка в кнопке mapping_delete_cancel:', error);
            // Ошибка обрабатывается в index.js, не нужно дублировать
            throw error;
        }
    }
}; 