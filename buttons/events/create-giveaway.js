const { ButtonBuilder, ButtonStyle} = require('discord.js');

module.exports = {
    rules: ['canEdit'],
    data: new ButtonBuilder()
        .setCustomId('create-giveaway')
        .setLabel('🎉 Создать розыгрыш')
        .setStyle(ButtonStyle.Primary),

    async execute(interaction, client) {
        await interaction.showModal(client.modals.get('modal-giveaway-create').data);
    }
}; 