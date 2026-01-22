const path = require("path");
const fs = require("fs");
const {REST, Routes} = require("discord.js");

let cmds = [];

const register = async (client, commands) => {
    const rest = new REST().setToken(client.TOKEN);

    await (async () => {
        try {
            console.log(`Started refreshing ${commands.length} application (/) commands.`);

            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                {body: commands},
            );

            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            console.error(error);
        }
    })();
}

const loadCommands = async (client) => {
    const foldersPath = path.join(__dirname, '../../commands');
    const commandFolders = fs.readdirSync(foldersPath);
    const commands = []
    const commandsRegistry = []

    for (const command of cmds) {
        let mod = require.resolve(`${command.dir}`);
        if (mod && (require.cache[mod] !== undefined))
            delete require.cache[mod];
    }

    cmds = []

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                command.dir = filePath
                commands.push([command.data.name, command]);
                commandsRegistry.push(command.data)
                cmds.push(command)
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    await register(client, commandsRegistry)

    return commands;
}

module.exports = {loadCommands};