const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, MessageFlags } = require("discord.js");
const { addOshkaTemplate } = require("../../utilities/data/DataBase");

module.exports = {
    data: new ModalBuilder()
        .setCustomId('addoshka')
        .setTitle('Добавить шаблон Ошки')
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

            const name = interaction.fields.getTextInputValue('oshka_name');
            const content = interaction.fields.getTextInputValue('oshka_content');

            // Добавляем шаблон в базу данных
            await addOshkaTemplate(name, content);

            await interaction.editReply({
                content: `✅ Шаблон Ошки "${name}" успешно добавлен!`
            });

        } catch (error) {
            console.error('Ошибка при добавлении шаблона Ошки:', error);
            await interaction.editReply({
                content: '❌ Произошла ошибка при добавлении шаблона Ошки.'
            });
        }
    }
}; 