const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, MessageFlags } = require("discord.js");
const { getSettingByKey, setSetting } = require("../../utilities/data/DataBase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("report-panel")
        .setDescription("Sends report panel to the server")
        .addStringOption(option =>
            option.setName("channel")
                .setDescription("ID канала или ветки (необязательно)")
                .setRequired(false)),
    async execute(interaction, client) {
        if (!interaction.member.permissions.has("Administrator")) return;

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // Проверяем, указан ли канал в параметрах
        const specifiedChannelId = interaction.options.getString("channel");
        
        if (specifiedChannelId) {
            // Если указан канал, используем его
            const targetChannel = interaction.guild.channels.cache.get(specifiedChannelId);
            
            if (!targetChannel) {
                await interaction.editReply({
                    content: `Ошибка: канал с ID ${specifiedChannelId} не найден.`
                });
                return;
            }

            // Отправляем панель в указанный канал
            await targetChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x292929)
                        .setDescription("Добро пожаловать в раздел обратной связи, здесь Вы можете подать жалобу на тех, кто нарушал правила.\n\n" +
                            "🚨\ **Подать жалобу**: Для этого нажмите кнопку **\"Подать жалобу\"**. Расскажите нам о нарушениях правил мероприятия, если мы их не заметили.")
                        .setImage("https://media.discordapp.net/attachments/1349466493011624006/1351534894378909747/Special_03.png?ex=67daba75&is=67d968f5&hm=a069364e73096d70ed7a5ea173a08a4802b0a3ac1799e00348ae2eb9c9a03090&=&format=webp&quality=lossless&width=999&height=562")
                ],
                components: [
                    new ActionRowBuilder()
                        .setComponents(
                            client.buttons.get("report").data
                        )
                ]
            });

            await interaction.editReply({
                content: `Панель отправлена в канал <#${specifiedChannelId}>.`
            });
            return;
        }

        // Получаем объект channels из настроек
        let channelsRaw = await getSettingByKey("channels");
        let channels = {};
        if (channelsRaw) {
            try {
                channels = JSON.parse(channelsRaw);
            } catch (e) {
                channels = {};
            }
        }

        // Если report-канал не задан — используем текущий и сохраняем
        if (!channels.report) {
            channels.report = interaction.channel.id;
            await setSetting("channels", JSON.stringify(channels));
            await interaction.editReply({
                content: `Канал для панели жалоб был автоматически настроен на этот канал.`
            });
        } else {
            await interaction.editReply({
                content: `Панель жалоб будет отправлена в <#${channels.report}>.`
            });
        }

        // Получаем канал
        const reportChannel = interaction.guild.channels.cache.get(channels.report);
        if (!reportChannel) {
            await interaction.editReply({
                content: `Ошибка: канал с ID ${channels.report} не найден.`
            });
            return;
        }

        // Отправляем панель
        await reportChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x292929)
                    .setDescription("Добро пожаловать в раздел обратной связи, здесь Вы можете подать жалобу.\n\n" +
                        "🚨\ **Подать жалобу**: Для этого нажмите кнопку \"Подать жалобу\". Расскажите нам о нарушениях правил мероприятия, если мы их не заметили.")
                    .setImage("https://media.discordapp.net/attachments/1349466493011624006/1351534894378909747/Special_03.png?ex=67daba75&is=67d968f5&hm=a069364e73096d70ed7a5ea173a08a4802b0a3ac1799e00348ae2eb9c9a03090&=&format=webp&quality=lossless&width=999&height=562")
            ],
            components: [
                new ActionRowBuilder()
                    .setComponents(
                        client.buttons.get("report").data
                    )
            ]
        });
    }
}
