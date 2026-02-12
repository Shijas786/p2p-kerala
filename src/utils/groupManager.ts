import fs from "fs";
import path from "path";

const GROUPS_FILE = path.join(__dirname, "../../data/groups.json");
const DIR_PATH = path.join(__dirname, "../../data");

// Ensure data dir exists
if (!fs.existsSync(DIR_PATH)) {
    fs.mkdirSync(DIR_PATH, { recursive: true });
}

export const groupManager = {
    // Add group ID
    addGroup: (chatId: number) => {
        const groups = groupManager.getGroups();
        if (!groups.includes(chatId)) {
            groups.push(chatId);
            fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups));
        }
    },

    // Remove group ID
    removeGroup: (chatId: number) => {
        let groups = groupManager.getGroups();
        groups = groups.filter(id => id !== chatId);
        fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups));
    },

    // Get all groups
    getGroups: (): number[] => {
        try {
            if (!fs.existsSync(GROUPS_FILE)) return [];
            const data = fs.readFileSync(GROUPS_FILE, "utf-8");
            return JSON.parse(data) || [];
        } catch {
            return [];
        }
    }
};
