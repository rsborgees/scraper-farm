const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function loadAuth() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
    const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tokens.json')));
    oAuth2Client.setCredentials(tokens);
    return oAuth2Client;
}

async function findFileWithParents(fileNamePart) {
    const auth = loadAuth();
    const drive = google.drive({ version: 'v3', auth });
    
    console.log(`Searching for files containing "${fileNamePart}"...`);
    const res = await drive.files.list({
        q: `name contains '${fileNamePart}' and trashed = false`,
        fields: 'files(id, name, parents)'
    });
    
    const files = res.data.files;
    if (files && files.length > 0) {
        for (const file of files) {
            console.log(`File: ${file.name} (${file.id})`);
            if (file.parents) {
                for (const parentId of file.parents) {
                    const parentRes = await drive.files.get({
                        fileId: parentId,
                        fields: 'name'
                    });
                    console.log(`  Parent: ${parentRes.data.name} (${parentId})`);
                }
            }
        }
    } else {
        console.log('No files found.');
    }
}

async function run() {
    await findFileWithParents('356095');
    await findFileWithParents('356956');
}

run().catch(console.error);
