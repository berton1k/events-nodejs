const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { getOshkaTemplates, deleteOshkaTemplate } = require("../../utilities/data/DataBase");

module.exports = {
    data: new StringSelectMenuBuilder()
        .setCustomId('oshka_delete_select')
        .setPlaceholder('Выберите шаблон для удаления'),
    async execute(interaction, client) {
        try {
            const selectedTemplateId = interaction.values[0];
            
            // Получаем информацию о выбранном шаблоне
            const templates = await getOshkaTemplates();
            const selectedTemplate = templates.find(t => t.id.toString() === selectedTemplateId);
            
            if (!selectedTemplate) {
                await interaction.reply({
                    content: '❌ Выбранный шаблон не найден.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Создаем кнопки подтверждения
            const confirmRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('oshka_delete_confirm')
                        .setLabel('✅ Подтвердить удаление')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('oshka_delete_cancel')
                        .setLabel('❌ Отменить')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({
                content: `**Вы уверены, что хотите удалить шаблон "${selectedTemplate.name}"?**\n\n**Содержимое:**\n\`\`\`${selectedTemplate.content}\`\`\`\n\n**ID шаблона: ${selectedTemplate.id}**`,
                components: [confirmRow],
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error('Ошибка при выборе шаблона для удаления:', error);
            await interaction.reply({
                content: '❌ Произошла ошибка при выборе шаблона.',
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
} 