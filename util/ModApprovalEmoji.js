var ListeningMessageEmoji = require('./ListeningMessageEmoji.js');
if (__filename.indexOf('test') != -1) {
    ListeningMessageEmoji = require('./testListeningMessageEmoji.js')
}
class ModApprovalEmoji extends ListeningMessageEmoji {
    constructor(listenerType, messageID, textChannelID, date, discordID, leagueName, expirationTime) {
        super(listenerType, messageID, textChannelID, date, discordID, expirationTime);
        this.leagueName = leagueName;
    }
}

module.exports = ModApprovalEmoji;