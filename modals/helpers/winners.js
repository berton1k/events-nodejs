const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, ModalSubmitInteraction, EmbedBuilder, MessageFlags } = require("discord.js");
const axios = require("axios");

const isImageUrl = async (url) => {
    try {
        // Проверяем протокол URL
        const urlObj = new URL(url);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return false;
        }
        
        const response = await axios.head(url);
        return response.headers["content-type"].startsWith("image/");
    } catch (err) {
        return false;
    }
};

module.exports = {
    data: new ModalBuilder()
        .setTitle("Победители мероприятия")
        .setCustomId("mp-winner")
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("event_name")
                    .setLabel("Название мероприятия")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("winner_id")
                    .setLabel("Статик ID победителя")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("photo_link")
                    .setLabel("Ссылка на фото")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            )
        ),

    /**
     * 
     * @param {ModalSubmitInteraction} interaction
     */
    execute: async (interaction) => {
        try {
            await interaction.deferReply({
                flags: [MessageFlags.Ephemeral]
            })
            const eventName = interaction.fields.getTextInputValue("event_name");
            const winnerId = interaction.fields.getTextInputValue("winner_id");
            const photoLink = interaction.fields.getTextInputValue("photo_link");

            if (!(await isImageUrl(photoLink)) || photoLink === 'Test') {
                return await interaction.editReply({
                    content: "Невереная ссылка на картинку."
                })
            }

            const embed = new EmbedBuilder()
            .setTitle(`🏆 Победители мероприятия ${eventName}`)
            .setDescription(`\nИгрок со статиком **#${winnerId}** становится победителем!\n`)
            .setColor("009dbf")
            .setImage(photoLink)
            .setFooter({
                text: `${interaction.user.tag} | ${new Date().toLocaleString()}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            });

            const channel = await interaction.guild.channels.fetch("1350232997630050304").catch(() => null);
            
            if (!channel) {
                return interaction.editReply({
                    content: "❌ Ошибка: Не удалось найти канал для публикации победителя.",
                });
            }

            await channel.send({ embeds: [embed] });

            await interaction.editReply({
                content: "Опубликовано."
            });

        } catch (error) {
            console.error("Ошибка при обработке модального окна:", error);
            await interaction.editReply({
                content: "❌ Произошла ошибка при обработке вашего запроса.",
            });
        }
    }
};