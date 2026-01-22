const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, MessageFlags } = require("discord.js");
const { getOshkaTemplates, updateOshkaTemplate } = require("../../utilities/data/DataBase");

// Функция для создания модального окна с динамическими полями
const createEditModal = (templateId, template) => {
    return new ModalBuilder()
        .setCustomId(`editoshka_${templateId}`)
        .setTitle('Редактировать шаблон Ошки')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('oshka_name')
                    .setLabel('Название шаблона')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Например: Дерби 2.0')
                    .setRequired(true)
                    .setMaxLength(100)
                    .setValue(template.name)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('oshka_content')
                    .setLabel('Содержимое шаблона')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('/o Уважаемые игроки, сейчас будет проведено мероприятие...')
                    .setRequired(true)
                    .setMaxLength(2000)
                    .setValue(template.content)
            )
        );
};

// Функция для показа модального окна
const showModal = async (interaction, client, templateId) => {
    try {
        // Получаем шаблон по ID
        const templates = await getOshkaTemplates();
        const template = templates.find(t => t.id.toString() === templateId);
        
        if (!template) {
            await interaction.reply({
                content: '❌ Шаблон не найден.',
                flags: [MessageFlags.Ephemeral]
            });
            return;
        }

        const modal = createEditModal(templateId, template);
        await interaction.showModal(modal);

    } catch (error) {
        console.error('Ошибка при открытии модального окна редактирования:', error);
        await interaction.reply({
            content: '❌ Произошла ошибка при открытии формы редактирования.',
            flags: [MessageFlags.Ephemeral]
        });
    }
};

// Основной экспорт для регистрации модального окна
module.exports = {
    data: new ModalBuilder()
        .setCustomId('editoshka')
        .setTitle('Редактировать шаблон Ошки')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('oshka_name')
                    .setLabel('Название шаблона')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Например: Дерби 2.0')
                    .setRequired(true)
                    .setMaxLength(100)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('oshka_content')
                    .setLabel('Содержимое шаблона')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('/o Уважаемые игроки, сейчас будет проведено мероприятие...')
                    .setRequired(true)
                    .setMaxLength(2000)
            )
        ),
    async execute(interaction, client) {
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const templateId = interaction.customId.split('_')[1]; // Получаем ID из customId
            const name = interaction.fields.getTextInputValue('oshka_name');
            const content = interaction.fields.getTextInputValue('oshka_content');

            // Обновляем шаблон в базе данных
            await updateOshkaTemplate(templateId, name, content);

            await interaction.editReply({
                content: `✅ Шаблон Ошки "${name}" успешно обновлен!`
            });

        } catch (error) {
            console.error('Ошибка при обновлении шаблона Ошки:', error);
            await interaction.editReply({
                content: '❌ Произошла ошибка при обновлении шаблона Ошки.'
            });
        }
    },
    showModal
}; 