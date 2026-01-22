const { ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId("edit_participation")
        .setLabel("✏️ Редактировать")
        .setStyle(ButtonStyle.Primary),

    /**
     * @param {ButtonInteraction} interaction
     * @param {Client} client
     * @param {string|null} eventId - ID события (указывается при создании кнопки)
     */
    execute: async (interaction, client, eventId) => {
        try {
            console.log('=== EDIT PARTICIPATION BUTTON START ===');
            console.log('Button clicked:', interaction.customId);
            console.log('User:', interaction.user.tag);
            console.log('Event ID from args:', eventId);
            
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

            if (!eventId) {
                // Извлекаем ID события из customId кнопки
                const customIdParts = interaction.customId.split('_');
                eventId = customIdParts.slice(2).join('_');
            }

            // Получаем текущие значения из эмбеда
            const embed = interaction.message.embeds[0];
            let currentOshka = '';
            let currentRequest = '';
            let currentStartTime = '';

            // Извлекаем текущие значения из полей эмбеда
            if (embed.fields) {
                const oshkaField = embed.fields.find(field => field.name === '🏆 Ошка');
                const requestField = embed.fields.find(field => field.name === '📋 Запрос');
                const startTimeField = embed.fields.find(field => field.name === '⏰ Время начала');
                
                if (oshkaField) {
                    // Извлекаем значение из блока кода (убираем ```)
                    currentOshka = oshkaField.value.replace(/```\n?/g, '').replace(/\n?```/g, '').trim();
                }
                if (requestField) currentRequest = requestField.value;
                if (startTimeField) currentStartTime = startTimeField.value;
            }

            // Создаем модальное окно для редактирования
            const modal = new ModalBuilder()
                .setCustomId(`modal-edit-participation_${eventId}`)
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
                            .setValue(currentOshka)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('edit_request')
                            .setLabel('📋 Запрос и статик')
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder('Введите запрос')
                            .setRequired(true)
                            .setMaxLength(1000)
                            .setValue(currentRequest)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('edit_start_time')
                            .setLabel('⏰ Время начала')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Например: 20:00 или 20:30')
                            .setRequired(true)
                            .setMaxLength(10)
                            .setValue(currentStartTime)
                    )
                );

            await interaction.showModal(modal);
            console.log('Modal shown successfully');

            console.log('=== EDIT PARTICIPATION BUTTON END ===');

        } catch (error) {
            console.error("=== ERROR IN EDIT PARTICIPATION BUTTON ===");
            console.error("Error:", error);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            
            try {
                await interaction.reply({
                    content: "❌ Произошла ошибка при открытии формы редактирования.",
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (replyError) {
                console.error("Reply error:", replyError);
            }
        }
    }
}; 