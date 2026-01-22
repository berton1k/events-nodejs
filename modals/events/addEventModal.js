
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const {createEvent, getEventByName, getSettings} = require("../../utilities/data/DataBase");

module.exports = {
    data: new ModalBuilder()
        .setCustomId('modal-event-add')
        .setTitle('Добавить новый ивент')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('event_name').setLabel('Название ивента').setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('event_task').setLabel('Задача').setStyle(TextInputStyle.Paragraph)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('event_prize').setLabel('Призовой фонд').setPlaceholder("Пример: 50.000$").setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('event_rules').setLabel('Правила').setStyle(TextInputStyle.Paragraph)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('event_image').setLabel('Ссылка на картинку').setStyle(TextInputStyle.Short)
            )
        ),
    async execute(interaction) {
        const name = interaction.fields.getTextInputValue('event_name');
        const task = interaction.fields.getTextInputValue('event_task');
        const prize = interaction.fields.getTextInputValue('event_prize');
        const imageUrl = interaction.fields.getTextInputValue('event_image');
        const rules = interaction.fields.getTextInputValue('event_rules');
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const event = await getEventByName(name)
        const settings = await getSettings();
        let logsChannel;
        if (settings["channels"]["logs"])
            logsChannel = await interaction.guild.channels.fetch(settings["channels"]["logs"])
        else
            logsChannel = null;

        if (!event) {
            await createEvent(name, task, prize, imageUrl, rules);

            if (logsChannel) {
                await logsChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Создан ивент")
                            .setDescription(`<@${interaction.member.id}> создал ивент "${name}".`)
                            .setTimestamp(Date.now())
                            .setFooter({ text: interaction.member.id })
                            .setAuthor({ name: interaction.member.user.username, iconURL: interaction.member.user.avatarURL({}) })
                            .setColor("#49FFC5")
                    ]
                })
            }
            await interaction.editReply({ content: `Ивент "${name}" создан.` });
        } else {
            await interaction.editReply({ content: `Ивент "${name}" уже существует.` });
        }
    }
};
