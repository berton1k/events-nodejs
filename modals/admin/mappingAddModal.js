const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const googleSheetsManager = require('../../utilities/googleSheets');
const mappingPanelUpdater = require('../../utilities/mappingPanelUpdater');

module.exports = {
    data: new ModalBuilder()
        .setCustomId('mapping_add_modal')
        .setTitle('Добавить маппинг никнейма'),

    async execute(interaction, client) {
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const sheetsNickname = interaction.fields.getTextInputValue('sheets_nickname');
            const discordNickname = interaction.fields.getTextInputValue('discord_nickname');

            // Проверяем, что поля не пустые
            if (!sheetsNickname.trim() || !discordNickname.trim()) {
                await interaction.editReply({
                    content: '❌ Пожалуйста, заполните все поля',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Проверяем, не существует ли уже такой маппинг
            const mappings = googleSheetsManager.getNicknameMappings();
            if (mappings[discordNickname]) {
                await interaction.editReply({
                    content: `❌ Маппинг для **${discordNickname}** уже существует: **${discordNickname}** → **${mappings[discordNickname]}**`,
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Добавляем новый маппинг
            await googleSheetsManager.addNicknameMapping(discordNickname, sheetsNickname);

            // Обновляем все активные панели
            await mappingPanelUpdater.updateAllPanels();

            await interaction.editReply({
                content: `✅ Маппинг успешно добавлен!\n\n**${discordNickname}** → **${sheetsNickname}**`,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Ошибка в модальном окне mapping_add_modal:', error);
            // Ошибка обрабатывается в index.js, не нужно дублировать
            throw error;
        }
    }
}; 