const { ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require("discord.js");
const { getOshkaTemplates } = require("../../utilities/data/DataBase");

module.exports = {
    data: new ButtonBuilder()
        .setCustomId('oshka-edit')
        .setLabel('✏️ | Редактировать шаблон')
        .setStyle(ButtonStyle.Primary),
    async execute(interaction, client) {
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            // Получаем все шаблоны Ошки
            const allTemplates = await getOshkaTemplates();
            
            if (allTemplates.length === 0) {
                await interaction.editReply({
                    content: '❌ Нет доступных шаблонов Ошки для редактирования.'
                });
                return;
            }

            const templatesPerPage = 25;
            let currentPage = 0;
            const totalPages = Math.ceil(allTemplates.length / templatesPerPage);

            // Функция для создания выпадающего списка с текущей страницей
            const createTemplateSelect = (page) => {
                const startIndex = page * templatesPerPage;
                const endIndex = Math.min(startIndex + templatesPerPage, allTemplates.length);
                const pageTemplates = allTemplates.slice(startIndex, endIndex);

                return new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('oshka_edit_select')
                            .setPlaceholder(`Выберите шаблон для редактирования (стр. ${page + 1}/${totalPages})`)
                            .addOptions(
                                pageTemplates.map(template => 
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel(template.name)
                                        .setDescription(template.content.substring(0, 50) + '...')
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
                            .setCustomId(`oshka_edit_prev_${page}`)
                            .setLabel('◀️ Предыдущая')
                            .setStyle(ButtonStyle.Secondary)
                    );
                }
                
                // Информация о странице
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('oshka_edit_page_info')
                        .setLabel(`${page + 1}/${totalPages}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );
                
                // Кнопка "Следующая страница"
                if (page < totalPages - 1) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId(`oshka_edit_next_${page}`)
                            .setLabel('Следующая ▶️')
                            .setStyle(ButtonStyle.Secondary)
                    );
                }

                return new ActionRowBuilder().addComponents(buttons);
            };

            // Создаем начальный выпадающий список и кнопки пагинации
            const templateSelect = createTemplateSelect(currentPage);
            const paginationButtons = createPaginationButtons(currentPage);

            // Формируем сообщение
            let content = `**Выберите шаблон Ошки для редактирования:**\n`;
            content += `📋 Всего шаблонов: ${allTemplates.length}\n`;
            content += `📄 Страница ${currentPage + 1} из ${totalPages}`;
            
            if (allTemplates.length > 25) {
                content += `\n\n💡 Используйте кнопки навигации для просмотра всех шаблонов`;
            }

            const message = await interaction.editReply({
                content: content,
                components: [templateSelect, paginationButtons]
            });

            // Создаем коллектор для кнопок пагинации
            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id && 
                    (i.customId.startsWith('oshka_edit_prev_') || 
                     i.customId.startsWith('oshka_edit_next_')),
                time: 300000 // 5 минут
            });

            collector.on('collect', async (i) => {
                try {
                    if (i.customId.startsWith('oshka_edit_prev_')) {
                        currentPage = Math.max(0, currentPage - 1);
                    } else if (i.customId.startsWith('oshka_edit_next_')) {
                        currentPage = Math.min(totalPages - 1, currentPage + 1);
                    }

                    // Обновляем компоненты
                    const newTemplateSelect = createTemplateSelect(currentPage);
                    const newPaginationButtons = createPaginationButtons(currentPage);
                    
                    // Обновляем сообщение
                    let newContent = `**Выберите шаблон Ошки для редактирования:**\n`;
                    newContent += `📋 Всего шаблонов: ${allTemplates.length}\n`;
                    newContent += `📄 Страница ${currentPage + 1} из ${totalPages}`;
                    
                    if (allTemplates.length > 25) {
                        newContent += `\n\n💡 Используйте кнопки навигации для просмотра всех шаблонов`;
                    }

                    await i.update({
                        content: newContent,
                        components: [newTemplateSelect, newPaginationButtons]
                    });
                } catch (error) {
                    console.error('Ошибка при обновлении страницы:', error);
                    await i.followUp({
                        content: '❌ Произошла ошибка при переключении страницы.',
                        ephemeral: true
                    });
                }
            });

            collector.on('end', () => {
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

        } catch (error) {
            console.error('Ошибка при получении шаблонов Ошки:', error);
            await interaction.editReply({
                content: '❌ Произошла ошибка при получении списка шаблонов.'
            });
        }
    }
} 