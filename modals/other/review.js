const {ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalSubmitInteraction, MessageFlags, EmbedBuilder, ComponentType} = require("discord.js");

module.exports = {
    data: new ModalBuilder()
        .setTitle("Напишите свой отзыв")
        .setCustomId("review")
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("text")
                    .setLabel("Содержание отзыва")
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

        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({ name: interaction.member.user.username, iconURL: interaction.member.user.avatarURL({}) })
                    .setFields([
                        {
                            name: "Автор отзыва:",
                            value: `<@${interaction.member.id}>`
                        },
                        {
                            name: "Текст отзыва:",
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