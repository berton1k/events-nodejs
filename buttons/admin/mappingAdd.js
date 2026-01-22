const { ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const googleSheetsManager = require('../../utilities/googleSheets');

module.exports = {
    data: new ButtonBuilder()
        .setCustomId('mapping_add')
        .setLabel('➕ Добавить маппинг')
        .setStyle(ButtonStyle.Success),

    async execute(interaction, client) {
        try {
            // Получаем Discord ник из взаимодействия
            const discordNickname = interaction.user.username;
            
            // Создаем модальное окно для ввода никнейма из Google Sheets
            const modal = new ModalBuilder()
                .setCustomId('mapping_add_modal')
                .setTitle('Добавить маппинг никнейма');

            const sheetsNicknameInput = new TextInputBuilder()
                .setCustomId('sheets_nickname')
                .setLabel('Никнейм в Google Sheets')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Введите никнейм из Google Sheets таблицы')
                .setRequired(true)
                .setMaxLength(50);

            const discordNicknameInput = new TextInputBuilder()
                .setCustomId('discord_nickname')
                .setLabel('Discord никнейм (автозаполнение)')
                .setStyle(TextInputStyle.Short)
                .setValue(discordNickname)
                .setRequired(true)
                .setMaxLength(50);

            const firstActionRow = new ActionRowBuilder().addComponents(sheetsNicknameInput);
            const secondActionRow = new ActionRowBuilder().addComponents(discordNicknameInput);

            modal.addComponents(firstActionRow, secondActionRow);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Ошибка в кнопке mapping_add:', error);
            // Ошибка обрабатывается в index.js, не нужно дублировать
            throw error;
        }
    }
}; 