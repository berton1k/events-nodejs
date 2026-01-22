
const { StringSelectMenuBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, MessageFlags} = require('discord.js');
const {getEvent} = require("../../utilities/data/DataBase");

module.exports = {
    data: new StringSelectMenuBuilder()
            .setCustomId('event-select-edit')
            .setPlaceholder('Выберите ивент')
            .addOptions([
                { label: 'error', value: 'error', disabled: true },
            ]),
    async execute(interaction, client) {
        console.log('=== EVENT SELECT EDIT DEBUG ===');
        console.log('Selected value:', interaction.values[0]);
        
        // Извлекаем ID события из нового формата value
        const valueParts = interaction.values[0].split('_');
        const eventId = valueParts.slice(2).join('_'); // Объединяем оставшиеся части как ID
        
        console.log('Value parts:', valueParts);
        console.log('Extracted event ID:', eventId);
        
        const event = await getEvent(eventId);
        console.log('Found event:', event);

        // Проверяем, существует ли событие
        if (!event) {
            await interaction.reply({
                content: `Событие не найдено в базе данных. ID: ${eventId}`,
                flags: [MessageFlags.Ephemeral]
            });
            return;
        }

        const modal = client.modals.get("modal-event-edit").data
            .setCustomId(`modal-event-edit_${eventId}`)
            .setComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('event_name').setLabel('Название ивента').setStyle(TextInputStyle.Short).setValue(event.name)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('event_prize').setLabel('Призовой фонд').setPlaceholder("Пример: 50.000$").setStyle(TextInputStyle.Short).setValue(event.prize)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('event_task').setLabel('Задача').setStyle(TextInputStyle.Paragraph).setValue(event.task)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('event_rules').setLabel('Правила').setStyle(TextInputStyle.Paragraph).setValue(event.rules)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('event_image').setLabel('Ссылка на картинку').setStyle(TextInputStyle.Short).setValue(event.image)
                ),
            );

        await interaction.showModal(modal);
    }
};
