/*
ListeningMessageEmoji is an object thats meant to be a representation of a discord message that we want to wait for emojis to be reacted onto it.
I create instances of ListeningMessageEmoji so that we can store it in a list of ListeningMessageEmojis and link the handle events done to the message and link
that to the discordID of the person who made it. We also need expire times, since we dont want all of them to last forever.
*/
class ListeningMessageEmoji {
    constructor(listenerType, messageID, textChannelID, date, discordID, expirationTime) {
        if (!date) date = Date.now(); 
        if (!discordID) discordID = null; 
        if (!expirationTime) expirationTime = 86400000; //Defaults to a day if none is given (milliseconds)
        this.listenerType = listenerType; //We only have a few listenerTypes right now.
        this.date = date; //Date ListeningMessageEmoji was instanciated
        this.messageID = `${messageID}`; //The unique discord message ID. So we know what message the ListeningMessageEmoji isbound to
        this.textChannelID = `${textChannelID}`; 
        this.discordID = discordID; //Discord ID of the user who made the listeningMessageEmoji
        this.expirationTime = expirationTime; 
    }

/*
Functionality just to check to see if the ListeningMessageEmoji has expired or not. When it's expired, we usually know to delete that ListeningMessageEmoji object.
*/
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