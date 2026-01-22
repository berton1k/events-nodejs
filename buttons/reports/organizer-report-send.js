const { ButtonBuilder, ButtonInteraction, Client, ButtonStyle, MessageFlags, EmbedBuilder } = require("discord.js");
const { generateOrganizerReport } = require("../../utilities/data/organizerReport");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("organizer-report-send")
        .setLabel("Отправить отчет сейчас")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("👤"),
    
    /**
     * @param interaction {ButtonInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        try {
            await interaction.deferUpdate();
            
            const reportEmbed = await generateOrganizerReport(client);
            
            await interaction.followUp({
                content: "👤 **Отчет организаторов сформирован**",
                embeds: [reportEmbed],
                flags: [MessageFlags.Ephemeral]
            });
        } catch (error) {
            console.error("Error sending organizer report:", error);
            await interaction.followUp({
                content: "❌ Произошла ошибка при создании отчета организаторов.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
}; 