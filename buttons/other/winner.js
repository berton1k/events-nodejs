const {ButtonBuilder, ButtonInteraction, Client, ButtonStyle} = require("discord.js");


module.exports = {
    data: new ButtonBuilder()
        .setCustomId("winner")
        .setLabel("🏆 | Заполнить победителя")
        .setStyle(ButtonStyle.Success),
    /**
     *
     * @param interaction {ButtonInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        await interaction.showModal(client.modals.get("mp-winner-single").data);
    }
}
