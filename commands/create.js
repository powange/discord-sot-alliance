const AllianceManager = require('../src/allianceManager');

module.exports = {
    name: 'create',
    description: 'Create new alliance!',
    cooldown: 5,
    args: true,
    usage: '<BoatType> <amountBoat>',
    guildOnly: true,
    execute(message, args) {
        if (!args.length) {
            return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
        }

        const boatType = args[0];
        const amount = parseInt(args[1]);

        var boatsType = ['galion', 'brigantin', 'sloop'];

        if (!boatsType.includes(args[0])) {
            return message.reply('that doesn\'t seem to be a valid boat type.');
        }

        if (isNaN(amount)) {
            return message.reply('that doesn\'t seem to be a valid number.');
        } else if (amount <= 1 || amount > 6) {
            return message.reply('you need to input a number between 2 and 6.');
        }

        const allianceManager = AllianceManager.getInstance(message.guild);
        allianceManager.create(message.member, boatType, amount);
    },
};