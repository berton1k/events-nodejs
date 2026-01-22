const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { generateOrganizerReport } = require("../../utilities/data/organizerReport");
const { getSettings, setSetting } = require("../../utilities/data/DataBase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("organizer-report")
        .setDescription("Manage daily organizer reports")
        .addSubcommand(subcommand =>
            subcommand
                .setName("send")
                .setDescription("Send organizer report now"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("info")
                .setDescription("Show organizer report settings")),
    
    admin: true,
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                case "send":
                    await this.sendReport(interaction, client);
                    break;
                case "info":
                    await this.showInfo(interaction);
                    break;
            }
        } catch (error) {
            console.error("Error in organizer-report command:", error);
            await interaction.reply({
                content: "An error occurred while processing the command.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    },
    
    async sendReport(interaction, client) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        
        const reportEmbed = await generateOrganizerReport(client);
        
        await interaction.editReply({
            content: "👤 **Отчет организаторов сформирован**",
            embeds: [reportEmbed]
        });
    },
    
    async showInfo(interaction) {
        const settings = await getSettings();
        // Используем отдельный канал для отчетов организаторов, если настроен, иначе используем общий канал отчетов
        const channelId = settings.channels?.organizerReport || settings.channels?.dailyReport || "Not set";
        const channel = channelId !== "Not set" ? `<#${channelId}>` : "Not set";
        
        const embed = new EmbedBuilder()
            .setTitle("👤 Настройки отчета организаторов")
            .setColor("#ff9ff3")
            .addFields([
                {
                    name: "Канал отчетов",
                    value: channel,
                    inline: true
                },
                {
                    name: "Расписание",
                    value: "Ежедневно в 23:59",
                    inline: true
                },
                {
                    name: "Статус",
                    value: "✅ Активен",
                    inline: true
                }
            ])
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("organizer-report-send")
                    .setLabel("Отправить отчет сейчас")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("👤"),
                new ButtonBuilder()
                    .setCustomId("organizer-report-test")
                    .setLabel("Тестовый отчет")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🧪")
            );
        
        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });
    }
}; 