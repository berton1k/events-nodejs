const {ModalBuilder, Client, TextInputBuilder, ActionRowBuilder, TextInputStyle, ModalSubmitInteraction, MessageFlags, EmbedBuilder, ComponentType} = require("discord.js");
const {getButtonWithId} = require("../../utilities/data/utils");
const { connectDatabase } = require("../../utilities/data/DataBase");


module.exports = {
    data: new ModalBuilder()
        .setTitle("Заполните информацию о вашем отпуске")
        .setCustomId("away")
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("awaytime")
                    .setLabel("Дата вашего отсутствия")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("reason")
                    .setLabel("Причина отсутствия")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            )
        ),

/**
 *
 * @param interaction {ModalSubmitInteraction}
 * @param client {Client}
 */
execute: async (interaction, client) => {
    try {
        // Сначала подтверждаем взаимодействие
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        
        const awaytime = interaction.fields.getTextInputValue("awaytime");
        const reason = interaction.fields.getTextInputValue("reason");

        // Роли, которые нужно упомянуть
        let roleMentions = "<@&1349492150508851230> <@&1389336260924936294> <@&1349492329395912745> <@&1349776856106274867>";

        const channel = await interaction.guild.channels.fetch("1422051145521692753").catch(() => {
            console.error("Не удалось найти канал для отправки сообщения.");
            return null;
        });

        if (!channel) {
            await interaction.editReply({
                content: "❌ Не удалось найти канал для отправки запроса. Обратитесь к администратору."
            });
            return;
        }

        await channel.send({
            content: roleMentions,
            embeds: [
                new EmbedBuilder()
                    .setTitle("Отпуск")
                    .setDescription(`<@${interaction.user.id}> запрашивает отпуск`)
                    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                    .addFields(
                        { name: "Дата отсутствия:", value: awaytime },
                        { name: "Причина:", value: reason }
                    )
                    .setColor("009dbf")
                    .setTimestamp()
                    .setFooter({ text: `ID: ${interaction.user.id}` })
            ],
            components: [
                new ActionRowBuilder().setComponents(
                    getButtonWithId(client, "acceptaway", interaction.member.id),
                    getButtonWithId(client, "rejectaway", interaction.member.id),
                )
            ]
        });

        await interaction.editReply({
            content: "✅ Ваш запрос на отпуск был успешно отправлен на утверждение."
        });
    } catch (error) {
        console.error("Ошибка в обработке модального окна:", error);
        
        // Пытаемся отправить сообщение об ошибке
        try {
            if (interaction.deferred) {
                await interaction.editReply({
                    content: "❌ Произошла ошибка при обработке вашего запроса. Попробуйте позже."
                });
            } else {
                await interaction.reply({
                    content: "❌ Произошла ошибка при обработке вашего запроса. Попробуйте позже.",
                    flags: [MessageFlags.Ephemeral]
                });
            }
        } catch (replyError) {
            console.error("Не удалось отправить сообщение об ошибке:", replyError);
        }
    }
}
};
