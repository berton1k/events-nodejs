const { ButtonBuilder, ButtonInteraction, Client, ButtonStyle, MessageFlags, EmbedBuilder } = require("discord.js");
const { generateDailyReport } = require("../../utilities/data/dailyReport");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("daily-report-test")
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
            
            const reportEmbed = await generateDailyReport(client);
            
            // Добавляем пометку о том, что это тестовый отчет
            reportEmbed.setTitle("🧪 Тест - Ежедневный отчет о событиях");
            reportEmbed.setDescription("Это тестовый отчет. " + reportEmbed.data.description);
            
            await interaction.followUp({
                content: "🧪 **Тестовый отчет сформирован**",
                embeds: [reportEmbed],
                flags: [MessageFlags.Ephemeral]
            });
        } catch (error) {
            console.error("Error generating test report:", error);
            await interaction.followUp({
                content: "❌ Произошла ошибка при создании тестового отчета.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
}; 