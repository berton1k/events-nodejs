const {Client} = require("discord.js");
const {loadSelectMenus} = require("./selectMenus");
const {loadModals} = require("./modals");
const {loadButtons} = require("./buttons");
const {loadCommands} = require("./commands");

/**
 *
 * @param client {Client}
 */
const reloadAll = async (client) => {
    console.log("-------------------")
    client.commands.clear()
    client.buttons.clear()
    client.modals.clear()
    client.selectMenus.clear()

    let slctmenu = loadSelectMenus()
    for (const menu of slctmenu) {
        client.selectMenus.set(menu[0], menu[1]);
    }
    console.log(`Select menus loaded: ${slctmenu.length}`)

    let mdls = loadModals();
    for (const modal of mdls) {
        client.modals.set(modal[0], modal[1]);
    }
    console.log(`Modals loaded: ${mdls.length}`)

    let btn = loadButtons();
    for (const button of btn) {
        client.buttons.set(button[0], button[1]);
    }
    console.log(`Buttons loaded: ${btn.length}`)

    let cmd = await loadCommands(client);
    for (const command of cmd) {
        client.commands.set(command[0], command[1]);
    }
    console.log(`Commands loaded: ${cmd.length}`)
    console.log("-------------------")
}

module.exports = {reloadAll}