const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { getSettings, setSetting, getSettingByKey } = require("../../utilities/data/DataBase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("events-panel")
        .setDescription("Sends main panel to the server")
        .addStringOption(option =>
            option.setName("channel")
                .setDescription("ID канала или ветки (необязательно)")
                .setRequired(false)),
    async execute(interaction, client) {
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
                        .setTitle('Панель управления ивентами')
                        .setDescription('Выберите одно из доступных действий ниже для управления ивентами.')
                        .setColor('#5865F2')
                ],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('event-publish').setLabel('📌 | Опубликовать ивент').setStyle(ButtonStyle.Primary)
                    ),
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('event-add').setLabel('➕ | Добавить ивент').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('event-delete').setLabel('❌ | Удалить ивент').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId('event-edit').setLabel('✏️ | Редактировать ивент').setStyle(ButtonStyle.Secondary)
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

        // Если events-канал не задан — используем текущий и сохраняем
        if (!channels.events) {
            channels.events = interaction.channel.id;
            await setSetting("channels", JSON.stringify(channels));
            await interaction.editReply({
                content: `Канал для панели событий был автоматически настроен на этот канал.`
            });
        } else {
            await interaction.editReply({
                content: `Панель событий будет отправлена в <#${channels.events}>.`
            });
        }

        // Получаем канал
        const eventsChannel = interaction.guild.channels.cache.get(channels.events);
        if (!eventsChannel) {
            await interaction.editReply({
                content: `Ошибка: канал с ID ${channels.events} не найден.`
            });
            return;
        }

        // Отправляем панель
        await eventsChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Панель управления ивентами')
                    .setDescription('Выберите одно из доступных действий ниже для управления ивентами.')
                    .setColor('#5865F2')
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('event-publish').setLabel('📌 | Опубликовать ивент').setStyle(ButtonStyle.Primary)
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('event-add').setLabel('➕ | Добавить ивент').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('event-delete').setLabel('❌ | Удалить ивент').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('event-edit').setLabel('✏️ | Редактировать ивент').setStyle(ButtonStyle.Secondary)
                )
            ]
        });
    }
}
