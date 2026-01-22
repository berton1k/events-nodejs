const { ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const googleSheetsManager = require('../../utilities/googleSheets');
const mappingPanelUpdater = require('../../utilities/mappingPanelUpdater');
const { canUserDeleteMappings } = require('../../utilities/data/DataBase');

module.exports = {
    data: new ButtonBuilder()
        .setCustomId('mapping_delete_confirm')
        .setLabel('✅ Подтвердить удаление')
        .setStyle(ButtonStyle.Danger),

    async execute(interaction, client) {
        try {
            // Проверяем права пользователя на удаление маппингов
            const canDelete = await canUserDeleteMappings(interaction.member);
            if (!canDelete) {
                await interaction.reply({
                    content: '❌ У вас нет прав для удаления маппингов ников',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Извлекаем Discord ник из customId
            const customId = interaction.customId;
            const discordNickname = customId.replace('mapping_delete_confirm_', '');

            if (!discordNickname) {
                await interaction.reply({
                    content: '❌ Не удалось определить маппинг для удаления',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            const mappings = googleSheetsManager.getNicknameMappings();
            const sheetsNickname = mappings[discordNickname];

            if (!sheetsNickname) {
                await interaction.reply({
                    content: '❌ Выбранный маппинг не найден',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Удаляем маппинг
            const removedSheetsNickname = await googleSheetsManager.removeNicknameMapping(discordNickname);

            // Обновляем все активные панели
            await mappingPanelUpdater.updateAllPanels();

            await interaction.reply({
                content: `✅ Маппинг успешно удален!\n\n**${discordNickname}** → **${sheetsNickname}**`,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Ошибка в кнопке mapping_delete_confirm:', error);
            // Ошибка обрабатывается в index.js, не нужно дублировать
            throw error;
        }
    }
}; 