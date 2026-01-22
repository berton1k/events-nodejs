const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { updateExistingTables, fixWarningsTable } = require('../../utilities/data/DataBase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fixdatabase')
        .setDescription('Исправить структуру базы данных'),

    admin: true,

    async execute(interaction, client) {
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🔧 Исправление базы данных')
                .setDescription('Начинаю проверку и исправление структуры таблиц...')
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral]
            });

            // Запускаем обновление структуры таблиц
            await updateExistingTables();
            
            // Дополнительно исправляем таблицу warnings
            try {
                await fixWarningsTable();
                console.log('Таблица warnings дополнительно проверена и исправлена');
            } catch (warningError) {
                console.log('Дополнительная проверка warnings:', warningError.message);
            }

            embed.setDescription('✅ Структура базы данных успешно исправлена!')
                .addFields(
                    { name: 'Проверено', value: 'Таблицы warnings, warning_kicks, bans', inline: true },
                    { name: 'Статус', value: 'Исправлено', inline: true }
                );

            await interaction.editReply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Ошибка при исправлении базы данных:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Ошибка')
                .setDescription(`Произошла ошибка при исправлении базы данных: ${error.message}`)
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed],
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
