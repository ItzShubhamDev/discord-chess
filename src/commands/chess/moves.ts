import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from "discord.js";
import { legalMoves, move } from "../../functions/game";
import { Move } from "chess.js";

const labels = {
    bb: "Bishop",
    bk: "King",
    bn: "Knight",
    bp: "Pawn",
    bq: "Queen",
    br: "Rook",
    wb: "Bishop",
    wk: "King",
    wn: "Knight",
    wp: "Pawn",
    wq: "Queen",
    wr: "Rook",
} as Record<string, string>;

const emojis = {
    bb: "<:blackbishop:1333283975866875977>",
    bk: "<:blackking:1333283997014294620>",
    bn: "<:blackknight:1333285740372557949>",
    bp: "<:blackpawn:1333285750724104212>",
    bq: "<:blackqueen:1333285759628869662>",
    br: "<:blackrook:1333285793405468672>",
    wb: "<:whitebishop:1333285803601694811>",
    wk: "<:whiteking:1333285817648418907>",
    wn: "<:whiteknight:1333285910837461133>",
    wp: "<:whitepawn:1333285922556608592>",
    wq: "<:whitequeen:1333285935760277565>",
    wr: "<:whiterook:1333285946602291274>",
} as Record<string, string>;

export const command = {
    data: new SlashCommandBuilder()
        .setName("moves")
        .setDescription("Shows the moves of the current chess game"),
    async execute(interaction: ChatInputCommandInteraction) {
        const res = await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
            withResponse: true,
        });
        const moves = await legalMoves(interaction.user.id, interaction);
        const groupedMoves: Record<string, Move[]> = {};
        if (!moves) return;
        if (moves.length === 0) {
            await interaction.reply("No legal moves found.");
            return;
        }
        for (const mv of moves) {
            if (!groupedMoves[mv.color + mv.piece]) {
                groupedMoves[mv.color + mv.piece] = [];
            }
            groupedMoves[mv.color + mv.piece].push(mv);
        }

        const pieces = Object.keys(groupedMoves).map((piece) => {
            return new ButtonBuilder()
                .setCustomId(piece)
                .setLabel(labels[piece])
                .setStyle(ButtonStyle.Primary)
                .setEmoji(emojis[piece]);
        });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(pieces);

        await interaction.editReply({
            components: [row],
        });

        const collectorFilter = (i: any) => i.user.id === interaction.user.id;
        try {
            const r = (await res.resource?.message?.awaitMessageComponent({
                filter: collectorFilter,
                time: 60_000,
            })) as ButtonInteraction;

            if (!r) return;
            const selectedPiece = groupedMoves[r.customId];

            if (!selectedPiece) {
                await interaction.editReply({
                    content: "No moves found for this piece.",
                    components: [],
                });
                return;
            }

            let buttons: ButtonBuilder[] = [];

            for (const move of selectedPiece) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`${move.from}-${move.to}`)
                        .setLabel(`${move.from} -> ${move.to}`)
                        .setEmoji(emojis[move.color + move.piece])
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(false)
                );
            }

            const rows: ActionRowBuilder<ButtonBuilder>[] = [];

            if (buttons.length > 25) {
                buttons = buttons.slice(0, 25);
            }

            for (let i = 0; i < buttons.length; i += 5) {
                rows.push(
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        ...buttons.slice(i, i + 5)
                    )
                );
            }

            const movesRes = await r.reply({
                components: [...rows],
                flags: MessageFlags.Ephemeral,
                withResponse: true,
            });

            await interaction.editReply({
                content: "Select a move",
                components: [],
            });

            try {
                const collectorFilter = (i: any) =>
                    i.user.id === interaction.user.id;
                const confirmation =
                    (await movesRes.resource?.message?.awaitMessageComponent({
                        filter: collectorFilter,
                        time: 60_000,
                    })) as ButtonInteraction;

                if (!confirmation) return;

                await confirmation.deferUpdate();

                const mv = selectedPiece.find(
                    (m) => `${m.from}-${m.to}` === confirmation.customId
                );

                await confirmation.deleteReply();

                if (!mv) {
                    await interaction.editReply({
                        content: "Invalid move selected.",
                        components: [],
                    });
                    return;
                }

                await move(interaction.user.id, mv, interaction);

                await interaction.editReply({
                    content: `Moved ${emojis[mv.color + mv.piece]} from ${
                        mv.from
                    } to ${mv.to}`,
                    components: [],
                });
            } catch (error) {
                console.error(error);
                await interaction.editReply({
                    content: "No move selected.",
                    components: [],
                });
            }
        } catch (error) {
            await interaction.editReply({
                content: "No piece selected.",
                components: [],
            });
        }
    },
};
