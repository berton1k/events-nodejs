const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { generateDailyReport } = require("../../utilities/data/dailyReport");
const { getSettings, setSetting } = require("../../utilities/data/DataBase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("daily-report")
        .setDescription("Manage daily event reports")
        .addSubcommand(subcommand =>
            subcommand
                .setName("send")
                .setDescription("Send daily report now"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("set-channel")
                .setDescription("Set channel for daily reports")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Channel to send daily reports")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("info")
                .setDescription("Show daily report settings")),
    
    admin: true,
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                case "send":
                    await this.sendReport(interaction, client);
                    break;
                case "set-channel":
                    await this.setChannel(interaction);
                    break;
                case "info":
                    await this.showInfo(interaction);
                    break;
            }
        } catch (error) {
            console.error("Error in daily-report command:", error);
            await interaction.reply({
                content: "An error occurred while processing the command.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    },
    
    async sendReport(interaction, client) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        
        const reportEmbed = await generateDailyReport(client);
        
        await interaction.editReply({
            content: "📊 **Ежедневный отчет сформирован**",
            embeds: [reportEmbed]
        });
    },
    
    async setChannel(interaction) {
        const channel = interaction.options.getChannel("channel");
        
        // Получаем текущие настройки каналов
        const settingsData = await getSettings();
        const currentChannels = settingsData?.channels || {};
        
        // Обновляем канал ежедневных отчетов
        const updatedChannels = { ...currentChannels, dailyReport: channel.id };
        await setSetting("channels", JSON.stringify(updatedChannels));
        
        await interaction.reply({
            content: `✅ Daily report channel set to ${channel}`,
            flags: [MessageFlags.Ephemeral]
        });
    },
    
    async showInfo(interaction) {
        const settings = await getSettings();
        const channelId = settings.channels?.dailyReport || "Not set";
        const channel = channelId !== "Not set" ? `<#${channelId}>` : "Not set";
        
        const embed = new EmbedBuilder()
            .setTitle("📊 Настройки ежедневного отчета")
            .setColor("#4ecdc4")
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
                    .setCustomId("daily-report-send")
                    .setLabel("Отправить отчет сейчас")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("📊"),
                new ButtonBuilder()
                    .setCustomId("daily-report-test")
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