const { ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId('oshka-add')
        .setLabel('📝 | Добавить шаблон')
        .setStyle(ButtonStyle.Success),
    async execute(interaction, client) {
        // Открываем модальное окно для добавления шаблона
        const modal = require('../../modals/events/addOshkaModal');
        await interaction.showModal(modal.data);
    }
} 