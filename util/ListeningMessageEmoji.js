class ListeningMessageEmoji {
    constructor(listenerType, messageID, textChannelID, date, discordID, expirationTime) {
        if (!date) date = Date.now(); 
        if (!discordID) discordID = null; 
        if (!expirationTime) expirationTime = 86400000; //Defaults to a day if none is given
        this.listenerType = listenerType;
        this.date = date;
        this.messageID = `${messageID}`;
        this.textChannelID = `${textChannelID}`;
        this.discordID = discordID;
        this.expirationTime = expirationTime;
    }

    static isExpired(listeningMessageEmoji) {
        return new Promise(function(resolve, reject) {
        if ((Date.now() - listeningMessageEmoji.date) > listeningMessageEmoji.expirationTime) { //Older than expiration time
            resolve(true);
        } else {
            resolve(false)
        }
    });
    }

    
}

module.exports = ListeningMessageEmoji;