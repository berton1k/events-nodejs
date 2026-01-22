const path = require("path");
const fs = require("fs");

let btns = [];

const loadButtons = () => {
    const foldersPath = path.join(__dirname, '../../buttons');
    const buttonsFolders = fs.readdirSync(foldersPath);
    const buttons = []

    for (const button of btns) {
        let mod = require.resolve(`${button.dir}`);
        if (mod && (require.cache[mod] !== undefined))
            delete require.cache[mod];
    }

    btns = []

    for (const folder of buttonsFolders) {
        const buttonsPath = path.join(foldersPath, folder);
        const buttonsFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));
        for (const file of buttonsFiles) {
            const filePath = path.join(buttonsPath, file);
            const button = require(filePath);
            if ('data' in button && 'execute' in button) {
                button.dir = filePath
                buttons.push([button.data.data.custom_id, button]);
                btns.push(button)
            } else {
                console.log(`[WARNING] The button at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    return buttons;
}

module.exports = {loadButtons};