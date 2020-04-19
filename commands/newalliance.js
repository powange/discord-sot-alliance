const AllianceManager = require('../src/allianceManager');

module.exports = {
    name: 'newalliance',
    description: 'Create new alliance!',
    aliases: ['na'],
    cooldown: 5,
    guildOnly: true,
    execute(message, args) {
        const boatsType = ['galion', 'brigantin', 'sloop'];
        const boatType = null;

        const channel = message.channel;
        const user = message.author;
        console.log(message.author);

        channel.send('Quel type de bateaux recherchez vous dans votre alliance ? (galion, brigantin, sloop)').then((messageTypeBoat) => {
            message.delete();
            const filter = m => {
                return user.id === m.author.id && boatsType.includes(m.content)
            };
            channel.awaitMessages(filter, {time: 60000, max: 1, errors: ['time']})
                .then(messages => {
                    const boatType = messages.first().content;
                    messageTypeBoat.delete();
                    messages.first().delete();

                    channel.send('Combien en voulez vous ? (entrez un nombre entre 2 et 6)').then((messageAmount) => {

                        const filter = m => {
                            let reponse = parseInt(m.content);
                            return user.id === m.author.id && !isNaN(reponse) && reponse >= 2 && reponse <= 6
                        };
                        channel.awaitMessages(filter, {time: 60000, max: 1, errors: ['time']})
                            .then(messages => {
                                const amount = parseInt(messages.first().content);
                                messageAmount.delete();
                                messages.first().delete();

                                const allianceManager = AllianceManager.getInstance(message.guild);
                                allianceManager.create(boatType, amount).then(alliance => {
                                    console.log('alliance ===> ', alliance);
                                    channel.send(`${user} a démarré une création d'alliance de ${amount} ${boatType}s => <#${alliance.textChannelID}>`);
                                });

                            })
                            .catch(() => {
                                channel.send('You did not enter any input!');
                            });


                    }).catch();

                })
                .catch(() => {
                    channel.send('You did not enter any input!');
                });
        });
    },
};