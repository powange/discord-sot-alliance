const fs = require('fs');
const Discord = require('discord.js');
const AllianceManager = require('./src/allianceManager');
const isIp = require('is-ip');

const client = new Discord.Client({ partials: ['MESSAGE', 'REACTION'] });
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

// Here we load the config.json file that contains our token and our prefix values.
const {prefix, token} = require('./config.json');
// token contains the bot's token
// prefix contains the message prefix.


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
    // this event triggers when the bot is removed from a guild.
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on('message', message => {

    // This event will run on every single message received, from any channel or DM.

    // It's good practice to ignore other bots. This also makes your bot ignore itself
    // and not get into a spam loop (we call that "botception").
    if (message.author.bot) return;

    const alliancesManager = AllianceManager.getInstance(message.guild);
    let alliancesMatch = alliancesManager.alliances.filter(a => a.textChannelID === message.channel.id);

    if (alliancesMatch.size) {

        const messageSplit = message.content.split(':');
        if (isIp.v4(messageSplit[0])) {
            alliancesManager.setIp(message.content, message.author, alliancesMatch.first()).then(ip => {
                message.delete();
            }).catch(err => {
                console.log(err);
                message.delete();
            });
        }else{
            message.reply('Commande non authorisé')
                .then(msg => {
                    msg.delete({timeout: 5000}).then(msg => {
                        message.delete();
                    }).catch(err => console.log(err));
                }).catch(err => console.log(err));
        }
    }

    // Also good practice to ignore any message that does not start with our prefix,
    // which is set in the configuration file.
    if (message.content.indexOf(prefix) !== 0) return;

    // Here we separate our "command" name, and our "arguments" for the command.
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName)
        || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    if (command.guildOnly && message.channel.type !== 'text') {
        return message.reply('I can\'t execute that command inside DMs!');
    }

    if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;
        if (command.usage) {
            reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
        }
        return message.channel.send(reply);
    }

    if (!cooldowns.has(message.guild.id)) {
        cooldowns.set(message.guild.id, new Discord.Collection());
    }

    const guildCooldowns = cooldowns.get(message.guild.id);

    if (!guildCooldowns.has(command.name)) {
        guildCooldowns.set(command.name, new Discord.Collection());
    }

    const now = Date.now();
    const timestamps = guildCooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
        }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('there was an error trying to execute that command!');
    }

    // MembersVoice.parse(message);

    // const channelsVoice = message.guild.channels.cache.filter(c => c.type === 'voice' && c.parentID === '697310977401815120');
    // console.log(channelsVoice);
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.log('Something went wrong when fetching the message: ', error);
            return;
        }
    }

    if (user.bot === false) {
        console.log(reaction);
        const alliancesManager = AllianceManager.getInstance(reaction.message.guild);
        let alliancesMatch = alliancesManager.alliances.filter(a => a.messageID === reaction.message.id);

        if (alliancesMatch.size) {
            let alliance = alliancesMatch.first();
            alliancesManager.addReaction(reaction, user, alliance);
        }
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.log('Something went wrong when fetching the message: ', error);
            return;
        }
    }

    if (user.bot === false) {
        const alliancesManager = AllianceManager.getInstance(reaction.message.guild);
        let alliancesMatch = alliancesManager.alliances.filter(a => a.messageID === reaction.message.id);

        if (alliancesMatch.size) {
            let alliance = alliancesMatch.first();
            alliancesManager.removeReaction(reaction, user, alliance);
        }
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {

    if (newState.member.user.bot === false) {
        const alliancesManager = AllianceManager.getInstance(newState.guild);
        let alliancesMatch = alliancesManager.alliances.filter(a => {
            return a.voiceChannelID === newState.channelID || a.voiceChannelID === oldState.channelID;
        });

        if (alliancesMatch.size) {
            let alliance = alliancesMatch.first();
            alliancesManager.updateMessageEmbed(alliance)
        }
    }
});
client.login(token);
