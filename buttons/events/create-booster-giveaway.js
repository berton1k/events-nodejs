const { ButtonBuilder, ButtonStyle} = require('discord.js');

module.exports = {
    rules: ['canEdit'],
    data: new ButtonBuilder()
        .setCustomId('create-booster-giveaway')
        .setLabel('🚀 Розыгрыш для бустеров')
        .setStyle(ButtonStyle.Success),

    async execute(interaction, client) {
        await interaction.showModal(client.modals.get('modal-booster-giveaway-create').data);
    }
}; 