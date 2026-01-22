const {ButtonBuilder, ButtonInteraction, Client, ButtonStyle, MessageFlags} = require("discord.js");


module.exports = {
    data: new ButtonBuilder()
        .setCustomId("acceptRules")
        .setLabel("Я прочитал(а) и принимаю данные Правила сообщества")
        .setStyle(ButtonStyle.Success),
    /**
     *
     * @param interaction {ButtonInteraction}
     * @param client {Client}
     */
    execute: async (interaction, client) => {
        try {
            // Сначала подтверждаем взаимодействие
            await interaction.deferUpdate();
            
            // Затем добавляем роль
            await interaction.member.roles.add("1349493013293961348");
            
            // Отправляем подтверждение пользователю
            await interaction.followUp({
                content: "✅ Вы успешно приняли правила сообщества!",
                flags: [MessageFlags.Ephemeral]
            });
        } catch (error) {
            console.error("Ошибка при принятии правил:", error);
            
            // Пытаемся отправить сообщение об ошибке
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: "❌ Произошла ошибка при принятии правил. Обратитесь к администратору.",
                        flags: [MessageFlags.Ephemeral]
                    });
                } else {
                    await interaction.reply({
                        content: "❌ Произошла ошибка при принятии правил. Обратитесь к администратору.",
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } catch (followUpError) {
                console.error("Не удалось отправить сообщение об ошибке:", followUpError);
            }
        }
    }
}