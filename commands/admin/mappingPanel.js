const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const googleSheetsManager = require('../../utilities/googleSheets');
const { getMappingPanelChannel } = require('../../utilities/data/DataBase');
const mappingPanelUpdater = require('../../utilities/mappingPanelUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mappingpanel')
        .setDescription('Открыть панель управления маппингом ников'),

    admin: true,

    async execute(interaction, client) {
        try {
            // Сначала отвечаем на взаимодействие, чтобы избежать таймаута
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            // Получаем канал для панели управления маппингом
            const mappingPanelChannelId = await getMappingPanelChannel();
            
            if (!mappingPanelChannelId) {
                await interaction.editReply({
                    content: '❌ Канал для панели управления маппингом не настроен. Используйте `/settings setchannel` для настройки.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            const mappingPanelChannel = interaction.guild.channels.cache.get(mappingPanelChannelId);
            
            if (!mappingPanelChannel) {
                await interaction.editReply({
                    content: '❌ Настроенный канал для панели управления маппингом не найден. Проверьте настройки.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Создаем панель с помощью утилиты
            const { embed, components } = mappingPanelUpdater.createPanel();

            // Отправляем панель в указанный канал
            const panelMessage = await mappingPanelChannel.send({
                embeds: [embed],
                components: components
            });

            // Добавляем панель в список активных для автоматического обновления
            mappingPanelUpdater.addActivePanel(panelMessage.id, panelMessage);

            await interaction.editReply({
                content: `✅ Панель управления маппингом отправлена в канал ${mappingPanelChannel}`,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Ошибка в команде mappingPanel:', error);
            try {
                await interaction.editReply({
                    content: `❌ Ошибка при открытии панели: ${error.message}`,
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (replyError) {
                console.error('Не удалось отправить ответ об ошибке:', replyError);
            }
        }
    }
}; 