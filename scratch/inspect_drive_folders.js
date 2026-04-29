const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TOKEN_PATH = path.join(__dirname, 'tokens.json');

function loadAuth() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
    const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tokens.json')));
    oAuth2Client.setCredentials(tokens);
    return oAuth2Client;
}

async function listFolders(parentFolderId) {
    const auth = loadAuth();
    const drive = google.drive({ version: 'v3', auth });
    
    console.log(`Listing subfolders of ${parentFolderId}...`);
    const res = await drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)'
    });
    
    const folders = res.data.files;
    if (folders && folders.length > 0) {
        for (const folder of folders) {
            console.log(`Folder: ${folder.name} (${folder.id})`);
            const subRes = await drive.files.list({
                q: `'${folder.id}' in parents and trashed = false`,
                fields: 'files(id, name, mimeType)'
            });
            console.log(`  Contains ${subRes.data.files.length} items.`);
        }
    } else {
        console.log('No subfolders found.');
    }
}

const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID;
listFolders(rootId).catch(console.error);
