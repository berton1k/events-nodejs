const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('log-settings')
        .setDescription('Manage logging system settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Show current logging system status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleanup-days')
                .setDescription('Set how many days to keep logs')
                .addIntegerOption(option =>
                    option.setName('days')
                        .setDescription('Number of days to keep logs (1-365)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(365)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('manual-cleanup')
                .setDescription('Manually trigger log cleanup')
                .addIntegerOption(option =>
                    option.setName('days')
                        .setDescription('Remove logs older than this many days (default: current setting)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(365))),
    
    admin: true,
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                case 'status':
                    await handleStatus(interaction);
                    break;
                case 'cleanup-days':
                    await handleCleanupDays(interaction);
                    break;
                case 'manual-cleanup':
                    await handleManualCleanup(interaction);
                    break;
            }
        } catch (error) {
            console.error('Error executing log-settings command:', error);
            await interaction.reply({
                content: '❌ An error occurred while managing log settings',
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};

async function handleStatus(interaction) {
    try {
        console.log('log-settings: Getting log system status...');
        const logCleanupScheduler = interaction.client.logCleanupScheduler;
        console.log('log-settings: logCleanupScheduler available:', !!logCleanupScheduler);
        if (!logCleanupScheduler) {
            throw new Error('Log cleanup scheduler not initialized');
        }
        const status = logCleanupScheduler.getStatus();
        console.log('log-settings: Status:', status);
        
        const embed = new EmbedBuilder()
            .setTitle('Logging System Status')
            .setColor('#0099ff')
            .setTimestamp();
        
        if (status.isRunning) {
            embed.setDescription('✅ Logging system is running normally');
            embed.addFields(
                { name: 'Status', value: 'Active', inline: true },
                { name: 'Cleanup Days', value: `${status.cleanupDays}`, inline: true },
                { name: 'Next Cleanup', value: status.nextCleanup ? status.nextCleanup.toLocaleString() : 'Unknown', inline: true }
            );
        } else {
            embed.setDescription('❌ Logging system is not running');
            embed.addFields(
                { name: 'Status', value: 'Inactive', inline: true },
                { name: 'Cleanup Days', value: `${status.cleanupDays}`, inline: true }
            );
        }
        
        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        
    } catch (error) {
        console.error('Error getting log system status:', error);
        await interaction.reply({
            content: '❌ Unable to get logging system status',
            flags: [MessageFlags.Ephemeral]
        });
    }
}

async function handleCleanupDays(interaction) {
    try {
        const days = interaction.options.getInteger('days');
        console.log('log-settings: Updating cleanup days to:', days);
        const logCleanupScheduler = interaction.client.logCleanupScheduler;
        console.log('log-settings: logCleanupScheduler available:', !!logCleanupScheduler);
        if (!logCleanupScheduler) {
            throw new Error('Log cleanup scheduler not initialized');
        }
        
        logCleanupScheduler.updateSettings(days);
        
        const embed = new EmbedBuilder()
            .setTitle('Log Cleanup Settings Updated')
            .setColor('#00ff00')
            .setDescription(`Log cleanup days have been updated to ${days} days`)
            .addFields(
                { name: 'New Setting', value: `${days} days`, inline: true },
                { name: 'Effect', value: 'Logs older than this will be automatically cleaned up', inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        
    } catch (error) {
        console.error('Error updating cleanup days:', error);
        await interaction.reply({
            content: '❌ Unable to update cleanup days setting',
            flags: [MessageFlags.Ephemeral]
        });
    }
}

async function handleManualCleanup(interaction) {
    try {
        const days = interaction.options.getInteger('days');
        console.log('log-settings: Manual cleanup requested for days:', days);
        const logCleanupScheduler = interaction.client.logCleanupScheduler;
        console.log('log-settings: logCleanupScheduler available:', !!logCleanupScheduler);
        if (!logCleanupScheduler) {
            throw new Error('Log cleanup scheduler not initialized');
        }
        
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        
        const deletedCount = await logCleanupScheduler.manualCleanup(days || logCleanupScheduler.cleanupDays);
        
        const embed = new EmbedBuilder()
            .setTitle('Manual Log Cleanup Completed')
            .setColor('#00ff00')
            .setDescription(`Manual log cleanup has been completed successfully`)
            .addFields(
                { name: 'Days Old', value: `${days || logCleanupScheduler.cleanupDays}`, inline: true },
                { name: 'Entries Deleted', value: `${deletedCount}`, inline: true }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error during manual cleanup:', error);
        await interaction.editReply({
            content: '❌ An error occurred during manual cleanup',
            flags: [MessageFlags.Ephemeral]
        });
    }
}
