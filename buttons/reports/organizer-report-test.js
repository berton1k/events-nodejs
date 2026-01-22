const { ButtonBuilder, ButtonInteraction, Client, ButtonStyle, MessageFlags, EmbedBuilder } = require("discord.js");
const { generateOrganizerReport } = require("../../utilities/data/organizerReport");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("organizer-report-test")
        .setLabel("Тестовый отчет")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🧪"),
    
    /**
     * @param interaction {ButtonInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        try {
            await interaction.deferUpdate();
            
            const reportEmbed = await generateOrganizerReport(client);
            
            // Добавляем пометку о том, что это тестовый отчет
            reportEmbed.setTitle("🧪 Тест - Ежедневный отчет организаторов");
            reportEmbed.setDescription("Это тестовый отчет. " + reportEmbed.data.description);
            
            await interaction.followUp({
                content: "🧪 **Тестовый отчет организаторов сформирован**",
                embeds: [reportEmbed],
                flags: [MessageFlags.Ephemeral]
            });
        } catch (error) {
            console.error("Error generating test organizer report:", error);
            await interaction.followUp({
                content: "❌ Произошла ошибка при создании тестового отчета организаторов.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
}; 