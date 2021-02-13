var configFile = './' + __filename.slice(__dirname.length + 1, -3) + 'Config.json'; //gets the correct config accoutn based on this files name
const Discord = require('discord.js');
const fs = require('fs');
const {GoogleSpreadsheet} = require('google-spreadsheet');
const rp = require('request-promise');
const MongoClient = require('mongodb').MongoClient;
const text2wav = require('text2wav');

var Member, LeagueAccount, ListeningMessageEmoji, ModApprovalEmoji, RSVPApprovalEmoji, QuickInhouseListeningMessageEmoji;


var mongoURI = '';
var token;
let client = new Discord.Client();
var config;

var elyonMembersList = ({
    members: []
});
var listeningMessageEmojis = ({
    messages: []
});
var memberDataRows;
var refreshingLeagueAccounts = false;

var startTime = Date.now();

client.on('ready', async () => {

    //NECESSARY
    onBoot();
    
    console.log("Started!");
    checkServerConfiguration();
    /*
        try {
        let guild = client.guilds.cache.find(g => g.id === config.serverID);
        
        let role = guild.roles.cache.find(r => r.name === 'Member 農民');
        let amongUsRole = guild.roles.cache.find(r => r.name === 'Among Us');
        let leagueRole = guild.roles.cache.find(r => r.name === 'League of Legends');
        var members = role.members;
        for (var member of members) {
            member = member[1]
                member.roles.add(amongUsRole);
                await member.roles.add(leagueRole);
        }

    } catch(err) {
        console.log(err);
        }
        */
})


client.on('guildMemberAdd', async (guildMember) => {
    registerNewGuildMemberLeagueAccount(guildMember)

});


async function registerNewGuildMemberLeagueAccount(guildMember) {
    if (guildMember.guild.id == config.serverID) {

        var elyonMember = await getElyonMemberFromDiscord(guildMember.id);
        if (elyonMember) { //If elyonmember is already registered AND has a league account already, then dont request another account
            if (elyonMember.leagueAccounts.length != 0) {
                return false;
            }
        }
        if (!(await getElyonMemberFromLeagueName(guildMember.displayName))) {
            //var leagueAccount = await LeagueAccount.findLeagueAccountByName(guildMember.displayName);
            let guild = client.guilds.cache.find(g => g.id === config.serverID);
            let defaultBotChannel = guild.channels.cache.find(channel => channel.name === config.defaultBotChannelName);
            await requestLeagueAccount(defaultBotChannel, guildMember.user, `leagueaccount ${guildMember.displayName}`, guildMember.displayName);
            defaultBotChannel.send(`${guildMember.user.username}` + "`Is this your league of legends account?\nIf no, change your discord nickname to your exact league of legends name.`")
            return true;
        } else {
            console.log(`New member leaguename "${guildMember.displayName}" already registered to an elyon account`);
        }
    }
    return false;

}

/*
client.on('messageReactionAdd', (messageReaction, user) => {
    console.log(messageReaction.emoji);
    if (user.bot) return;
    
    if (messageReaction.emoji.type == "ReactionEmoji") {
        console.log('reaction emoji')
    } else {
        console.log('not reaction emoji but emoji');
    }
})
*/



async function loadElyonMemberDataSheet() {
    try {
        const doc = new GoogleSpreadsheet(config.elyonMemberDataSheetURL); //Elyon Member Data Sheets
        await doc.useServiceAccountAuth(require(config.elyonBotSheetsTokenFile));
        await doc.loadInfo(); // loads document properties and worksheets

        var sheet = doc.sheetsByIndex[config.elyonMemberDataSheetPageIndex];
        memberDataRows = await sheet.getRows(); // can pass in { limit, offset }
    } catch (err) {
        return false;
    }
    return true;
}



function clearRSVP(channel, user) {
    getGuildMemberFromServerIDAndUserID(config.serverID, user.id).then(function (guildMember) {
        isModerator(guildMember).then(function (isModerator) {
            if (isModerator) {

                var rsvpApprovalEmoji = listeningMessageEmojis.messages.find(listeningMessageEmoji => listeningMessageEmoji.listenerType === "rsvpApproval");
                //console.log(listeningMessageEmoji)
                if (rsvpApprovalEmoji) removeListeningMessageEmoji(rsvpApprovalEmoji.messageID).then(function (status) {

                    fetchRoleByName("rsvp").then(function (role) {
                        for (var member of role.members) {
                            try {
                                member = member[1];
                                member.roles.remove(role);
                            } catch (err) {
                                console.log(err);
                            }
                        }
                    })
                    fetchRoleByName("norsvp").then(function (role) {
                        for (var member of role.members) {
                            try {
                                member = member[1];
                                member.roles.remove(role);
                            } catch (err) {
                                console.log(err);
                            }
                        }
                    })
                    channel.send("`Cleared RSVP role and removed RSVP listeners.`");
                })
            } else {
                channel.send("`This command requires bot access.`");
            }


        })
    });

}


function createRSVP(channel, user, message) {
    getGuildMemberFromServerIDAndUserID(config.serverID, user.id).then(function (guildMember) {
        isModerator(guildMember).then(function (isModerator) {
            if (isModerator) {


                var rsvpApprovalEmoji = listeningMessageEmojis.messages.find(listeningMessageEmoji => listeningMessageEmoji.listenerType === "rsvpApproval");
                if (rsvpApprovalEmoji) {
                    channel.send("`Already listening for an RSVP. do 0clearrsvp to remove it.`");
                    return;
                }
                message.react(config.checkMarkEmojiName).then(function (emoji) {
                    message.react(config.xMarkEmojiName).then(function (emoji) {
                        var listeningMessageEmoji = new RSVPApprovalEmoji("rsvpApproval", message.id, channel.id, Date.now(), user.id, 604800000)
                        addListeningMessageEmoji(listeningMessageEmoji).then(function (decision) {


                            //handleModApprovalDecision(listeningMessageEmoji, decision).then(function(status) {
                            //sendDeniedMessage(listeningMessageEmoji, status)

                            //})
                        })
                    })
                })
            } else {
                channel.send("`This command requires bot access.`");
            }
        })
    })

}


async function updateRankRoles(elyonMember) {
    var guildMember = await getGuildMemberFromServerIDAndUserID(config.serverID, elyonMember.discordID)
    if (guildMember) {
        let guild = client.guilds.cache.find(g => g.id === config.serverID);
        var highestRankEnum = await elyonMember.getHighestRankEnum();
        var highestRank = await LeagueAccount.parseRankFromEnum(highestRankEnum)
        if (highestRank.tier) {
            for (var role of guildMember.roles.cache) {
                role = role[1]; //guildMember.roles.cache technically returns an array with an id and then the role object. so need [1] to specifically get role
                switch (role.name) {
                    case "IRON":
                    case "BRONZE":
                    case "SILVER":
                    case "GOLD":
                    case "PLATINUM":
                    case "DIAMOND":
                    case "MASTER":
                    case "GRANDMASTER":
                    case "CHALLENGER":
                        if (role.name != highestRank.tier) {
                            try {
                                guildMember.roles.remove(role);
                                console.log("Removing rank role.")
                            } catch (err) {
                                continue;
                            }

                        }
                        break;
                    default:
                        break;

                }
            }
            if (highestRankEnum != 0) {
                var currentRankRole = guildMember.roles.cache.find(r => r.name === highestRank.tier);
                if (currentRankRole) { //if the discord members currentMainRole exists
                    console.log("Member already has the correct rank role.");
                } else if (currentRankRole == undefined) {
                    let rankRole = guild.roles.cache.find(r => r.name === highestRank.tier);
                    guildMember.roles.add(rankRole);
                    console.log("Giving member rank role");
                }
            }
        }
        return (true);

    } else return (false)
}


function updateRolesMainSubRoles(elyonMember) {
    return new Promise(function (resolve, reject) {
        getGuildMemberFromServerIDAndUserID(config.serverID, elyonMember.discordID).then(function (guildMember) {
            let guild = client.guilds.cache.find(g => g.id === config.serverID);
            if (elyonMember.mainRole) {
                var mainRoles = [];
                for (var role of guildMember.roles.cache) {
                    role = role[1]; //guildMember.roles.cache technically returns an array with an id and then the role object. so need [1] to specifically get role
                    if (role.name.indexOf("Main: ") != -1) {
                        try {
                            if (role.name != "Main: " + elyonMember.mainRole) {
                                guildMember.roles.remove(role);
                            }
                            mainRoles.push(role);
                        } catch (err) {
                            console.log("Error: Couldn't find role looking for.")
                            resolve(false)
                        }
                    }
                }
                var currentMainRole = guildMember.roles.cache.find(r => r.name === "Main: " + elyonMember.mainRole);
                if (currentMainRole) { //if the discord members currentMainRole exists
                    console.log("Member already has the correct main role.");
                } else if (currentMainRole == undefined) {
                    try {
                        let mainRole = guild.roles.cache.find(r => r.name === "Main: " + elyonMember.mainRole);
                        guildMember.roles.add(mainRole);
                    } catch (err) {
                        console.log("Error: Couldn't find role looking for: " + "Main: " + elyonMember.mainRole);
                        resolve(false)
                    }

                }
            }
            if (elyonMember.subRole) {
                var subRoles = [];
                for (var role of guildMember.roles.cache) {
                    role = role[1]; //guildMember.roles.cache technically returns an array with an id and then the role object. so need [1] to specifically get role
                    if (role.name.indexOf("Sub: ") != -1) {
                        try {
                            if (role.name != "Sub: " + elyonMember.subRole) {
                                guildMember.roles.remove(role);
                            }
                            subRoles.push(role);
                        } catch (err) {
                            console.log("Error: Couldn't find role looking for.")
                            resolve(false)
                        }
                    }
                }
                var currentSubRole = guildMember.roles.cache.find(r => r.name === "Sub: " + elyonMember.subRole);
                if (currentSubRole) { //if the discord members currentSubRole exists
                    console.log("Member already has the correct sub role.");
                } else if (currentSubRole == undefined) {
                    try {
                        let subRole = guild.roles.cache.find(r => r.name === "Sub: " + elyonMember.subRole);
                        guildMember.roles.add(subRole);
                    } catch (err) {
                        console.log("Error: Couldn't find role looking for: " + "Sub: " + elyonMember.subRole)
                        resolve(false)
                    }
                }
            }
            resolve(true);

        })
    });
}


async function onBoot() {
    setStatus();
    handleInhouseListeningMessageEmojis()
    handleRsvpApprovalListeningMessageEmojis()
    handleModApprovalListeningMessageEmojis(); //Boots mod approval listening message emojis. needs discord.client to be logged in
    setInterval(updateListeningMessageEmojis, 3600000); //Checks for expired ListeningMessageEmojis every hour
    refreshLeagueAccounts(); //Checks for league account updates on boot
    setInterval(refreshLeagueAccounts, 3600000) //Check for league accounts that need to be refreshed every hour
}


function idleTime(time) {
    return new Promise(function (resolve, reject) {
        setTimeout(() => resolve(time), time)
    });
}


async function refreshLeagueAccounts() {
    if (refreshingLeagueAccounts == true) {
        console.log("Already refreshing league accounts from last queue. Will wait until next refreshLeagueAccounts.");
        return false;
    }
    var refreshList = [];
    refreshingLeagueAccounts = true;
    for (var member of elyonMembersList.members) {
        var guildMember = await getGuildMemberFromServerIDAndUserID(config.serverID, member.discordID)
        if (!guildMember) {
            console.log(`${member.discordName} is not in the discord server. Not refreshing his league accounts.`);
            continue;
        }
        for (var leagueAccount of member.leagueAccounts) {
            console.log(leagueAccount.lastRefreshed);
            if (Date.now() - leagueAccount.lastRefreshed > config.refreshLeagueAccountTime) { //if last refresh was longer than a day ago
                if (!refreshList.find(item => item.leagueAccount.summonerID === leagueAccount.summonerID)) {
                    refreshList.push({
                        count: 1,
                        leagueAccount: leagueAccount,
                        elyonMember: member
                    });
                } else {
                    console.log(`League account is already in the refreshList queue. Not adding again.`)
                }
            }
        }
    }
    console.log(refreshList.length + ' league accounts need to be refreshed.')
    for (var account of refreshList) {
        if (account.count <= 2) { //Max count/number of retries is 2
            //var worked = await account.leagueAccount.refreshAccount();
            //console.log(worked + ' okayyy ');
            console.log(`Refreshing ${account.leagueAccount.leagueName} ${new Date(account.leagueAccount.lastRefreshed).toLocaleString()} older than day current: ${new Date(Date.now()).toLocaleString()}`)
            var worked = await account.leagueAccount.refreshAccount()
            if (worked == true) {
                account.elyonMember.highestRankEnum = await account.elyonMember.getHighestRankEnum();

                var status = await writeElyonMemberList()
                var elyonMember = await getElyonMemberFromSummonerID(account.leagueAccount.summonerID)
                var status = await updateRankRoles(elyonMember);
                console.log("Refreshed league account: " + account.leagueAccount.leagueName);
            } else if (worked == false) {
                account.count++;
                refreshList.push(account);
                console.log("Failed to refresh league account: " + account.leagueAccount.summonerID);
            }
            const idle = await idleTime(4000); //Simple idle time to wait 4 seconds per requests to not hit rate limit
        }
    }
    refreshingLeagueAccounts = false;
    return true;
    //console.log(elyonMembersList.members[0].leagueAccounts)
}


function sendDeniedMessage(listeningMessageEmoji, decision) {
    console.log('handlemodapprovaldeciison resolved ' + decision);
    if (decision == false) {
        let guild = client.guilds.cache.find(g => g.id === config.serverID);
        let textChannel = guild.channels.cache.find(channel => channel.id === listeningMessageEmoji.textChannelID);
        textChannel.send("`League Account could not be given for some reason.`")
    }
}


function handleModApprovalDecision(listeningMessageEmoji, decision) {
    return new Promise(function (resolve, reject) {
        if (decision == true) {

            LeagueAccount.findLeagueAccountByName(listeningMessageEmoji.leagueName).then(function (leagueAccount) {
                if (leagueAccount) { //returns undefined if leagueAccount wasnt found
                    addLeagueOfLegendsAccountToElyonMember(listeningMessageEmoji.discordID, leagueAccount).then(function (status) {
                        resolve(status);
                    })
                } else {
                    console.log("League account doesnt exist breh")
                    resolve(false);
                }
            })

        } else if (decision == false) {

            console.log("not giving " + listeningMessageEmoji.discordID + " his league name")
            resolve(false);
        }
    });
}


function addLeagueOfLegendsAccountToElyonMember(discordID, leagueAccount) {
    return new Promise(function (resolve, reject) {
        indexOfElyonMemberFromDiscord(discordID).then(function (elyonMemberIndex) {
            if (elyonMemberIndex != -1) {
                checkIfSummonerIDAlreadyRegistered(leagueAccount).then(function (bool) {
                    if (bool == false) {
                        elyonMembersList.members[elyonMemberIndex].leagueAccounts.push(leagueAccount);
                        elyonMembersList.members[elyonMemberIndex].getHighestRankEnum().then(function (highestRankEnum) {
                            elyonMembersList.members[elyonMemberIndex].highestRankEnum = highestRankEnum;
                            writeElyonMemberList().then(function (status) {
                                updateRankRoles(elyonMembersList.members[elyonMemberIndex]).then(function (status) {
                                    resolve(true);
                                })
                            })
                        })
                    } else if (bool == true) {
                        console.log("Someone already has summonerID");
                        resolve(false)
                    }
                })
            } else {
                console.log("elyonMember not found.");
                resolve(false);
            }
        });


    });

}

/*
function removeLeagueOfLegendsAccountFromElyonMember(discordID, leagueAccount) {
    return new Promise(function(resolve, reject) {
        getElyonMemberFromSummonerID(leagueAccount.summonerID).then(function(elyonMember) {
            if (elyonMember) {
                if (elyonMember.discordID == discordID) {
                    //then delete leagueaccount and then write to file then resolve
                    var leagueAccountIndex = elyonMember.leagueAccounts.findIndex(la => la.summonerID === leagueAccount.summonerID)
                    if (leagueAccountIndex != -1) {
                        elyonMember.leagueAccounts.splice(leagueAccountIndex, 1)
                        writeElyonMemberListToFile().then(function(status) {
                            updateRankRoles(elyonMember).then(function(status) { 
                                resolve(true);
                            })
                            
                        })
                    }
                } else {
                    resolve(false)
                }
            } else {
                resolve(false)
            }

        })
        resolve(false)

    
    });
    
}
*/

function setMainRoleForElyonMember(discordID, role) {
    return new Promise(function (resolve, reject) {
        indexOfElyonMemberFromDiscord(discordID).then(function (index) {
            if (index != -1) {
                elyonMembersList.members[index].mainRole = role;
                writeElyonMemberList().then(function (status) {
                    updateRolesMainSubRoles(elyonMembersList.members[index]).then(function (status) {
                        resolve(status);
                    });
                })

            } else {
                resolve(false);
            }
        })
    })
}


function setSubRoleForElyonMember(discordID, role) {
    return new Promise(function (resolve, reject) {
        indexOfElyonMemberFromDiscord(discordID).then(function (index) {
            if (index != -1) {
                elyonMembersList.members[index].subRole = role;
                writeElyonMemberList().then(function (status) {
                    updateRolesMainSubRoles(elyonMembersList.members[index]).then(function (status) {
                        resolve(status);
                    });
                });

            } else {
                resolve(false);
            }
        })
    })
}


function setFavoriteChampsForElyonMember(discordID, favoriteChamps) {
    return new Promise(function (resolve, reject) {
        indexOfElyonMemberFromDiscord(discordID).then(function (index) {
            if (index != -1) {
                elyonMembersList.members[index].favoriteChamps = favoriteChamps;
                writeElyonMemberList().then(function (status) {
                    resolve(status);
                })

            } else {
                resolve(false);
            }
        })
    })
}


function setInhouseForElyonMember(discordID, inhouseStats) {
    return new Promise(function (resolve, reject) {
        indexOfElyonMemberFromDiscord(discordID).then(function (index) {
            if (index != -1) {
                elyonMembersList.members[index].inhouseStats = inhouseStats;
                writeElyonMemberList().then(function (status) {
                    resolve(status);
                })

            } else {
                resolve(false);
            }
        })
    })
}

function removeLeagueOfLegendsAccountFromElyonMember(discordID, leagueAccount) {
    return new Promise(function (resolve, reject) {
        getElyonMemberFromSummonerID(leagueAccount.summonerID).then(function (elyonMember) {
            if (elyonMember) {
                if (elyonMember.discordID == discordID) {
                    //then delete leagueaccount and then write to file then resolve
                    var leagueAccountIndex = elyonMember.leagueAccounts.findIndex(la => la.summonerID === leagueAccount.summonerID)
                    if (leagueAccountIndex != -1) {
                        elyonMember.leagueAccounts.splice(leagueAccountIndex, 1)
                        elyonMember.getHighestRankEnum().then(function (highestRankEnum) {
                            elyonMember.highestRankEnum = highestRankEnum;
                            writeElyonMemberList().then(function (status) {
                                updateRankRoles(elyonMember).then(function (status) {
                                    resolve(true);
                                })

                            })
                        })
                    }
                } else {
                    resolve(false)
                }
            } else {
                resolve(false)
            }

        })
        resolve(false)


    });

}

/*
function removeLeagueAccountFromElyonMember(discordID, leagueAccount) {
    return new Promise(function(resolve, reject) {
        indexOfElyonMemberFromDiscord(discordID).then(function(elyonMemberIndex) {
            if (elyonMemberIndex != -1) {
                checkIfSummonerIDAlreadyRegistered(leagueAccount).then(function(bool) {
                    if (bool == true) {
                    elyonMembersList.members[elyonMemberIndex].leagueAccounts.splice(elyonMembersList.members[elyonMemberIndex].leagueAccounts.findIndex(la => la.summonerID === leagueAccount.summonerID), 1);
                    writeElyonMemberListToFile().then(function(status) {
                        resolve(true);
                    })
            } else {
                console.log("summonerID not registered");
                resolve(false)
            }
            })
            } else {
                console.log("elyonMember not found.");
                resolve(false);
            }
    });

    
    });



}
*/

async function getElyonMemberFromLeagueName(leagueName) {
    for (var member of elyonMembersList.members) {
        for (var leagueAccount of member.leagueAccounts) {
            if (leagueAccount.leagueName.toLowerCase() == leagueName.toLowerCase()) return member;
        }
    }
    return undefined;
}

function getElyonMemberFromSummonerID(summonerID) {
    return new Promise(function (resolve, reject) {

        //issue need to check every single league accounts
        elyonMembersList.members.forEach(function (member, index) {
            if (member.leagueAccounts.find(la => la.summonerID === summonerID)) {
                resolve(member);
            }
        })
        resolve(undefined);
    });
}


function checkIfSummonerIDAlreadyRegistered(leagueAccount) {
    return new Promise(function (resolve, reject) {

        //issue need to check every single league accounts
        elyonMembersList.members.forEach(function (member, index) {
            if (member.leagueAccounts.find(la => la.summonerID === leagueAccount.summonerID)) {
                resolve(true);
            }
        })
        resolve(false);
    });
}



function handleInhouseListeningMessageEmojis() {
    listeningMessageEmojis.messages.forEach(function (listeningMessageEmoji, index) {
        if (listeningMessageEmoji.listenerType == 'quickInhouse') {
            bootListeningMessageEmoji(listeningMessageEmoji).then(function (closed) {

            })
        }
    })

}

function handleRsvpApprovalListeningMessageEmojis() {
    listeningMessageEmojis.messages.forEach(function (listeningMessageEmoji, index) {
        if (listeningMessageEmoji.listenerType == 'rsvpApproval') {
            bootListeningMessageEmoji(listeningMessageEmoji).then(function (closed) {

            })
        }
    })

}


function handleModApprovalListeningMessageEmojis() {
    listeningMessageEmojis.messages.forEach(function (listeningMessageEmoji, index) {
        if (listeningMessageEmoji.listenerType == 'modAccountApproval') {
            bootListeningMessageEmoji(listeningMessageEmoji).then(function (decision) {
                handleModApprovalDecision(listeningMessageEmoji, decision).then(function (status) {
                    sendDeniedMessage(listeningMessageEmoji, status)
                });
            })
        }
    })
}


function bootListeningMessageEmoji(listeningMessageEmoji) {
    return new Promise(function (resolve, reject) {
        switch (listeningMessageEmoji.listenerType) {
            case "modAccountApproval":
                fetchModAccountApproval(listeningMessageEmoji.messageID, listeningMessageEmoji.textChannelID, listeningMessageEmoji.date).then(function (bool) {
                    resolve(bool)
                });
                break;
            case "rsvpApproval":
                fetchRsvpApproval(listeningMessageEmoji.messageID, listeningMessageEmoji.textChannelID, listeningMessageEmoji.date).then(function (bool) {
                    resolve(bool)
                });
                break;
            case "quickInhouse":
                fetchQuickInhouse(listeningMessageEmoji.messageID, listeningMessageEmoji.textChannelID, listeningMessageEmoji.date).then(function (bool) {
                    resolve(bool)
                });
                break;
            default:
                reject("listenerType not found.");
                break;
        }
    });
}


async function clearInhouse(channel, user) {
    try {
        var guildMember = await getGuildMemberFromServerIDAndUserID(config.serverID, user.id);
        if (await isModerator(guildMember)) {
            var inhouseEmoji = listeningMessageEmojis.messages.find(listeningMessageEmoji => listeningMessageEmoji.listenerType === "quickInhouse");
            //console.log(listeningMessageEmoji)
            if (inhouseEmoji) {
                var status = await removeListeningMessageEmoji(inhouseEmoji.messageID)
                var message = await getMessageByMessageIDAndChannelID(inhouseEmoji.messageID, inhouseEmoji.textChannelID);
                if (message) {
                    message.delete();
                }
                return status;
            }
        } else {
            channel.send("`You do not have access to this command.`");
            return false;
        }
        return true;

    } catch (err) {
        console.log(err);
        return false;
    }

}

async function getInhouseEmbed(listeningMessageEmoji) {
    try {

        let guild = client.guilds.cache.find(g => g.id === config.serverID);
        var inhouseListEmbed = {
            color: 9177243,
            author: {
                name: "List of all Inhouse members by role",
                icon_url: client.user.displayAvatarURL()
            },
            footer: {
                text: "Expires in an hour."
            },
            fields: [{
                    name: `${guild.emojis.cache.find(emoji => emoji.name === 'top')}`,
                    value: "­"
                },
                {
                    name: `${guild.emojis.cache.find(emoji => emoji.name === 'jungle')}`,
                    value: "­"
                },
                {
                    name: `${guild.emojis.cache.find(emoji => emoji.name === 'mid')}`,
                    value: "­"
                },
                {
                    name: `${guild.emojis.cache.find(emoji => emoji.name === 'adc')}`,
                    value: "­"
                },
                {
                    name: `${guild.emojis.cache.find(emoji => emoji.name === 'supp')}`,
                    value: "­"
                },
                {
                    name: `${guild.emojis.cache.find(emoji => emoji.name === 'fill')}`,
                    value: "­"
                }
            ]
        }
        var top = [];
        var jungle = [];
        var mid = [];
        var adc = [];
        var supp = [];
        var fill = [];
        for (var member of listeningMessageEmoji.members) {
            var guildMember = await getGuildMemberFromServerIDAndUserID(config.serverID, member.discordID);
            if (!guildMember) continue;
            switch (member.role) {
                case "top":
                    top.push(guildMember.displayName);
                    break;
                case "jungle":
                    jungle.push(guildMember.displayName);
                    break;
                case "mid":
                    mid.push(guildMember.displayName);
                    break;
                case "adc":
                    adc.push(guildMember.displayName);
                    break;
                case "supp":
                    supp.push(guildMember.displayName);
                    break;
                case "fill":
                    fill.push(guildMember.displayName);
                    break;
                default:
                    break;
            }
        }
        inhouseListEmbed.fields[0].value += top.join(", ");
        inhouseListEmbed.fields[1].value += jungle.join(", ");
        inhouseListEmbed.fields[2].value += mid.join(", ");
        inhouseListEmbed.fields[3].value += adc.join(", ");
        inhouseListEmbed.fields[4].value += supp.join(", ");
        inhouseListEmbed.fields[5].value += fill.join(", ");
        return inhouseListEmbed;
    } catch (err) {
        console.log(err);
        return undefined;
    }
}

async function updateQuickInhouseEmbed(listeningMessageEmoji, message, time) {
    await idleTime(time);
    listeningMessageEmoji.queue = 0; //reset queue
    listeningMessageEmoji.lastUpdated = Date.now();
    const updatedEmbed = new Discord.MessageEmbed(await getInhouseEmbed(listeningMessageEmoji));
    message.edit(updatedEmbed);
}


function fetchQuickInhouse(messageID, textChannelID, date) {
    return new Promise(function (resolve, reject) {
        getListeningMessageEmojiByMessageID(messageID).then(function (listeningMessageEmoji) {
            var expirationDate = (listeningMessageEmoji.expirationTime + date) - Date.now(); // <-- Milliseconds until listener expires. (1 hour)
            fetchEmojiReactionCollector(messageID, textChannelID, expirationDate).then(function (collector) {
                if (collector) {
                    collector.on('collect', function (reaction, user) {
                        if (user.bot) {
                            resolve(false)
                            return;
                        }
                        getListeningMessageEmojiByMessageID(messageID).then(function (listeningMessageEmoji) { //needs to recheck to make sure listeningMessageEmoji still exists every time it collects
                            if (listeningMessageEmoji) {

                                switch (reaction.emoji.name) {
                                    case "top":
                                    case "jungle":
                                    case "mid":
                                    case "adc":
                                    case "supp":
                                    case "fill":
                                        getGuildMemberFromServerIDAndUserID(config.serverID, user.id).then(function (guildMember) {

                                            if (!listeningMessageEmoji.members.find(member => member.discordID == guildMember.id)) {
                                                listeningMessageEmoji.members.push({
                                                    discordID: guildMember.id,
                                                    role: undefined
                                                });
                                            }
                                            var member = listeningMessageEmoji.members.find(member => member.discordID == guildMember.id);
                                            if (member.role == reaction.emoji.name) {
                                                return;
                                            } else {
                                                member.role = reaction.emoji.name;
                                                if (Date.now() - listeningMessageEmoji.lastUpdated < 2000) { //Last updated less than 2 second ago
                                                    if (listeningMessageEmoji.queue == 0) {
                                                        getMessageByMessageIDAndChannelID(messageID, textChannelID).then(function (message) {
                                                            /*
                                                            lastupdated = 40,000
                                                            Date.Now() = 41,500
                                                            updateIn = (40,000 + 2000) - 41,500 so 500
                                                            if UpdateIn < 0 || > 2000, updatein = 0
                                                            */
                                                            //wanna update when those 2 seconds are done
                                                            var updateIn = (listeningMessageEmoji.lastUpdated + 2000) - Date.now();
                                                            if (updateIn < 0 || updateIn > 2000) updateIn = 0;
                                                            listeningMessageEmoji.queue = listeningMessageEmoji.queue + 1;
                                                            updateQuickInhouseEmbed(listeningMessageEmoji, message, updateIn)
                                                        })
                                                    } else {
                                                        console.log('Already has a queue to update.')
                                                    }

                                                } else {
                                                    if (listeningMessageEmoji.queue == 0) {
                                                        //update embed now
                                                        getMessageByMessageIDAndChannelID(messageID, textChannelID).then(function (message) {
                                                            updateQuickInhouseEmbed(listeningMessageEmoji, message, 0)
                                                        });
                                                    }
                                                }
                                            }
                                        })
                                        break;
                                    default:
                                        console.log(`Role not found: ${reaction.emoji.name}`)
                                        return;
                                }
                            } else {
                                collector.stop("Listener no longer exists");
                            }
                        })
                    });
                    collector.on('end', function (collected, reason) {
                        removeListeningMessageEmoji(messageID).then(function (bool) {
                            updateListeningMessageEmojis().then(function (bool) {
                                client.users.fetch(listeningMessageEmoji.discordID).then(function (requester) {
                                    console.log("expired")
                                    resolve(false)
                                });
                            });
                        });
                    });
                } else {
                    console.log("Message no longer exists to create a listener for.");
                    removeListeningMessageEmoji(messageID).then(function (status) {
                        resolve(false)
                    })

                }
            });
        });
    });
}


function fetchRsvpApproval(messageID, textChannelID, date) {
    return new Promise(function (resolve, reject) {
        var expirationDate = (604800000 + date) - Date.now(); // <-- Milliseconds until listener expires. (1 week)
        getListeningMessageEmojiByMessageID(messageID).then(function (listeningMessageEmoji) {
            fetchEmojiReactionCollector(messageID, textChannelID, expirationDate).then(function (collector) {
                if (collector) {
                    collector.on('collect', function (reaction, user) {
                        getListeningMessageEmojiByMessageID(messageID).then(function (listeningMessageEmoji) { //needs to recheck to make sure listeningMessageEmoji still exists every time it collects
                            if (listeningMessageEmoji) {

                                if (user.bot) return;
                                if (reaction.emoji.name == config.checkMarkEmojiName) {
                                    getGuildMemberFromServerIDAndUserID(config.serverID, user.id).then(function (guildMember) {
                                        if (guildMember.roles.cache.find(r => r.name === 'rsvp')) return; //if already has rsvp role, return
                                        console.log("Player RSVP'd");
                                        fetchRoleByName("rsvp").then(function (role) {
                                            if (role) {
                                                try {
                                                    guildMember.roles.add(role);
                                                    if (guildMember.roles.cache.find(r => r.name === 'norsvp')) {
                                                        guildMember.roles.remove(guildMember.roles.cache.find(r => r.name === 'norsvp'))
                                                    } //if already has rsvp role, return
                                                } catch (err) {
                                                    console.log(err);
                                                }
                                            }
                                        })



                                    })
                                } else if (reaction.emoji.name == config.xMarkEmojiName) {
                                    getGuildMemberFromServerIDAndUserID(config.serverID, user.id).then(function (guildMember) {
                                        if (guildMember.roles.cache.find(r => r.name === 'norsvp')) return; //if already has rsvp role, return
                                        console.log("Player didn't RSVP'd");
                                        fetchRoleByName("norsvp").then(function (role) {
                                            if (role) {
                                                guildMember.roles.add(role);
                                                if (guildMember.roles.cache.find(r => r.name === 'rsvp')) {
                                                    try {
                                                        guildMember.roles.remove(guildMember.roles.cache.find(r => r.name === 'rsvp'))
                                                    } catch (err) {
                                                        console.log(err);
                                                    }
                                                } //if already has rsvp role, return
                                            }
                                        })



                                    })
                                }
                            } else {
                                collector.stop("Listener no longer exists");
                            }
                        })
                    });
                    collector.on('end', function (collected, reason) {
                        removeListeningMessageEmoji(messageID).then(function (bool) {
                            updateListeningMessageEmojis().then(function (bool) {
                                client.users.fetch(listeningMessageEmoji.discordID).then(function (requester) {

                                    console.log("expired")
                                    resolve(false)
                                })
                            });
                        })


                    })
                } else {
                    console.log("Message no longer exists to create a listener for.");
                    removeListeningMessageEmoji(messageID).then(function (status) {
                        resolve(false)
                    })
                }
            });
        });
    });
}


function fetchModAccountApproval(messageID, textChannelID, date) {
    return new Promise(function (resolve, reject) {
        var expirationDate = (86400000 + date) - Date.now(); // <-- Milliseconds until listener expires 
        getListeningMessageEmojiByMessageID(messageID).then(function (listeningMessageEmoji) {
            fetchEmojiReactionCollector(messageID, textChannelID, expirationDate).then(function (collector) {
                if (collector) {
                    collector.on('collect', function (reaction, user) {
                        getListeningMessageEmojiByMessageID(messageID).then(function (listeningMessageEmoji) { //needs to recheck to make sure listeningMessageEmoji still exists every time it collects
                            if (listeningMessageEmoji) {
                                if (user.bot) return;
                                if (reaction.emoji.name == config.checkMarkEmojiName || reaction.emoji.name == config.xMarkEmojiName) {
                                    getGuildMemberFromServerIDAndUserID(config.serverID, user.id).then(function (guildMember) {
                                        //console.log(guildMember.id);
                                        isModerator(guildMember).then(function (isModerator) {
                                            if (isModerator) {
                                                if (reaction.emoji.name == config.checkMarkEmojiName) {
                                                    updateListeningMessageEmojis().then(function (bool) {
                                                        console.log('Approved by mod');
                                                        collector.stop("approved")
                                                    });
                                                } else if (reaction.emoji.name == config.xMarkEmojiName) {
                                                    updateListeningMessageEmojis().then(function (bool) {
                                                        console.log('Denied by mod');
                                                        collector.stop("denied")
                                                    });
                                                }


                                            }
                                        })
                                    })
                                }
                            } else {
                                collector.stop("Listener no longer exists");
                            }
                        });
                    });
                    collector.on('end', function (collected, reason) {

                        removeListeningMessageEmoji(messageID).then(function (bool) {
                            updateListeningMessageEmojis().then(function (bool) {
                                client.users.fetch(listeningMessageEmoji.discordID).then(function (requester) {
                                    var msg = collector.message;
                                    if (reason == "approved") {
                                        msg.channel.send(`${requester.username}` + "`" + ` League Account '${listeningMessageEmoji.leagueName}' has been approved.` + "`");
                                        resolve(true);
                                    } else {
                                        console.log("Either denied or expired")
                                        msg.channel.send(`${requester.username}` + "`" + ` League Account '${listeningMessageEmoji.leagueName}' has been denied.` + "`");
                                        resolve(false)
                                    }

                                    collector.message.delete().then(msg => {}).catch(error => {});


                                })
                            });
                        })


                    })
                } else {
                    console.log("Message no longer exists to create a listener for.");
                    removeListeningMessageEmoji(messageID).then(function (status) {
                        resolve(false)
                    })
                }
            });
        });
    });
}


function getListeningMessageEmojiByMessageID(messageID) {
    return new Promise(function (resolve, reject) {
        resolve(listeningMessageEmojis.messages.find(message => message.messageID === messageID))
    });
}




function fetchEmojiReactionCollector(messageID, textChannelID, expireTime) {
    return new Promise(function (resolve, reject) {
        getMessageByMessageIDAndChannelID(messageID, textChannelID).then(function (message) {
            if (message) {
                const filter = (reaction, user) => reaction.emoji.name != undefined;
                resolve(message.createReactionCollector(filter, {
                    time: expireTime
                }));
            } else {
                resolve(undefined);
            }

        });



    })
}

/*
else if (listeningMessageEmoji.listenerType == "modAccountApproval") {
              
          
          console.log(listeningMessageEmojiThatMatches)
          if (listeningMessageEmojiThatMatches) {
              if (listeningMessageEmojiThatMatches.listenerType ==listeningMessageEmoji.listenerType) {
                  reject("Message already added to list.");
              }
          }
      }
*/
function addListeningMessageEmoji(listeningMessageEmoji) {
    return new Promise(function (resolve, reject) {
        var listeningMessageEmojiThatMatches = undefined;

        // var listeningMessageEmojiThatMatches = listeningMessageEmojis.messages.filter(message => message.listenerType === 'modAccountApproval').find(message => message.leagueName.toLowerCase() === listeningMessageEmoji.leagueName.toLowerCase());
        if (listeningMessageEmoji.listenerType == 'modAccountApproval')
            listeningMessageEmojiThatMatches = listeningMessageEmojis.messages.find(message => message.listenerType === 'modAccountApproval' && message.leagueName.toLowerCase() === listeningMessageEmoji.leagueName.toLowerCase())
        if (listeningMessageEmojis.messages.find(message => message.messageID === listeningMessageEmoji.messageID)) {
            reject("Message already added to list.");
        } else if (listeningMessageEmoji.listenerType == "modAccountApproval" && listeningMessageEmojiThatMatches) {
            //listeningMessageEmoji.messageID

            listeningMessageEmojis.messages.push(listeningMessageEmoji);
            writeListeningMessageEmojisToFile().then(function (status) {
                bootListeningMessageEmoji(listeningMessageEmoji).then(function (decision) {
                    resolve(decision);
                })
            })
        } else {
            listeningMessageEmojis.messages.push(listeningMessageEmoji);
            writeListeningMessageEmojisToFile().then(function (status) {
                bootListeningMessageEmoji(listeningMessageEmoji).then(function (decision) {
                    resolve(decision);
                })
            })
        }
    });
}


function removeListeningMessageEmoji(messageID) {
    console.log('removing listener ' + messageID)
    return new Promise(function (resolve, reject) {
        var listeningMessageEmojiIndex = listeningMessageEmojis.messages.findIndex(message => message.messageID === messageID)
        if (listeningMessageEmojiIndex != -1) {
            listeningMessageEmojis.messages.splice(listeningMessageEmojiIndex, 1)
            writeListeningMessageEmojisToFile().then(function (status) {
                resolve(status)
            })
        } else {
            resolve(false);
        }

    });
}


function getMessageByMessageIDAndChannelID(messageID, channelID) {
    return new Promise(function (resolve, reject) {
        let guild = client.guilds.cache.find(g => g.id === config.serverID);
        let textChannel = guild.channels.cache.find(channel => channel.id === channelID);
        if (textChannel) {
            textChannel.messages.fetch(messageID).then(function (message) {
                resolve(message);
            }).catch(error => {
                resolve(undefined)

            });
        } else {
            resolve(undefined)
        }

    })

}



function updateListeningMessageEmojis() {
    return new Promise(function (resolve, reject) {
        if (listeningMessageEmojis.messages.length > 0) {
            listeningMessageEmojis.messages.forEach(function (listeningMessageEmoji, index) {
                ListeningMessageEmoji.isExpired(listeningMessageEmoji).then(function (bool) {
                    if (bool) { //bool is true or existing means that it is expired
                        removeListeningMessageEmoji(listeningMessageEmoji.messageID).then(function (status) {
                            console.log("One Listener has expired");
                        })
                    }
                })

            })
            resolve(false);
        } else resolve(true);
    });
}


function createListeningMessageEmoji(listeningMessageEmojiJSON) {
    return new Promise(function (resolve, reject) {
        switch (listeningMessageEmojiJSON.listenerType) {
            case "rsvpApproval":
                resolve(new RSVPApprovalEmoji(listeningMessageEmojiJSON.listenerType, listeningMessageEmojiJSON.messageID, listeningMessageEmojiJSON.textChannelID,
                    listeningMessageEmojiJSON.date, listeningMessageEmojiJSON.discordID, listeningMessageEmojiJSON.expirationTime));
                break;
            case "modAccountApproval":
                resolve(new ModApprovalEmoji(listeningMessageEmojiJSON.listenerType, listeningMessageEmojiJSON.messageID, listeningMessageEmojiJSON.textChannelID,
                    listeningMessageEmojiJSON.date, listeningMessageEmojiJSON.discordID, listeningMessageEmojiJSON.leagueName, listeningMessageEmojiJSON.expirationTime));
                break;
            case "quickInhouse":
                resolve(new QuickInhouseListeningMessageEmoji(listeningMessageEmojiJSON.listenerType, listeningMessageEmojiJSON.messageID, listeningMessageEmojiJSON.textChannelID,
                    listeningMessageEmojiJSON.date, listeningMessageEmojiJSON.discordID, listeningMessageEmojiJSON.expirationTime, listeningMessageEmojiJSON.lastUpdated,
                    listeningMessageEmojiJSON.queue, listeningMessageEmojiJSON.members));
                break;
            default:
                resolve(undefined);
                break;
        }

    });
}


async function populateListeningMessageEmojis() {
    var json;
    try {
        json = await readFile(config.listeningMessageEmojisPath)
        } catch (err) {
            console.log('No elyonListeningMessageEmojis.json file found. Generating new file instead.');
            json = `{"messages":[]}`
            var jsonObject = JSON.parse(json);
            fs.writeFileSync(config.listeningMessageEmojisPath, JSON.stringify(jsonObject, null, 4));
        }
    if (!json) return (false);

    var tempList = JSON.parse(json);
    for (var listeningMessageEmojiJSON of tempList.messages) { //runs sequentially and waits for end

        var listeningMessageEmoji = await createListeningMessageEmoji(listeningMessageEmojiJSON);
        if (listeningMessageEmoji)
            listeningMessageEmojis.messages.push(listeningMessageEmoji);
    }
    return (true);

}


async function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', function (err, data) {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
}



function writeListeningMessageEmojisToFile() {

    return new Promise(function (resolve, reject) {
        fs.writeFile(config.listeningMessageEmojisPath, JSON.stringify(listeningMessageEmojis, null, 4), function (err) {
            if (err) return reject(err);
            resolve(true);
        })
    });
}


async function populateElyonMemberList() {
    if (config.readMemberDataFromFileInsteadOfSheets) {
        console.log("Populating Elyon Member List From File")
        return await populateElyonMemberListFromFile();

    } else {
        console.log("Populating Elyon Member List From Mongo DB")
        return await populateElyonMemberListFromMongoDB();
        //return await populateElyonMemberListFromSheets();
    }

}


async function populateElyonMemberListFromFile() {
    var json;
    try {
        json = await readFile(config.elyonMembersListPath)
    } catch (err) {
        console.log('No elyonMembersListPath file found. Generating new file instead.');
        json = `{"members":[]}`
        var jsonObject = JSON.parse(json);
        fs.writeFileSync(config.elyonMembersListPath, JSON.stringify(jsonObject, null, 4));
        
    }
    if (!json) return (false);
    var tempList = JSON.parse(json);
    //console.log(json);
    //console.log(tempList.members[0].leagueAccounts);
    for (var elyonMemberJSON of tempList.members) { //runs sequentially and waits for end
        var elyonMember = await Member.createMember(elyonMemberJSON);
        elyonMember.leagueAccounts = []; //wipe array so we can push to it
        for (var leagueAccountJSON of elyonMemberJSON.leagueAccounts) {
            //console.log(leagueAccountJSON)
            elyonMember.leagueAccounts.push(await LeagueAccount.createLeagueAccount(leagueAccountJSON));
        }
        elyonMembersList.members.push(elyonMember);
    }

    return (true);
}

async function populateElyonMemberListFromSheets() {

    for (var row of memberDataRows) {
        if (!row.discordID) return true; //means we hit the end of filled up members
        var discordName = row.discordName;
        if (discordName) {
            discordName = discordName.substr(1, discordName.length - 2)
        }
        //discordName[discordName.length - 1] = '';
        var favoriteChamps = row.favoriteChamps;
        if (row.favoriteChamps) {
            favoriteChamps = favoriteChamps.substr(1, favoriteChamps.length - 2)
            // favoriteChamps[favoriteChamps.length - 1] = '';
        }
        var elyonMember = new Member(null, row.discordID, row.mainRole, row.subRole, favoriteChamps, row.inhouseStats, discordName, row.highestRankEnum);
        var leagueAccountsJSON = JSON.parse(row.leagueAccounts);
        for (var leagueAccountJSON of leagueAccountsJSON) {
            elyonMember.leagueAccounts.push(await LeagueAccount.createLeagueAccount(leagueAccountJSON));
        }
        elyonMembersList.members.push(elyonMember);
    }

    return (true);
}

async function writeElyonMemberList() {
    if (config.writeMemberDataToFileInsteadOfSheets) {
        return await writeElyonMemberListToFile();
    } else {

        writeElyonMemberListToFile(); //writing elyonMemberLIst to file to make a localfile backup
        return await writeElyonMemberListToMongoDB();
        //return await writeElyonMemberListToSheets();
    }

}

function writeElyonMemberListToFile() {
    console.log("writing to file");

    return new Promise(function (resolve, reject) {
        fs.writeFile(config.elyonMembersListPath, JSON.stringify(elyonMembersList, null, 4), function (err) {
            if (err) reject(err);
            resolve(true);
        })
    });
}

async function writeElyonMemberListToSheets(count) {
    if (!count) count = 1;
    if (count < 5) {
        try {
            console.log("writing to sheets");

            await Promise.all(elyonMembersList.members.map(async (member, i) => {
                memberDataRows[i].discordName = '"' + member.discordName + '"';
                memberDataRows[i].discordID = member.discordID;
                memberDataRows[i].leagueAccounts = JSON.stringify(member.leagueAccounts);
                memberDataRows[i].mainRole = member.mainRole;
                memberDataRows[i].subRole = member.subRole;
                memberDataRows[i].favoriteChamps = '"' + member.favoriteChamps + '"';
                memberDataRows[i].inhouseStats = member.inhouseStats;
                memberDataRows[i].highestRankEnum = member.highestRankEnum;
                if (member.discordName == null) memberDataRows[i].discordName = "";
                if (member.discordID == null) memberDataRows[i].discordID = "";
                if (member.mainRole == null) memberDataRows[i].mainRole = "";
                if (member.subRole == null) memberDataRows[i].subRole = "";
                if (member.favoriteChamps == null) memberDataRows[i].favoriteChamps = "";
                if (member.inhouseStats == null) memberDataRows[i].inhouseStats = "";
                if (member.highestRankEnum == null) memberDataRows[i].highestRankEnum = "";
                await memberDataRows[i].save();
            }));
        } catch (err) {
            console.log(`Failed to save Elyon Member Data to sheets for ${count} times. Trying 5 times before saving to file instead.`);
            count = count++;
            return await writeElyonMemberListToSheets(count);
        }
        return true;
    } else {
        console.log(`Failed to save Elyon Member Data to sheets. Writing to file instead.`);
        config.writeMemberDataToFileInsteadOfSheets = true;
        return false;
    }
}


function addElyonMemberToList(member) {
    return new Promise(function (resolve, reject) {
        elyonMembersList.members.push(member);
        console.log('writing elyon member list')
        writeElyonMemberList().then(function (status) {
            resolve(status);
        })
    });

}


function indexOfElyonMemberFromDiscord(discordID) {
    return new Promise(function (resolve, reject) {
        var index = elyonMembersList.members.findIndex(member => member.discordID === discordID);
        resolve(index);
    });
}


function getElyonMemberFromDiscord(discordID) {
    return new Promise(function (resolve, reject) {
        var member = elyonMembersList.members.find(member => member.discordID === discordID);
        resolve(member);
    });
}



function setStatus() {
    client.user.setActivity('to discord.', {
        type: config.status,
        url: config.twitchLink
    }).catch(console.error);
}


function isModerator(guildMember) {
    return new Promise(function (resolve, reject) {
        getModerators(config.serverID).then(function (moderators) {
            let bool = moderators.has(guildMember.id);
            resolve(bool);
        });
    });

}

function getModerators(guildID) {
    return new Promise(function (resolve, reject) {
        try {
            let guild = client.guilds.cache.find(g => g.id === guildID);

            let role = guild.roles.cache.find(r => r.name === config.modRole);
            resolve(role.members);

        } catch (err) {
            reject(err);
        }
    });
}


function fetchRoleByName(roleName) {
    return new Promise(function (resolve, reject) {
        let guild = client.guilds.cache.find(g => g.id === config.serverID);
        resolve(guild.roles.cache.find(r => r.name === roleName));
    });
}

async function checkServerConfiguration() {
    var requiredRoles = [config.modRole, "Main: top","Main: jungle","Main: mid","Main: adc","Main: supp","Sub: top","Sub: jungle","Sub: mid","Sub: adc","Sub: supp", 
                         "CHALLENGER", "GRANDMASTER", "MASTER", "DIAMOND", "PLATINUM", "GOLD", "SILVER", "BRONZE", "IRON", "rsvp", "norsvp", "voice"]
    var requiredEmojis = ["CHALLENGER", "GRANDMASTER", "MASTER", "DIAMOND", "PLATINUM", "GOLD", "SILVER", "BRONZE", "IRON"]
    var requiredTextChannel = config.defaultBotChannelName;
    try {
        let guild = client.guilds.cache.find(g => g.id === config.serverID);
        var guildRoles = guild.roles.cache;
        var rolesNotFound = [];
        for (var requiredRole of requiredRoles) {
            if (!guildRoles.find(role => role.name === requiredRole)) {
                rolesNotFound.push(requiredRole);
            }
        }
        var guildEmojis = guild.emojis.cache;
        var emojisNotFound = [];
        for (var requiredEmoji of requiredEmojis) {
            if (!guildEmojis.find(emoji => emoji.name === requiredEmoji)) {
                emojisNotFound.push(requiredEmoji);
            }
        }
        var guildTextChannels = guild.channels.cache.filter(channel => channel.type === "text");
        var requiredTextChannelExists = guildTextChannels.find(channel => channel.name === requiredTextChannel);
        if (emojisNotFound.length > 0)console.log(`These required emojis not found: ${emojisNotFound}`)
        if (rolesNotFound.length > 0)console.log(`These required roles not found: ${rolesNotFound}`)
        if (!requiredTextChannelExists)console.log(`This required text channel wasn't found: ${requiredTextChannel}`)
        if (rolesNotFound.length > 0 || emojisNotFound.length > 0 || !requiredTextChannelExists)console.log(`Type 0configure command to auto add them or there could be issues.`);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

async function autoServerConfiguration() {
    try {
        var requiredRoles = [config.modRole, "Main: top","Main: jungle","Main: mid","Main: adc","Main: supp","Sub: top","Sub: jungle","Sub: mid","Sub: adc","Sub: supp", 
                             "CHALLENGER", "GRANDMASTER", "MASTER", "DIAMOND", "PLATINUM", "GOLD", "SILVER", "BRONZE", "IRON", "rsvp", "norsvp", "voice"]
        var requiredEmojis = ["CHALLENGER", "GRANDMASTER", "MASTER", "DIAMOND", "PLATINUM", "GOLD", "SILVER", "BRONZE", "IRON"]
        var requiredTextChannel = config.defaultBotChannelName;
        let guild = client.guilds.cache.find(g => g.id === config.serverID);
        var guildRoles = guild.roles;

        for (var requiredRole of requiredRoles) {
            if (!guildRoles.cache.find(role => role.name === requiredRole)) {
                console.log(`Adding role:${requiredRole}`)
                await guildRoles.create({
                    data: {
                        name: requiredRole,
                        permissions: [],
                        color: 'WHITE'
                },
                reason: 'Necessary roles for League Bot.'})
            }
        }
        var guildEmojis = guild.emojis;
        for (var requiredEmoji of requiredEmojis) {
            if (!guildEmojis.cache.find(emoji => emoji.name === requiredEmoji)) {
                console.log(`Adding emoji:${requiredEmoji}`)
                await guildEmojis.create(`./icons/${requiredEmoji}.png`, requiredEmoji);
            }
        }
        var guildTextChannels = guild.channels.cache.filter(channel => channel.type === "text");
        var requiredTextChannelExists = guildTextChannels.find(channel => channel.name === requiredTextChannel);
        if (!requiredTextChannelExists) {
            console.log(`Adding text channel: ${requiredTextChannel}`)
            await guild.channels.create(requiredTextChannel, {
                type:'text'
            })
        }

        return true;
    } catch(err) {
        console.log(err);
        return false;
    }
}

function reloadConfig() {
    return new Promise(function (resolve, reject) {
        if (!fs.existsSync(configFile)) {
            resolve(false);
            console.log('No config file found. Goto github repository for more info. Closing')
            process.exit(0);
        }
        fs.readFile(configFile, 'utf8', function (err, json) {
            if (err) reject(false);
            try {
                config = JSON.parse(json);
                token = config.discordToken;
                Member = require(config.elyonMemberClass);
                LeagueAccount = require(config.LeagueAccountClass);
                ListeningMessageEmoji = require(config.ListeningMessageEmojiClass)
                ModApprovalEmoji = require(config.ModApprovalEmojiClass)
                RSVPApprovalEmoji = require(config.RSVPApprovalEmojiClass)
                QuickInhouseListeningMessageEmoji = require(config.QuickInhouseListeningMessageEmojiClass);
                mongoURI = `${config.mongoURIPart1}${config.mongoUsername}${config.mongoURIPart2}${config.mongoPass}${config.mongoURIPart3}${config.dbName}${config.mongoURIPart4}`
                resolve(true);
            } catch (err) {
                console.log("Issue with config file. Make sure that all necessary values are correct.")
                console.log(err);
                process.exit(0);
            }
        });
    });
}

async function getGuildMembersInVoiceChannel(serverID, voiceChannelID) {
    try {
        let guild = client.guilds.cache.find(g => g.id === serverID);
        let guildMembers = guild.members.cache.filter(guildMember => guildMember.voice.channelID === voiceChannelID);
        if (guildMembers.size == 0) return undefined;
        return guildMembers;
    } catch (err) {
        return undefined;
    }

}

async function getGuildMemberFromServerIDAndUserID(serverID, id) {
    for (const guild of client.guilds.cache) {
        if (guild[1].id == serverID) {
            for (const member of guild[1].members.cache) {
                if (member[1].id == id) {
                    return member[1];

                }
            }
        }
    }
    return undefined;

}


function parseRole(args) {
    return new Promise(function (resolve, reject) {
        if (!args) resolve(undefined);
        switch (args.toLowerCase()) {
            case "top":
                resolve('top')
                break;
            case "jg":
            case "jungle":
                resolve('jungle')
                break;
            case "mid":
            case "middle":
                resolve('mid');
                break;
            case "adc":
            case "marksman":
            case "bot":
                resolve('adc');
                break;
            case "sup":
            case "supp":
            case "support":
                resolve('supp')
                break;
            default:
                resolve(undefined);
                break;
        }
    });
}


async function requestLeagueAccount(channel, user, contents, args) {
    var requestingElyonMember = await getElyonMemberFromDiscord(user.id)
    if (!requestingElyonMember) {
        channel.send("`Registering new member.`");
        register(channel, user, contents)
        return false;
    }
    var member = await getElyonMemberFromLeagueName(args)
    if (member) {
        var guildMember = await getGuildMemberFromServerIDAndUserID(config.serverID, member.discordID)
        if (guildMember) {
            channel.send('`Account is already registered to `' + `${guildMember.user.username}`)
        } else {
            channel.send("`League account name registered, but discord member was not found. Contact an admin for assistance.`")
        }

        return false;
    }
    var leagueAccountEmbed = {
        title: args,
        description: `${user.username} claims to have access to the League account '${args}'. A moderator must confirm this as correct`,
        color: 9177243,
        timestamp: Date.now(),
        footer: {
            text: "This will expire within a day"
        },
        author: {
            name: user.username,
            url: "https://na.op.gg/summoner/userName=" + args.replace(/ /g, "%20"),
            icon_url: user.displayAvatarURL()
        }
    }
    var listeningMessageEmojiThatMatches = listeningMessageEmojis.messages.find(message => message.listenerType == 'modAccountApproval' && message.leagueName.toLowerCase() === args.toLowerCase())
    if (listeningMessageEmojiThatMatches && listeningMessageEmojiThatMatches.listenerType == "modAccountApproval") {
        var message = await getMessageByMessageIDAndChannelID(listeningMessageEmojiThatMatches.messageID, listeningMessageEmojiThatMatches.textChannelID);
        if (message) {
            channel.send("`Someone has already requested this account at` " + message.url)
        } else {
            var status = await removeListeningMessageEmoji(listeningMessageEmojiThatMatches.messageID);
            channel.send("`Someone has already requested this account but message no longer exists. Trying to create new.`")
            register(channel, user, contents);
        }


        return false;
    }
    var message = await channel.send({
        embed: leagueAccountEmbed
    })
    await message.react(config.checkMarkEmojiName)
    await message.react(config.xMarkEmojiName)
    var modApprovalEmoji = new ModApprovalEmoji("modAccountApproval", message.id, channel.id, Date.now(), user.id, args, 86400000)
    var decision = await addListeningMessageEmoji(modApprovalEmoji);
    var status = await handleModApprovalDecision(modApprovalEmoji, decision)
    sendDeniedMessage(modApprovalEmoji, status)
    return status;
}

function register(channel, user, contents) {
    var contentArray = contents.split(' ');
    getElyonMemberFromDiscord(user.id).then(function (elyonMember) {
        if (!elyonMember) {
            addElyonMemberToList(new Member(null, user.id, null, null, null, null, user.username)).then(function (status) {
                register(channel, user, contents);
                return;
            });

        } else {
            if (contentArray.length > 1) {
                var command = contentArray[0];
                var argsArray = contentArray.slice(1);
                var args = argsArray.join(" ");
                args = args.trim();
                switch (command.toLowerCase()) {
                    case "leagueaccount":

                        requestLeagueAccount(channel, user, contents, args);
                        break;
                    case "altaccount":
                        break;
                    case "mainrole":
                        console.log('trying main role');
                        parseRole(args).then(function (role) {
                            if (role) {
                                setMainRoleForElyonMember(user.id, role).then(function (status) {
                                    if (status == true) {
                                        channel.send("`" + `${user.username}'s main role changed to ${role}.` + "`");
                                    } else {
                                        channel.send("`" + `${user.username}'s main role could not be changed to ${role}.` + "`");
                                    }
                                })
                            } else {
                                channel.send("`This is not a role.`");
                            }
                        })
                        break;
                    case "subrole":
                        parseRole(args).then(function (role) {
                            if (role) {
                                setSubRoleForElyonMember(user.id, role).then(function (status) {
                                    if (status == true) {
                                        channel.send("`" + `${user.username}'s sub role changed to ${role}.` + "`");
                                    } else {
                                        channel.send("`" + `${user.username}'s sub role could not be changed to ${role}.` + "`");
                                    }
                                })
                            } else {
                                channel.send("`This is not a role.`");
                            }
                        })
                        break;
                    case "favoritechamps":
                        setFavoriteChampsForElyonMember(user.id, args).then(function (status) {
                            if (status == true) {
                                channel.send("`Favorite champs added.`")
                            } else {
                                channel.send("`Favorite champs could not be added.`")
                            }
                        })
                        break;
                    default:
                        console.log("Command not found.");
                        channel.send("`Command not found. Type '0register' for the register command list.`")
                        break;

                }
            } else {

                var commandListEmbed = {
                    color: 9177243,
                    author: {
                        name: "All register commands help. Please complete all commands listed.",
                        icon_url: client.user.displayAvatarURL()
                    },
                    fields: [{
                            name: "```❌1. leagueaccount```",
                            value: "Example: 0register leagueaccount tyler1"
                        },
                        {
                            name: "```❌2. mainrole```",
                            value: "Example: 0register mainrole top"
                        },
                        {
                            name: "```❌3. subrole```",
                            value: "Example: 0register subrole support"
                        },
                        {
                            name: "```❌4. favoritechamps```",
                            value: "Example: 0register favoritechamps draven, warwick, lulu, and malphite"
                        }
                    ]
                }
                if (elyonMember.leagueAccounts.length > 0) commandListEmbed.fields[0].name = commandListEmbed.fields[0].name.replace("❌", '✅')
                if (elyonMember.mainRole) commandListEmbed.fields[1].name = commandListEmbed.fields[1].name.replace("❌", '✅')
                if (elyonMember.subRole) commandListEmbed.fields[2].name = commandListEmbed.fields[2].name.replace("❌", '✅')
                if (elyonMember.favoriteChamps) commandListEmbed.fields[3].name = commandListEmbed.fields[3].name.replace("❌", '✅')
                channel.send({
                    embed: commandListEmbed
                });
            }

        }

    });
}


function manualRegister(channel, user, withoutCommand) {
    try {
        var userMention = withoutCommand.split(" ")[0];
    } catch (err) {
        console.log(err);
        channel.send("`Invalid parameters.`")
        return;
    }
    if (!userMention) {
        channel.send("`Invalid parameters.`");
        return;
    }

    getGuildMemberFromServerIDAndUserID(config.serverID, user.id).then(function (guildMember) {
        isModerator(guildMember).then(function (isModerator) {
            if (isModerator) {
                getUserFromMention(userMention).then(function (target) {
                    if (target) {
                        getElyonMemberFromDiscord(target.id).then(function (elyonMember) {
                            if (elyonMember) {
                                channel.send("`User is already registered`");
                                return;
                            } else {
                                register(channel, target, '');
                            }

                        })

                    } else {
                        channel.send("`This discord user was not found.`")
                    }
                })
            } else {
                channel.send("`You do not have access to this command.`")
            }
        })

    });
}


function getUserFromMention(mention) {
    return new Promise(function (resolve, reject) {
        if (!mention) resolve(undefined);

        if (mention.startsWith('<@') && mention.endsWith('>')) {
            mention = mention.slice(2, -1);

            if (mention.startsWith('!')) {
                mention = mention.slice(1);
            }

            resolve(client.users.cache.get(mention));
        }
        resolve(undefined);
    });
}

function accountInfo(channel, user, contents) {
    if (contents == '') contents = `${user}`;
    getUserFromMention(contents).then(function (target) {
        if (target) {
            getGuildMemberFromServerIDAndUserID(config.serverID, target.id).then(function (guildMember) {
                getElyonMemberFromDiscord(target.id).then(function (member) {
                    if (member) {
                        var displayMainRole = member.mainRole;
                        var displaySubRole = member.subRole;
                        var displayfavoriteChamps = member.favoriteChamps;
                        if (member.mainRole == null || member.mainRole == undefined) displayMainRole = "N/A";
                        if (member.subRole == null || member.subRole == undefined) displaySubRole = "N/A";
                        if (member.favoriteChamps == null || member.favoriteChamps == undefined) displayfavoriteChamps = "N/A";

                        let guild = client.guilds.cache.find(g => g.id === config.serverID);
                        var mainRoleEmoji = guild.emojis.cache.find(emoji => emoji.name === displayMainRole);
                        var subRoleEmoji = guild.emojis.cache.find(emoji => emoji.name === displaySubRole);
                        if (!mainRoleEmoji) mainRoleEmoji = '';
                        if (!subRoleEmoji) subRoleEmoji = '';
                        var accountInfoEmbed = {
                            color: 9177243,
                            author: {
                                name: guildMember.displayName,
                                icon_url: target.displayAvatarURL()
                            },
                            fields: [{
                                    name: "Main Role:",
                                    value: `${mainRoleEmoji}${displayMainRole}`
                                },
                                {
                                    name: "Sub Role:",
                                    value: `${subRoleEmoji}${displaySubRole}`
                                },
                                {
                                    name: "Favorite Champions:",
                                    value: displayfavoriteChamps
                                }
                            ]
                        }

                        member.leagueAccounts.forEach(function (leagueAccount) {
                            accountInfoEmbed.fields.push({
                                name: "```" + `${leagueAccount.leagueName}` + "```",
                                value: `${guild.emojis.cache.find(emoji => emoji.name === leagueAccount.leagueRankTier)}${leagueAccount.leagueRankTier} ${leagueAccount.leagueRankRank}`,
                                inline: true
                            })

                        })
                        channel.send({
                            embed: accountInfoEmbed
                        });

                    } else {
                        channel.send("`Account not found for player. Do 0register`")
                    }
                })
            })
        } else {
            channel.send("`Could not find discord user requested.`")
        }

    });

}

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min);
}


function setMainRole(channel, user, withoutCommand) {
    try {
        var userMention = withoutCommand.split(" ")[0];
        var role = withoutCommand.split(" ")[1];
    } catch (err) {
        channel.send("`Invalid parameters.`")
        return;
    }
    if (!userMention || !role) {
        channel.send("`Invalid parameters.`");
        return;
    }

    getGuildMemberFromServerIDAndUserID(config.serverID, user.id).then(function (guildMember) {
        isModerator(guildMember).then(function (isModerator) {
            if (isModerator) {
                getUserFromMention(userMention).then(function (target) {
                    if (target) {
                        getElyonMemberFromDiscord(target.id).then(function (member) {
                            if (member) {
                                parseRole(role).then(function (role) {
                                    if (role) {
                                        setMainRoleForElyonMember(target.id, role)
                                        channel.send("`Main role set for " + target.username + ".`");
                                    } else {
                                        channel.send("`Role doesn't exist.`")
                                    }
                                });
                            } else {
                                channel.send("`Account not found for player.`")
                            }
                        })
                    } else {
                        channel.send("`Could not find user requested.`")
                    }
                });
            } else {
                channel.send("`You do not have access to this command.`")
            }
        });
    });
}


function setSubRole(channel, user, withoutCommand) {
    try {
        var userMention = withoutCommand.split(" ")[0];
        var role = withoutCommand.split(" ")[1];
    } catch (err) {
        channel.send("`Invalid parameters.`")
        return;
    }
    if (!userMention || !role) {
        channel.send("`Invalid parameters.`");
        return;
    }

    getGuildMemberFromServerIDAndUserID(config.serverID, user.id).then(function (guildMember) {
        isModerator(guildMember).then(function (isModerator) {
            if (isModerator) {
                getUserFromMention(userMention).then(function (target) {
                    if (target) {
                        getElyonMemberFromDiscord(target.id).then(function (member) {
                            if (member) {
                                parseRole(role).then(function (role) {
                                    if (role) {
                                        setSubRoleForElyonMember(target.id, role) /
                                            channel.send("`Sub role set for " + target.username + ".`");
                                    } else {
                                        channel.send("`Role doesn't exist.`")
                                    }
                                });
                            } else {
                                channel.send("`Account not found for player.`")
                            }
                        })
                    } else {
                        channel.send("`Could not find user requested.`")
                    }
                });
            } else {
                channel.send("`You do not have access to this command.`")
            }
        });
    });
}

/*
Assigns a favorite champion that the discord user chooses. Can be just about any string given. This is data stored to the member data section.
*/
function setFavoriteChamps(channel, user, withoutCommand) {
    try {
        var userMention = withoutCommand.split(" ")[0];
        var tmp = withoutCommand.split(" ")
        tmp.shift();
        var favoriteChamps = tmp.join(" ");
    } catch (err) {
        console.log(err);
        channel.send("`Invalid parameters.`")
        return;
    }
    if (!userMention || !favoriteChamps) {
        channel.send("`Invalid parameters.`");
        return;
    }

    getGuildMemberFromServerIDAndUserID(config.serverID, user.id).then(function (guildMember) {
        isModerator(guildMember).then(function (isModerator) {
            if (isModerator) {
                getUserFromMention(userMention).then(function (target) {
                    if (target) {
                        getElyonMemberFromDiscord(target.id).then(function (member) {
                            if (member) {
                                setFavoriteChampsForElyonMember(target.id, favoriteChamps);
                                channel.send("`Favorite champs set for " + target.username + ".`");
                            } else {
                                channel.send("`Account not found for player.`")
                            }
                        })
                    } else {
                        channel.send("`Could not find user requested.`")
                    }
                });
            } else {
                channel.send("`You do not have access to this command.`")
            }
        });
    });
}

/*
Registers a given league account to a discord user.
*/
function addLeagueAccount(channel, user, withoutCommand) {
    try {
        var userMention = withoutCommand.split(" ")[0];
        var tmp = withoutCommand.split(" ")
        tmp.shift();
        var leagueName = tmp.join(" ");
    } catch (err) {
        console.log(err);
        channel.send("`Invalid parameters.`")
        return;
    }
    if (!userMention || !leagueName) {
        channel.send("`Invalid parameters.`");
        return;
    }

    getGuildMemberFromServerIDAndUserID(config.serverID, user.id).then(function (guildMember) {
        isModerator(guildMember).then(function (isModerator) {
            if (isModerator) {
                getUserFromMention(userMention).then(function (target) {
                    if (target) {
                        getElyonMemberFromDiscord(target.id).then(function (member) {
                            if (member) {
                                getElyonMemberFromLeagueName(leagueName).then(function (elyonMember) { //Checks if elyonMember who owns this leagueAccount exists.
                                    if (elyonMember) {
                                        getGuildMemberFromServerIDAndUserID(config.serverID, elyonMember.discordID).then(function (ownerMember) {
                                            if (ownerMember) {
                                                channel.send('`Account is already registered to `' + `${ownerMember.user.username}`)
                                            } else {
                                                channel.send("`League account registered, but discord member was not found. Contact an admin for assistance.`")
                                            }

                                        });
                                        return;
                                    } else {
                                        //add account to user
                                        LeagueAccount.findLeagueAccountByName(leagueName).then(function (leagueAccount) {
                                            if (leagueAccount) { //returns undefined if leagueAccount wasnt found
                                                addLeagueOfLegendsAccountToElyonMember(target.id, leagueAccount).then(function (status) {
                                                    getGuildMemberFromServerIDAndUserID(config.serverID, target.id).then(function (guildMember) {
                                                        channel.send("`Added league of legends account '" + leagueAccount.leagueName + "' to " + guildMember.displayName + "'s account.`");
                                                    });
                                                })
                                            } else {
                                                console.log("League account doesnt exist breh")
                                                channel.send("`League account doesn't exist or was not found.`")
                                            }
                                        })
                                    }

                                })

                            } else {
                                channel.send("`This person does not have an elyon account registered.`")
                            }
                        })
                    } else {
                        channel.send("`Could not find user requested.`")
                    }
                });
            } else {
                channel.send("`You do not have access to this command.`")
            }
        });
    });
}


/*
Strips the given leagueAccount from a discord user. 
*/
function removeLeagueAccount(channel, user, withoutCommand) {
    try {
        var userMention = withoutCommand.split(" ")[0];
        var tmp = withoutCommand.split(" ")
        tmp.shift();
        var leagueName = tmp.join(" ");
    } catch (err) {
        console.log(err);
        channel.send("`Invalid parameters.`")
        return;
    }
    if (!userMention || !leagueName) {
        channel.send("`Invalid parameters.`");
        return;
    }

    getGuildMemberFromServerIDAndUserID(config.serverID, user.id).then(function (guildMember) {
        isModerator(guildMember).then(function (isModerator) {
            if (isModerator) {
                getUserFromMention(userMention).then(function (target) {
                    if (target) {
                        getElyonMemberFromDiscord(target.id).then(function (elyonMember) {
                            if (elyonMember) {
                                LeagueAccount.findLeagueAccountByName(leagueName).then(function (leagueAccount) {
                                    if (leagueAccount) { //returns undefined if leagueAccount wasnt found
                                        getElyonMemberFromSummonerID(leagueAccount.summonerID).then(function (accountOwner) {
                                            if (accountOwner) {
                                                if (accountOwner.discordID == target.id) {
                                                    removeLeagueOfLegendsAccountFromElyonMember(target.id, leagueAccount).then(function (status) {
                                                        getGuildMemberFromServerIDAndUserID(config.serverID, target.id).then(function (guildMember) {
                                                            channel.send("`Removed league of legends account '" + leagueAccount.leagueName + "' from " + guildMember.displayName + "'s account.`");

                                                        })
                                                    })
                                                } else {
                                                    channel.send("`This league account is linked to another member.`")
                                                }
                                            } else {
                                                channel.send("`No member has this League Account linked.`")
                                            }


                                        })
                                    } else {
                                        console.log("League account doesnt exist")
                                        channel.send("`League account doesn't exist or was not found.`")
                                    }
                                })


                            } else {
                                channel.send("`This person does not have an elyon account registered.`")
                            }

                        })

                    } else {

                    }
                });

            } else {
                channel.send("`You do not have access to this command.`")
            }
        });
    })
}

/*
Functionality for quickInhouse command. Sends a message that quickly sets up and allows people to react with their preferred role to get a fast idea of what
multiple people would want to play for a theoretical inhouse match. 
*/
async function quickInhouse(channel, user) {

    var guildMember = await getGuildMemberFromServerIDAndUserID(config.serverID, user.id)

    if (await isModerator(guildMember)) {
        let guild = client.guilds.cache.find(g => g.id === config.serverID);
        var quickInhouseEmoji = listeningMessageEmojis.messages.find(listeningMessageEmoji => listeningMessageEmoji.listenerType === 'quickInhouse');
        if (quickInhouseEmoji) {
            channel.send("`Already listening for a quick Inhouse. do 0clearinhouse to remove it.`");
            return;
        }
        const defaultEmbed = new Discord.MessageEmbed().setTitle('Loading inhouse list.');
        var message = await channel.send({
            embed: defaultEmbed
        });
        if (message) {
            var listeningMessageEmoji = new QuickInhouseListeningMessageEmoji("quickInhouse", message.id, channel.id, Date.now(), user.id, 3600000, Date.now(), 0, undefined)
            addListeningMessageEmoji(listeningMessageEmoji)
            updateQuickInhouseEmbed(listeningMessageEmoji, message, 0);
            await message.react(guild.emojis.cache.find(emoji => emoji.name === 'top'))
            await message.react(guild.emojis.cache.find(emoji => emoji.name === 'jungle'))
            await message.react(guild.emojis.cache.find(emoji => emoji.name === 'mid'))
            await message.react(guild.emojis.cache.find(emoji => emoji.name === 'adc'))
            await message.react(guild.emojis.cache.find(emoji => emoji.name === 'supp'))
            await message.react(guild.emojis.cache.find(emoji => emoji.name === 'fill'))
        }

    } else {
        channel.send("`You do not have access to this command.`")
    }
}

/*
Sends a fancy looking custom discord Embed with a list of all the available commands assigned to the bot. Mostly self-explanatory
*/
function commandList(channel) {
    var commandListEmbed = {
        color: 9177243,
        author: {
            name: "All commands with descriptions of functionality.",
            icon_url: client.user.displayAvatarURL()
        },
        fields: [{
                name: "```0register```",
                value: "Description: Lists all commands for registering your elyon account"
            },
            {
                name: "```0account @user```",
                value: "Description: Responds with details on this persons elyon account. Including linked league accounts, roles, etc."
            },
            {
                name: "```0roll```",
                value: "Description: Rolls from 1-100 for 10 people."
            },
            {
                name: "```0coinflip```",
                value: "Description: Flips a coin."
            },
            {
                name: "```0showrsvp```",
                value: "Description: Lists RSVP members by role."
            },
            {
                name: "```0items```",
                value: "Description: Lists 5 random phasmophobia items and 1 light source.\n```Moderator Commands```"
            },
            //MODERATOR COMMANDS
            {
                name: "```0rsvp```",
                value: "Description: Create an RSVP emoji that assigns RSVP role."
            },
            {
                name: "```0clearrsvp```",
                value: "Description: Clears listeners on RSVP emoji and removes RSVP role from everyone."
            },
            {
                name: "```0setmainrole @user adc```",
                value: "Description: Manually sets main role for users elyon account."
            },
            {
                name: "```0setsubrole @user top```",
                value: "Description: Manually sets sub role for users elyon account."
            },
            {
                name: "```0setfavoritechamps @user draven, nidalee, i kinda like mundo```",
                value: "Description: Manually sets favorite champs for users elyon account."
            },
            {
                name: "```0addleagueaccount @user tyler1```",
                value: "Description: Manually add league account to users elyon account."
            },
            {
                name: "```0removeleagueaccount @user tyler1```",
                value: "Description: Remove league account from users elyon account."
            },
            {
                name: "```0manualregister @user```",
                value: "Description: Manually registers an elyon account for a user."
            },
            {
                name: "```0quickinhouse```",
                value: "Description: Sends an inhouse role selector."
            },
            {
                name: "```0clearinhouse```",
                value: "Description: Clears the current inhouse queue."
            }
        ]
    }
    channel.send({
        embed: commandListEmbed
    });
}

/*
RSVP functionality here.
*/
async function sendRSVP(textChannel) {
    try {
        let guild = client.guilds.cache.find(g => g.id === config.serverID);
        var RSVPListEmbed = {
            color: 9177243,
            author: {
                name: "List of all RSVP members by role",
                icon_url: client.user.displayAvatarURL()
            },
            fields: [{
                    name: `${guild.emojis.cache.find(emoji => emoji.name === 'top')}`,
                    value: "­"
                },
                {
                    name: `${guild.emojis.cache.find(emoji => emoji.name === 'jungle')}`,
                    value: "­"
                },
                {
                    name: `${guild.emojis.cache.find(emoji => emoji.name === 'mid')}`,
                    value: "­"
                },
                {
                    name: `${guild.emojis.cache.find(emoji => emoji.name === 'adc')}`,
                    value: "­"
                },
                {
                    name: `${guild.emojis.cache.find(emoji => emoji.name === 'supp')}`,
                    value: "­"
                },
                {
                    name: "```No Main Role:```",
                    value: "­"
                }
            ]
        }
        var role = await fetchRoleByName("rsvp")
        for (var member of role.members) {
            member = member[1];
            // console.log(member.displayName);
            var elyonMember = await getElyonMemberFromDiscord(member.id);
            if (elyonMember) {
                switch (elyonMember.mainRole) {
                    case "top":
                        RSVPListEmbed.fields[0].value += member.displayName + ', ';
                        break;
                    case "jungle":
                        RSVPListEmbed.fields[1].value += member.displayName + ', ';
                        break;
                    case "mid":
                        RSVPListEmbed.fields[2].value += member.displayName + ', ';
                        break;
                    case "adc":
                        RSVPListEmbed.fields[3].value += member.displayName + ', ';
                        break;
                    case "supp":
                        RSVPListEmbed.fields[4].value += member.displayName + ', ';
                        break;
                    default:
                        RSVPListEmbed.fields[5].value += member.displayName + ', ';
                        break;
                }
            } else {
                RSVPListEmbed.fields[5].value += member.displayName + ', ';
            }

        }
        textChannel.send({
            embed: RSVPListEmbed
        });

    } catch (err) {
        console.log(err);
        textChannel.send("`Error sending RSVP list.`")
    }
}

/*
This is functionality made specifically to check to see if someone was given a role for ex. "Main: Top". A simpler solution to attach a new role to someones
league account than to have to go through the written command 0setmainrole ___ ___. Easier for moderators.
*/
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    //Check if any new roles were added
    var addedRoles = [];
    for (var role of newMember.roles.cache) {
        role = role[1];
        if (!oldMember.roles.cache.find(r => r.id === role.id)) {
            //role is the added role
            var elyonMember = await getElyonMemberFromDiscord(newMember.id);
            if (elyonMember) {
                if (role.name == `Main: ${elyonMember.mainRole}` || role.name == `Sub: ${elyonMember.subRole}`) {
                    console.log(`added main or sub role elyonmember already is role`);
                    continue;
                }
            }
            addedRoles.push(role);
        }
    }
    //If nickname changed
    if (oldMember.nickname != newMember.nickname) {
        if (newMember.nickname) {
            var elyonMember = await getElyonMemberFromDiscord(newMember.id);
            if (elyonMember.leagueAccounts.length == 0) {
                let guild = client.guilds.cache.find(g => g.id === config.serverID);
                let defaultBotChannel = guild.channels.cache.find(channel => channel.name === config.defaultBotChannelName);
                defaultBotChannel.send("`" + `${oldMember.displayName} changed nickname to ${newMember.displayName}. Requesting new league account.` + "`")
                requestLeagueAccount(defaultBotChannel, newMember.user, `leagueaccount ${newMember.nickname}`, newMember.nickname);
            }
        }
        //If role was added
    } else if (addedRoles.length > 0) {
        let guild = client.guilds.cache.find(g => g.id === config.serverID);
        let defaultBotChannel = guild.channels.cache.find(channel => channel.name === config.defaultBotChannelName);
        for (var newRole of addedRoles) {
            //If the newRole is a rankRole (Main:top, Sub:top, etc) then we will register role and swap whatever they currently have to that role.
            switch (newRole.name) {
                case "Main: top":
                case "Main: jungle":
                case "Main: mid":
                case "Main: adc":
                case "Main: supp":
                    register(defaultBotChannel, newMember.user, `mainrole ${newRole.name.replace("Main: ", "")}`)
                    break;
                case "Sub: top":
                case "Sub: jungle":
                case "Sub: mid":
                case "Sub: adc":
                case "Sub: supp":
                    register(defaultBotChannel, newMember.user, `subrole ${newRole.name.replace("Sub: ", "")}`)
                    break;
                default:
                    break;
            }
        }
    }



});

/*
Primary discord message command handler. Chat commands must be added here to be considered.
*/
client.on('message', (msg) => {
    if (msg.author.bot == true) return;
    if (msg.channel.type != "text" && msg.author.id != config.devID) return; //dev will bypass and be able to work through dms

    if (msg.content.startsWith(config.commandPrefix)) {

        textChannel = msg.channel;
        var rawString = msg.content.replace(config.commandPrefix, "");
        var cmd = rawString.split(' ')[0].toLowerCase();

        var tmp = rawString.split(" ");
        tmp.shift();
        var contents = tmp.join(" ");

        switch (cmd.toLowerCase()) {
            case 'test':
                isModerator(msg.member).then(function (decision) {
                    if (decision) {
                
                var commandListEmbed = {
                    color: 9177243,
                    author: {
                        name: "All register commands help. Please complete all commands listed.",
                        icon_url: client.user.displayAvatarURL()
                    },
                    fields: [{
                        name: "```testEmbed```",
                        value: "Same"
                    }]
                }
                msg.channel.send({
                    embed: commandListEmbed
                }).then(function (message) {
                    commandListEmbed.author.name = 'editttttt mmeeeemmmeee';
                    const exampleEmbed = new Discord.MessageEmbed(commandListEmbed)

                    message.edit(exampleEmbed);
                })
            }
            })
                break;
            case 'configure':
                isModerator(msg.member).then(function (decision) {
                    if (decision) {
                        autoServerConfiguration().then(function(status) {
                            if (status) {
                                msg.channel.send("`Auto configuration completed.`");
                            } else {
                                msg.channel.send("`Auto configuration failed at some point.`");
                            }
                        })
                    }else {
                        msg.channel.send("`This command requires bot access.`");
                    }
                });
                break;
            case 'entrance':
                if (msg.author.id == config.devID) {
                        entrance(msg, contents);
                    }
                break;
            case 'uptime':
                try {
                    var uptime = Date.now() - startTime;
                    var utc = new Date((new Date(startTime)).toUTCString());
                    utc.setHours(utc.getHours() - 8) // converts to PST by subtracting 8 hours from UTC time.
                    var message = "`" + `Boot Time: ${utc.toLocaleString()} PST` + "`\n"
                    message += "`" + `Uptime: ${convertTime(parseInt(uptime / 1000))}` + "`";
                    message += "`" + `Uptime2: ${convertTime2(parseInt(uptime / 1000))}` + "`";
                    msg.channel.send(message);
                } catch(err) {
                    console.log(err);
                }
                break;
            case 'phasmophobia':
            case 'items':
                try {
                    var items = ['glowstick', 'parabolic microphone', 'emf reader', 'uv light', 'crucifix', 'motion sensor', 'salt', 'spirit box', 'smudge sticks', 'thermometer', 'ghost book', 'photo camera'];
                    var lights = ['flashlight', 'candle/lighter', 'strong flashlight']
                    items = shuffle(items).slice(0, 5);//shuffle then cut out all but the first 5
                    lights = shuffle(lights);
                    
                    var message = "`" + `Items: ${items.join(', ')}` + "`\n";
                    message += "`" + `Lights: ${lights[0]}` + "`";
                    msg.channel.send(message);
                } catch (err) {
                    console.log(err);
                }
                break;
            case 'revert_channels':
                revertName(msg);
                break;
            case 'register':
                register(msg.channel, msg.author, contents.trim());
                break;
            case 'account':
                accountInfo(msg.channel, msg.author, contents.trim());
                break;
            case 'rsvp':
                try {
                if (contents.indexOf("^") != -1) {
                    var messages = msg.channel.messages.cache;
                    console.log(messages);
                        // if (message = )
                    

                    // console.log(msg.channel.messages.cache);
                }
            } catch(err) {
                console.log(err);
            }
                createRSVP(msg.channel, msg.author, msg);
                break;
            case 'clearrsvp':
                clearRSVP(msg.channel, msg.author);
                break;
            case 'showrsvp':
                sendRSVP(msg.channel);
                break;
            case 'setmainrole':
                setMainRole(msg.channel, msg.author, contents);
                break;
            case 'setsubrole':
                setSubRole(msg.channel, msg.author, contents);
                break;
            case 'setfavoritechamps':
                setFavoriteChamps(msg.channel, msg.author, contents);
                break;
            case 'addleagueaccount':
                addLeagueAccount(msg.channel, msg.author, contents);
                break;
            case 'removeleagueaccount':
                removeLeagueAccount(msg.channel, msg.author, contents);
                break;
            case 'manualregister':
                manualRegister(msg.channel, msg.author, contents);
                break;
            case 'coinflip':
            case 'flip':
                try {
                    let guild = client.guilds.cache.find(g => g.id === config.serverID);
                    if (randomIntFromInterval(1, 2) == 1) {
                        let heads = guild.emojis.cache.find(emoji => emoji.name === 'heads')
                        msg.react(heads);
                    } else {
                        let tails = guild.emojis.cache.find(emoji => emoji.name === 'tails')
                        msg.react(tails);
                    }
                } catch (err) {
                    console.log(err);
                }
                break;
            case 'crash':
            case 'reboot':
            case 'restart':
                if (msg.author.id == config.devID) {
                    msg.react("🤖").then(function (s) {
                        process.exit(0);
                    })

                }
                break;
            case 'roll':

                getGuildMemberFromServerIDAndUserID(config.serverID, msg.author.id).then(function (guildMember) {
                    try {
                        var strings = [];
                        if (guildMember.voice.channel) {
                            getGuildMembersInVoiceChannel(config.serverID, guildMember.voice.channel.id).then(function (guildMembers) {
                                guildMembers = guildMembers.map(m => m);
                                for (var i = 0; i < 10; i++) {
                                    if (guildMembers[i]) {
                                        strings.push("`" + `${guildMembers[i].displayName} has rolled ${randomIntFromInterval(1, 100)}.` + "`")
                                    } else
                                        strings.push("`" + `User_${i + 1} has rolled ${randomIntFromInterval(1, 100)}.` + "`");
                                }
                                msg.channel.send(strings.join("\n"));
                            });
                        } else {
                            for (var i = 0; i < 10; i++) {
                                strings.push("`" + `User_${i + 1} has rolled ${randomIntFromInterval(1, 100)}.` + "`");
                            }
                            msg.channel.send(strings.join("\n"));
                        }

                    } catch (err) {
                        console.log(err);
                    }
                });

                break
            case 'inhouse':
            case 'quickinhouse':
            case 'showinhouse':
                quickInhouse(msg.channel, msg.author);
                break;
            case 'clearinhouse':
                clearInhouse(msg.channel, msg.author).then(function (status) {
                    if (status) {
                        msg.channel.send("`Cleared inhouse.`")
                    } else {
                        msg.channel.send("`Couldn't clear inhouse.`")
                    }

                })
                break;
            case 'tts':
                joinAndTTS(msg, contents);
                break;
            case 'commands':
            case 'command':
            case 'help':
                commandList(msg.channel);
                break

            default:
                break;
        }
    } else if (msg.mentions.roles.find(role => role.name === "voice")) { //if (`${msg.content}`.indexOf(`${msg.mentions.roles.first()}`) != -1) { //role mention is the only the msg content
        if (msg.member.voice.channelID) {
            getGuildMembersInVoiceChannel(config.serverID, msg.member.voice.channelID).then(function (guildMembers) {
                if (guildMembers) {
                    var string = '';
                    for (var guildMember of guildMembers) {
                        string += `${guildMember[1].user} `
                    }
                    msg.channel.send(string);
                }
            })
        }


    }
});


/* Simple time conversion function to switch int representation of seconds into clean formatted H:M:S string */
function convertTime(sec) {
    var hours = Math.floor(sec/3600);
    var seconds = "" + sec % 60;
    var minutes = "" + Math.floor(((sec % 3600) - seconds) / 60);

    return `${hours.toString().padStart(2, '0')}h:${minutes.toString().padStart(2, '0')}m:${seconds.toString().padStart(2, '0')}s`; 
}


/* Simple algorithm to shuffle any given array. */
function shuffle(arr) {
    var size = arr.length;
    var temp = [...arr];
    var index;
    var newArray = [];
    while (size > 0) {
        index = Math.floor(Math.random() * size);
        newArray.push(temp[index])
        temp.splice(index, 1);
        size--;
    }
    return newArray;
}


/* 
Functionality for TTS command. Reads the TTS message, generates an audio file of that TTS, join the discord channel, plays the audio file, deletes the old
audio file, then leaves the discord. For fun function. 
*/
function joinAndTTS(msg, contents) {
    try {
        if (msg.member.voice.channel) {
            msg.member.voice.channel.join().then((connection) => {
                text2wav(contents.trim(), {
                    voice: 'en+iven'
                }).then(out => {
                    var fileName = Date.now();
                    fs.writeFile(`./voicedata/${fileName}.wav`, Buffer.from(out), (err) => {
                        if (err) {
                            console.log("Error writing TTS file.")
                            return;
                        }
                        var dispatcher = connection.play(`./voicedata/${fileName}.wav`);
                        dispatcher.setVolumeLogarithmic(2);
                        dispatcher.on('speaking', (speaking) => { //when finished speaking, play next song because that means songs over
                            if (speaking == 1) return; //still speaking
                            console.log('TTS Ended')
                            for (var connections of client.voice.connections) {
                                try {
                                    fs.unlinkSync(`./voicedata/${fileName}.wav`);
                                    connections[1].disconnect();
                                } catch (err) {
                                    console.log("Couldn't leave TTS channel/delete TTS file.")
                                }
                            }
                        });
                    });
                })


            });
        }
    } catch (err) {
        console.log("Error with TTS");
    }
}

/*
**To be removed** Testing fun functions. WILL NOT WORK UNLESS the song file exists.
*/
async function entrance(msg, channelID) {
    try {
        var joined = false;
        let guild = client.guilds.cache.find(g => g.id === config.serverID);
        var voiceChannel = guild.channels.cache.find(channel => channel.id === channelID);
        if (voiceChannel) {
            var connection = await voiceChannel.join();
            var dispatcher = connection.play(`./Def Jam.mp3`); //7 seconds till drop
            msg.author.send('Entrance started. Join in 7 seconds.');

            dispatcher.setVolumeLogarithmic(1);
            dispatcher.on('speaking', (speaking) => { //runs every cycle to check if still speaking and wait for end
                if (joined == false) {
                    if (dispatcher.streamTime > 6000 && dispatcher.streamTime < 7000) {
                        joined = true;
                        msg.author.send('Join now');
                }
            }
                if (speaking == 1) return; //still speaking
                console.log('song Ended')
                for (var connections of client.voice.connections) {
                    try {
                        connections[1].disconnect();
                    } catch (err) {
                        console.log("Error leaving voice channel on entrance.")
                    }
                }
        
        });

        } else {
            msg.channel.send("`This voice channel doesn't exist.`")
        }
    } catch (err) {
        console.log(err);
        console.log("Error with entrance");
    }
}

/*
Not really in use anymore. Was testing functionality of audit log to reverse changes made recently to channel names.
*/
async function revertName(msg) {
    try {
        if (await isModerator(msg.member)) {
            var audit = await msg.guild.fetchAuditLogs();
            var list = audit.entries.filter(entry => entry.action == 'CHANNEL_UPDATE');
            console.log(list);
            var string = '';
            var alreadyUpdated = [];
            for (var update of list) {
                if (alreadyUpdated.indexOf(update[1].target.id) == -1) {
                    alreadyUpdated.push(update[1].target.id);
                    for (var change of update[1].changes) {
                        if (change.key == 'name') {
                            console.log(change);
                            var changingChannel = update[1].target;
                            await changingChannel.setName(change.old);
                            string += `${change.old} - ${change.new}\n`
                            break;
                        }
                    }

                }
            }

            msg.member.send(string)
        }
    } catch (err) {
        console.log(err);
    }
}

/*
Initial mongoDB function to load the mongo database and create the mongoDB object. Only gets run if we config file tells it to load from mongo database.
*/
function loadMongoDB() {
    return new Promise(function (resolve, reject) {


        const client = new MongoClient(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        try {
            client.connect(err => {
                try {
                    if (err) resolve(false);
                    mongoDB = client.db();
                    resolve(true);
                } catch (err) {
                    resolve(false)
                }

            })
        } catch (err) {
            resolve(false);
        }
    })
}

/*
As name implies, reads mongo database and populates the elyonMembersList array with the information retrieved from the database.
*/
async function populateElyonMemberListFromMongoDB() {
    try {
        if (!mongoDB) return false;
        const collection = mongoDB.collection('elyon');
        var getData = () => {
            return new Promise(function (resolve, reject) {
                collection.find({
                    _id: config.mongoElyonMemberListPath
                }).toArray(function (err, doc) {
                    if (err) resolve(undefined);
                    resolve(doc[0].members);
                });
            });
        }
        var data = await getData();
        if (!data) return (false);
        for (var member of data) {
            var elyonMember = new Member(null, member.discordID, member.mainRole, member.subRole, member.favoriteChamps, member.inhouseStats, member.discordName, member.highestRankEnum);
            for (var leagueAccount of member.leagueAccounts) {

                elyonMember.leagueAccounts.push(await LeagueAccount.createLeagueAccount(leagueAccount));
            }
            elyonMembersList.members.push(elyonMember);
        }
        return true;
    } catch (err) {
        return (false);
    }
}

/*
Writes elyonMemberList data to the database. Function gets run basically everytime a significant change is made to the elyonMemberList data.
The "count" is the amount of times it will try to rerun the function if it fails. Since its reliant on database over internet, theres alot of potential for failure.
Once count reaches the max, it'll instead choose to write to file so preserve data that would otherwise be lost.
*/
async function writeElyonMemberListToMongoDB(count) {
    if (!count) count = 1;
    if (count < 5) {
        try {
            console.log("writing to mongo");
            var writeData = () => {
                return new Promise(function (resolve, reject) {
                    const collection = mongoDB.collection('elyon');

                    collection.updateOne({
                        _id: config.mongoElyonMemberListPath
                    }, {
                        $set: {
                            members: elyonMembersList.members
                        }
                    }, function (err, result) {
                        resolve(true)
                    });
                });

            }
            return await writeData();
        } catch (err) {
            console.log(`Failed to save Elyon Member Data to MongoDB for ${count} times. Trying 5 times before saving to file instead.`);
            count = count + 1;
            await idleTime(1000);
            await loadMongoDB();
            return await writeElyonMemberListToMongoDB(count);
        }
    } else {
        console.log(`Failed to save Elyon Member Data to MongoDB for the last time.`);
        return false;
    }
}

/*
One of the initial functions run on boot. Needs to load basic configuration data and determine whether to use data retrived from the mongo database.
Also populates the datasection of the bot, checks for listeningMessageEmojis to ensure were listening and waiting for emoji reactions right on boot.
*/
reloadConfig().then(function (status) {
    loadMongoDB().then(function (status) {
        if (status == false && (!config.readMemberDataFromFileInsteadOfSheets || !config.writeMemberDataToFileInsteadOfSheets)) {
            console.log('loadMongoDB resolved false. Wait 5 seconds then process.exit')
            setTimeout(() => {
                process.exit(0);
            }, 5000)
            return;
        }
        // loadElyonMemberDataSheet().then(function(status) {
        //     if (status == false) {
        //         console.log("Error loading Elyon Member Data Sheets. Reading from and writing to file instead.");
        //         config.readMemberDataFromFileInsteadOfSheets = true;
        //         config.writeMemberDataToFileInsteadOfSheets = true;
        //     }
        populateElyonMemberList().then(function (status) {
            populateListeningMessageEmojis().then(function (status) {
                updateListeningMessageEmojis().then(function (status) {
                    client.login(token).catch(error => {
                        console.log(error);
                        console.log('Discord login failed. Wait 5 seconds then process.exit')

                        setTimeout(() => {
                            process.exit(0);
                        }, 5000)
                        // });
                    });
                })
            })
        })
    })
})