import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import conf from "./config.json";
config();

if (!process.env.DISCORD_TOKEN) {
    console.error(
        "[ERROR] The bot token is required to register commands. Please set the TOKEN environment variable."
    );
    process.exit(1);
}

const commands = [];

const commandFolders = fs
    .readdirSync(path.join(__dirname, "./commands"))
    .filter((folder) => !folder.endsWith(".js"));
for (const folder of commandFolders) {
    const commandFiles = fs
        .readdirSync(path.join(__dirname, "./commands", folder))
        .filter((file) => file.endsWith(".ts"));
    for (const file of commandFiles) {
        const { command } = require(path.join(
            __dirname,
            "./commands",
            folder,
            file
        ));
        if ("data" in command && "execute" in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(
                `[WARNING] The command at ${file} is missing a required "data" or "execute" property.`
            );
        }
    }
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`[INFO] Started refreshing application (/) commands.`);
        const data = (await rest.put(
            Routes.applicationCommands(conf.clientId),
            { body: commands }
        )) as any;

        console.log(
            `[INFO] Successfully reloaded ${data.length} application (/) commands.`
        );
    } catch (error) {
        console.error(error);
    }
})();
