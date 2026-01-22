const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEvent, getSettings, clearEventParticipants, updateEventOrganizer, getOshkaTemplates, getEventParticipants, addEventParticipant } = require("../../utilities/data/DataBase");

// Функция для проверки валидности URL
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return ['http:', 'https:', 'attachment:'].includes(url.protocol);
    } catch (_) {
        return false;
    }
}

// Функция для форматирования тега организатора
function formatOrganizerTag(organizer) {
    if (organizer.startsWith('<@') && organizer.endsWith('>')) {
        // Это уже тег
        return organizer;
    } else if (/^\d+$/.test(organizer)) {
        // Это Discord ID, создаем тег
        return `<@${organizer}>`;
    } else {
        // Это обычный текст, оставляем как есть
        return organizer;
    }
}

// Функция для извлечения ID пользователя из строки
function extractUserId(input) {
    // Убираем лишние символы
    let cleanInput = input.replace(/[<>@!]/g, '');
    
    // Если это ID пользователя (только цифры)
    if (/^\d+$/.test(cleanInput)) {
        return cleanInput;
    }
    
    return null;
}

module.exports = {
    data: new ModalBuilder()
        .setCustomId('modal-event-publish_')
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
        ),
    async execute(interaction, client, eventId) {
        try {
            console.log('=== PUBLISH EVENT MODAL START ===');
            console.log('Event ID:', eventId);
            console.log('User:', interaction.user.tag);
            
            // Проверяем, что eventId передан
            if (!eventId) {
                console.error('Event ID не передан в модальное окно');
                await interaction.reply({
                    content: '❌ Ошибка: ID события не найден.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }
            
            let oshka = interaction.fields.getTextInputValue('event_oshka');
            const request = interaction.fields.getTextInputValue('event_request');
            const organizer = interaction.fields.getTextInputValue('event_organizer');
            const startTime = interaction.fields.getTextInputValue('event_start_time');

            // Если поле Ошка пустое, показываем выпадающий список шаблонов
            if (!oshka || oshka.trim() === '') {
                console.log('=== SHOWING TEMPLATE SELECTION ===');
                const allTemplates = await getOshkaTemplates();
                console.log('📋 Всего шаблонов найдено:', allTemplates.length);
                
                if (allTemplates.length === 0) {
                    console.log('❌ Нет доступных шаблонов Ошки');
                    await interaction.reply({
                        content: '❌ Нет доступных шаблонов Ошки.',
                        flags: [MessageFlags.Ephemeral]
                    });
                    return;
                }

                const templatesPerPage = 25;
                let currentPage = 0;
                const totalPages = Math.ceil(allTemplates.length / templatesPerPage);
                console.log(`📄 Создаем пагинацию: ${totalPages} страниц по ${templatesPerPage} шаблонов на страницу`);

                // Функция для создания выпадающего списка с текущей страницей
                const createTemplateSelect = (page) => {
                    const startIndex = page * templatesPerPage;
                    const endIndex = Math.min(startIndex + templatesPerPage, allTemplates.length);
                    const pageTemplates = allTemplates.slice(startIndex, endIndex);

                    const encodedEventId = Buffer.from(eventId).toString('base64');
                    console.log('Original eventId:', eventId);
                    console.log('Encoded eventId (Base64):', encodedEventId);
                    console.log(`📋 Количество шаблонов для отображения на стр. ${page + 1}:`, pageTemplates.length);

                    return new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`template_select_${encodedEventId}_${encodeURIComponent(request)}_${encodeURIComponent(organizer)}_${encodeURIComponent(startTime)}`)
                                .setPlaceholder(`Выберите шаблон Ошки (стр. ${page + 1}/${totalPages})`)
                                .addOptions(
                                    pageTemplates.map((template, index) => 
                                        new StringSelectMenuOptionBuilder()
                                            .setLabel(`${startIndex + index + 1}. ${template.name}`)
                                            .setDescription(template.content.substring(0,50) + '...')
                                            .setValue(template.id.toString())
                                    )
                                )
                        );
                };

                // Функция для создания кнопок пагинации
                const createPaginationButtons = (page) => {
                    const buttons = [];
                    
                    // Кнопка "Предыдущая страница"
                    if (page > 0) {
                        buttons.push(
                            new ButtonBuilder()
                                .setCustomId(`template_prev_${page}_${eventId}`)
                                .setLabel('◀️ Предыдущая')
                                .setStyle(ButtonStyle.Secondary)
                        );
                    }
                    
                    // Информация о странице
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId('template_page_info')
                            .setLabel(`${page + 1}/${totalPages}`)
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true)
                    );
                    
                    // Кнопка "Следующая страница"
                    if (page < totalPages - 1) {
                        buttons.push(
                            new ButtonBuilder()
                                .setCustomId(`template_next_${page}_${eventId}`)
                                .setLabel('Следующая ▶️')
                                .setStyle(ButtonStyle.Secondary)
                        );
                    }

                    return new ActionRowBuilder().addComponents(buttons);
                };

                // Создаем начальный выпадающий список и кнопки пагинации
                const templateSelect = createTemplateSelect(currentPage);
                const paginationButtons = createPaginationButtons(currentPage);
                console.log('🔘 Кнопки пагинации созданы:', paginationButtons.components.length, 'кнопок');

                // Формируем сообщение
                let content = `**Выберите шаблон Ошки из списка:**\n`;
                content += `📋 Всего шаблонов: ${allTemplates.length}\n`;
                content += `📄 Страница ${currentPage + 1} из ${totalPages}`;
                
                if (allTemplates.length > 25) {
                    content += `\n\n💡 Используйте кнопки навигации для просмотра всех шаблонов`;
                }

                const message = await interaction.reply({
                    content: content,
                    components: [templateSelect, paginationButtons],
                    flags: [MessageFlags.Ephemeral]
                });
                console.log('📤 Сообщение с пагинацией отправлено, ID:', message.id);

                // Создаем коллектор для кнопок пагинации
                const collector = message.createMessageComponentCollector({
                    filter: (i) => i.user.id === interaction.user.id && 
                        (i.customId.startsWith('template_prev_') || 
                         i.customId.startsWith('template_next_')),
                    time: 300000 // 5 минут
                });
                console.log('🔍 Коллектор для кнопок пагинации создан');

                // Обработчик для выпадающего списка шаблонов
                const templateCollector = message.createMessageComponentCollector({
                    filter: (i) => i.user.id === interaction.user.id && 
                        i.customId.startsWith('template_select_'),
                    time: 300000 // 5 минут
                });
                console.log('🔍 Коллектор для выбора шаблона создан');

                templateCollector.on('collect', async (i) => {
                    try {
                        console.log('=== TEMPLATE SELECTED ===');
                        console.log('Selected template ID:', i.values[0]);
                        
                        // Получаем выбранный шаблон
                        const selectedTemplateId = i.values[0];
                        const selectedTemplate = allTemplates.find(t => t.id.toString() === selectedTemplateId);
                        
                        if (!selectedTemplate) {
                            await i.reply({
                                content: '❌ Выбранный шаблон не найден.',
                                flags: [MessageFlags.Ephemeral]
                            });
                            return;
                        }

                        // Обновляем сообщение с выбранным шаблоном
                        const templateEmbed = new EmbedBuilder()
                            .setTitle('✅ Шаблон выбран')
                            .setDescription(`**Выбранный шаблон:** ${selectedTemplate.name}\n\n**Содержимое:**\n\`\`\`${selectedTemplate.content}\`\`\``)
                            .setColor('#00FF00')
                            .setFooter({ text: 'Теперь ивент будет опубликован с этим шаблоном' });

                        await i.update({
                            content: '',
                            embeds: [templateEmbed],
                            components: []
                        });

                        // Останавливаем коллекторы
                        collector.stop();
                        templateCollector.stop();

                        // Продолжаем выполнение с выбранным шаблоном
                        oshka = selectedTemplate.content;
                        
                        // Вызываем функцию публикации ивента
                        await publishEvent(interaction, client, eventId, oshka, request, organizer, startTime);

                    } catch (error) {
                        console.error('Ошибка при выборе шаблона:', error);
                        await i.followUp({
                            content: '❌ Произошла ошибка при выборе шаблона.',
                            ephemeral: true
                        });
                    }
                });

                collector.on('collect', async (i) => {
                    try {
                        console.log('🔘 Кнопка пагинации нажата:', i.customId);
                        if (i.customId.startsWith('template_prev_')) {
                            currentPage = Math.max(0, currentPage - 1);
                            console.log('⬅️ Переход на предыдущую страницу:', currentPage + 1);
                        } else if (i.customId.startsWith('template_next_')) {
                            currentPage = Math.min(totalPages - 1, currentPage + 1);
                            console.log('➡️ Переход на следующую страницу:', currentPage + 1);
                        }

                        // Обновляем компоненты
                        const newTemplateSelect = createTemplateSelect(currentPage);
                        const newPaginationButtons = createPaginationButtons(currentPage);
                        console.log('🔄 Компоненты обновлены для страницы:', currentPage + 1);
                        
                        // Обновляем сообщение
                        let newContent = `**Выберите шаблон Ошки из списка:**\n`;
                        newContent += `📋 Всего шаблонов: ${allTemplates.length}\n`;
                        newContent += `📄 Страница ${currentPage + 1} из ${totalPages}`;
                        
                        if (allTemplates.length > 25) {
                            newContent += `\n\n💡 Используйте кнопки навигации для просмотра всех шаблонов`;
                        }

                        await i.update({
                            content: newContent,
                            components: [newTemplateSelect, newPaginationButtons]
                        });
                        console.log('✅ Сообщение обновлено для страницы:', currentPage + 1);
                    } catch (error) {
                        console.error('Ошибка при обновлении страницы:', error);
                        await i.followUp({
                            content: '❌ Произошла ошибка при переключении страницы.',
                            ephemeral: true
                        });
                    }
                });

                collector.on('end', () => {
                    console.log('⏰ Коллектор пагинации завершен, отключаем кнопки');
                    // Отключаем кнопки пагинации после истечения времени
                    const disabledButtons = createPaginationButtons(currentPage);
                    disabledButtons.components.forEach(button => {
                        if (!button.data.disabled) {
                            button.setDisabled(true);
                        }
                    });
                    
                    interaction.editReply({
                        components: [templateSelect, disabledButtons]
                    }).catch(() => {});
                });

                templateCollector.on('end', () => {
                    console.log('⏰ Коллектор выбора шаблона завершен');
                });

                return;
            }

            // Проверяем, является ли ввод числом (номером шаблона)
            const templateNumber = parseInt(oshka);
            if (!isNaN(templateNumber) && templateNumber > 0) {
                const templates = await getOshkaTemplates();
                if (templateNumber <= templates.length) {
                    const selectedTemplate = templates[templateNumber - 1];
                    oshka = selectedTemplate.content;
                }
            } else {
                // Проверяем, является ли ввод названием шаблона
                const templates = await getOshkaTemplates();
                const selectedTemplate = templates.find(t => 
                    t.name.toLowerCase().includes(oshka.toLowerCase())
                );
                if (selectedTemplate) {
                    oshka = selectedTemplate.content;
                }
            }

            // Если ошка была введена вручную или выбрана по номеру/названию, публикуем ивент
            if (oshka && oshka.trim() !== '') {
                await publishEvent(interaction, client, eventId, oshka, request, organizer, startTime);
            } else {
                // Если ошка не была введена, показываем сообщение
                await interaction.reply({
                    content: '❌ Пожалуйста, введите ошку или выберите шаблон из списка.',
                    flags: [MessageFlags.Ephemeral]
                });
            }
        } catch (error) {
            console.error("Ошибка при публикации ивента:", error);
            
            // Проверяем, является ли ошибка связанной с истекшим взаимодействием
            if (error.code === 10062) {
                console.log('Взаимодействие истекло, пропускаем обработку ошибки');
                return;
            }
            
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: '❌ Неизвестная ошибка, попробуйте позже',
                        flags: [MessageFlags.Ephemeral]
                    });
                } else {
                    await interaction.reply({
                        content: '❌ Неизвестная ошибка, попробуйте позже',
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } catch (replyError) {
                console.error("Не удалось отправить сообщение об ошибке:", replyError);
                // Если не можем отправить сообщение об ошибке, просто логируем
            }
        }
    }
};

// Функция для публикации ивента
async function publishEvent(interaction, client, eventId, oshka, request, organizer, startTime) {
    try {
        console.log('=== PUBLISHING EVENT ===');
        console.log('Event ID:', eventId);
        console.log('Oshka:', oshka);
        console.log('Request:', request);
        console.log('Organizer:', organizer);
        console.log('Start Time:', startTime);

        // Получаем событие
        console.log('Получаем событие из базы данных...');
        const event = await getEvent(eventId);
        if (!event) {
            console.log('Событие не найдено в базе данных');
            await interaction.followUp({
                content: 'Событие не найдено в базе данных.',
                flags: [MessageFlags.Ephemeral]
            });
            return;
        }
        console.log('Событие найдено:', event.name);

        // Сначала подтверждаем взаимодействие
        console.log('Подтверждаем взаимодействие...');
        try {
            await interaction.deferUpdate();
        } catch (error) {
            console.log('Взаимодействие уже подтверждено или истекло');
        }

        console.log('Получаем настройки...');
        const settings = await getSettings();
        console.log('Настройки получены:', settings?.channels);
        
        let eventsChannel;
        if (!settings?.channels?.events) {
            console.log('Канал мероприятий не настроен');
            eventsChannel = null;
        } else {
            try {
                // Проверяем, что ID канала является корректным числом
                const channelId = settings.channels.events;
                console.log('ID канала мероприятий:', channelId);
                
                if (!/^\d+$/.test(channelId)) {
                    console.error(`Некорректный ID канала мероприятий: ${channelId}`);
                    await interaction.followUp({
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
            // Создаем эмбед для канала мероприятий
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
            
            // Сохраняем организатора в базе данных
            await updateEventOrganizer(event.id, organizer);

            // Отправляем сообщение в канал участия с дополнительной информацией
            if (settings?.channels?.participation) {
                let participationChannel;
                try {
                    // Проверяем, что ID канала является корректным числом
                    const channelId = settings.channels.participation;
                    if (!/^\d+$/.test(channelId)) {
                        console.error(`Некорректный ID канала участия: ${channelId}`);
                        await interaction.followUp({
                            content: `❌ Указан некорректный ID канала участия: ${channelId}`,
                            flags: [MessageFlags.Ephemeral]
                    });
                        return;
                    }
                    
                    participationChannel = await interaction.guild.channels.fetch(channelId);
                } catch (error) {
                    console.error(`Ошибка при получении канала участия (ID: ${settings.channels.participation}):`, error);
                    participationChannel = null;
                }
                
                if (participationChannel) {
                    // Формируем тег организатора для эмбеда
                    const organizerTag = formatOrganizerTag(organizer);

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
                            { name: '🏆 Ошка', value: `\`\`\`\n${oshka}\n\`\`\``, inline: false },
                            { name: '📋 Запрос', value: request, inline: false },
                            { name: '👤 Организатор', value: organizerTag, inline: false },
                            { name: '👨‍💼 Администратор', value: `<@${interaction.user.id}>`, inline: false },
                            { name: '⏰ Время начала', value: startTime, inline: false },
                            { name: '👥 Участники', value: participantsList, inline: false }
                        )
                        .setColor("#009dbf")
                        .setFooter({ text: `ID события: ${event.id}` });

                    // Добавляем изображение только если оно валидно
                    if (event.image && event.image !== 'Test' && isValidUrl(event.image)) {
                        participationEmbed.setImage(event.image);
                    }

                    const participationButtons = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`participate_${event.id}`)
                            .setLabel('✅ Участвую')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`leave_event_${event.id}`)
                            .setLabel('❌ Выйти из участия')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`edit_participation_${event.id}`)
                            .setLabel('✏️ Редактировать')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`close_participation_${event.id}`)
                            .setLabel('🔒 Закрыть участие')
                            .setStyle(ButtonStyle.Danger)
                    );

                    // Автоматически добавляем организатора как участника
                    const organizerId = extractUserId(organizer);
                    if (organizerId) {
                        try {
                            const organizerMember = await interaction.guild.members.fetch(organizerId);
                            await addEventParticipant(event.id, organizerId, organizerMember.user.username);
                        } catch (error) {
                            console.error("Ошибка при добавлении организатора как участника:", error);
                        }
                    }

                    // Формируем контент с тегом организатора
                    let content = `<@&1349492446169399356>`;
                    
                    // Добавляем тег организатора к контенту
                    content += `\nОрганизатор: ${formatOrganizerTag(organizer)}`;

                    await participationChannel.send({
                        content: content,
                        embeds: [participationEmbed],
                        components: [participationButtons]
                    });
                }
            }

            console.log('Отправляем сообщение об успешной публикации...');
            await interaction.followUp({
                content: '✅ Ивент успешно опубликован!',
                flags: [MessageFlags.Ephemeral]
            });
            console.log('=== PUBLISH EVENT SUCCESS ===');

            // Логирование
            let logsChannel;
            if (settings?.channels?.logs) {
                try {
                    // Проверяем, что ID канала является корректным числом
                    const channelId = settings.channels.logs;
                    if (!/^\d+$/.test(channelId)) {
                        console.error(`Некорректный ID канала логов: ${channelId}`);
                        // Не прерываем выполнение, просто не логируем
                    } else {
                        logsChannel = await interaction.guild.channels.fetch(channelId);
                    }
                } catch (error) {
                    console.error(`Ошибка при получении канала логов (ID: ${settings.channels.logs}):`, error);
                    logsChannel = null;
                }
            }

            if (logsChannel) {
                // Формируем тег организатора для логов
                const organizerTagForLogs = formatOrganizerTag(organizer);

                await logsChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Опубликован ивент")
                            .setDescription(`<@${interaction.member.id}> опубликовал ивент [${event.name}](${msgEvent.url}).`)
                            .addFields(
                                { name: '🏆 Ошка', value: oshka, inline: true },
                                { name: '📋 Запрос и статик', value: request, inline: true },
                                { name: '⏰ Время начала', value: startTime, inline: true },
                                { name: '👤 Организатор', value: organizerTagForLogs, inline: true }
                            )
                            .setTimestamp(Date.now())
                            .setFooter({ text: interaction.member.id })
                            .setAuthor({ name: interaction.member.user.username, iconURL: interaction.member.user.avatarURL({}) })
                            .setColor("#49FFC5")
                    ]
                });
            }
        } else {
            await interaction.followUp({
                content: '❌ Канал для публикации ивентов не найден.',
                flags: [MessageFlags.Ephemeral]
            });
        }
    } catch (error) {
        console.error("Ошибка при публикации ивента:", error);
        
        try {
            await interaction.followUp({
                content: '❌ Произошла ошибка при публикации ивента.',
                flags: [MessageFlags.Ephemeral]
            });
        } catch (replyError) {
            console.error("Не удалось отправить сообщение об ошибке:", replyError);
        }
    }
} 
