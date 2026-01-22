
const { ButtonBuilder, ButtonStyle} = require('discord.js');

module.exports = {
    rules: ['canEdit'],
    data: new ButtonBuilder()
        .setCustomId('event-add')
        .setLabel('➕ Добавить ивент')
        .setStyle(ButtonStyle.Success),

    async execute(interaction, client) {
        await interaction.showModal(client.modals.get('modal-event-add').data);
    }
};