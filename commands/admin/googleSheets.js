const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const googleSheetsManager = require('../../utilities/googleSheets');
const BulkSheetsUpdater = require('../../utilities/bulkSheetsUpdate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('googlesheets')
        .setDescription('Управление интеграцией с Google Sheets')
        .addSubcommand(subcommand =>
            subcommand
                .setName('mark')
                .setDescription('Отметить участие участника в Google Sheets')
                .addStringOption(option =>
                    option.setName('nickname')
                        .setDescription('Ник участника')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('date')
                        .setDescription('Дата в формате DD.MM (по умолчанию сегодня)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Проверить участие участника')
                .addStringOption(option =>
                    option.setName('nickname')
                        .setDescription('Ник участника')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('date')
                        .setDescription('Дата в формате DD.MM (по умолчанию сегодня)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Получить список всех участников из Google Sheets'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list-date')
                .setDescription('Получить список участников для конкретной даты')
                .addStringOption(option =>
                    option.setName('date')
                        .setDescription('Дата в формате DD.MM')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Тестировать подключение к Google Sheets'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sync')
                .setDescription('Синхронизировать участников из базы данных с Google Sheets')
                .addStringOption(option =>
                    option.setName('date')
                        .setDescription('Дата в формате DD.MM (по умолчанию сегодня)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Получить статистику синхронизации'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bulk')
                .setDescription('Массовое обновление участников события')
                .addStringOption(option =>
                    option.setName('event_id')
                        .setDescription('ID события')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('date')
                        .setDescription('Дата в формате DD.MM (по умолчанию сегодня)')
                        .setRequired(false))),

    admin: true,

    async execute(interaction, client) {
        try {
            // Сразу отвечаем, чтобы избежать истечения взаимодействия
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'mark':
                    await this.handleMark(interaction);
                    break;
                case 'check':
                    await this.handleCheck(interaction);
                    break;
                case 'list':
                    await this.handleList(interaction);
                    break;
                case 'list-date':
                    await this.handleListDate(interaction);
                    break;
                case 'test':
                    await this.handleTest(interaction);
                    break;
                case 'sync':
                    await this.handleSync(interaction);
                    break;
                case 'stats':
                    await this.handleStats(interaction);
                    break;
                case 'bulk':
                    await this.handleBulk(interaction);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Неизвестная подкоманда',
                        flags: [MessageFlags.Ephemeral]
                    });
            }
        } catch (error) {
            console.error('Ошибка в команде googleSheets:', error);
            
            // Простая обработка ошибок без сложных проверок
            try {
                if (interaction.deferred) {
                    await interaction.editReply({
                        content: `❌ Произошла ошибка: ${error.message}`,
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } catch (replyError) {
                console.error('Не удалось отправить ответ об ошибке:', replyError);
            }
        }
    },

    async handleMark(interaction) {
        const nickname = interaction.options.getString('nickname');
        const date = interaction.options.getString('date');

        try {
            const success = await googleSheetsManager.markParticipation(nickname, date);
            
            if (success) {
                const targetDate = date || googleSheetsManager.getCurrentDate();
                const participationCount = await googleSheetsManager.getParticipationCount(nickname, date);
                await interaction.editReply({
                    content: `✅ Участие участника **${nickname}** отмечено в Google Sheets на дату **${targetDate}** (всего участий: ${participationCount})`,
                    flags: [MessageFlags.Ephemeral]
                });
            } else {
                await interaction.editReply({
                    content: `❌ Не удалось отметить участие для **${nickname}**. Проверьте, что участник существует в таблице и дата корректна.`,
                    flags: [MessageFlags.Ephemeral]
                });
            }
        } catch (error) {
            console.error('Ошибка в handleMark:', error);
            try {
                await interaction.editReply({
                    content: `❌ Ошибка при отметке участия: ${error.message}`,
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (replyError) {
                console.error('Не удалось отправить ответ об ошибке в handleMark:', replyError);
            }
        }
    },

    async handleCheck(interaction) {
        const nickname = interaction.options.getString('nickname');
        const date = interaction.options.getString('date');

        try {
            const participationCount = await googleSheetsManager.getParticipationCount(nickname, date);
            const targetDate = date || googleSheetsManager.getCurrentDate();
            
            if (participationCount > 0) {
                await interaction.editReply({
                    content: `✅ Участник **${nickname}** участвовал в мероприятии **${targetDate}** ${participationCount} раз(а)`,
                    flags: [MessageFlags.Ephemeral]
                });
            } else {
                await interaction.editReply({
                    content: `❌ Участник **${nickname}** не участвовал в мероприятии **${targetDate}**`,
                    flags: [MessageFlags.Ephemeral]
                });
            }
        } catch (error) {
            console.error('Ошибка в handleCheck:', error);
            try {
                await interaction.editReply({
                    content: `❌ Ошибка при проверке участия: ${error.message}`,
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (replyError) {
                console.error('Не удалось отправить ответ об ошибке в handleCheck:', replyError);
            }
        }
    },

    async handleList(interaction) {
        try {
            const participants = await googleSheetsManager.getAllParticipants();
            
            if (participants.length === 0) {
                await interaction.editReply({
                    content: '📋 Список участников пуст или не удалось получить данные',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 Список участников из Google Sheets')
                .setDescription(`Найдено участников: **${participants.length}**`)
                .setColor('#00ff00')
                .setTimestamp();

            // Разбиваем список на части, если участников много
            const chunkSize = 20;
            for (let i = 0; i < participants.length; i += chunkSize) {
                const chunk = participants.slice(i, i + chunkSize);
                const fieldName = i === 0 ? 'Участники' : `Участники (продолжение ${Math.floor(i / chunkSize) + 1})`;
                embed.addFields({
                    name: fieldName,
                    value: chunk.map((nickname, index) => `${i + index + 1}. ${nickname}`).join('\n'),
                    inline: false
                });
            }

            await interaction.editReply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral]
            });
        } catch (error) {
            await interaction.editReply({
                content: `❌ Ошибка при получении списка участников: ${error.message}`,
                flags: [MessageFlags.Ephemeral]
            });
        }
    },

    async handleTest(interaction) {
        try {
            // Проверяем инициализацию
            if (!googleSheetsManager.sheets || !googleSheetsManager.spreadsheetId) {
                await interaction.editReply({
                    content: '❌ Google Sheets не инициализирован. Проверьте переменные окружения.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Пытаемся получить данные из таблицы
            const participants = await googleSheetsManager.getAllParticipants();
            
            const embed = new EmbedBuilder()
                .setTitle('🔧 Тест подключения к Google Sheets')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Статус', value: '✅ Подключение успешно', inline: true },
                    { name: 'Spreadsheet ID', value: googleSheetsManager.spreadsheetId || 'Не установлен', inline: true },
                    { name: 'Участников найдено', value: participants.length.toString(), inline: true }
                )
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral]
            });
        } catch (error) {
            const embed = new EmbedBuilder()
                .setTitle('🔧 Тест подключения к Google Sheets')
                .setColor('#ff0000')
                .addFields(
                    { name: 'Статус', value: '❌ Ошибка подключения', inline: true },
                    { name: 'Ошибка', value: error.message, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral]
            });
        }
    },

    async handleSync(interaction) {
        const date = interaction.options.getString('date');
        
        try {
            await interaction.editReply({
                content: '🔄 Начинаем синхронизацию... Это может занять некоторое время.',
                flags: [MessageFlags.Ephemeral]
            });

            const bulkUpdater = new BulkSheetsUpdater();
            const result = await bulkUpdater.syncParticipantsFromDatabase(date);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('🔄 Синхронизация завершена')
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'Добавлено участников', value: result.added.toString(), inline: true },
                        { name: 'Всего обработано', value: result.total.toString(), inline: true },
                        { name: 'Ошибок', value: result.errors.length.toString(), inline: true },
                        { name: 'В Google Sheets', value: result.sheetsParticipants.toString(), inline: true },
                        { name: 'В базе данных', value: result.databaseParticipants.toString(), inline: true }
                    )
                    .setTimestamp();

                if (result.errors.length > 0) {
                    embed.addFields({
                        name: 'Ошибки',
                        value: result.errors.slice(0, 10).join('\n') + (result.errors.length > 10 ? '\n...и еще ' + (result.errors.length - 10) + ' ошибок' : ''),
                        inline: false
                    });
                }

                await interaction.editReply({
                    embeds: [embed],
                    flags: [MessageFlags.Ephemeral]
                });
            } else {
                await interaction.editReply({
                    content: `❌ Ошибка синхронизации: ${result.error}`,
                    flags: [MessageFlags.Ephemeral]
                });
            }
        } catch (error) {
            await interaction.editReply({
                content: `❌ Ошибка при синхронизации: ${error.message}`,
                flags: [MessageFlags.Ephemeral]
            });
        }
    },

    async handleStats(interaction) {
        try {
            const bulkUpdater = new BulkSheetsUpdater();
            const stats = await bulkUpdater.getSyncStats();
            
            if (stats.success === false) {
                await interaction.editReply({
                    content: `❌ Ошибка при получении статистики: ${stats.error}`,
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 Статистика синхронизации')
                .setColor('#0099ff')
                .addFields(
                    { name: 'В Google Sheets', value: stats.sheetsParticipants.toString(), inline: true },
                    { name: 'В базе данных', value: stats.databaseParticipants.toString(), inline: true },
                    { name: 'Отсутствуют в Sheets', value: stats.missingInSheets.toString(), inline: true },
                    { name: 'Лишние в Sheets', value: stats.extraInSheets.toString(), inline: true }
                )
                .setTimestamp();

            if (stats.missingList.length > 0) {
                embed.addFields({
                    name: 'Отсутствуют в Google Sheets',
                    value: stats.missingList.slice(0, 10).join(', ') + (stats.missingList.length > 10 ? '\n...и еще ' + (stats.missingList.length - 10) + ' участников' : ''),
                    inline: false
                });
            }

            if (stats.extraList.length > 0) {
                embed.addFields({
                    name: 'Лишние в Google Sheets',
                    value: stats.extraList.slice(0, 10).join(', ') + (stats.extraList.length > 10 ? '\n...и еще ' + (stats.extraList.length - 10) + ' участников' : ''),
                    inline: false
                });
            }

            await interaction.editReply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral]
            });
        } catch (error) {
            await interaction.editReply({
                content: `❌ Ошибка при получении статистики: ${error.message}`,
                flags: [MessageFlags.Ephemeral]
            });
        }
    },

    async handleBulk(interaction) {
        const eventId = interaction.options.getString('event_id');
        const date = interaction.options.getString('date');
        
        try {
            await interaction.editReply({
                content: '🔄 Начинаем массовое обновление... Это может занять некоторое время.',
                flags: [MessageFlags.Ephemeral]
            });

            const bulkUpdater = new BulkSheetsUpdater();
            const result = await bulkUpdater.updateEventParticipants(eventId, date);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('🔄 Массовое обновление завершено')
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'Событие ID', value: eventId, inline: true },
                        { name: 'Обновлено участников', value: result.updated.toString(), inline: true },
                        { name: 'Всего участников', value: result.total.toString(), inline: true },
                        { name: 'Ошибок', value: result.errors.length.toString(), inline: true }
                    )
                    .setTimestamp();

                if (result.errors.length > 0) {
                    embed.addFields({
                        name: 'Ошибки',
                        value: result.errors.slice(0, 10).join('\n') + (result.errors.length > 10 ? '\n...и еще ' + (result.errors.length - 10) + ' ошибок' : ''),
                        inline: false
                    });
                }

                await interaction.editReply({
                    embeds: [embed],
                    flags: [MessageFlags.Ephemeral]
                });
            } else {
                await interaction.editReply({
                    content: `❌ Ошибка массового обновления: ${result.error}`,
                    flags: [MessageFlags.Ephemeral]
                });
            }
        } catch (error) {
            await interaction.editReply({
                content: `❌ Ошибка при массовом обновлении: ${error.message}`,
                flags: [MessageFlags.Ephemeral]
            });
        }
    },

    async handleListDate(interaction) {
        const date = interaction.options.getString('date');

        try {
            const participants = await googleSheetsManager.getParticipantsForDate(date);
            
            if (participants.length === 0) {
                await interaction.editReply({
                    content: `📋 Список участников для даты ${date} пуст или не удалось получить данные`,
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(`📋 Список участников для даты ${date}`)
                .setDescription(`Найдено участников: **${participants.length}**`)
                .setColor('#00ff00')
                .setTimestamp();

            // Разбиваем список на части, если участников много
            const chunkSize = 20;
            for (let i = 0; i < participants.length; i += chunkSize) {
                const chunk = participants.slice(i, i + chunkSize);
                const fieldName = i === 0 ? 'Участники' : `Участники (продолжение ${Math.floor(i / chunkSize) + 1})`;
                embed.addFields({
                    name: fieldName,
                    value: chunk.map((nickname, index) => `${i + index + 1}. ${nickname}`).join('\n'),
                    inline: false
                });
            }

            await interaction.editReply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral]
            });
        } catch (error) {
            await interaction.editReply({
                content: `❌ Ошибка при получении списка участников для даты ${date}: ${error.message}`,
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
}; 