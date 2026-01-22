
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags} = require('discord.js');
const {updateEvent, getEvent, getSettings} = require("../../utilities/data/DataBase");

module.exports = {
    data: new ModalBuilder()
        .setCustomId('modal-event-edit')
        .setTitle('Редактировать ивент'),
    async execute(interaction, client, eventId) {
        console.log('=== EDIT EVENT MODAL DEBUG ===');
        console.log('Event ID from parameter:', eventId);
        
        const name = interaction.fields.getTextInputValue('event_name');
        const task = interaction.fields.getTextInputValue('event_task');
        const prize = interaction.fields.getTextInputValue('event_prize');
        const imageUrl = interaction.fields.getTextInputValue('event_image');
        const rules = interaction.fields.getTextInputValue('event_rules');

        // Получаем событие по ID
        const event = await getEvent(eventId);
        console.log('Found event:', event);
        
        const settings = await getSettings();
        let logsChannel;
        if (settings["channels"]["logs"])
            logsChannel = await interaction.guild.channels.fetch(settings["channels"]["logs"])
        else
            logsChannel = null;

        if (!event) {
            try {
                await interaction.update({ flags: [MessageFlags.Ephemeral], content: `Событие не найдено в базе данных. ID: ${eventId}`, components: []});
            } catch (error) {
                console.error("Не удалось обновить взаимодействие:", error);
            }
            return;
        }

        // Обновляем событие по ID
        await updateEvent(eventId, name, task, prize, imageUrl, rules);
        try {
            await interaction.update({ flags: [MessageFlags.Ephemeral], content: `Ивент "${name}" обновлён.`, components: []});
        } catch (error) {
            console.error("Не удалось обновить взаимодействие:", error);
        }

        if (logsChannel) {
            await logsChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Отредактирован ивент")
                        .setDescription(`<@${interaction.member.id}> отредактировал ивент "${name}".`)
                        .setTimestamp(Date.now())
                        .setFooter({ text: interaction.member.id })
                        .setAuthor({ name: interaction.member.user.username, iconURL: interaction.member.user.avatarURL({}) })
                        .setColor("#49FFC5")
                ]
            })
        }
    }
};
