const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const axios = require('axios');
const cheerio = require('cheerio');
const readline = require('readline');

const username = 'ENTER USERNAME';
const password = 'ENTER PASSWORD!';

const CHECK_INTERVAL = 20 * 60 * 1000; // 20 minutes
const REQUEST_DELAY = 1500; // 1.5s between requests (avoid rate limit)

const client = new SteamUser();
const community = new SteamCommunity();

let cookiesGlobal = null;
let farmingQueue = [];
let currentGame = null;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

client.logOn({
    accountName: username,
    password: password
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
        const badgePage = await axios.get(
            "https://steamcommunity.com/my/badges",
            { headers: { Cookie: cookiesGlobal } }
        );

        const $ = cheerio.load(badgePage.data);
        const appids = [];

        $('.badge_row_overlay').each((i, el) => {
            const link = $(el).attr('href');
            const match = link.match(/gamecards\/(\d+)/);
            if (match) appids.push(parseInt(match[1]));
        });

        console.log(`Found ${appids.length} badge entries\n`);

        for (const appid of appids) {

            await sleep(REQUEST_DELAY);

            try {
                const res = await axios.get(
                    `https://steamcommunity.com/my/gamecards/${appid}`,
                    { headers: { Cookie: cookiesGlobal } }
                );

                const $$ = cheerio.load(res.data);
                const dropText = $$('.progress_info_bold').text();

                const match = dropText.match(/([0-9]+)\s+card drops remaining/);

                if (match) {
                    const drops = parseInt(match[1]);
                    const name = $$('.badge_title').first().text().trim();

                    farmingQueue.push({
                        appid,
                        name,
                        drops
                    });

                    console.log(`${name} — ${drops} drops remaining`);
                }

            } catch (err) {
                console.log(`Failed checking appid ${appid}`);
            }
        }

        console.log(`\nQueue built: ${farmingQueue.length} games ready to farm\n`);

    } catch (err) {
        console.log("Failed to load badge page.");
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

        const res = await axios.get(
            `https://steamcommunity.com/my/gamecards/${currentGame.appid}`,
            { headers: { Cookie: cookiesGlobal } }
        );

        const $ = cheerio.load(res.data);
        const dropText = $('.progress_info_bold').text();
        const match = dropText.match(/([0-9]+)\s+card drops remaining/);

        if (match) {
            const drops = parseInt(match[1]);
            console.log(`${currentGame.name} — ${drops} drops remaining`);
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
