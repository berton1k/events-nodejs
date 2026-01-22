const {ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, ModalSubmitInteraction, MessageFlags, EmbedBuilder, ComponentType} = require("discord.js");

module.exports = {
    data: new ModalBuilder()
        .setTitle("Напишите свою идею")
        .setCustomId("idea")
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("text")
                    .setLabel("Содержание идеи")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Paragraph)
            )
        ),
    /**
     *
     * @param interaction {ModalSubmitInteraction}
     */
    execute: async (interaction) => {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const channel = await interaction.guild.channels.fetch("1422051945081999420").catch(() => {});

        const text = interaction.fields.getField("text", ComponentType.TextInput);

        // Роли для тегания при отправке идей
        const roleMentions = "<@&1349492281027199088><@&1349492150508851230><@&1389336260924936294>";

        await channel.send({
            content: roleMentions,
            embeds: [
                new EmbedBuilder()
                    .setAuthor({ name: interaction.member.user.username, iconURL: interaction.member.user.avatarURL({}) })
                    .setFields([
                        {
                            name: "Автор предложения:",
                            value: `<@${interaction.member.id}>`
                        },
                        {
                            name: "Описание идеи:",
                            value: text.value
                        }
                    ])
                    .setColor(0x292929)
                    .setTimestamp(Date.now())
                    .setFooter({ text: interaction.member.id })
            ]
        })

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xff2020)
                    .setDescription(`Отправлено.`)
            ],
        })
    }
}