require("dotenv").config();
const { Client, GatewayIntentBits,MessageFlags, Events, Collection, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require("discord.js");
const {log} = require("./utilities/data/utils");
const {reloadAll} = require("./utilities/registry/reloadAll");
const eventsData = require("./events.json");
const {getSettings, getEvent, getOshkaTemplates, getOshkaTemplatesLimited, updateEventOrganizer, clearEventParticipants, addEventParticipant} = require("./utilities/data/DataBase");
const Scheduler = require("./utilities/scheduler");
const GiveawayScheduler = require("./utilities/giveawayScheduler");
const DiscordLogger = require("./utilities/discordLogger");
const { setupLoggingEvents } = require("./utilities/loggingEvents");
const LogCleanupScheduler = require("./utilities/logCleanupScheduler");
const { setupLegacyLogEvents } = require("./utilities/legacyLogEvents");
const { setupLegacyLogCommands } = require("./utilities/legacyLogCommands");

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

// Функция для форматирования тега организатора
function formatOrganizerTag(tag) {
    if (tag.startsWith('<@') && tag.endsWith('>')) {
        return tag;
    }
    return `<@${tag}>`;
}

// Функция для извлечения ID из тега @user или <@!user>
function extractUserId(tag) {
    if (tag.startsWith('<@') && tag.endsWith('>')) {
        return tag.slice(2, -1);
    }
    if (tag.startsWith('<@!') && tag.endsWith('>')) {
        return tag.slice(3, -1);
    }
    return null;
}

const selectionChannelId = '1350433471381639249'
const USE_LEGACY_LOGS = true;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

const COMMANDS_ALLOWED_USER_ID = '965947020026191922';

client.TOKEN = process.env.TOKEN;

client.commands = new Collection();
client.buttons = new Collection();
client.modals = new Collection();
client.selectMenus = new Collection();
client.distubeEvents = new Collection();

setupLegacyLogEvents(client);
setupLegacyLogCommands(client);

// Инициализируем планировщики
const scheduler = new Scheduler(client);
const giveawayScheduler = new GiveawayScheduler(client);
const logCleanupScheduler = new LogCleanupScheduler(client);

// Добавляем планировщик очистки логов в client
client.logCleanupScheduler = logCleanupScheduler;

log("Starting client...");

client.once(Events.ClientReady, async readyClient => {
  log(`Logged in as ${readyClient.user.tag}`);
  log("Loading content...")
  await reloadAll(client);
  
  // Инициализируем DiscordLogger
  const discordLogger = new DiscordLogger(client);
  await discordLogger.initialize();
  log("DiscordLogger initialized successfully");
  
  // Добавляем DiscordLogger в client для доступа из команд
  client.discordLogger = discordLogger;
  
  // Устанавливаем DiscordLogger в utilities/data/logging.js
  const { setDiscordLogger } = require("./utilities/data/logging");
  setDiscordLogger(discordLogger);
  log("DiscordLogger set in logging utilities");
  
  if (!USE_LEGACY_LOGS) {
    // Настраиваем логирование событий
    setupLoggingEvents(client, discordLogger);
    log("Logging events setup completed");
  } else {
    log("Logging events disabled (legacy logs enabled)");
  }
  
  // Инициализируем планировщик очистки логов
  await logCleanupScheduler.initialize();
  log("LogCleanupScheduler initialized successfully");
  
  // Инициализируем планировщик после загрузки всех компонентов
  await scheduler.initialize();
  
  // Проверяем статус систем логирования
  log("=== Logging System Status ===");
  log(`DiscordLogger available: ${!!client.discordLogger}`);
  log(`DiscordLogger initialized: ${client.discordLogger?.isInitialized}`);
  log(`LogCleanupScheduler available: ${!!client.logCleanupScheduler}`);
  log(`LogCleanupScheduler initialized: ${client.logCleanupScheduler?.isInitialized}`);
  log("=============================");
  
  // Инициализируем маппинги после загрузки всех компонентов
  const googleSheetsManager = require('./utilities/googleSheets');
  try {
    await googleSheetsManager.loadMappingsFromDatabase();
    log("Mappings initialized successfully");
  } catch (error) {
    log(`Error initializing mappings: ${error.message}`);
  }
  
  log("Loaded, ready, go!")
  client.user.setPresence({ activities: [{ name: 'majestic-rp.ru | ⚙️' }] });
});

client.on(Events.InteractionCreate, async (interaction) => {
  console.log('=== INTERACTION RECEIVED ===');
  console.log('Type:', interaction.type);
  console.log('Custom ID:', interaction.customId);
  console.log('User:', interaction.user.tag);
  
  const dynamicCustomIdPattern = /^(.+?)(?:_(.+))?$/;

  if (interaction.isChatInputCommand()) {
    if (interaction.user?.id !== COMMANDS_ALLOWED_USER_ID) {
      return await interaction.reply({
        content: '❌ У вас нет доступа к командам.',
        flags: [MessageFlags.Ephemeral]
      });
    }

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    if (command.admin) {
      if (!interaction.member || !interaction.member.permissions || !interaction.member.permissions.has("Administrator")) {
        return await interaction.reply({ flags: [MessageFlags.Ephemeral], content: "У вас нет доступа к этой команде." })
      }
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error("Ошибка при выполнении команды:", error);
      
      // Проверяем состояние взаимодействия
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
        console.error("Не удалось отправить ответ об ошибке:", replyError);
      }
    }
  } else if (interaction.isButton()) {
    console.log('=== BUTTON INTERACTION ===');
    console.log('Custom ID:', interaction.customId);
    console.log('User:', interaction.user.tag);
    
    const matches = interaction.customId.match(dynamicCustomIdPattern);
    console.log('Matches:', matches);
    
    if (!matches) {
      console.log('No matches found, returning');
      return;
    }
    
    const button_name = matches[1];
    let button = client.buttons.get(button_name);
    
    console.log('Button name:', button_name);
    console.log('Button found:', !!button);

    // Специальная обработка для кнопок участия в событиях
    if (!button && interaction.customId.startsWith('participate_')) {
      console.log('Это кнопка участия в событии, ищем базовую кнопку participate');
      button = client.buttons.get('participate');
      console.log('Base participate button found:', !!button);
    }
    
    // Специальная обработка для кнопок выхода из событий
    if (!button && interaction.customId.startsWith('leave_event_')) {
      console.log('Это кнопка выхода из события, ищем базовую кнопку leave_event');
      button = client.buttons.get('leave_event');
      console.log('Base leave_event button found:', !!button);
    }
    
    // Специальная обработка для кнопок редактирования участия
    if (!button && interaction.customId.startsWith('edit_participation_')) {
      console.log('Это кнопка редактирования участия, ищем базовую кнопку edit_participation');
      button = client.buttons.get('edit_participation');
      console.log('Base edit_participation button found:', !!button);
    }
    
        // Специальная обработка для кнопок закрытия участия
        if (!button && interaction.customId.startsWith('close_participation_')) {
          console.log('Это кнопка закрытия участия, ищем базовую кнопку close_participation');
          button = client.buttons.get('close_participation');
          console.log('Base close_participation button found:', !!button);
        }
        
        // Специальная обработка для кнопок подтверждения участников
        if (!button && interaction.customId.startsWith('confirm_participants_')) {
          console.log('Это кнопка подтверждения участников, ищем базовую кнопку confirm_participants');
          button = client.buttons.get('confirm_participants');
          console.log('Base confirm_participants button found:', !!button);
        }

        // Специальная обработка для кнопки редактирования победителя
        if (!button && interaction.customId.startsWith('edit_winner_')) {
          console.log('Это кнопка редактирования победителя, ищем базовую кнопку edit_winner');
          button = client.buttons.get('edit_winner');
          console.log('Base edit_winner button found:', !!button);
        }
    
    // Специальная обработка для кнопок подтверждения участников
    if (!button && button_name.startsWith('confirm_participants_')) {
      console.log('Это кнопка подтверждения участников, ищем базовую кнопку confirm_participants');
      button = client.buttons.get('confirm_participants');
      console.log('Base confirm_participants button found:', !!button);
    }
    
    // Специальная обработка для кнопок удаления участников
    if (!button && button_name.startsWith('remove_participants_')) {
      console.log('Это кнопка удаления участников, ищем базовую кнопку remove_participants');
      button = client.buttons.get('remove_participants');
      console.log('Base remove_participants button found:', !!button);
    }
    
    // Специальная обработка для кнопок редактирования победителя
    if (!button && button_name.startsWith('edit_winner_')) {
      console.log('Это кнопка редактирования победителя, ищем базовую кнопку edit_winner');
      button = client.buttons.get('edit_winner');
      console.log('Base edit_winner button found:', !!button);
    }
    
    // Специальная обработка для кнопок подтверждения событий
    if (!button && button_name.startsWith('event-confirm-')) {
      console.log('Это кнопка подтверждения события, обрабатывается через awaitMessageComponent');
      return; // Эти кнопки обрабатываются в eventSelectPublish.js
    }
    
    // Специальная обработка для кнопок отмены событий
    if (!button && button_name.startsWith('event-cancel-')) {
      console.log('Это кнопка отмены события, обрабатывается через awaitMessageComponent');
      return; // Эти кнопки обрабатываются в eventSelectPublish.js
    }
    
    // Специальная обработка для кнопок маппинга
    if (!button && (button_name.startsWith('mapping_') || interaction.customId.startsWith('mapping_'))) {
      console.log('Это кнопка маппинга, ищем по полному custom_id');
      button = client.buttons.get(interaction.customId);
      console.log('Mapping button found:', !!button);
      // Для кнопок маппинга не передаем аргументы
      if (button) {
        try {
          await button.execute(interaction, client);
          console.log('=== MAPPING BUTTON EXECUTION SUCCESS ===');
          return;
        } catch (error) {
          console.error("Ошибка при выполнении кнопки маппинга:", error);
          
          // Проверяем, является ли ошибка связанной с истекшим взаимодействием
          if (error.code === 10062 || error.code === 40060) {
            console.log('Взаимодействие истекло или уже обработано, пропускаем обработку ошибки');
            return;
          }
          
          try {
            if (interaction.replied || interaction.deferred) {
              await interaction.followUp({
                content: `❌ Произошла ошибка: ${error.message}`,
                flags: [MessageFlags.Ephemeral]
              });
            } else {
              await interaction.reply({
                content: `❌ Произошла ошибка: ${error.message}`,
                flags: [MessageFlags.Ephemeral]
              });
            }
          } catch (replyError) {
            console.error('Не удалось отправить ответ об ошибке:', replyError);
          }
          return;
        }
      }
    }
    
    // Специальная обработка для кнопок подтверждения удаления маппинга
    if (!button && interaction.customId.startsWith('mapping_delete_confirm_')) {
      console.log('Это кнопка подтверждения удаления маппинга, ищем базовую кнопку');
      button = client.buttons.get('mapping_delete_confirm');
      console.log('Mapping delete confirm button found:', !!button);
      // Для кнопок подтверждения удаления не передаем аргументы
      if (button) {
        try {
          await button.execute(interaction, client);
          console.log('=== MAPPING DELETE CONFIRM BUTTON EXECUTION SUCCESS ===');
          return;
        } catch (error) {
          console.error("Ошибка при выполнении кнопки подтверждения удаления:", error);
          // Ошибка обрабатывается в компоненте, не нужно дублировать
          return;
        }
      }
    }
    
    // Специальная обработка для кнопки отмены удаления маппинга
    if (!button && interaction.customId === 'mapping_delete_cancel') {
      console.log('Это кнопка отмены удаления маппинга');
      button = client.buttons.get('mapping_delete_cancel');
      console.log('Mapping delete cancel button found:', !!button);
      // Для кнопки отмены не передаем аргументы
      if (button) {
        try {
          await button.execute(interaction, client);
          console.log('=== MAPPING DELETE CANCEL BUTTON EXECUTION SUCCESS ===');
          return;
        } catch (error) {
          console.error("Ошибка при выполнении кнопки отмены удаления:", error);
          // Ошибка обрабатывается в компоненте, не нужно дублировать
          return;
        }
      }
    }

    // Специальная обработка для кнопок подтверждения удаления шаблона Ошки
    if (!button && interaction.customId === 'oshka_delete_confirm') {
      console.log('Это кнопка подтверждения удаления шаблона Ошки');
      button = client.buttons.get('oshka_delete_confirm');
      console.log('Oshka delete confirm button found:', !!button);
      if (button) {
        try {
          await button.execute(interaction, client);
          console.log('=== OSHKA DELETE CONFIRM BUTTON EXECUTION SUCCESS ===');
          return;
        } catch (error) {
          console.error("Ошибка при выполнении кнопки подтверждения удаления шаблона Ошки:", error);
          return;
        }
      }
    }

    // Специальная обработка для кнопок отмены удаления шаблона Ошки
    if (!button && interaction.customId === 'oshka_delete_cancel') {
      console.log('Это кнопка отмены удаления шаблона Ошки');
      button = client.buttons.get('oshka_delete_cancel');
      console.log('Oshka delete cancel button found:', !!button);
      if (button) {
        try {
          await button.execute(interaction, client);
          console.log('=== OSHKA DELETE CANCEL BUTTON EXECUTION SUCCESS ===');
          return;
        } catch (error) {
          console.error("Ошибка при выполнении кнопки отмены удаления шаблона Ошки:", error);
          return;
        }
      }
    }

    // Специальная обработка для кнопок пагинации шаблонов Ошки
    if (!button && (interaction.customId.startsWith('oshka_edit_prev_') || 
                    interaction.customId.startsWith('oshka_edit_next_') ||
                    interaction.customId.startsWith('oshka_delete_prev_') || 
                    interaction.customId.startsWith('oshka_delete_next_') ||
                    interaction.customId.startsWith('template_prev_') || 
                    interaction.customId.startsWith('template_next_') ||
                    interaction.customId.startsWith('template_page_info'))) {
      console.log('Это кнопка пагинации шаблонов Ошки, обрабатывается через awaitMessageComponent');
      
      // Обрабатываем пагинацию шаблонов Ошки
      if (interaction.customId.startsWith('template_prev_') || interaction.customId.startsWith('template_next_')) {
        try {
          console.log('🔄 Обрабатываем пагинацию шаблонов Ошки');
          
          // Извлекаем информацию из customId
          const parts = interaction.customId.split('_');
          const direction = parts[1]; // 'prev' или 'next'
          const currentPage = parseInt(parts[2]);
          const eventId = parts.slice(3).join('_'); // Восстанавливаем eventId с подчеркиваниями
          
          console.log('📊 Направление:', direction);
          console.log('📊 Текущая страница:', currentPage);
          console.log('📊 Event ID:', eventId);
          
          // Получаем все шаблоны
          const { getOshkaTemplates } = require('./utilities/data/DataBase');
          const allTemplates = await getOshkaTemplates();
          const templatesPerPage = 25;
          const totalPages = Math.ceil(allTemplates.length / templatesPerPage);
          
          // Вычисляем новую страницу
          let newPage = currentPage;
          if (direction === 'prev') {
            newPage = Math.max(0, currentPage - 1);
          } else if (direction === 'next') {
            newPage = Math.min(totalPages - 1, currentPage + 1);
          }
          
          console.log('📊 Новая страница:', newPage);
          
          // Создаем новые компоненты
          const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
          
          // Создаем выпадающий список для новой страницы
          const startIndex = newPage * templatesPerPage;
          const endIndex = Math.min(startIndex + templatesPerPage, allTemplates.length);
          const pageTemplates = allTemplates.slice(startIndex, endIndex);
          
          const templateSelect = new ActionRowBuilder()
            .addComponents(
              new StringSelectMenuBuilder()
                .setCustomId(`template_select_${Buffer.from(eventId).toString('base64')}_${encodeURIComponent('')}_${encodeURIComponent('')}_${encodeURIComponent('')}`)
                .setPlaceholder(`Выберите шаблон Ошки (стр. ${newPage + 1}/${totalPages})`)
                .addOptions(
                  pageTemplates.map((template, index) => 
                    new StringSelectMenuOptionBuilder()
                      .setLabel(`${startIndex + index + 1}. ${template.name}`)
                      .setDescription(template.content.substring(0,50) + '...')
                      .setValue(template.id.toString())
                  )
                )
            );
          
          // Создаем кнопки пагинации для новой страницы
          const paginationButtons = [];
          
          if (newPage > 0) {
            paginationButtons.push(
              new ButtonBuilder()
                .setCustomId(`template_prev_${newPage}_${eventId}`)
                .setLabel('◀️ Предыдущая')
                .setStyle(ButtonStyle.Secondary)
            );
          }
          
          paginationButtons.push(
            new ButtonBuilder()
              .setCustomId('template_page_info')
              .setLabel(`${newPage + 1}/${totalPages}`)
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true)
          );
          
          if (newPage < totalPages - 1) {
            paginationButtons.push(
              new ButtonBuilder()
                .setCustomId(`template_next_${newPage}_${eventId}`)
                .setLabel('Следующая ▶️')
                .setStyle(ButtonStyle.Secondary)
            );
          }
          
          const paginationRow = new ActionRowBuilder().addComponents(paginationButtons);
          
          // Обновляем сообщение
          let content = `**Выберите шаблон Ошки из списка:**\n`;
          content += `📋 Всего шаблонов: ${allTemplates.length}\n`;
          content += `📄 Страница ${newPage + 1} из ${totalPages}`;
          
          if (allTemplates.length > 25) {
            content += `\n\n💡 Используйте кнопки навигации для просмотра всех шаблонов`;
          }
          
          await interaction.update({
            content: content,
            components: [templateSelect, paginationRow]
          });
          
          console.log('✅ Пагинация обновлена успешно');
          return;
        } catch (error) {
          console.error('❌ Ошибка при обработке пагинации:', error);
          try {
            await interaction.followUp({
              content: '❌ Произошла ошибка при переключении страницы.',
              ephemeral: true
            });
          } catch (followUpError) {
            console.error('❌ Не удалось отправить сообщение об ошибке:', followUpError);
          }
          return;
        }
      }
      
      // Для других кнопок пагинации просто откладываем взаимодействие
      try {
        await interaction.deferUpdate();
        console.log('✅ Взаимодействие отложено для обработки коллектором');
      } catch (error) {
        console.log('⚠️ Взаимодействие уже обработано или истекло:', error.message);
      }
      return; // Эти кнопки обрабатываются в соответствующих компонентах
    }

    if (!button) {
      console.log('Button not found in registry, this might be handled by awaitMessageComponent');
      return;
    }

    if (button.rules) {
      const settings = await getSettings();
      // Проверка canEdit
      if (
        button.rules.includes("canEdit") &&
        (!settings.roles || !Array.isArray(settings.roles.canEdit) ||
         !interaction.member.roles.cache.find(r => settings.roles.canEdit.includes(r.id)))
      ) {
        await interaction.deferUpdate();
        return await interaction.followUp({ flags: [MessageFlags.Ephemeral], content: "У вас нет доступа." })
      }
      // Проверка canPublish
      if (
        button.rules.includes("canPublish") &&
        (!settings.roles || !Array.isArray(settings.roles.canPublish) ||
         !interaction.member.roles.cache.find(r => settings.roles.canPublish.includes(r.id)))
      ) {
        await interaction.deferUpdate();
        return await interaction.followUp({ flags: [MessageFlags.Ephemeral], content: "У вас нет доступа." })
      }
      // Проверка canCloseParticipation
      if (
        button.rules.includes("canCloseParticipation") &&
        (!settings.roles || !Array.isArray(settings.roles.canCloseParticipation) ||
         !interaction.member.roles.cache.find(r => settings.roles.canCloseParticipation.includes(r.id)))
      ) {
        await interaction.deferUpdate();
        return await interaction.followUp({ flags: [MessageFlags.Ephemeral], content: "У вас нет доступа." })
      }

    }

    try {
      console.log('Executing button with args:', matches[2] ? matches[2].split("_") : []);
      
      // Специальная обработка для кнопок участия - передаем полный eventId как один аргумент
      if (interaction.customId.startsWith('participate_') || 
          interaction.customId.startsWith('leave_event_') ||
          interaction.customId.startsWith('edit_participation_') ||
          interaction.customId.startsWith('close_participation_') ||
          interaction.customId.startsWith('confirm_participants_')) {
        let eventId;
        if (interaction.customId.startsWith('close_participation_')) {
          // Для кнопки закрытия участия убираем 'close_participation_' и берем остальное как eventId
          eventId = interaction.customId.replace('close_participation_', '');
        } else if (interaction.customId.startsWith('confirm_participants_')) {
          // Для кнопки подтверждения участников убираем 'confirm_participants_' и берем остальное как eventId
          eventId = interaction.customId.replace('confirm_participants_', '');
        } else {
          // Для остальных кнопок убираем первую часть и берем остальное как eventId
          eventId = interaction.customId.split('_').slice(1).join('_');
        }
        console.log('Special handling for participation button, eventId:', eventId);
        await button.execute(interaction, client, eventId);
      } else if (matches[2]) {
        const args = matches[2].split("_");
        await button.execute(interaction, client, ...args);
      } else {
        await button.execute(interaction, client);
      }
      console.log('=== BUTTON EXECUTION SUCCESS ===');
    } catch (error) {
      console.error("Ошибка при выполнении кнопки:", error);
      
      // Проверяем, является ли ошибка связанной с истекшим взаимодействием
      if (error.code === 10062 || error.code === 40060) {
        console.log('Взаимодействие истекло или уже обработано, пропускаем обработку ошибки');
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
  } else if (interaction.isModalSubmit()) {
    console.log('=== MODAL SUBMIT ===');
    console.log('Custom ID:', interaction.customId);
    console.log('User:', interaction.user.tag);
    
    // Специальная обработка для модальных окон публикации событий
    if (interaction.customId.startsWith('modal-event-publish_')) {
      console.log('Это модальное окно публикации события');
      
      // Извлекаем ID события из customId
      const customIdParts = interaction.customId.split('_');
      console.log('CustomId parts:', customIdParts);
      
      // Убираем 'modal-event-publish' из начала и берем все остальное как eventId
      const eventId = interaction.customId.replace('modal-event-publish_', '');
      console.log('Event ID from customId:', eventId);
      
      // Создаем модальное окно вручную, так как оно создается динамически
      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const { getEvent, getSettings, clearEventParticipants, updateEventOrganizer, getOshkaTemplates, getOshkaTemplatesLimited, getEventParticipants, addEventParticipant } = require("./utilities/data/DataBase");
      
      try {
        // Проверяем, что eventId получен
        if (!eventId) {
          console.error('Event ID не найден в customId:', interaction.customId);
          await interaction.reply({
            content: '❌ Ошибка: не удалось определить ID события.',
            flags: [MessageFlags.Ephemeral]
          });
          return;
        }
        
        // Получаем данные из полей модального окна
        let oshka = interaction.fields.getTextInputValue('event_oshka');
        const request = interaction.fields.getTextInputValue('event_request');
        const organizer = interaction.fields.getTextInputValue('event_organizer');
        const startTime = interaction.fields.getTextInputValue('event_start_time');

        // Если поле Ошка пустое, показываем выпадающий список шаблонов с пагинацией
        if (!oshka || oshka.trim() === '') {
          const allTemplates = await getOshkaTemplates();
          
          if (allTemplates.length === 0) {
            await interaction.reply({
              content: '❌ Нет доступных шаблонов Ошки.',
              flags: [MessageFlags.Ephemeral]
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

          // Создаем коллектор для кнопок пагинации
          const collector = message.createMessageComponentCollector({
            filter: (i) => {
              console.log('=== COLLECTOR FILTER ===');
              console.log('Interaction Custom ID:', i.customId);
              console.log('User ID:', i.user.id);
              console.log('Expected User ID:', interaction.user.id);
              console.log('Starts with template_prev_:', i.customId.startsWith('template_prev_'));
              console.log('Starts with template_next_:', i.customId.startsWith('template_next_'));
              
              const matches = i.user.id === interaction.user.id && 
                (i.customId.startsWith('template_prev_') || 
                 i.customId.startsWith('template_next_'));
              
              console.log('Filter result:', matches);
              return matches;
            },
            time: 300000 // 5 минут
          });

          console.log('=== COLLECTOR CREATED ===');
          console.log('Message ID:', message.id);
          console.log('Collector created for pagination buttons');
          console.log('Expected user ID:', interaction.user.id);

          // Обработчик для выпадающего списка шаблонов
          const templateCollector = message.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id && 
              i.customId.startsWith('template_select_'),
            time: 300000 // 5 минут
          });

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
              
              // Публикуем ивент
              await publishEvent(interaction, eventId, oshka, request, organizer, startTime);

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
              console.log('=== PAGINATION BUTTON CLICKED ===');
              console.log('Custom ID:', i.customId);
              console.log('User:', i.user.tag);
              
              if (i.customId.startsWith('template_prev_')) {
                currentPage = Math.max(0, currentPage - 1);
              } else if (i.customId.startsWith('template_next_')) {
                currentPage = Math.min(totalPages - 1, currentPage + 1);
              }

              // Обновляем компоненты
              const newTemplateSelect = createTemplateSelect(currentPage);
              const newPaginationButtons = createPaginationButtons(currentPage);
              
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

        // Получаем событие
        console.log('Получаем событие из базы данных...');
        const event = await getEvent(eventId);
        if (!event) {
          console.log('Событие не найдено в базе данных');
          await interaction.reply({
            content: 'Событие не найдено в базе данных.',
            flags: [MessageFlags.Ephemeral]
          });
          return;
        }
        console.log('Событие найдено:', event.name);

        // Сначала подтверждаем взаимодействие
        console.log('Подтверждаем взаимодействие...');
        await interaction.deferUpdate();

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
            console.error('Ошибка при получении канала мероприятий:', error);
            eventsChannel = null;
          }
        }

        if (!eventsChannel) {
          await interaction.followUp({
            content: '❌ Канал для публикации мероприятий не настроен. Используйте `/settings setchannel` для настройки канала "Мероприятия".',
            flags: [MessageFlags.Ephemeral]
          });
          return;
        }

        // Обновляем организатора в базе данных
        console.log('Обновляем организатора в базе данных...');
        await updateEventOrganizer(eventId, organizer);
        console.log('Организатор обновлен');

        // Создаем эмбед для публикации
        console.log('Создаем эмбед для публикации...');
        const embed = new EmbedBuilder()
          .setTitle(event.name)
          .setDescription(`**Приветствуем, уважаемые игроки!**\nВ ближайшее время на сервере пройдет мероприятие.\nСледите за чатом в игре!\n\n**Задача:**\n${event.task}\n\n**Призовой фонд:** ${event.prize}\n\n**Правила**:\n${event.rules}\n\n**🏆 Ошка:**\n${oshka}\n\n**📋 Запрос:**\n${request}\n\n**👤 Организатор:** ${formatOrganizerTag(organizer)}\n\n**⏰ Время начала:** ${startTime}`)
          .setColor("#009dbf");

        // Добавляем изображение только если оно валидно
        if (event.image && event.image !== 'Test' && isValidUrl(event.image)) {
          embed.setImage(event.image);
        }

        // Отправляем сообщение в канал мероприятий
        console.log('Отправляем сообщение в канал мероприятий...');
        const publishedMessage = await eventsChannel.send({ embeds: [embed] });
        console.log('Сообщение отправлено:', publishedMessage.id);

        // Создаем канал для участия
        console.log('Создаем канал для участия...');
        const participationChannelName = `участие-${event.name.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '-')}`;
        let participationChannel;

        try {
          participationChannel = await interaction.guild.channels.create({
            name: participationChannelName,
            type: 0, // Текстовый канал
            parent: eventsChannel.parent, // Тот же родительский канал
            permissionOverwrites: [
              {
                id: interaction.guild.id, // @everyone
                deny: [PermissionFlagsBits.SendMessages],
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
              }
            ]
          });
          console.log('Канал для участия создан:', participationChannel.name);
        } catch (error) {
          console.error('Ошибка при создании канала для участия:', error);
          participationChannel = null;
        }

        if (participationChannel) {
          // Создаем эмбед для канала участия
          console.log('Создаем эмбед для канала участия...');
          const participationEmbed = new EmbedBuilder()
            .setTitle(`🎯 Участие в мероприятии: ${event.name}`)
            .setDescription(`**Приветствуем, уважаемые игроки!**\n\n**Задача:**\n${event.task}\n\n**Призовой фонд:** ${event.prize}\n\n**Правила**:\n${event.rules}\n\n**🏆 Ошка:**\n${oshka}\n\n**📋 Запрос:**\n${request}\n\n**👤 Организатор:** ${formatOrganizerTag(organizer)}\n\n**⏰ Время начала:** ${startTime}`)
            .setColor("#009dbf");

          // Добавляем изображение только если оно валидно
          if (event.image && event.image !== 'Test' && isValidUrl(event.image)) {
            participationEmbed.setImage(event.image);
          }

          // Создаем кнопки участия
          const { ButtonBuilder, ButtonStyle } = require('discord.js');
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
          let content = `<@&1349492446169399356> <@&1349492281027199088>`;
          
          // Добавляем тег организатора, если это Discord ID
          if (organizerId) {
            content += `\n<@${organizerId}>`;
          }

          // Отправляем сообщение в канал участия
          await participationChannel.send({
            content: content,
            embeds: [participationEmbed],
            components: [participationButtons]
          });

          // Отправляем ссылку на канал участия в основной канал
          await publishedMessage.reply({
            content: `🎯 **Канал для участия:** ${participationChannel}`,
            flags: [MessageFlags.Ephemeral]
          });
        }

        // Отправляем подтверждение пользователю
        await interaction.followUp({
          content: `✅ Мероприятие **${event.name}** успешно опубликовано!`,
          flags: [MessageFlags.Ephemeral]
        });

        console.log('=== MODAL EVENT PUBLISH EXECUTION SUCCESS ===');
      } catch (error) {
        console.error("Ошибка при выполнении модального окна публикации события:", error);
        await interaction.reply({
          content: "❌ Произошла ошибка при публикации события.",
          flags: [MessageFlags.Ephemeral]
        });
      }
      return;
    }
    
    // Специальная обработка для модальных окон редактирования событий
    if (interaction.customId.startsWith('modal-event-edit_')) {
      console.log('Это модальное окно редактирования события');
      const modal = client.modals.get('modal-event-edit');
      
      console.log('Modal found:', !!modal);
      
      if (!modal) {
        console.log('Modal not found, returning');
        return;
      }
      
      // Извлекаем ID события из customId
      const eventId = interaction.customId.replace('modal-event-edit_', '');
      console.log('Event ID:', eventId);
      
      try {
        console.log('Executing modal with event ID:', eventId);
        await modal.execute(interaction, client, eventId);
        console.log('=== MODAL SUBMIT SUCCESS ===');
      } catch (error) {
        console.error("Ошибка при выполнении модального окна:", error);
        console.log('=== MODAL SUBMIT ERROR ===');
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
          // Пытаемся отправить сообщение через deferUpdate
          try {
            await interaction.deferUpdate();
            await interaction.followUp({
              content: '❌ Неизвестная ошибка, попробуйте позже',
              flags: [MessageFlags.Ephemeral]
            });
          } catch (finalError) {
            console.error("Не удалось отправить сообщение об ошибке даже через deferUpdate:", finalError);
          }
        }
      }
      return;
    }
    
    // Специальная обработка для модальных окон редактирования победителя
    if (interaction.customId.startsWith('edit_winner_modal_')) {
      console.log('Это модальное окно редактирования победителя');
      const modal = client.modals.get('edit_winner_modal');
      
      console.log('Modal found:', !!modal);
      
      if (!modal) {
        console.log('Modal not found, returning');
        return;
      }
      
      try {
        await modal.execute(interaction, client);
        console.log('=== MODAL EDIT WINNER EXECUTION SUCCESS ===');
      } catch (error) {
        console.error("Ошибка при выполнении модального окна редактирования победителя:", error);
        await interaction.reply({
          content: "❌ Произошла ошибка при редактировании информации о победителе.",
          flags: [MessageFlags.Ephemeral]
        });
      }
      return;
    }
    
    // Обычная обработка для других модальных окон
    const matches = interaction.customId.match(dynamicCustomIdPattern);
    console.log('Matches:', matches);
    
    if (!matches) {
      console.log('No matches found for modal, returning');
      return;
    }
    
    const modal_name = matches[1];
    let modal = client.modals.get(modal_name);
    
    console.log('Modal name:', modal_name);
    console.log('Modal found:', !!modal);

    // Специальная обработка для модальных окон маппинга
    if (!modal && (modal_name.startsWith('mapping_') || interaction.customId.startsWith('mapping_'))) {
      console.log('Это модальное окно маппинга, ищем по полному custom_id');
      modal = client.modals.get(interaction.customId);
      console.log('Mapping modal found:', !!modal);
    }

    if (!modal) {
      console.log('Modal not found, returning');
      return;
    }

    try {
      console.log('Executing modal with args:', matches[2] ? matches[2].split("_") : []);
      
      // Для модальных окон маппинга не передаем аргументы
      if (interaction.customId.startsWith('mapping_')) {
        await modal.execute(interaction, client);
      } else if (matches[2]) {
        const args = matches[2].split("_");
        await modal.execute(interaction, client, ...args);
      } else {
        await modal.execute(interaction, client);
      }
      console.log('=== MODAL SUBMIT SUCCESS ===');
    } catch (error) {
        console.error("Ошибка при выполнении модального окна:", error);
        console.log('=== MODAL SUBMIT ERROR ===');
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
        // Пытаемся отправить сообщение через deferUpdate
        try {
          await interaction.deferUpdate();
          await interaction.followUp({
            content: '❌ Неизвестная ошибка, попробуйте позже',
            flags: [MessageFlags.Ephemeral]
          });
        } catch (finalError) {
          console.error("Не удалось отправить сообщение об ошибке даже через deferUpdate:", finalError);
        }
      }
    }
  } else if (interaction.isStringSelectMenu()) {
    // Сначала ищем точное совпадение
    let selectMenu = client.selectMenus.get(interaction.customId);
    
    // Если не найдено, ищем частичное совпадение для template_select
    if (!selectMenu && interaction.customId.startsWith('template_select_')) {
      selectMenu = client.selectMenus.get('template_select_');
    }

    if (!selectMenu) return;

    try {
      await selectMenu.execute(interaction, client);
    } catch (error) {
      console.error("Ошибка при выполнении select menu:", error);
      
      // Проверяем, является ли ошибка связанной с истекшим взаимодействием
      if (error.code === 10062 || error.code === 40060) {
        console.log('Взаимодействие истекло или уже обработано, пропускаем обработку ошибки');
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
});

// Функция для публикации ивента
async function publishEvent(interaction, eventId, oshka, request, organizer, startTime) {
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
        console.error('Ошибка при получении канала мероприятий:', error);
        eventsChannel = null;
      }
    }

    if (!eventsChannel) {
      await interaction.followUp({
        content: '❌ Канал для публикации мероприятий не настроен. Используйте `/settings setchannel` для настройки канала "Мероприятия".',
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }

    // Обновляем организатора в базе данных
    console.log('Обновляем организатора в базе данных...');
    await updateEventOrganizer(eventId, organizer);
    console.log('Организатор обновлен');

    // Создаем эмбед для публикации
    console.log('Создаем эмбед для публикации...');
    const embed = new EmbedBuilder()
      .setTitle(event.name)
      .setDescription(oshka)
      .setColor('#009dbf')
      .addFields(
        { name: '📋 Заявка', value: request, inline: false },
        { name: '👤 Организатор', value: organizer, inline: true },
        { name: '⏰ Время начала', value: startTime, inline: true }
      )
      .setFooter({
        text: `${interaction.user.tag} | ${new Date().toLocaleString()}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
      });

    // Добавляем изображение, если оно есть
    if (event.image) {
      embed.setImage(event.image);
    }

    // Отправляем сообщение в канал мероприятий
    console.log('Отправляем сообщение в канал мероприятий...');
    const message = await eventsChannel.send({
      content: `🎉 **Новое мероприятие!**`,
      embeds: [embed]
    });

    console.log('Сообщение отправлено, ID:', message.id);

    // Отправляем подтверждение пользователю
    await interaction.followUp({
      content: `✅ Мероприятие **${event.name}** успешно опубликовано в канале ${eventsChannel}!`,
      flags: [MessageFlags.Ephemeral]
    });

    console.log('=== EVENT PUBLISHED SUCCESSFULLY ===');

  } catch (error) {
    console.error('Ошибка при публикации ивента:', error);
    
    // Проверяем, является ли ошибка связанной с истекшим взаимодействием
    if (error.code === 10062 || error.code === 40060) {
      console.log('Взаимодействие истекло или уже обработано, пропускаем обработку ошибки');
      return;
    }
    
    try {
      await interaction.followUp({
        content: '❌ Произошла ошибка при публикации мероприятия. Попробуйте позже.',
        flags: [MessageFlags.Ephemeral]
      });
    } catch (followUpError) {
      console.error('Не удалось отправить сообщение об ошибке:', followUpError);
    }
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === "event_selection") {
    try {
      const eventType = interaction.values[0];
      const event = eventsData[eventType];

      const roleID = "1349493013293961348";
      const roleMention = `<@&${roleID}>`;

      const embed = new EmbedBuilder()
        .setTitle(event.title)
        .setDescription(event.description)
        .setColor("#009dbf")
        .setFooter({
          text: `${interaction.user.tag} | ${new Date().toLocaleString()}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        });

      // Добавляем изображение только если оно валидно
      if (event.image && event.image !== 'Test' && isValidUrl(event.image)) {
        embed.setImage(event.image);
      }

      const targetChannelId = "1350442007981719643";
      const targetChannel = interaction.client.channels.cache.get(targetChannelId); 

      if (targetChannel) {
        await targetChannel.send({
          content: `${roleMention}`,
          embeds: [embed]
        });
        
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: `✅ Мероприятие **${event.title}** отправлено!`, flags: [MessageFlags.Ephemeral] });
        } else {
          await interaction.followUp({ content: `✅ Мероприятие **${event.title}** отправлено!`, flags: [MessageFlags.Ephemeral] });
        }
      } else {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: `❌ Канал не найден! (ID: ${targetChannelId})`, flags: [MessageFlags.Ephemeral] });
        } else {
          await interaction.followUp({ content: `❌ Канал не найден! (ID: ${targetChannelId})`, flags: [MessageFlags.Ephemeral] });
        }
      }
    } catch (error) {
      console.error("Ошибка при обработке event_selection:", error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "❌ Произошла ошибка при обработке запроса.", flags: [MessageFlags.Ephemeral] });
        } else {
          await interaction.followUp({ content: "❌ Произошла ошибка при обработке запроса.", flags: [MessageFlags.Ephemeral] });
        }
      } catch (replyError) {
        console.error("Не удалось отправить сообщение об ошибке:", replyError);
      }
    }
  }
});

// Обработчик необработанных ошибок
client.on('error', (error) => {
    console.error('Ошибка клиента Discord:', error);
});

// Обработчик необработанных отклонений промисов
process.on('unhandledRejection', (reason, promise) => {
    console.error('Необработанное отклонение промиса:', reason);
});

client.login(process.env.TOKEN);
