module.exports = {
    name: 'countdown',
    description: 'Launch countdown!',
    cooldown: 5,
    execute(message, args) {
        let voiceChannel = message.member.voice.channel;

        voiceChannel
            .join()
            .then(function (connection) {
                connection.play('./Ressources/countdown.webm', { volume: 2 })
                    .on('finish', () => {
                        console.log('countdown.webm has finished playing!');
                        voiceChannel.leave();
                    });
            })
    },
};