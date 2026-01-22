const { ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId('oshka_delete_cancel')
        .setLabel('❌ Отменить')
        .setStyle(ButtonStyle.Secondary),
    async execute(interaction, client) {
        try {
            await interaction.reply({
                content: '❌ Удаление шаблона отменено.',
                flags: [MessageFlags.Ephemeral]
            });
        } catch (error) {
            console.error('Ошибка при отмене удаления шаблона:', error);
            await interaction.reply({
                content: '❌ Произошла ошибка при отмене удаления.',
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
} 