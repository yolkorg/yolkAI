// constants
const constants = {
    /*
        the gun to use given the following values:

        0 - eggk
        1 - free ranger
        2 - whipper
        3 - crackshot
    */
    gunToUse: 0,

    // the bot's name. simple enough.
    name: 'yolkAI',

    // a proxy to use with the bot.
    // leave untouched to use no proxy.
    proxy: null,

    // a game code to join. you can specify one by using the following (ranked in priority):
    // GAME_CODE=your-game-code node ai/main.js
    // node ai/main.js your-game-code
    // or by specifying it here:
    code: 'your-game-code'
}

import Bot from 'yolkbot/bot';

import FireDispatch from 'yolkbot/dispatch/FireDispatch.js';
import LookAtDispatch from 'yolkbot/dispatch/LookAtDispatch.js';
import MeleeDispatch from 'yolkbot/dispatch/MeleeDispatch';
import ReloadDispatch from 'yolkbot/dispatch/ReloadDispatch.js';
import SpawnDispatch from 'yolkbot/dispatch/SpawnDispatch.js';

const gunData = {
    0: { id: 0, roundsPer: 9, default: true },
    1: { id: 2, roundsPer: 5 },
    2: { id: 4, roundsPer: 12 },
    3: { id: 5, roundsPer: 1 }
};

const gun = gunData[constants.gunToUse];

const bot = new Bot({ name: constants.name, proxy: constants.proxy });

let tickStage = 1;

bot.on('playerJoin', (player) => {
    console.log(player.name, 'joined.');
});

const getNearestPlayer = () => {
    let minDistance = Infinity;
    let targetPlayer;

    let players = Object.values(bot.players);

    for (let i = 0; i < players.length; i++) {
        const player = players[i];

        if (player && player !== bot.me && player.playing && (bot.me.team === 0 || player.team !== bot.me.team) && player.hp > 0) {
            const distance = Math.hypot(
                player.position.x - bot.me.position.x,
                player.position.y - bot.me.position.y,
                player.position.z - bot.me.position.z
            );

            if (distance < minDistance) {
                minDistance = distance;
                targetPlayer = player;
            }
        }
    }

    return targetPlayer;
}

bot.on('tick', () => {
    if (bot.state.reloading || !bot.me.playing) return;

    const stage1 = () => {
        let nearestPlayer = getNearestPlayer();

        if (nearestPlayer) {
            tickStage = 2;
            bot.dispatch(new LookAtDispatch(nearestPlayer.id));
        } else tickStage = 3;
    };

    const stage2 = () => {
        let nearestPlayer = getNearestPlayer();

        if (nearestPlayer) {
            const from = Math.hypot(
                nearestPlayer.position.x - bot.me.position.x,
                nearestPlayer.position.y - bot.me.position.y,
                nearestPlayer.position.z - bot.me.position.z
            );

            if (from <= 1) return bot.dispatch(new MeleeDispatch());
        }

        bot.dispatch(new FireDispatch(gun.roundsPer));

        if (bot.me.weapons[0] && bot.me.weapons[0].ammo && bot.me.weapons[0].ammo.rounds <= 1) tickStage = 3;
        else tickStage = 1;
    };

    const stage3 = () => {
        tickStage = 1;

        if (bot.me.weapons[0] && bot.me.weapons[0].ammo && bot.me.weapons[0].ammo.rounds <= 1) bot.dispatch(new ReloadDispatch());
        else stage1();
    };

    if (tickStage == 1) stage1();
    else if (tickStage == 2) stage2();
    else if (tickStage == 3) stage3();
});

await bot.join(process.env.GAME_CODE || process.argv[2] || constants.code);

if (!gun.default) bot.dispatch(new SaveLoadoutDispatch({ gunId: gun.id })); // change gun to crackshot
bot.dispatch(new SpawnDispatch()); // spawn in game