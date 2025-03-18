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
import SaveLoadoutDispatch from 'yolkbot/dispatch/SaveLoadoutDispatch';
import SpawnDispatch from 'yolkbot/dispatch/SpawnDispatch.js';

const gunData = {
    0: { id: 0, roundsPer: 9, default: true },
    1: { id: 2, roundsPer: 5 },
    2: { id: 4, roundsPer: 12 },
    3: { id: 5, roundsPer: 1 }
};

const gun = gunData[constants.gunToUse];

const bot = new Bot({
    proxy: constants.proxy,
    intents: [Bot.Intents.PATHFINDING]
});

let tickStage = 1;

bot.on('playerJoin', (player) => {
    console.log(player.name, 'joined.');
});

bot.on('tick', () => {
    if (bot.state.reloading || !bot.me.playing) return;

    const stage1 = () => {
        let nearestPlayer = bot.getBestTarget();

        if (nearestPlayer) {
            tickStage = 2;
            bot.dispatch(new LookAtDispatch(nearestPlayer.id));
        } else tickStage = 3;
    };

    const stage2 = () => {
        let nearestPlayer = bot.getBestTarget();

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

await bot.join(constants.name, process.env.GAME_CODE || process.argv[2] || constants.code);

if (!gun.default) bot.dispatch(new SaveLoadoutDispatch({ gunId: gun.id })); // change gun to selected
bot.dispatch(new SpawnDispatch()); // spawn in game