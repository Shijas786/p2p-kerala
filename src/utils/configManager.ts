import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(__dirname, "../../data/broadcast_config.json");
const DIR_PATH = path.join(__dirname, "../../data");

// Create data dir if not exists
if (!fs.existsSync(DIR_PATH)) {
    fs.mkdirSync(DIR_PATH, { recursive: true });
}

export const configManager = {
    setBroadcastChannel: (chatId: string) => {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({ broadcast_channel_id: chatId }));
    },

    getBroadcastChannel: (): string | null => {
        try {
            if (!fs.existsSync(CONFIG_PATH)) return null;
            const data = fs.readFileSync(CONFIG_PATH, "utf-8");
            return JSON.parse(data).broadcast_channel_id || null;
        } catch {
            return null;
        }
    }
};
