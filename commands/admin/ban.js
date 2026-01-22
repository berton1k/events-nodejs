const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { banUser, isUserBanned, getSettings } = require('../../utilities/data/DataBase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Забанить пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для бана')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Количество дней бана (0 = навсегда)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(365))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина бана')
                .setRequired(false)),

    admin: false, // Теперь проверяем роли модерации

    async execute(interaction, client) {
        try {
            // Проверяем права на модерацию
            const settings = await getSettings();
            const roles = settings?.roles || {};
            const canModerateRoles = roles.canModerate || [];
            
            // Если роли не настроены, только администраторы могут использовать команды
            if (canModerateRoles.length === 0) {
                if (!interaction.member || !interaction.member.permissions || !interaction.member.permissions.has("Administrator")) {
                    return await interaction.reply({ 
                        flags: [MessageFlags.Ephemeral], 
                        content: "У вас нет доступа к этой команде." 
                    });
                }
            } else {
                // Проверяем, есть ли у пользователя одна из разрешенных ролей
                const hasRole = interaction.member.roles.cache.some(role => canModerateRoles.includes(role.id));
                
                // Также проверяем права администратора
                if (!hasRole && !interaction.member.permissions.has("Administrator")) {
                    return await interaction.reply({ 
                        flags: [MessageFlags.Ephemeral], 
                        content: "У вас нет доступа к этой команде." 
                    });
                }
            }

            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const targetUser = interaction.options.getUser('user');
            const days = interaction.options.getInteger('days') || 0;
            const reason = interaction.options.getString('reason') || 'Причина не указана';
            const moderator = interaction.user;

            // Проверяем, не пытается ли модератор забанить сам себя
            if (targetUser.id === moderator.id) {
                await interaction.editReply({
                    content: '❌ Вы не можете забанить самого себя.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Проверяем, не пытается ли модератор забанить бота
            if (targetUser.id === client.user.id) {
                await interaction.editReply({
                    content: '❌ Вы не можете забанить бота.',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Проверяем, не забанен ли уже пользователь
            const existingBan = await isUserBanned(targetUser.id);
            if (existingBan) {
                await interaction.editReply({
                    content: `❌ Пользователь **${targetUser.tag}** уже заблокирован.`,
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Рассчитываем дату окончания бана
            let banUntil = null;
            let isPermanent = false;
            
            if (days === 0) {
                isPermanent = true;
            } else {
                banUntil = new Date();
                banUntil.setDate(banUntil.getDate() + days);
                banUntil = banUntil.toISOString();
            }

            // Добавляем бан в базу данных
            await banUser(targetUser.id, moderator.id, reason, days);

            // Баним пользователя на сервере
            try {
                const member = await interaction.guild.members.fetch(targetUser.id);
                const banOptions = {
                    reason: `Бан от ${moderator.tag}. Причина: ${reason}${!isPermanent ? ` (${days} дней)` : ' (навсегда)'}`
                };

                if (!isPermanent && days > 0) {
                    banOptions.deleteMessageDays = 1; // Удаляем сообщения за последний день
                }

                await member.ban(banOptions);

                // Создаем embed для ответа
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('🚫 Пользователь заблокирован')
                    .setDescription(`Пользователь **${targetUser.tag}** заблокирован`)
                    .addFields(
                        { name: 'Причина', value: reason, inline: true },
                        { name: 'Модератор', value: moderator.tag, inline: true },
                        { name: 'Длительность', value: isPermanent ? 'Навсегда' : `${days} дней`, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [embed],
                    flags: [MessageFlags.Ephemeral]
                });

                // Отправляем сообщение в ЛС пользователю
                try {
                    const banMessage = isPermanent 
                        ? `Вы были заблокированы на сервере seattle events модератором, "${moderator.tag}": ${reason}\n\n🚫 **Бан выдан навсегда.**`
                        : `Вы были заблокированы на сервере seattle events модератором, "${moderator.tag}": ${reason}\n\n🚫 **Бан выдан на ${days} дней.**`;
                    
                    await targetUser.send(banMessage);
                } catch (dmError) {
                    console.log(`Не удалось отправить сообщение в ЛС пользователю ${targetUser.tag}: ${dmError.message}`);
                }

            } catch (banError) {
                console.error('Ошибка при бане пользователя:', banError);
                
                // Если не удалось забанить на сервере, удаляем запись из базы данных
                // (здесь можно добавить функцию удаления бана из БД)
                
                await interaction.editReply({
                    content: `❌ Ошибка при бане пользователя: ${banError.message}`,
                    flags: [MessageFlags.Ephemeral]
                });
            }

        } catch (error) {
            console.error('Ошибка в команде ban:', error);
            await interaction.editReply({
                content: `❌ Ошибка при бане пользователя: ${error.message}`,
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
