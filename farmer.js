const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const axios = require('axios');
const cheerio = require('cheerio');
const readline = require('readline');

const USERNAME = 'ENTER USERNAME';
const PASSWORD = 'ENTER PASSWORD!';

const CHECK_INTERVAL = 20 * 60 * 1000;
const REQUEST_DELAY = 2000;

const client = new SteamUser();
const community = new SteamCommunity();

let cookiesGlobal = null;
let farmingQueue = [];
let currentGame = null;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

client.logOn({
    accountName: USERNAME,
    password: PASSWORD
});

client.on('steamGuard', (domain, callback) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Enter Steam Guard code: ', code => {
        callback(code);
        rl.close();
    });
});

client.on('loggedOn', () => {
    console.log("Logged into Steam");
    client.setPersona(SteamUser.EPersonaState.Online);
});

client.on('webSession', async (sessionID, cookies) => {
    community.setCookies(cookies);
    cookiesGlobal = cookies.join('; ');
    console.log("Web session established\n");

    await buildQueue();
    startNextGame();
});

async function buildQueue() {
    console.log("Scanning badge page...\n");
    farmingQueue = [];

    try {
        const res = await axios.get("https://steamcommunity.com/my/badges", {
            headers: {
                Cookie: cookiesGlobal,
                "User-Agent": "Mozilla/5.0"
            }
        });

        const $ = cheerio.load(res.data);

        $('.badge_row').each((i, row) => {

            const overlay = $(row).find('.badge_row_overlay').attr('href');
            if (!overlay) return;

            const match = overlay.match(/gamecards\/(\d+)/);
            if (!match) return;

            const appid = parseInt(match[1]);

            const dropSpan = $(row).find('.progress_info_bold').first();
            if (!dropSpan.length) return;

            const drops = parseInt(dropSpan.text().trim());
            if (isNaN(drops) || drops <= 0) return;

            const name = $(row).find('.badge_title').text().trim();

            farmingQueue.push({
                appid,
                name,
                drops
            });

            console.log(`${name} — ${drops} drops remaining`);
        });

        console.log(`\nQueue built: ${farmingQueue.length} games ready to farm\n`);

    } catch (err) {
        console.log("Failed loading badge page:", err.message);
    }
}

function startNextGame() {

    if (farmingQueue.length === 0) {
        console.log("No games left to farm.");
        client.gamesPlayed([]);
        return;
    }

    currentGame = farmingQueue.shift();

    console.log(`Now farming: ${currentGame.name}`);
    client.gamesPlayed(currentGame.appid);

    setTimeout(checkCurrentGame, CHECK_INTERVAL);
}

async function checkCurrentGame() {

    console.log(`\nRechecking drops for ${currentGame.name}...\n`);

    try {
        await sleep(REQUEST_DELAY);
        await buildQueue();

        const stillExists = farmingQueue.find(g => g.appid === currentGame.appid);

        if (stillExists) {
            console.log(`${currentGame.name} — ${stillExists.drops} drops remaining`);
            setTimeout(checkCurrentGame, CHECK_INTERVAL);
        } else {
            console.log(`${currentGame.name} finished.\n`);
            startNextGame();
        }

    } catch (err) {
        console.log("Error checking drops. Retrying later.");
        setTimeout(checkCurrentGame, CHECK_INTERVAL);
    }
}
