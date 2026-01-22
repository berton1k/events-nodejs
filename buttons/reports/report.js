const {ButtonBuilder, ButtonInteraction, Client, ButtonStyle, MessageFlags, EmbedBuilder, ActionRowBuilder} = require("discord.js");


module.exports = {
    data: new ButtonBuilder()
        .setCustomId("report")
        .setLabel("🚨 | Подать жалобу")
        .setStyle(ButtonStyle.Danger),
    /**
     *
     * @param interaction {ButtonInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        await interaction.reply({
            flags: [MessageFlags.Ephemeral],
            embeds: [
                new EmbedBuilder()
                    .setDescription("Выберите соответствующий раздел для жалобы.")
                    .setColor("Red")
            ],
            components: [
                new ActionRowBuilder()
                    .setComponents(
                        client.buttons.get("report-players").data,
                        client.buttons.get("report-orgs").data
                    )
            ]
        })
    }
}