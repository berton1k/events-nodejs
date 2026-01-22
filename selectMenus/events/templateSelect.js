const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getOshkaTemplates, getEvent, getSettings, clearEventParticipants, updateEventOrganizer, addEventParticipant, getEventParticipants } = require("../../utilities/data/DataBase");

module.exports = {
    data: new StringSelectMenuBuilder()
        .setCustomId('template_select_')
        .setPlaceholder('Выберите шаблон Ошки'),

    async execute(interaction, client) {
        try {
            console.log('=== TEMPLATE SELECT START ===');
            console.log('User:', interaction.user.tag);
            console.log('Selected template ID:', interaction.values[0]);
            console.log('Custom ID:', interaction.customId);
            
            // Сразу дефолтим взаимодействие, чтобы оно не истекло
            await interaction.deferUpdate();
            
            const selectedTemplateId = interaction.values[0];
            const templates = await getOshkaTemplates();
            const selectedTemplate = templates.find(t => t.id.toString() === selectedTemplateId);

            // Извлекаем данные из customId
            const customIdParts = interaction.customId.split('_');
            console.log('Custom ID parts:', customIdParts);
            
            // Проверяем, что у нас достаточно частей
            if (customIdParts.length < 6) {
                console.error('Неверный формат customId:', interaction.customId);
                await interaction.editReply({
                    content: '❌ Неверный формат данных.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }
            
            // Формат: template_select_BASE64_EVENTID_ENCODED_REQUEST_ENCODED_ORGANIZER_ENCODED_STARTTIME
            // ID события закодирован в Base64, поэтому нужно его декодировать
            const encodedEventId = customIdParts[2] || '';
            let eventId;
            
            // Проверяем, является ли это Base64 закодированным ID
            if (encodedEventId && /^[A-Za-z0-9+/=]+$/.test(encodedEventId)) {
                try {
                    eventId = Buffer.from(encodedEventId, 'base64').toString();
                    console.log('Decoded Base64 eventId:', eventId);
                } catch (error) {
                    console.error('Ошибка при декодировании Base64 ID события:', error);
                    await interaction.editReply({
                        content: '❌ Ошибка при обработке данных события.',
                        flags: [MessageFlags.Ephemeral]
                    });
                    return;
                }
            } else {
                // Старый формат - ID события может быть разбит на части
                console.log('Обнаружен старый формат ID события, собираем части...');
                const eventIdParts = customIdParts.slice(2, -3); // Все части кроме последних 3
                eventId = eventIdParts.join('_');
                console.log('Собранный eventId из частей:', eventId);
            }
            
            const request = decodeURIComponent(customIdParts[customIdParts.length - 3] || 'Запрос не указан');
            const organizer = decodeURIComponent(customIdParts[customIdParts.length - 2] || 'Организатор не указан');
            const startTime = decodeURIComponent(customIdParts[customIdParts.length - 1] || 'Время не указано');
            
            console.log('Encoded eventId from customId:', encodedEventId);
            console.log('Final eventId:', eventId);
            console.log('Extracted data:', { eventId, request, organizer, startTime });

            if (!eventId) {
                await interaction.editReply({
                    content: '❌ ID события не найден.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            if (!selectedTemplate) {
                await interaction.editReply({
                    content: '❌ Шаблон не найден.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Получаем событие
            console.log('Получаем событие из базы данных...');
            const event = await getEvent(eventId);
            if (!event) {
                console.log('Событие не найдено в базе данных');
                await interaction.editReply({
                    content: '❌ Событие не найдено.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }
            console.log('Событие найдено:', event.name);

            // Получаем настройки
            console.log('Получаем настройки...');
            const settings = await getSettings();
            console.log('Настройки получены:', settings?.channels);
            
            let eventsChannel;
            if (!settings?.channels?.events) {
                console.log('Канал мероприятий не настроен');
                eventsChannel = null;
            } else {
                try {
                    const channelId = settings.channels.events;
                    console.log('ID канала мероприятий:', channelId);
                    
                    if (!/^\d+$/.test(channelId)) {
                        console.error(`Некорректный ID канала мероприятий: ${channelId}`);
                        await interaction.editReply({
                            content: `❌ Указан некорректный ID канала мероприятий: ${channelId}`,
                            flags: [MessageFlags.Ephemeral]
                        });
                        return;
                    }
                    
                    console.log('Получаем канал мероприятий...');
                    eventsChannel = await interaction.guild.channels.fetch(channelId);
                    console.log('Канал мероприятий получен:', eventsChannel?.name);
                } catch (error) {
                    console.error(`Ошибка при получении канала мероприятий (ID: ${settings.channels.events}):`, error);
                    eventsChannel = null;
                }
            }

            if (eventsChannel) {
                const eventEmbed = new EmbedBuilder()
                    .setTitle(event.name)
                    .setDescription(`**Приветствуем, уважаемые игроки!**\nВ ближайшее время на сервере пройдет мероприятие.\nСледите за чатом в игре!\n\n**Задача:**\n${event.task}\n\n**Призовой фонд:** ${event.prize}\n\n**Правила**:\n${event.rules}`)
                    .setColor("#009dbf");

                // Добавляем изображение только если оно валидно
                if (event.image && event.image !== 'Test' && isValidUrl(event.image)) {
                    eventEmbed.setImage(event.image);
                }

                let msgEvent = await eventsChannel.send({
                    content: `<@&1361458195456983213>`,
                    embeds: [eventEmbed]
                });

                // Очищаем участников предыдущего события с этим ID
                await clearEventParticipants(event.id);

                // Отправляем сообщение в канал участия с кнопками
                if (settings?.channels?.participation) {
                    const participationChannel = await interaction.guild.channels.fetch(settings.channels.participation).catch(() => null);
                    
                    if (participationChannel) {
                        // Функция для форматирования тега организатора
                        const formatOrganizerTag = (organizer) => {
                            // Убираем лишние символы
                            let cleanOrganizer = organizer.replace(/[<>@!]/g, '');
                            
                            // Если это валидный Discord ID (17-19 цифр)
                            if (/^\d{17,19}$/.test(cleanOrganizer)) {
                                return `<@${cleanOrganizer}>`;
                            }
                            
                            // Если это уже тег, возвращаем как есть
                            if (organizer.startsWith('<@') && organizer.endsWith('>')) {
                                return organizer;
                            }
                            
                            // Иначе просто возвращаем как есть
                            return organizer;
                        };

                        // Форматируем тег организатора для отображения
                        const organizerTag = formatOrganizerTag(organizer);

                        // Автоматически добавляем организатора как участника
                        const organizerId = extractUserId(organizer);
                        if (organizerId) {
                            try {
                                const organizerMember = await interaction.guild.members.fetch(organizerId);
                                await addEventParticipant(event.id, organizerId, organizerMember.user.username);
                                console.log(`✅ Организатор ${organizerMember.user.username} добавлен как участник`);
                            } catch (error) {
                                console.error("Ошибка при добавлении организатора как участника:", error);
                                console.log(`⚠️ Организатор не будет добавлен как участник. ID: ${organizerId}, Ошибка: ${error.message}`);
                            }
                        } else {
                            console.log(`⚠️ Не удалось извлечь валидный Discord ID из: "${organizer}"`);
                        }

                        // Получаем список участников (исключая организатора для отображения)
                        const participants = await getEventParticipants(event.id);
                        const organizerIdForDisplay = extractUserId(organizer);
                        let participantsList;
                        
                        if (participants.length > 0) {
                            // Фильтруем организатора из списка отображения
                            const displayParticipants = participants.filter(p => p.user_id !== organizerIdForDisplay);
                            if (displayParticipants.length > 0) {
                                participantsList = displayParticipants.map(p => `<@${p.user_id}>`).join(', ');
                            } else {
                                participantsList = 'Пока нет участников';
                            }
                        } else {
                            participantsList = 'Пока нет участников';
                        }

                        const participationEmbed = new EmbedBuilder()
                            .setTitle(`🎯 ${event.name}`)
                            .addFields(
                                { name: '🏆 Ошка', value: `\`\`\`\n${selectedTemplate.content}\n\`\`\``, inline: false },
                                { name: '📋 Запрос', value: request, inline: false },
                                { name: '⏰ Время начала', value: startTime, inline: false },                                
                                { name: '👤 Организатор', value: organizerTag, inline: false },
                                { name: '👥 Участники', value: participantsList, inline: false }
                            )
                            .setColor("#009dbf")
                            .setFooter({ text: `ID события: ${event.id}` });

                        // Добавляем изображение только если оно валидно
                        if (event.image && event.image !== 'Test' && isValidUrl(event.image)) {
                            participationEmbed.setImage(event.image);
                        }

                        const { ButtonBuilder, ButtonStyle } = require('discord.js');
                        const participationButtons = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`participate_${event.id}`)
                                .setLabel('✅ Участвую')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`leave_event_${event.id}`)
                                .setLabel('❌ Покинуть')
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setCustomId(`edit_participation_${event.id}`)
                                .setLabel('✏️ Редактировать')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId(`close_participation_${event.id}`)
                                .setLabel('🔒 Закрыть участие')
                                .setStyle(ButtonStyle.Secondary)
                        );

                        await participationChannel.send({
                            content: `<@&1349492446169399356> <@&1349492281027199088>`,
                            embeds: [participationEmbed],
                            components: [participationButtons]
                        });
                    }
                }

                console.log('Отправляем сообщение об успешной публикации...');
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('✅ Ивент опубликован')
                            .setDescription('Ивент успешно опубликован в канал мероприятий.')
                            .setColor('#43B581')
                    ],
                    components: []
                });
                console.log('Сообщение об успешной публикации отправлено');

                let logsChannel;
                if (settings?.channels?.logs) {
                    logsChannel = await interaction.guild.channels.fetch(settings.channels.logs).catch(() => null);
                } else {
                    logsChannel = null;
                }

                if (logsChannel) {
                    await logsChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Опубликован ивент")
                                .setDescription(`<@${interaction.member.id}> опубликовал ивент [${event.name}](${msgEvent.url}).`)
                                .setTimestamp(Date.now())
                                .setFooter({ text: interaction.member.id })
                                .setAuthor({ name: interaction.member.user.username, iconURL: interaction.member.user.avatarURL({}) })
                                .setColor("#49FFC5")
                        ]
                    })
                }
            } else {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Ошибка')
                            .setDescription('Канал для публикации ивентов не найден.')
                            .setColor('#FF0000')
                    ],
                    components: []
                });
            }
            
            console.log('=== TEMPLATE SELECT SUCCESS ===');

        } catch (error) {
            console.error("Ошибка при выборе шаблона:", error);
            
            // Проверяем, является ли ошибка связанной с истекшим взаимодействием
            if (error.code === 10062) {
                console.log('Взаимодействие истекло, пропускаем обработку ошибки');
                return;
            }
            
            try {
                // Поскольку мы используем deferUpdate(), используем editReply для обновления
                await interaction.editReply({
                    content: '❌ Неизвестная ошибка, попробуйте позже',
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (replyError) {
                console.error("Не удалось отправить сообщение об ошибке:", replyError);
                // Если не можем отправить сообщение об ошибке, просто логируем
            }
        }
    }
};

// Функция для проверки валидности URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Функция для извлечения ID пользователя из строки
function extractUserId(input) {
    // Убираем лишние символы
    let cleanInput = input.replace(/[<>@!]/g, '');
    
    // Проверяем, что это валидный Discord ID (17-19 цифр)
    if (/^\d{17,19}$/.test(cleanInput)) {
        return cleanInput;
    }
    
    return null;
} 