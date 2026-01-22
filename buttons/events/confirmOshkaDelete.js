const { ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { deleteOshkaTemplate, getOshkaTemplates } = require("../../utilities/data/DataBase");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId('oshka_delete_confirm')
        .setLabel('✅ Подтвердить удаление')
        .setStyle(ButtonStyle.Danger),
    async execute(interaction, client) {
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            // Получаем ID шаблона из сообщения
            const messageContent = interaction.message.content;
            const templateIdMatch = messageContent.match(/ID шаблона: (\d+)/);
            const templateId = templateIdMatch ? templateIdMatch[1] : null;
            
            if (!templateId) {
                await interaction.editReply({
                    content: '❌ Не удалось определить ID шаблона.'
                });
                return;
            }
            
            // Получаем информацию о шаблоне перед удалением
            const templates = await getOshkaTemplates();
            const templateToDelete = templates.find(t => t.id.toString() === templateId);
            
            if (!templateToDelete) {
                await interaction.editReply({
                    content: '❌ Шаблон не найден.'
                });
                return;
            }

            // Удаляем шаблон
            await deleteOshkaTemplate(templateId);

            await interaction.editReply({
                content: `✅ Шаблон "${templateToDelete.name}" успешно удален!`
            });

        } catch (error) {
            console.error('Ошибка при удалении шаблона Ошки:', error);
            await interaction.editReply({
                content: '❌ Произошла ошибка при удалении шаблона.'
            });
        }
    }
} 