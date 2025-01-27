import {
    ChatInputCommandInteraction,
    Client,
    Collection,
    SlashCommandBuilder,
} from "discord.js";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
config();

const client = new Client({
    intents: 512,
});

const commands = new Collection<
    string,
    {
        data: SlashCommandBuilder;
        execute(interaction: ChatInputCommandInteraction): Promise<void>;
    }
>();

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
            commands.set(command.data.name, command);
        } else {
            console.log(
                `[WARNING] The command at ${file} is missing a required "data" or "execute" property.`
            );
        }
    }
}

const eventFolders = fs
    .readdirSync(path.join(__dirname, "./events"))
    .filter((folder) => !folder.endsWith(".js"));
for (const folder of eventFolders) {
    const eventFiles = fs
        .readdirSync(path.join(__dirname, "./events", folder))
        .filter((file) => file.endsWith(".ts"));
    for (const file of eventFiles) {
        const { event } = require(path.join(
            __dirname,
            "./events",
            folder,
            file
        ));
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, event.execute);
        }
    }
}

client.login(process.env.DISCORD_TOKEN);
export { client, commands };
