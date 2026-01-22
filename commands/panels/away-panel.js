const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, MessageFlags } = require("discord.js");
const { getSettingByKey, setSetting } = require("../../utilities/data/DataBase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("away-panel")
        .setDescription("Sends away panel to the server")
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
                        .setDescription("Добро пожаловать в раздел отпусков. Здесь вы можете оставить заявку на отпуск, чтобы уведомить о вашем отсутствии.\n\n" +
                            "📆 **Оформить отпуск**: нажмите кнопку \"Запросить отпуск\", далее укажите даты и причину отсутствия.\n\n" +
                            "💡 Если у вас есть вопросы, свяжитесь с Chief Event | Chief Events Helpers.")
                ],
                components: [
                    new ActionRowBuilder()
                        .setComponents(
                            client.buttons.get("away").data,
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

        // Если away-канал не задан — используем текущий и сохраняем
        if (!channels.away) {
            channels.away = interaction.channel.id;
            await setSetting("channels", JSON.stringify(channels));
            await interaction.editReply({
                content: `Канал для панели отпусков был автоматически настроен на этот канал.`
            });
        } else {
            await interaction.editReply({
                content: `Панель отпусков будет отправлена в <#${channels.away}>.`
            });
        }

        // Получаем канал
        const awayChannel = interaction.guild.channels.cache.get(channels.away);
        if (!awayChannel) {
            await interaction.editReply({
                content: `Ошибка: канал с ID ${channels.away} не найден.`
            });
            return;
        }

        // Отправляем панель
        await awayChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x292929)
                    .setDescription("Привет!\n" +
                        "Добро пожаловать в раздел отпусков. Здесь вы можете оставить заявку на отпуск, чтобы уведомить о вашем отсутствии.\n\n" +
                            "📆 **Оформить отпуск**: нажмите кнопку \"Запросить отпуск\", далее укажите даты и причину отсутствия.\n\n" +
                            "💡 Если у вас есть вопросы, свяжитесь с Chief Event | Chief Events Helpers.")
            ],
            components: [
                new ActionRowBuilder()
                    .setComponents(
                        client.buttons.get("away").data,
                    )
            ]
        });
    }
}
