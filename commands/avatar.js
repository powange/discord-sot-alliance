module.exports = {
    name: 'avatar',
    aliases: ['icon', 'av'],
    description: 'My Avatar!',
    cooldown: 5,
    execute(message, args) {
        message.reply(message.author.displayAvatarURL());
    },
};