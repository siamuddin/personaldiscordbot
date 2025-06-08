const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActivityType } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Create Express app for Render health checks
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint for UptimeRobot
app.get('/', (req, res) => {
    res.json({
        status: 'Bot is running!',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        botStatus: client.isReady() ? 'Connected' : 'Disconnected'
    });
});

app.get('/ping', (req, res) => {
    res.send('Pong! Bot is alive 🚀');
});

// Start Express server
app.listen(PORT, () => {
    console.log(`🌐 Health check server running on port ${PORT}`);
});

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// Bot token - Use environment variable for Render
const TOKEN = process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN_HERE';

// Cool status messages
const statusMessages = [
    { type: ActivityType.Watching, text: "your files 📁" },
    { type: ActivityType.Playing, text: "with Discord files 🎮" },
    { type: ActivityType.Listening, text: "your commands 🎧" },
    { type: ActivityType.Watching, text: "avatars & banners 👀" },
    { type: ActivityType.Playing, text: "hide and seek with files 🕵️" },
    { type: ActivityType.Streaming, text: "your content 📺", url: "https://www.twitch.tv/discord" },
    { type: ActivityType.Watching, text: "user profiles 👤" },
    { type: ActivityType.Playing, text: "file detective 🔍" },
    { type: ActivityType.Listening, text: "Discord's heartbeat 💓" },
    { type: ActivityType.Watching, text: "the matrix 🔴" },
    { type: ActivityType.Playing, text: "with 1s and 0s 💾" },
    { type: ActivityType.Competing, text: "file conversion race 🏃‍♂️" }
];

let currentStatusIndex = 0;

// Function to download and send file
async function downloadAndSendFile(url, filename, interaction) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch file');
        
        const buffer = await response.buffer();
        const attachment = new AttachmentBuilder(buffer, { name: filename });
        
        return attachment;
    } catch (error) {
        console.error('Error downloading file:', error);
        return null;
    }
}

// Function to get user avatar
async function getUserAvatar(user, size = 4096) {
    const avatarURL = user.displayAvatarURL({ 
        format: 'png', 
        size: size,
        dynamic: true 
    });
    
    const filename = `${user.username}_avatar.${avatarURL.includes('.gif') ? 'gif' : 'png'}`;
    return await downloadAndSendFile(avatarURL, filename);
}

// Function to get user banner
async function getUserBanner(user, size = 4096) {
    try {
        // Fetch full user data to get banner
        const fullUser = await client.users.fetch(user.id, { force: true });
        
        if (!fullUser.banner) {
            return null;
        }
        
        const bannerURL = fullUser.bannerURL({ 
            format: 'png', 
            size: size,
            dynamic: true 
        });
        
        const filename = `${user.username}_banner.${bannerURL.includes('.gif') ? 'gif' : 'png'}`;
        return await downloadAndSendFile(bannerURL, filename);
    } catch (error) {
        console.error('Error getting banner:', error);
        return null;
    }
}

// Function to create user info embed
function createUserInfoEmbed(user, member = null) {
    const embed = new EmbedBuilder()
        .setTitle(`User Information - ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'Username', value: user.username, inline: true },
            { name: 'Discriminator', value: user.discriminator || 'None', inline: true },
            { name: 'User ID', value: user.id, inline: true },
            { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false },
            { name: 'Bot Account', value: user.bot ? 'Yes' : 'No', inline: true }
        )
        .setColor(0x00AE86)
        .setTimestamp();

    if (member) {
        embed.addFields(
            { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
            { name: 'Roles', value: member.roles.cache.size > 1 ? member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.toString()).join(', ') : 'None', inline: false }
        );
        
        if (member.nickname) {
            embed.addFields({ name: 'Nickname', value: member.nickname, inline: true });
        }
    }

    return embed;
}

// Register slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Get a user\'s avatar')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get avatar from')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Get a user\'s banner')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get banner from')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get information about a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get info about')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('useraboutme')
        .setDescription('Get a user\'s about me section')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get about me from')
                .setRequired(false))
];

// Function to update bot status
function updateBotStatus() {
    const status = statusMessages[currentStatusIndex];
    
    if (status.type === ActivityType.Streaming) {
        client.user.setActivity(status.text, { 
            type: status.type, 
            url: status.url 
        });
    } else {
        client.user.setActivity(status.text, { type: status.type });
    }
    
    currentStatusIndex = (currentStatusIndex + 1) % statusMessages.length;
    console.log(`🎭 Status updated: ${ActivityType[status.type]} ${status.text}`);
}

// Function to get random startup status
function getStartupStatus() {
    const startupStatuses = [
        { type: ActivityType.Playing, text: "🚀 Booting up..." },
        { type: ActivityType.Watching, text: "🔧 System initialization" },
        { type: ActivityType.Listening, text: "🎵 Startup sequence" },
        { type: ActivityType.Playing, text: "⚡ Powering up cores" }
    ];
    return startupStatuses[Math.floor(Math.random() * startupStatuses.length)];
}

// Bot ready event
client.once('ready', async () => {
    console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
    console.log(`🌟 Bot ID: ${client.user.id}`);
    console.log(`📊 Serving ${client.guilds.cache.size} servers`);
    
    // Set initial startup status
    const startupStatus = getStartupStatus();
    client.user.setActivity(startupStatus.text, { type: startupStatus.type });
    
    // Register slash commands globally
    try {
        console.log('🔄 Registering slash commands...');
        await client.application.commands.set(commands);
        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
    
    // Start status rotation after 10 seconds
    setTimeout(() => {
        updateBotStatus();
        // Update status every 30 seconds
        setInterval(updateBotStatus, 30000);
    }, 10000);
    
    // Log system info
    console.log(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
    console.log(`⏱️ Startup time: ${process.uptime().toFixed(2)} seconds`);
    console.log('🎉 All systems operational!');
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const targetUser = interaction.options.getUser('user') || interaction.user;

    try {
        await interaction.deferReply();

        switch (commandName) {
            case 'avatar':
                const avatarAttachment = await getUserAvatar(targetUser);
                if (avatarAttachment) {
                    await interaction.editReply({ 
                        content: `**${targetUser.tag}'s Avatar:**`,
                        files: [avatarAttachment] 
                    });
                } else {
                    await interaction.editReply('❌ Failed to get avatar.');
                }
                break;

            case 'banner':
                const bannerAttachment = await getUserBanner(targetUser);
                if (bannerAttachment) {
                    await interaction.editReply({ 
                        content: `**${targetUser.tag}'s Banner:**`,
                        files: [bannerAttachment] 
                    });
                } else {
                    await interaction.editReply('❌ This user doesn\'t have a banner or failed to get banner.');
                }
                break;

            case 'userinfo':
                const member = interaction.guild ? await interaction.guild.members.fetch(targetUser.id).catch(() => null) : null;
                const userInfoEmbed = createUserInfoEmbed(targetUser, member);
                await interaction.editReply({ embeds: [userInfoEmbed] });
                break;

            case 'useraboutme':
                try {
                    const fullUser = await client.users.fetch(targetUser.id, { force: true });
                    const aboutMe = fullUser.bio || 'This user has no about me section.';
                    
                    const aboutEmbed = new EmbedBuilder()
                        .setTitle(`About Me - ${targetUser.tag}`)
                        .setDescription(aboutMe)
                        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                        .setColor(0x00AE86)
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [aboutEmbed] });
                } catch (error) {
                    await interaction.editReply('❌ Failed to get user\'s about me section.');
                }
                break;
        }
    } catch (error) {
        console.error('Error handling command:', error);
        const errorMessage = '❌ An error occurred while processing the command.';
        
        if (interaction.deferred) {
            await interaction.editReply(errorMessage);
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Handle messages (for Discord file link conversion and prefix commands)
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Discord file link regex
    const discordFileRegex = /https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/attachments\/\d+\/\d+\/[^\s]+/g;
    const fileLinks = message.content.match(discordFileRegex);

    if (fileLinks) {
        try {
            const attachments = [];
            
            for (const link of fileLinks) {
                // Extract filename from URL
                const urlParts = link.split('/');
                const filename = urlParts[urlParts.length - 1].split('?')[0]; // Remove query parameters
                
                const attachment = await downloadAndSendFile(link, filename);
                if (attachment) {
                    attachments.push(attachment);
                }
            }

            if (attachments.length > 0) {
                await message.reply({ 
                    content: '📎 **Converted Discord file links:**',
                    files: attachments 
                });
            }
        } catch (error) {
            console.error('Error converting file links:', error);
            await message.reply('❌ Failed to convert one or more file links.');
        }
    }

    // Prefix commands (alternative to slash commands)
    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        switch (command) {
            case 'avatar':
                let avatarUser = message.author;
                if (message.mentions.users.size > 0) {
                    avatarUser = message.mentions.users.first();
                } else if (args[0]) {
                    try {
                        avatarUser = await client.users.fetch(args[0]);
                    } catch {
                        return message.reply('❌ User not found.');
                    }
                }

                const avatarAttachment = await getUserAvatar(avatarUser);
                if (avatarAttachment) {
                    await message.reply({ 
                        content: `**${avatarUser.tag}'s Avatar:**`,
                        files: [avatarAttachment] 
                    });
                } else {
                    await message.reply('❌ Failed to get avatar.');
                }
                break;

            case 'banner':
                let bannerUser = message.author;
                if (message.mentions.users.size > 0) {
                    bannerUser = message.mentions.users.first();
                } else if (args[0]) {
                    try {
                        bannerUser = await client.users.fetch(args[0]);
                    } catch {
                        return message.reply('❌ User not found.');
                    }
                }

                const bannerAttachment = await getUserBanner(bannerUser);
                if (bannerAttachment) {
                    await message.reply({ 
                        content: `**${bannerUser.tag}'s Banner:**`,
                        files: [bannerAttachment] 
                    });
                } else {
                    await message.reply('❌ This user doesn\'t have a banner or failed to get banner.');
                }
                break;

            case 'userinfo':
                let infoUser = message.author;
                if (message.mentions.users.size > 0) {
                    infoUser = message.mentions.users.first();
                } else if (args[0]) {
                    try {
                        infoUser = await client.users.fetch(args[0]);
                    } catch {
                        return message.reply('❌ User not found.');
                    }
                }

                const member = message.guild ? await message.guild.members.fetch(infoUser.id).catch(() => null) : null;
                const userInfoEmbed = createUserInfoEmbed(infoUser, member);
                await message.reply({ embeds: [userInfoEmbed] });
                break;

            case 'useraboutme':
                let aboutUser = message.author;
                if (message.mentions.users.size > 0) {
                    aboutUser = message.mentions.users.first();
                } else if (args[0]) {
                    try {
                        aboutUser = await client.users.fetch(args[0]);
                    } catch {
                        return message.reply('❌ User not found.');
                    }
                }

                try {
                    const fullUser = await client.users.fetch(aboutUser.id, { force: true });
                    const aboutMe = fullUser.bio || 'This user has no about me section.';
                    
                    const aboutEmbed = new EmbedBuilder()
                        .setTitle(`About Me - ${aboutUser.tag}`)
                        .setDescription(aboutMe)
                        .setThumbnail(aboutUser.displayAvatarURL({ dynamic: true }))
                        .setColor(0x00AE86)
                        .setTimestamp();
                    
                    await message.reply({ embeds: [aboutEmbed] });
                } catch (error) {
                    await message.reply('❌ Failed to get user\'s about me section.');
                }
                break;
        }
    } catch (error) {
        console.error('Error handling prefix command:', error);
        await message.reply('❌ An error occurred while processing the command.');
    }
});

// Enhanced error handling for 24/7 operation
client.on('error', error => {
    console.error('🚨 Discord client error:', error);
});

client.on('warn', warning => {
    console.warn('⚠️ Discord client warning:', warning);
});

client.on('disconnect', () => {
    console.log('🔌 Bot disconnected from Discord');
});

client.on('reconnecting', () => {
    console.log('🔄 Bot attempting to reconnect...');
});

client.on('resume', () => {
    console.log('🔄 Bot connection resumed');
    // Update status after reconnection
    setTimeout(updateBotStatus, 5000);
});

process.on('unhandledRejection', error => {
    console.error('🚨 Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('🚨 Uncaught exception:', error);
    // Don't exit process for better 24/7 stability
});

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

// Keep alive function for Render
setInterval(() => {
    console.log(`💓 Heartbeat - Bot alive at ${new Date().toISOString()}`);
    console.log(`📊 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB | Uptime: ${Math.floor(process.uptime())}s`);
}, 300000); // Every 5 minutes

// Login to Discord with retry logic
async function loginWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await client.login(TOKEN);
            console.log('🔐 Successfully logged in to Discord!');
            return;
        } catch (error) {
            console.error(`🚨 Login attempt ${i + 1} failed:`, error);
            if (i === maxRetries - 1) {
                console.error('❌ Max login retries reached. Exiting...');
                process.exit(1);
            }
            console.log(`⏳ Retrying login in 5 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

// Start the bot
loginWithRetry();