const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, MessageFlags } = require("discord.js");
const { getSettingByKey, setSetting } = require("../../utilities/data/DataBase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("main-panel")
        .setDescription("Sends main panel to the server")
        .addStringOption(option =>
            option.setName("channel")
                .setDescription("ID канала или ветки (необязательно)")
                .setRequired(false)),
    async execute(interaction, client) {
        if (!interaction.member.permissions.has("Administrator")) return;

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // Проверяем, указан ли канал в параметрах
        const specifiedChannelId = interaction.options.getString("channel");
        
        if (specifiedChannelId) {
            // Если указан канал, используем его
            const targetChannel = interaction.guild.channels.cache.get(specifiedChannelId);
            
            if (!targetChannel) {
                await interaction.editReply({
                    content: `Ошибка: канал с ID ${specifiedChannelId} не найден.`
                });
                return;
            }

            // Отправляем панель в указанный канал
            await targetChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x292929)
                        .setDescription("Добро пожаловать в раздел обратной связи. Здесь вы можете оставить свои предложения или отзывы, чтобы помочь нам стать лучше.\n\n" +
                            "📝\ **Предложение**: нажмите кнопку **\"Предложить идею\"**. Расскажите нам, что бы вы хотели увидеть улучшенным или добавленным на мероприятиях.\n\n" +
                            "⭐\ **Отзыв**: нажмите кнопку **\"Оставить отзыв\"**. Расскажите нам о вашем опыте нахождения с нами, будь он положительным или негативный."
                        )
                        .setImage("https://media.discordapp.net/attachments/1349466493011624006/1351534894873972827/Special_02.png?ex=67daba75&is=67d968f5&hm=22e91f763843f1420424f230a1b26021a404f4b4916155bbba28e58859bedeab&=&format=webp&quality=lossless&width=999&height=562")
                ],
                components: [
                    new ActionRowBuilder()
                        .setComponents(
                            client.buttons.get("idea").data,
                            client.buttons.get("review").data
                        )
                ]
            });

            await interaction.editReply({
                content: `Панель отправлена в канал <#${specifiedChannelId}>.`
            });
            return;
        }

        // Если канал не указан, используем сохраненный или текущий
        let channelId = await getSettingByKey("ideas_channel_id");
        let isNewChannel = false;

        if (!channelId) {
            channelId = interaction.channel.id;
            await setSetting("ideas_channel_id", channelId);
            isNewChannel = true;
        }

        let ideas = interaction.guild.channels.cache.get(channelId);

        // Проверяем, что канал существует
        if (!ideas) {
            await interaction.editReply({
                content: `Ошибка: канал с ID ${channelId} не найден. Используйте команду в нужном канале для настройки.`
            });
            return;
        }

        // Отправляем панель в канал
        await ideas.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x292929)
                    .setDescription("Добро пожаловать в раздел обратной связи. Здесь вы можете оставить свои предложения или отзывы, чтобы помочь нам стать лучше.\n\n" +
                        "📝\ **Предложение**: нажмите кнопку **\"Предложить идею\"**. Расскажите нам, что бы вы хотели увидеть улучшенным или добавленным на мероприятиях.\n\n" +
                        "⭐\ **Отзыв**: нажмите кнопку **\"Оставить отзыв\"**. Расскажите нам о вашем опыте нахождения с нами, будь он положительным или негативным."
                    )
                    .setImage("https://media.discordapp.net/attachments/1349466493011624006/1351534894873972827/Special_02.png?ex=67daba75&is=67d968f5&hm=22e91f763843f1420424f230a1b26021a404f4b4916155bbba28e58859bedeab&=&format=webp&quality=lossless&width=999&height=562")
            ],
            components: [
                new ActionRowBuilder()
                    .setComponents(
                        client.buttons.get("idea").data,
                        client.buttons.get("review").data
                    )
            ]
        });

        // Отвечаем пользователю
        const replyMessage = isNewChannel 
            ? `ID канала настроен на текущий канал: ${channelId}. Панель отправлена.`
            : "Отправлено.";
            
        await interaction.editReply({
            content: replyMessage
        });
    }
}
