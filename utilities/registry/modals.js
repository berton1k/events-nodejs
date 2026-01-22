const path = require("path");
const fs = require("fs");

let mdls = [];

const loadModals = () => {
    const foldersPath = path.join(__dirname, '../../modals');
    const modalsFolders = fs.readdirSync(foldersPath);
    const modals = []

    for (const modal of mdls) {
        let mod = require.resolve(`${modal.dir}`);
        if (mod && (require.cache[mod] !== undefined))
            delete require.cache[mod];
    }

    mdls = []

    for (const folder of modalsFolders) {
        const modalsPath = path.join(foldersPath, folder);
        const modalsFiles = fs.readdirSync(modalsPath).filter(file => file.endsWith('.js'));
        for (const file of modalsFiles) {
            const filePath = path.join(modalsPath, file);
            const modal = require(filePath);
            if ('data' in modal && 'execute' in modal) {
                modal.dir = filePath
                modals.push([modal.data.data.custom_id, modal]);
                mdls.push(modal)
            } else {
                console.log(`[WARNING] The modal at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    return modals;
}

module.exports = {loadModals};