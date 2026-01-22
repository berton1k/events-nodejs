const { ButtonBuilder, ButtonInteraction, Client, ButtonStyle, MessageFlags, EmbedBuilder } = require("discord.js");
const { generateDailyReport } = require("../../utilities/data/dailyReport");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("daily-report-send")
        .setLabel("Отправить отчет сейчас")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📊"),
    
    /**
     * @param interaction {ButtonInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        try {
            await interaction.deferUpdate();
            
            const reportEmbed = await generateDailyReport(client);
            
            await interaction.followUp({
                content: "📊 **Ежедневный отчет сформирован**",
                embeds: [reportEmbed],
                flags: [MessageFlags.Ephemeral]
            });
        } catch (error) {
            console.error("Error sending daily report:", error);
            await interaction.followUp({
                content: "❌ Произошла ошибка при создании отчета.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
}; 