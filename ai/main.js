import Bot from 'yolkbot/bot';

import FireDispatch from 'yolkbot/dispatch/FireDispatch.js';
import LookAtDispatch from 'yolkbot/dispatch/LookAtDispatch.js';
import ReloadDispatch from 'yolkbot/dispatch/ReloadDispatch.js';
import SpawnDispatch from 'yolkbot/dispatch/SpawnDispatch.js';

const bot = new Bot({ name: 'selfbot' });

let tickStage = 1;

bot.on('join', (player) => {
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

            if (from <= 1)
                return bot.dispatch(new MeleeDispatch());
        }

        bot.dispatch(new FireDispatch(7));

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

await bot.join(process.env.GAME_CODE || process.argv[2]);

// bot.dispatch(new SaveLoadoutDispatch({ gunId: 5 })); // change gun to crackshot
bot.dispatch(new SpawnDispatch()); // spawn in game