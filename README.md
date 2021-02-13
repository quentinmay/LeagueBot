# <img src="https://user-images.githubusercontent.com/73214439/107851772-3d549080-6dc1-11eb-8136-d4d261803af4.png" width="70" height="70"> League Bot 

League Bot is a Discord Bot built using [discord.js](https://discord.js.org) to give utility to League Of Legends discord servers.

## ⚠Requirements
1. [Discord Bot Token](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)
2. [Riot Development API Key](https://developer.riotgames.com/)
3. [Node.js 14.0.0 or newer](https://nodejs.org/)

## ⚡Installation

Easily deployable using git clone:

```bash
git clone https://github.com/quentinmay/LeagueBot.git
cd LeagueBot
npm install
```
Now you must configure the bot before running using indexConfig example file:
```bash
mv indexConfig.json.example indexConfig.json
```
## Simple Configuration (Required)
Only top 4 required to change for basic functionality.

```json
{
    "discordToken": "",
    "devID": "",
    "serverID":"",
    "riotAPIToken": "",
    "commandPrefix": "!",
    "defaultBotChannelName":"general",
    "modRole":"Bot Access",
    "status":"STREAMING",
    "twitchLink":"https://www.twitch.tv/twitch",
    "mongoElyonMemberListPath": "./util/elyonMembersList.json",
    "elyonMembersListPath":"./util/elyonMembersList.json",
    "listeningMessageEmojisPath":"./util/elyonListeningMessageEmojis.json",
    "elyonMemberClass": "./util/member.js", 
    "LeagueAccountClass": "./util/LeagueAccount.js", 
    "ListeningMessageEmojiClass": "./util/ListeningMessageEmoji.js", 
    "ModApprovalEmojiClass": "./util/ModApprovalEmoji.js", 
    "RSVPApprovalEmojiClass": "./util/RSVPApprovalEmoji.js",
    "QuickInhouseListeningMessageEmojiClass": "./util/QuickInhouseListeningMessageEmoji.js",
    "checkMarkEmojiName":"✅",
    "xMarkEmojiName":"❎",
    "refreshLeagueAccountTime": "86400000",
    "readMemberDataFromFileInsteadOfSheets": true,
    "writeMemberDataToFileInsteadOfSheets": true,
    "elyonBotSheetsTokenFile":"./bot-google-sheets-token.json",
    "elyonMemberDataSheetURL":"",
    "elyonMemberDataSheetPageIndex":"0",
    "mongoURIPart1":"",
    "mongoUsername":"",
    "mongoURIPart2":"",
    "mongoPass":"",
    "mongoURIPart3":"",
    "dbName": "",
    "mongoURIPart4":""
}
```

## 🚀Initial Startup
Just startup the script now that everything has been built and you've filled your config file.
```bash
node index.js
```
Once your bot is up and running in your discord server, run the command ```!configure``` to add necessary roles/emojis/default text channel.

![Configure](https://user-images.githubusercontent.com/73214439/107845002-141a0d00-6d8d-11eb-9a53-2135e9ebcbf3.png)
## 📝User commands
| Command        | Description                                                                                        |
|----------------|----------------------------------------------------------------------------------------------------|
| !help          | Lists all the commands available on the bot.                                                       |
| !register      | Lists all commands for registering your elyon account.                                             |
| !account @user | Responds with details on this persons elyon account. Including linked league accounts, roles, etc. |
| roll           | Rolls from 1-100 for 10 people.                                                                    |
| !coinflip      | Flips a coin                                                                                       |
| !showrsvp      | Lists RSVP members by role.                                                                        |
| !items         | Lists 5 random phasmophobia items and 1 light source. (fun game mode)                              |
## 📝Moderator Commands
| Command                           | Description                                                         |
|-----------------------------------|---------------------------------------------------------------------|
| !rsvp                             | Create an RSVP emoji that assigns RSVP role.                        |
| !clearrsvp                        | Clears listeners on RSVP emoji and removes RSVP role from everyone. |
| !setmainrole @user adc            | Manually sets main role for users elyon account.                    |
| !setsubrole @user top             | Manually sets sub role for users elyon account.                     |
| !setfavoritechamps @user draven   | Manually sets favorite champs for users elyon account.              |
| !addleagueaccount @user tyler1    | Manually add league account to users elyon account.                 |
| !removeleagueaccount @user tyler1 | Remove league account from users elyon account.                     |
| !manualregister @user             | Manually registers an elyon account for a user.                     |
| !quickinhouse                     | Sends an inhouse role selector.                                     |
| !clearinhouse                     | Clears the current inhouse queue.                                   |
# WARNING
Thousands of lines of code from one developer thrown together in index file is subject to some jank coding and low documentation. Working to slowly include more documentation and hopefully come up with a plan to organize the entire code overtime.
