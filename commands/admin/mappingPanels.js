const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const mappingPanelUpdater = require('../../utilities/mappingPanelUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mappingpanels')
        .setDescription('Управление активными панелями маппинга')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Действие')
                .setRequired(true)
                .addChoices(
                    { name: 'Показать активные панели', value: 'list' },
                    { name: 'Обновить все панели', value: 'update' },
                    { name: 'Очистить все панели', value: 'clear' }
                )),

    admin: true,

    async execute(interaction, client) {
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const action = interaction.options.getString('action');

            switch (action) {
                case 'list':
                    const activeCount = mappingPanelUpdater.getActivePanelsCount();
                    const embed = new EmbedBuilder()
                        .setTitle('📋 Активные панели маппинга')
                        .setColor('#0099ff')
                        .addFields(
                            { name: '📊 Статистика', value: `Активных панелей: **${activeCount}**`, inline: true }
                        )
                        .setTimestamp();

                    if (activeCount === 0) {
                        embed.addFields({
                            name: 'ℹ️ Информация',
                            value: 'Нет активных панелей. Используйте `/mappingpanel` для создания новой панели.',
                            inline: false
                        });
                    } else {
                        embed.addFields({
                            name: 'ℹ️ Информация',
                            value: 'Панели автоматически обновляются при добавлении/удалении маппингов.',
                            inline: false
                        });
                    }

                    await interaction.editReply({
                        embeds: [embed],
                        flags: [MessageFlags.Ephemeral]
                    });
                    break;

                case 'update':
                    await mappingPanelUpdater.updateAllPanels();
                    await interaction.editReply({
                        content: `✅ Обновлено **${mappingPanelUpdater.getActivePanelsCount()}** активных панелей`,
                        flags: [MessageFlags.Ephemeral]
                    });
                    break;

                case 'clear':
                    mappingPanelUpdater.clearAllPanels();
                    await interaction.editReply({
                        content: '🧹 Все активные панели очищены',
                        flags: [MessageFlags.Ephemeral]
                    });
                    break;

                default:
                    await interaction.editReply({
                        content: '❌ Неизвестное действие',
                        flags: [MessageFlags.Ephemeral]
                    });
            }

        } catch (error) {
            console.error('Ошибка в команде mappingPanels:', error);
            try {
                await interaction.editReply({
                    content: `❌ Ошибка: ${error.message}`,
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (replyError) {
                console.error('Не удалось отправить ответ об ошибке:', replyError);
            }
        }
    }
}; 