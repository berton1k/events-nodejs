
const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const {getEvent, deleteEvent, getSettings} = require("../../utilities/data/DataBase");

module.exports = {
    data: new StringSelectMenuBuilder()
            .setCustomId('event-select-delete')
            .setPlaceholder('Выберите ивент')
            .addOptions([
                { label: 'error', value: 'error', disabled: true },
            ]),
    async execute(interaction) {
        // Извлекаем ID события из нового формата value
        const valueParts = interaction.values[0].split('_');
        const eventId = valueParts.slice(2).join('_'); // Объединяем оставшиеся части как ID
        
        const event = await getEvent(eventId);

        // Проверяем, существует ли событие
        if (!event) {
            await interaction.reply({
                content: 'Событие не найдено в базе данных.',
                flags: [MessageFlags.Ephemeral]
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('Подтверждение удаления')
            .setDescription(`Вы действительно хотите удалить ивент **${event.name}**?`)
            .setColor('#ff0000');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm-delete-${event.id}`)
                .setLabel('✅ Подтвердить')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`cancel-delete-${event.id}`)
                .setLabel('❌ Отмена')
                .setStyle(ButtonStyle.Secondary),
        );

        try {
            await interaction.update({
                content: '',
                embeds: [embed],
                components: [row]
            });
        } catch (error) {
            console.error("Не удалось обновить взаимодействие:", error);
            return;
        }

        try {
            const response = await interaction.channel.awaitMessageComponent({
                componentType: ComponentType.Button,
                filter: (i) => i.user.id === interaction.user.id &&
                    (i.customId === `confirm-delete-${event.id}` || i.customId === `cancel-delete-${event.id}`),
                time: 120000
            });

            if (response.customId === `confirm-delete-${event.id}`) {
                await deleteEvent(event.id);

                const settings = await getSettings(interaction.guild.id);

                let logsChannel;
                if (settings["channels"]["logs"])
                    logsChannel = await interaction.guild.channels.fetch(settings["channels"]["logs"])
                else
                    logsChannel = null;

                if (logsChannel) {
                    await logsChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Удалён ивент")
                                .setDescription(`<@${interaction.member.id}> удалил ивент "${event.name}".`)
                                .setTimestamp(Date.now())
                                .setFooter({ text: interaction.member.id })
                                .setAuthor({ name: interaction.member.user.username, iconURL: interaction.member.user.avatarURL({}) })
                                .setColor("#49FFC5")
                        ]
                    })
                }

                await response.update({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Ивент удалён')
                            .setDescription(`Ивент **${event.name}** был успешно удалён.`)
                            .setColor('#00ff00')
                    ],
                    components: []
                });
            } else {
                await response.update({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Отмена')
                            .setDescription('Удаление ивента отменено.')
                            .setColor('#dcdc4e')
                    ],
                    components: []
                });
            }
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Время истекло')
                        .setDescription('Вы не подтвердили или не отменили удаление вовремя.')
                        .setColor('#ff0000')
                ],
                components: []
            });
        }
    }
};
