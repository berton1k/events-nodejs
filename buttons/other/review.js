const {ButtonBuilder, ButtonInteraction, Client, ButtonStyle} = require("discord.js");


module.exports = {
    data: new ButtonBuilder()
        .setCustomId("review")
        .setLabel("⭐ | Оставить отзыв")
        .setStyle(ButtonStyle.Primary),
    /**
     *
     * @param interaction {ButtonInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        await interaction.showModal(client.modals.get("review").data);
    }
}