const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { updateExistingTables } = require('../../utilities/data/DataBase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('updatedatabase')
        .setDescription('Обновить структуру базы данных'),

    admin: true,

    async execute(interaction, client) {
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🔄 Обновление базы данных')
                .setDescription('Обновляю структуру базы данных...')
                .addFields({
                    name: '📋 Что будет проверено',
                    value: '• Таблица bans - наличие всех необходимых колонок\n• Автоматическое добавление недостающих колонок\n• Обновление структуры для команд модерации',
                    inline: false
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral]
            });

            // Обновляем структуру базы данных
            await updateExistingTables();

            embed.setColor('#00ff00')
                .setTitle('✅ База данных обновлена')
                .setDescription('Структура базы данных успешно обновлена!')
                .setFields({
                    name: '📊 Что было обновлено',
                    value: '• Проверена таблица bans\n• Добавлены недостающие колонки:\n  - `is_permanent` (BOOLEAN)\n  - `ban_until` (DATETIME)\n  - `reason` (TEXT)\n  - `moderator_id` (TEXT)\n  - `created_at` (DATETIME)\n• Проверена колонка `username` (если была с NOT NULL, заменена на правильную структуру)\n• Все таблицы модерации готовы к работе',
                    inline: false
                });

            await interaction.editReply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Ошибка при обновлении базы данных:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Ошибка обновления')
                .setDescription(`Произошла ошибка при обновлении базы данных: ${error.message}`)
                .addFields({
                    name: '🔍 Возможные причины',
                    value: '• Проблемы с правами доступа к базе данных\n• Повреждение файла базы данных\n• Недостаточно места на диске',
                    inline: false
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed],
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
