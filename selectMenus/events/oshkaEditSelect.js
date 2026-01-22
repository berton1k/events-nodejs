const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require("discord.js");
const { getOshkaTemplates } = require("../../utilities/data/DataBase");

module.exports = {
    data: new StringSelectMenuBuilder()
        .setCustomId('oshka_edit_select')
        .setPlaceholder('Выберите шаблон для редактирования'),
    async execute(interaction, client) {
        try {
            const selectedTemplateId = interaction.values[0];
            
            // Открываем модальное окно для редактирования
            const modalModule = require('../../modals/events/editOshkaModal');
            await modalModule.showModal(interaction, client, selectedTemplateId);

        } catch (error) {
            console.error('Ошибка при выборе шаблона для редактирования:', error);
            await interaction.reply({
                content: '❌ Произошла ошибка при выборе шаблона.',
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
} 