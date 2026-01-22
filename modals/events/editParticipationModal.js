const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new ModalBuilder()
        .setCustomId('modal-edit-participation')
        .setTitle('Редактирование информации об участии')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('edit_oshka')
                    .setLabel('🏆 Ошка')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Введите ошку')
                    .setRequired(true)
                    .setMaxLength(4000)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('edit_request')
                    .setLabel('📋 Запрос')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Введите запрос')
                    .setRequired(true)
                    .setMaxLength(1000)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('edit_start_time')
                    .setLabel('⏰ Время начала')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Например: 20:00 или 20:30')
                    .setRequired(true)
                    .setMaxLength(10)
            )
        ),
    async execute(interaction, client, eventId) {
        try {
            const newOshka = interaction.fields.getTextInputValue('edit_oshka');
            const newRequest = interaction.fields.getTextInputValue('edit_request');
            const newStartTime = interaction.fields.getTextInputValue('edit_start_time');

            // Проверяем права пользователя
            const allowedRoleIds = ["1349492281027199088", "1349492446169399356"];
            const member = interaction.member;
            const hasPermission = allowedRoleIds.some(roleId => member.roles.cache.has(roleId));

            if (!hasPermission) {
                await interaction.reply({
                    content: "❌ У вас нет прав для редактирования информации об участии.",
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Сначала подтверждаем взаимодействие
            await interaction.deferUpdate();

            // Обновляем эмбед
            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            const existingFields = embed.data.fields || [];

            // Обновляем поля Ошка, Запрос и Время начала
            const oshkaFieldIndex = existingFields.findIndex(field => field.name === '🏆 Ошка');
            const requestFieldIndex = existingFields.findIndex(field => field.name === '📋 Запрос');
            const startTimeFieldIndex = existingFields.findIndex(field => field.name === '⏰ Время начала');

            if (oshkaFieldIndex !== -1) {
                existingFields[oshkaFieldIndex].value = `\`\`\`\n${newOshka}\n\`\`\``;
            } else {
                existingFields.push({
                    name: '🏆 Ошка',
                    value: `\`\`\`\n${newOshka}\n\`\`\``,
                    inline: false
                });
            }

            if (requestFieldIndex !== -1) {
                existingFields[requestFieldIndex].value = newRequest;
            } else {
                existingFields.push({
                    name: '📋 Запрос',
                    value: newRequest,
                    inline: false
                });
            }

            if (startTimeFieldIndex !== -1) {
                existingFields[startTimeFieldIndex].value = newStartTime;
            } else {
                existingFields.push({
                    name: '⏰ Время начала',
                    value: newStartTime,
                    inline: false
                });
            }

            embed.setFields(existingFields);

            // Обновляем сообщение
            await interaction.message.edit({
                embeds: [embed]
            });

            await interaction.followUp({
                content: '✅ Информация об участии успешно обновлена!',
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error("Ошибка при редактировании информации об участии:", error);
            try {
                await interaction.followUp({
                    content: '❌ Произошла ошибка при обновлении информации.',
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (replyError) {
                console.error("Не удалось отправить сообщение об ошибке:", replyError);
            }
        }
    }
}; 