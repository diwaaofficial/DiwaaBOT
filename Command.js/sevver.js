require("dotenv").config();
const express = require("express");
const Twilio = require("twilio");
const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: true }));

const twilioClient = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

app.post("/whatsapp", async (req, res) => {
    const incomingMsg = req.body.Body.trim().toLowerCase();
    const senderNumber = req.body.From.replace("whatsapp:", "");

    let replyMessage = "🤖 Unknown command. Try '!info', '!add', '!remove', '!mute'.";
    
    // **Group Management Commands**
    if (incomingMsg.startsWith("!add ")) {
        let newMember = incomingMsg.split(" ")[1];
        replyMessage = `✅ Adding ${newMember} to the group...`;
    } else if (incomingMsg.startsWith("!remove ")) {
        let removeMember = incomingMsg.split(" ")[1];
        replyMessage = `❌ Removing ${removeMember} from the group...`;
    } else if (incomingMsg === "!info") {
        replyMessage = "📜 Group Info:\n- Admins: @admin1, @admin2\n- Total Members: 50\n- Rules: No spam!";
    } else if (incomingMsg === "!mute") {
        replyMessage = "🔇 Group is now muted! Only admins can send messages.";
    } else if (incomingMsg === "!unmute") {
        replyMessage = "🔊 Group is now open for all members.";
    } 
    // **YouTube Song Downloader**
    else if (incomingMsg.startsWith("https://www.youtube.com") || incomingMsg.startsWith("https://youtu.be")) {
        replyMessage = "🔄 Downloading your song, please wait...";
        const videoUrl = incomingMsg;

        try {
            const videoInfo = await ytdl.getInfo(videoUrl);
            const fileName = `${videoInfo.videoDetails.title}.mp3`;
            const filePath = path.join(__dirname, "downloads", fileName);

            // Download as MP3
            ytdl(videoUrl, { filter: "audioonly" })
                .pipe(fs.createWriteStream(filePath))
                .on("finish", async () => {
                    await twilioClient.messages.create({
                        from: TWILIO_WHATSAPP_NUMBER,
                        to: senderNumber,
                        mediaUrl: `https://yourserver.com/downloads/${fileName}`,
                        body: "✅ Here is your downloaded MP3 file.",
                    });
                });

        } catch (error) {
            replyMessage = "❌ Error downloading the song.";
        }
    }

    // Send the response back to WhatsApp
    await twilioClient.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: senderNumber,
        body: replyMessage,
    });

    res.sendStatus(200);
});

// **Server Port**
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
