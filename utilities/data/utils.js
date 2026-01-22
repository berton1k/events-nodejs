const {ChatInputCommandInteraction, ActionRowBuilder, Client, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags} = require("discord.js");

const menus = new Map();

/**
 *
 * @param countElements {Number}
 * @param interaction {ChatInputCommandInteraction}
 * @param elements {Array<any>}
 * @param selectMenuElement {String}
 * @param client {Client}
 * @param text {String}
 */
const createPagination = async (countElements, interaction, elements, selectMenuElement, client, text) => {
    console.log(`=== CREATING PAGINATION ===`);
    console.log(`📋 Количество элементов на страницу: ${countElements}`);
    console.log(`📊 Всего элементов: ${elements.length}`);
    console.log(`🔍 Select menu element: ${selectMenuElement}`);
    console.log(`📝 Текст: ${text}`);

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const message = await interaction.fetchReply();
    console.log(`📤 Сообщение создано, ID: ${message.id}`);

    // Проверяем, есть ли select menu
    const selectMenu = client.selectMenus.get(selectMenuElement);
    if (!selectMenu) {
        console.error(`❌ Select menu '${selectMenuElement}' не найден!`);
        await interaction.editReply({
            content: `❌ Ошибка: меню выбора не найдено.`,
            flags: [MessageFlags.Ephemeral]
        });
        return;
    }

    if (countElements >= elements.length) {
        console.log(`📋 Элементов меньше или равно ${countElements}, показываем без пагинации`);
        const menu = selectMenu.data.setOptions(elements);
        await interaction.editReply({
            content: `${text}:`,
            components: [new ActionRowBuilder().setComponents(menu)],
        });
        return;
    }

    const pages = [];
    for (let i = 0; i < elements.length; i += countElements) {
        pages.push(elements.slice(i, i + countElements));
    }
    console.log(`📄 Создано ${pages.length} страниц`);

    const getMenu = (pages, page) => {
        const menuData = selectMenu.data.setOptions(pages[page]);
        console.log(`🔍 Создано меню для страницы ${page + 1} с ${pages[page].length} элементами`);
        return menuData;
    };

    const getButtons = (page) => {
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("prev_page")
                .setLabel("⬅️ Назад")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId("next_page")
                .setLabel("Вперёд ➡️")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === pages.length - 1)
        );
        console.log(`🔘 Созданы кнопки пагинации для страницы ${page + 1}`);
        return buttons;
    };

    // Инициализируем меню перед отправкой
    menus.set(message.id, {
        pages: pages,
        page: 0
    });

    const initialMenu = getMenu(pages, 0);
    const initialButtons = getButtons(0);

    await interaction.editReply({
        content: `${text} (Страница ${1}/${pages.length}):`,
        components: [new ActionRowBuilder().setComponents(initialMenu), initialButtons],
    });
    console.log(`📤 Начальная страница отправлена`);

    const collector = message.createMessageComponentCollector({ 
        time: 300000, // 5 минут
        filter: (i) => i.user.id === interaction.user.id && i.message.id === message.id, 
        componentType: ComponentType.Button 
    });
    console.log(`🔍 Коллектор создан для кнопок пагинации`);

    collector.on("collect", async (i) => {
        try {
            console.log(`🔘 Кнопка нажата: ${i.customId}`);
            
            if (i.customId !== "prev_page" && i.customId !== "next_page") {
                console.log(`❌ Неизвестная кнопка: ${i.customId}`);
                menus.delete(message.id);
                return;
            }

            const menu = menus.get(message.id);
            if (!menu) {
                console.log(`❌ Меню не найдено для сообщения ${message.id}`);
                return;
            }

            if (i.customId === "prev_page" && menu.page > 0) {
                menu.page--;
                console.log(`⬅️ Переход на предыдущую страницу: ${menu.page + 1}`);
            }
            if (i.customId === "next_page" && menu.page < menu.pages.length - 1) {
                menu.page++;
                console.log(`➡️ Переход на следующую страницу: ${menu.page + 1}`);
            }

            const newMenu = getMenu(menu.pages, menu.page);
            const newButtons = getButtons(menu.page);

            await i.update({
                content: `${text} (Страница ${menu.page + 1}/${pages.length}):`,
                components: [new ActionRowBuilder().setComponents(newMenu), newButtons],
            });
            
            menus.set(message.id, menu);
            console.log(`✅ Страница ${menu.page + 1} обновлена`);
            
        } catch (error) {
            console.error("❌ Ошибка при обновлении пагинации:", error);
            if (error.code === 10062) {
                console.log('⏰ Взаимодействие истекло при обновлении пагинации');
                menus.delete(message.id);
            }
        }
    });

    collector.on("end", () => {
        console.log(`⏰ Коллектор пагинации завершен для сообщения ${message.id}`);
        menus.delete(message.id);
    });

    collector.on("error", (error) => {
        console.error("❌ Ошибка коллектора:", error);
        menus.delete(message.id);
    });

    console.log(`✅ Пагинация создана успешно для ${elements.length} элементов`);
}

const log = (msg) => console.log(`[${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}] ${msg}`);

/**
 * Форматирует время в читаемый формат
 * @param {string} isoDate - Дата в формате ISO
 * @returns {string} - Отформатированная дата
 */
function formatJoinDate(isoDate) {
    try {
        const date = new Date(isoDate);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Moscow'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return isoDate; // Возвращаем исходную строку если не удалось отформатировать
    }
}

function getButton(client, name) {
    if (client.buttons.has(name)) {
        const data = new ButtonBuilder(client.buttons.get(name).data.toJSON());
        return data.setCustomId(name);
    }
    else return null;
}

function getButtonWithId(client, name, id) {
    if (client.buttons.has(name)) {
        const data = new ButtonBuilder(client.buttons.get(name).data.toJSON());
        return data.setCustomId(`${name}_${id}`);
    } else return null;
}

function getButtonWithIdAndLabelEmoji(client, name, id, label, emoji) {
    if (client.buttons.has(name)) {
        const data = new ButtonBuilder(client.buttons.get(name).data.toJSON());
        return data.setCustomId(`${name}_${id}`).setLabel(label).setEmoji(emoji);
    } else return null;
}

function getModalWithId(client, name, id) {
    if (client.modals.has(name)) {
        const data = new ModalBuilder(client.modals.get(name).data.toJSON());
        return data.setCustomId(`${name}_${id}`);
    } else return null;
}

module.exports = {createPagination, log, formatJoinDate, getButton, getButtonWithId, getButtonWithIdAndLabelEmoji, getModalWithId};