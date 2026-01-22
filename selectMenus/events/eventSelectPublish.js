
const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, ComponentType, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputStyle, TextInputBuilder, MessageFlags, StringSelectMenuOptionBuilder
} = require('discord.js');
const {getEvent, getSettings, clearEventParticipants, getOshkaTemplates} = require("../../utilities/data/DataBase");

// Функция для проверки валидности URL
function isValidUrl(string) {
    try {
        const url = new URL(string);
        // Discord поддерживает только http:, https:, и attachment: протоколы
        return ['http:', 'https:', 'attachment:'].includes(url.protocol);
    } catch (_) {
        return false;
    }
}

module.exports = {
    data: new StringSelectMenuBuilder()
            .setCustomId('event-select-publish')
            .setPlaceholder('Выберите ивент')
            .addOptions([
                { label: 'error', value: 'error', disabled: true },
            ]),
    async execute(interaction, client) {
        console.log('=== EVENT SELECT PUBLISH START ===');
        console.log('User:', interaction.user.tag);
        console.log('Selected value:', interaction.values[0]);
        
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        } catch (error) {
            console.error('Ошибка при deferReply:', error);
            return;
        }
        
        // Извлекаем ID события из нового формата value
        const valueParts = interaction.values[0].split('_');
        console.log('Value parts:', valueParts);
        
        // Проверяем, что у нас достаточно частей
        if (valueParts.length < 3) {
            console.error('Неверный формат value:', interaction.values[0]);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Ошибка')
                        .setDescription('Неверный формат данных события.')
                        .setColor('#FF0000')
                ]
            });
            return;
        }
        
        // ID события начинается с третьей части и может содержать подчеркивания
        const eventId = valueParts.slice(2).join('_');
        console.log('Extracted event ID:', eventId);
        
        const event = await getEvent(eventId);

        // Проверяем, существует ли событие
        if (!event) {
            console.log('Событие не найдено в базе данных');
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Ошибка')
                        .setDescription('Событие не найдено в базе данных.')
                        .setColor('#FF0000')
                ]
            });
            return;
        }

        try {
            const buttonsRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`event-confirm-${event.id}`).setLabel('✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`event-cancel-${event.id}`).setLabel('❌').setStyle(ButtonStyle.Danger)
            );

            // Показываем итоговый эмбед с кнопками подтверждения
            const embed = new EmbedBuilder()
                .setTitle(event.name)
                .setDescription(`**Приветствуем, уважаемые игроки!**\nВ ближайшее время на сервере пройдет мероприятие.\nСледите за чатом в игре!\n\n**Задача:**\n${event.task}\n\n**Призовой фонд:** ${event.prize}\n\n**Правила**:\n${event.rules}`)
                .setColor("#009dbf");

            // Добавляем изображение только если оно валидно
            if (event.image && event.image !== 'Test' && isValidUrl(event.image)) {
                embed.setImage(event.image);
            }

            await interaction.editReply({
                content: '',
                embeds: [embed],
                components: [buttonsRow]
            });

            const buttonResponse = await interaction.channel.awaitMessageComponent({
                componentType: ComponentType.Button,
                filter: (i) => i.user.id === interaction.user.id && (i.customId === `event-confirm-${event.id}` || i.customId === `event-cancel-${event.id}`),
                time: 300000 // Увеличиваем до 5 минут
            });

            if (buttonResponse.customId === `event-confirm-${event.id}`) {
                console.log('Пользователь подтвердил публикацию, показываем модальное окно...');
                

                // Создаем модальное окно вручную
                console.log('Создаем модальное окно с customId:', `modal-event-publish_${event.id}`);
                
                const modal = new ModalBuilder()
                    .setCustomId(`modal-event-publish_${event.id}`)
                    .setTitle('Публикация ивента')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('event_oshka')
                                .setLabel('🏆 Ошка (оставьте пустым для выбора шаблона)')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Введите ошку, номер шаблона (1,2,3) или оставьте пустым')
                                .setRequired(false)
                                .setMaxLength(4000)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('event_request')
                                .setLabel('📋 Запрос')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Введите запрос')
                                .setRequired(true)
                                .setMaxLength(1000)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('event_organizer')
                                .setLabel('👤 Организатор')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Введите Discord ID или @тег организатора')
                                .setRequired(true)
                                .setMaxLength(100)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('event_start_time')
                                .setLabel('⏰ Время начала')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Например: 20:00 или 20:30')
                                .setRequired(true)
                                .setMaxLength(10)
                        )
                    );
                console.log('Модальное окно создано успешно');

                console.log('Отправляем модальное окно...');
                await buttonResponse.showModal(modal);
                console.log('Модальное окно отправлено успешно');
            } else if (buttonResponse.customId === `event-cancel-${event.id}`) {
                await buttonResponse.update({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('❌ Публикация отменена')
                            .setDescription('Публикация ивента была отменена.')
                            .setColor('#FF0000')
                    ],
                    components: []
                });
            }
            
            console.log('=== EVENT SELECT PUBLISH END ===');
        } catch (error) {
            console.error("Ошибка в eventSelectPublish:", error);
            
            // Проверяем, является ли ошибка связанной с истекшим взаимодействием
            if (error.code === 10062) {
                console.log('Взаимодействие истекло, пропускаем обработку ошибки');
                return;
            }
            
            let errorMessage = '❌ Неизвестная ошибка, попробуйте позже';
            
            if (error.code === 'InteractionCollectorError') {
                errorMessage = '⏰ Время ожидания истекло. Вы не подтвердили публикацию вовремя.';
            } else if (error.message) {
                errorMessage = `❌ Ошибка: ${error.message}`;
            }

            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Ошибка')
                                .setDescription(errorMessage)
                                .setColor('#FF0000')
                        ],
                        flags: [MessageFlags.Ephemeral]
                    });
                } else {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Ошибка')
                                .setDescription(errorMessage)
                                .setColor('#FF0000')
                        ]
                    });
                }
            } catch (replyError) {
                console.error("Не удалось отправить сообщение об ошибке:", replyError);
                // Если не можем отправить сообщение об ошибке, просто логируем
            }
        }
    }
};
