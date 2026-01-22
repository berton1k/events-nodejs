const {SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction, Client, SlashCommandStringOption, SlashCommandChannelOption, ChannelType,
    SlashCommandSubcommandBuilder,
    EmbedBuilder,
    SlashCommandRoleOption
} = require("discord.js");
const {getSettingsDatabase, getSettings, setSetting} = require("../../utilities/data/DataBase");

module.exports = {
    admin: true,
    data: new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Настройки")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("list")
                .setDescription("Список настроек")
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("setrole")
                .setDescription("Установить/удалить роль")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("name")
                        .setDescription("Для чего установить/удалить роль")
                        .addChoices([
                            {
                                "name": "Уведомление мероприятий",
                                "value": "events"
                            },
                            {
                                "name": "Могут публиковать мероприятия",
                                "value": "canPublish"
                            },
                            {
                                "name": "Могут редактировать мероприятия",
                                "value": "canEdit"
                            },
                            {
                                "name": "Могут закрывать участие в мероприятиях",
                                "value": "canCloseParticipation"
                            },
                            {
                                "name": "Могут удалять маппинги ников",
                                "value": "canDeleteMappings"
                            },
                            {
                                "name": "Могут использовать команды модерации",
                                "value": "canModerate"
                            }
                        ])
                        .setRequired(true)
                )
                .addRoleOption(
                    new SlashCommandRoleOption()
                        .setName("role")
                        .setDescription("Роль, которая будет выбрана для упоминания на ивенты")
                        .setRequired(true)
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("setchannel")
                .setDescription("Установить канал")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("name")
                        .setDescription("Для чего установить канал")
                        .addChoices([
                            {
                                "name": "Публикация мероприятий",
                                "value": "events"
                            },
                            {
                                "name": "Логи",
                                "value": "logs"
                            },
                            {
                                "name": "Логи модерации",
                                "value": "moderationLogs"
                            },
                            {
                                "name": "Участие в мероприятиях",
                                "value": "participation"
                            },
                            {
                                "name": "Ежедневные отчеты",
                                "value": "dailyReport"
                            },
                            {
                                "name": "Отчеты организаторов",
                                "value": "organizerReport"
                            },
                            {
                                "name": "Одобренные жалобы на игроков",
                                "value": "approvedPlayerReports"
                            },
                            {
                                "name": "Победители мероприятий",
                                "value": "winners"
                            },
                            {
                                "name": "Розыгрыши",
                                "value": "giveaways"
                            },
                            {
                                "name": "Уведомления о розыгрышах",
                                "value": "giveawayNotifications"
                            },
                            {
                                "name": "Панель шаблонов Ошки",
                                "value": "oshka"
                            },
                            {
                                "name": "Панель управления маппингом ников",
                                "value": "mappingPanel"
                            }
                        ])
                        .setRequired(true)
                )
                .addChannelOption(
                    new SlashCommandChannelOption()
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread)
                        .setName("channel")
                        .setDescription("Канал (включая ветки, форумы и треды)")
                        .setRequired(true)
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("refreshlogs")
                .setDescription("Обновить каналы логов (если были изменены)")
        ),
    /**
     *
     * @param interaction {ChatInputCommandInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        const command = interaction.options.getSubcommand(true);
        await interaction.deferReply({
            flags: [MessageFlags.Ephemeral]
        })
        if (command === "list") {
            const settings = await getSettings();
            
            // Проверяем, что settings существует и имеет нужные свойства
            const channels = settings?.channels || {};
            const roles = settings?.roles || {};
            
            // Получаем информацию о каналах
            let channelsInfo = "";
            for (const [key, channelId] of Object.entries(channels)) {
                if (channelId) {
                    const channel = interaction.guild.channels.cache.get(channelId);
                    let channelType = 'Неизвестный';
                    if (channel) {
                        switch (channel.type) {
                            case 0:
                                channelType = 'Текстовый канал';
                                break;
                            case 5:
                                channelType = 'Объявления';
                                break;
                            case 15:
                                channelType = 'Форум';
                                break;
                            case 11:
                                channelType = 'Публичная ветка';
                                break;
                            case 12:
                                channelType = 'Приватная ветка';
                                break;
                            case 10:
                                channelType = 'Ветка объявлений';
                                break;
                        }
                    } else {
                        channelType = 'Не найден';
                    }
                    channelsInfo += `**${key === 'events' ? 'Публикация мероприятий' : key === 'logs' ? 'Логи' : key === 'moderationLogs' ? 'Логи модерации' : key === 'participation' ? 'Участие в мероприятиях' : key === 'dailyReport' ? 'Ежедневные отчеты' : key === 'organizerReport' ? 'Отчеты организаторов' : key === 'approvedPlayerReports' ? 'Одобренные жалобы на игроков' : key === 'winners' ? 'Победители мероприятий' : key === 'giveaways' ? 'Розыгрыши' : key === 'giveawayNotifications' ? 'Уведомления о розыгрышах' : key === 'oshka' ? 'Панель шаблонов Ошки' : key === 'mappingPanel' ? 'Панель управления маппингом ников' : key}**: <#${channelId}> (${channelType})\n\n`;
                } else {
                    channelsInfo += `**${key === 'events' ? 'Публикация мероприятий' : key === 'logs' ? 'Логи' : key === 'moderationLogs' ? 'Логи модерации' : key === 'participation' ? 'Участие в мероприятиях' : key === 'dailyReport' ? 'Ежедневные отчеты' : key === 'organizerReport' ? 'Отчеты организаторов' : key === 'approvedPlayerReports' ? 'Одобренные жалобы на игроков' : key === 'winners' ? 'Победители мероприятий' : key === 'giveaways' ? 'Розыгрыши' : key === 'giveawayNotifications' ? 'Уведомления о розыгрышах' : key === 'oshka' ? 'Панель шаблонов Ошки' : key === 'mappingPanel' ? 'Панель управления маппингом ников' : key}**: Нет канала\n\n`;
                }
            }

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xff2020)
                        .setAuthor({
                            name: "Список настроек"
                        })
                        .setDescription(`## Каналы: \n${channelsInfo}## Роли:\n**Уведомление ивентов**: ${roles.events ? "<@&" + roles.events + ">" : "Нет роли"}\n\n**Могут публиковать ивенты**: ${Array.isArray(roles.canPublish) && roles.canPublish.length !== 0 ? roles.canPublish.map(roleId => "<@&" + roleId + ">").join(', ') : "Нет ролей"}\n**Могут редактировать ивенты**: ${Array.isArray(roles.canEdit) && roles.canEdit.length !== 0 ? roles.canEdit.map(roleId => "<@&" + roleId + ">").join(', ') : "Нет ролей"}\n**Могут закрывать участие**: ${Array.isArray(roles.canCloseParticipation) && roles.canCloseParticipation.length !== 0 ? roles.canCloseParticipation.map(roleId => "<@&" + roleId + ">").join(', ') : "Нет ролей"}\n**Могут удалять маппинги ников**: ${Array.isArray(roles.canDeleteMappings) && roles.canDeleteMappings.length !== 0 ? roles.canDeleteMappings.map(roleId => "<@&" + roleId + ">").join(', ') : "Нет ролей"}\n**Могут использовать команды модерации**: ${Array.isArray(roles.canModerate) && roles.canModerate.length !== 0 ? roles.canModerate.map(roleId => "<@&" + roleId + ">").join(', ') : "Нет ролей"}`)
                ],
            })
        } else if (command === "setchannel") {
            const name = interaction.options.getString("name", true);
            const channel = interaction.options.getChannel("channel", true, [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread]);

            // Получаем текущие настройки каналов
            const settingsData = await getSettings();
            const currentChannels = settingsData?.channels || {};
            
            // Обновляем канал
            const updatedChannels = { ...currentChannels, [name]: channel.id };
            await setSetting("channels", JSON.stringify(updatedChannels));
            
            // Если это канал розыгрышей, также обновляем отдельную настройку
            if (name === 'giveaways') {
                await setSetting("giveaways_channel_id", channel.id);
            }

            // Если это канал логов, обновляем Discord логгер
            if (name === 'logs') {
                try {
                    console.log('Setting logs channel, refreshing Discord logger...');
                    const { refreshDiscordLogChannel } = require("../../utilities/data/logging");
                    await refreshDiscordLogChannel();
                    console.log('Discord logger refreshed for logs channel');
                } catch (error) {
                    console.error('Error refreshing Discord log channel:', error);
                }
            }

            // Если это канал логов модерации, обновляем Discord логгер
            if (name === 'moderationLogs') {
                try {
                    console.log('Setting moderationLogs channel, refreshing Discord logger...');
                    const { refreshDiscordLogChannel } = require("../../utilities/data/logging");
                    await refreshDiscordLogChannel();
                    console.log('Discord logger refreshed for moderationLogs channel');
                } catch (error) {
                    console.error('Error refreshing Discord moderation log channel:', error);
                }
            }

            // Определяем тип канала для отображения
            let channelType = 'Неизвестный тип';
            switch (channel.type) {
                case 0:
                    channelType = 'Текстовый канал';
                    break;
                case 5:
                    channelType = 'Объявления';
                    break;
                case 15:
                    channelType = 'Форум';
                    break;
                case 11:
                    channelType = 'Публичная ветка';
                    break;
                case 12:
                    channelType = 'Приватная ветка';
                    break;
                case 10:
                    channelType = 'Ветка объявлений';
                    break;
            }

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x20ff20)
                        .setDescription(`Канал установлен: ${channel.name} (${channelType})`)
                ],
            })
        } else if (command === "refreshlogs") {
            try {
                console.log('Refreshing log channels...');
                const { refreshDiscordLogChannel } = require("../../utilities/data/logging");
                await refreshDiscordLogChannel();
                console.log('Log channels refreshed successfully');
                
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x20ff20)
                            .setDescription("Каналы логов обновлены успешно")
                    ],
                });
            } catch (error) {
                console.error('Error refreshing log channels:', error);
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xff2020)
                            .setDescription("Ошибка при обновлении каналов логов")
                    ],
                });
            }
        } else if (command === "setrole") {
            const name = interaction.options.getString("name", true);
            const role = interaction.options.getRole("role", true);

            if (name === "events") {
                // Получаем текущие настройки ролей
                const settingsData = await getSettings();
                const currentRoles = settingsData?.roles || {};
                
                // Обновляем роль
                const updatedRoles = { ...currentRoles, [name]: role.id };
                await setSetting("roles", JSON.stringify(updatedRoles));

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x20ff20)
                            .setDescription(`Роль установлена.`)
                    ],
                })
            } else {
                const settingsData = await getSettings();
                const currentRoles = settingsData?.roles?.[name] || [];

                if (currentRoles.includes(role.id)) {
                    // Удаляем роль из массива
                    const updatedRoles = currentRoles.filter(roleId => roleId !== role.id);
                    const updatedRolesData = { ...settingsData.roles, [name]: updatedRoles };
                    await setSetting("roles", JSON.stringify(updatedRolesData));

                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0xff2020)
                                .setDescription(`Роль удалена.`)
                        ],
                    });
                } else {
                    // Добавляем роль в массив
                    const updatedRoles = [...currentRoles, role.id];
                    const updatedRolesData = { ...settingsData.roles, [name]: updatedRoles };
                    await setSetting("roles", JSON.stringify(updatedRolesData));

                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x20ff20)
                                .setDescription(`Роль установлена.`)
                        ],
                    });
                }
            }
        }
    }
}