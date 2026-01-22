const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { getSettings, setSetting, getSettingByKey } = require("../../utilities/data/DataBase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("oshka-panel")
        .setDescription("Sends Oshka templates management panel to the server")
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
                        .setTitle('Панель управления шаблонами Ошки')
                        .setDescription('Выберите одно из доступных действий ниже для управления шаблонами Ошки.')
                        .setColor('#FF6B6B')
                        .addFields(
                            { name: '📝 Добавить шаблон', value: 'Создать новый шаблон Ошки', inline: true },
                            { name: '✏️ Редактировать шаблон', value: 'Изменить существующий шаблон', inline: true },
                            { name: '❌ Удалить шаблон', value: 'Удалить шаблон из базы данных', inline: true }
                        )
                ],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('oshka-add').setLabel('📝 | Добавить шаблон').setStyle(ButtonStyle.Success)
                    ),
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('oshka-edit').setLabel('✏️ | Редактировать шаблон').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('oshka-delete').setLabel('❌ | Удалить шаблон').setStyle(ButtonStyle.Danger)
                    )
                ]
            });

            await interaction.editReply({
                content: `Панель управления шаблонами Ошки отправлена в канал <#${specifiedChannelId}>.`
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

        // Если oshka-канал не задан — используем текущий и сохраняем
        if (!channels.oshka) {
            channels.oshka = interaction.channel.id;
            await setSetting("channels", JSON.stringify(channels));
            await interaction.editReply({
                content: `Канал для панели шаблонов Ошки был автоматически настроен на этот канал.`
            });
        } else {
            await interaction.editReply({
                content: `Панель шаблонов Ошки будет отправлена в <#${channels.oshka}>.`
            });
        }

        // Получаем канал
        const oshkaChannel = interaction.guild.channels.cache.get(channels.oshka);
        if (!oshkaChannel) {
            await interaction.editReply({
                content: `Ошибка: канал с ID ${channels.oshka} не найден.`
            });
            return;
        }

        // Отправляем панель
        await oshkaChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Панель управления шаблонами Ошки')
                    .setDescription('Выберите одно из доступных действий ниже для управления шаблонами Ошки.')
                    .setColor('#FF6B6B')
                    .addFields(
                        { name: '📝 Добавить шаблон', value: 'Создать новый шаблон Ошки', inline: true },
                        { name: '✏️ Редактировать шаблон', value: 'Изменить существующий шаблон', inline: true },
                        { name: '❌ Удалить шаблон', value: 'Удалить шаблон из базы данных', inline: true }
                    )
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('oshka-add').setLabel('📝 | Добавить шаблон').setStyle(ButtonStyle.Success)
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('oshka-edit').setLabel('✏️ | Редактировать шаблон').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('oshka-delete').setLabel('❌ | Удалить шаблон').setStyle(ButtonStyle.Danger)
                )
            ]
        });
    }
} 