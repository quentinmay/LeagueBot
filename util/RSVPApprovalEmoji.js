var ListeningMessageEmoji = require('./ListeningMessageEmoji.js');
class RSVPApprovalEmoji extends ListeningMessageEmoji {
    constructor(listenerType, messageID, textChannelID, date, discordID, expirationTime) {
        super(listenerType, messageID, textChannelID, date, discordID, expirationTime);
    }
}

module.exports = RSVPApprovalEmoji;