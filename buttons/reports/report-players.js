const {ButtonBuilder, ButtonInteraction, Client, ButtonStyle} = require("discord.js");


module.exports = {
    data: new ButtonBuilder()
        .setCustomId("report-players")
        .setLabel("Пожаловаться на игрока")
        .setStyle(ButtonStyle.Danger),
    /**
     *
     * @param interaction {ButtonInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        await interaction.showModal(client.modals.get("report-players").data);
    }
}