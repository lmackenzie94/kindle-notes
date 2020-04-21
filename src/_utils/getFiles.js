const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
require('dotenv').config();

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'src/_utils/token.json';

function init() {
  try {
    // Authorize a client with credentials, then call the Google Drive API.
    const content = JSON.parse(process.env.CREDENTIALS);
    authorize(content, listFiles);
  } catch (err) {
    console.log(`Problem with authorization: ${err}`);
  }
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the names and IDs of up the files
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listFiles(auth) {
  const drive = google.drive({ version: 'v3', auth });
  drive.files.list(
    {
      // pageSize: 10,
      q: `"${process.env.FOLDER_ID}" in parents`,
      fields: 'nextPageToken, files(id, name)',
    },
    (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      const files = res.data.files;
      if (files.length) {
        files.map((file) => {
          let trimmedFileName = removeSpaces(file.name);
          getFile(auth, file.id);
          downloadFile(auth, file.id, trimmedFileName);
        });
      } else {
        console.log('No files found.');
      }
    }
  );
}

/**
 * Downloads the files to a local directory
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function downloadFile(auth, fileId, fileName) {
  if (fs.existsSync(`static/pdfs/${fileName}`)) {
    console.log(`${fileName} already exists`);
    return;
  }
  const drive = google.drive({ version: 'v3', auth });
  const dest = fs.createWriteStream(`static/pdfs/${fileName}`);
  try {
    const res = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    res.data
      .on('end', function () {
        console.log(`Downloading ${fileName}...`);
      })
      .on('error', function (err) {
        console.log('Error during download', err);
      })
      .pipe(dest);
  } catch (err) {
    console.log(`Download error: ${err}`);
  }
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function getFile(auth, fileId) {
  const drive = google.drive({ version: 'v3', auth });
  try {
    const res = await drive.files.get({ fileId: fileId, fields: '*' });
    const formattedFileName = res.data.name.includes('.')
      ? removeFileExtension(res.data.name)
      : res.data.name;
    return {
      fileName: formattedFileName,
      trimmedName: removeSpaces(res.data.name),
      link: res.data.webViewLink,
      downloadLink: res.data.webContentLink,
    };
  } catch (err) {
    console.log(`The API returned an error: ${err}`);
  }
}

init();

// UTILITY FUNCTIONS

function removeFileExtension(fileName) {
  return fileName.split('.').slice(0, -1).join('.');
}

function removeSpaces(fileName) {
  return fileName.replace(/\s/g, '');
}
