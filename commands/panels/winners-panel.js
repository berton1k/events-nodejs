const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, MessageFlags } = require("discord.js");
const { getSettingByKey, setSetting } = require("../../utilities/data/DataBase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("winners-panel")
        .setDescription("Sends winners panel to the server")
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
                        .setDescription("Добро пожаловать в раздел заполнения победителей мероприятия. Здесь вы можете указать победителей и отправить их данные в <#1350232997630050304>.\n\n" +
                            "🏆\ **Заполнить победителя**: Нажмите кнопку **'Заполнить победителя'**, чтобы ввести имя победителя и загрузить изображение с ним. После этого информация будет отправлена в <#1350232997630050304>.\n\n" +
                            "🏆\ **Заполнить победителей**: нажмите кнопку **'Заполнить победителей'**, чтобы ввести статики победителей и загрузить изображение с ними. После этого информация будет отправлена в <#1350232997630050304>\n\n" +
                            "💡\ Если у вас есть вопросы или возникли трудности, обратитесь к Chief Events | Chief Events Helpers для помощи.")
                ],
                components: [
                    new ActionRowBuilder()
                        .setComponents(
                            client.buttons.get("winners").data,
                            client.buttons.get("winner").data,
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

        // Если winners-канал не задан — используем текущий и сохраняем
        if (!channels.winners) {
            channels.winners = interaction.channel.id;
            await setSetting("channels", JSON.stringify(channels));
            await interaction.editReply({
                content: `Канал для панели победителей был автоматически настроен на этот канал.`
            });
        } else {
            await interaction.editReply({
                content: `Панель победителей будет отправлена в <#${channels.winners}>.`
            });
        }

        // Получаем канал
        const winnersChannel = interaction.guild.channels.cache.get(channels.winners);
        if (!winnersChannel) {
            await interaction.editReply({
                content: `Ошибка: канал с ID ${channels.winners} не найден.`
            });
            return;
        }

        // Отправляем панель
        await winnersChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x292929)
                    .setDescription("Добро пожаловать в раздел заполнения победителей мероприятия. Здесь вы можете указать победителей и отправить их данные в <#1350232997630050304>.\n\n" +
                            "🏆\ **Заполнить победителя**: Нажмите кнопку **'Заполнить победителя'**, чтобы ввести имя победителя и загрузить изображение с ним. После этого информация будет отправлена в <#1350232997630050304>.\n\n" +
                            "🏆\ **Заполнить победителей**: нажмите кнопку **'Заполнить победителей'**, чтобы ввести статики победителей и загрузить изображение с ними. После этого информация будет отправлена в <#1350232997630050304>\n\n" +
                            "💡\ Если у вас есть вопросы или возникли трудности, обратитесь к Chief Events | Chief Events Helpers для помощи.")
            ],
            components: [
                new ActionRowBuilder()
                    .setComponents(
                        client.buttons.get("winners").data,
                        client.buttons.get("winner").data,
                    )
            ]
        });
    }
}
