const path = require("path");
const fs = require("fs");

let slctmenu = [];

const loadSelectMenus = () => {
    const foldersPath = path.join(__dirname, '../../selectMenus');
    const selectMenuFolders = fs.readdirSync(foldersPath);
    const selectMenus = []

    for (const selectMenu of slctmenu) {
        let mod = require.resolve(`${selectMenu.dir}`);
        if (mod && (require.cache[mod] !== undefined))
            delete require.cache[mod];
    }

    slctmenu = []

    for (const folder of selectMenuFolders) {
        const selectMenuPath = path.join(foldersPath, folder);
        const selectMenusFiles = fs.readdirSync(selectMenuPath).filter(file => file.endsWith('.js'));
        for (const file of selectMenusFiles) {
            const filePath = path.join(selectMenuPath, file);
            const selectMenu = require(filePath);
            if ('data' in selectMenu && 'execute' in selectMenu) {
                selectMenu.dir = filePath
                selectMenus.push([selectMenu.data.data.custom_id, selectMenu]);
                slctmenu.push(selectMenu)
            } else {
                console.log(`[WARNING] The select menu at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    return selectMenus;
}

module.exports = {loadSelectMenus};