const {ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, ModalSubmitInteraction, MessageFlags, EmbedBuilder, ComponentType} = require("discord.js");

module.exports = {
    data: new ModalBuilder()
        .setTitle("Напишите свою жалобу")
        .setCustomId("report-helpers")
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("staticId")
                    .setLabel("Ваш Static ID")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("staticIdRep")
                    .setLabel("Static ID хелпера")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("text")
                    .setLabel("Краткое описание ситуации")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Paragraph)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("proof")
                    .setLabel("Доказательство")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("time")
                    .setLabel("Дата и время нарушения")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            )
        ),
    /**
     *
     * @param interaction {ModalSubmitInteraction}
     */
    execute: async (interaction) => {
        const channel = await interaction.guild.channels.fetch("1422051499923476580").catch(() => {});

        const staticId = interaction.fields.getField("staticId", ComponentType.TextInput);
        const staticIdRep = interaction.fields.getField("staticIdRep", ComponentType.TextInput);
        const text = interaction.fields.getField("text", ComponentType.TextInput);
        const proof = interaction.fields.getField("proof", ComponentType.TextInput);
        const time = interaction.fields.getField("time", ComponentType.TextInput);

        // Роли для тегания при отправке жалоб
        const roleMentions = "<@&1349492150508851230> <@&1389336260924936294> <@&1349492329395912745> <@&1349776856106274867>";

        await channel.send({
            content: roleMentions,
            embeds: [
                new EmbedBuilder()
                    .setTitle("Жалоба на Event Helper")
                    .setAuthor({ name: interaction.member.user.username, iconURL: interaction.member.user.avatarURL({}) })
                    .setFields([
                        {
                            name: "Автор жалобы:",
                            value: `<@${interaction.member.id}>`
                        },
                        {
                            name: "Ваш Static ID:",
                            value: staticId.value
                        },
                        {
                            name: "Static ID хелпера:",
                            value: staticIdRep.value
                        },
                        {
                            name: "Краткое описание ситуации:",
                            value: text.value
                        },
                        {
                            name: "Доказательство:",
                            value: proof.value
                        },
                        {
                            name: "Дата и время нарушения:",
                            value: time.value
                        }
                    ])
                    .setColor(0x292929)
                    .setTimestamp(Date.now())
                    .setFooter({ text: interaction.member.id })
            ]
        })

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xff2020)
                    .setDescription(`Отправлено.`)
            ],
            components: []
        })
    }
}
