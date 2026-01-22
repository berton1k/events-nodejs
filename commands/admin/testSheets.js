const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const googleSheetsManager = require('../../utilities/googleSheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testsheets')
        .setDescription('Простая тестовая команда для Google Sheets'),

    admin: true,

    async execute(interaction, client) {
        try {
            // Сразу отвечаем
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            // Простая проверка подключения
            const currentDate = googleSheetsManager.getCurrentDate();
            const mappings = googleSheetsManager.getNicknameMappings();
            const status = googleSheetsManager.getInitializationStatus();

            const statusText = status.isReady ? '✅ Готов' : '❌ Не готов';
            const details = `Sheets API: ${status.sheets ? '✅' : '❌'}\nSpreadsheet ID: ${status.spreadsheetId ? '✅' : '❌'}\nAuth: ${status.auth ? '✅' : '❌'}`;

            await interaction.editReply({
                content: `🔧 Статус Google Sheets:\n\n${statusText}\n\n📅 Текущая дата: ${currentDate}\n📋 Маппингов ников: ${Object.keys(mappings).length}\n\n📊 Детали:\n${details}`,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Ошибка в команде testSheets:', error);
            
            try {
                if (interaction.deferred) {
                    await interaction.editReply({
                        content: `❌ Ошибка теста: ${error.message}`,
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } catch (replyError) {
                console.error('Не удалось отправить ответ об ошибке:', replyError);
            }
        }
    }
}; 