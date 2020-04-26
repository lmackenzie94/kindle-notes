const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const credentials = require('./credentials');
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
    authorize(credentials, listFiles);
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
      q: `"${process.env.FOLDER_ID}" in parents`,
      fields:
        'nextPageToken, files(id, name, createdTime, webViewLink, webContentLink)',
      orderBy: 'name',
    },
    (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      const files = res.data.files;
      if (files.length) {
        // downloadFiles(auth, files);
        const content = getFiles(files);
        writeDataFile(content);
      } else {
        console.log('No files found.');
      }
    }
  );
}

function getFiles(files) {
  const keyLearningsObj = files.find(
    (file) => file.name === 'Key Learnings.pdf'
  );

  let idx = 0;

  const fileData = Array.from(
    files
      .filter((file) => file.name !== 'Key Learnings.pdf')
      .map((file) => {
        idx++;

        const { title, author } = getTitleAndAuthor(file.name);

        return {
          idx,
          title,
          author,
          fileName: trimFileName(file.name),
          link: file.webViewLink,
          downloadLink: file.webContentLink,
          previewLink: file.webViewLink.replace('view?usp=drivesdk', 'preview'),
        };
      })
  );

  const formattedKeyLearnings = {
    idx: 0,
    title: 'KEY LEARNINGS',
    fileName: trimFileName(keyLearningsObj.name),
    link: keyLearningsObj.webViewLink,
    downloadLink: keyLearningsObj.webContentLink,
    previewLink: keyLearningsObj.webViewLink.replace(
      'view?usp=drivesdk',
      'preview'
    ),
  };
  fileData.unshift(formattedKeyLearnings);
  return fileData;
}

function writeDataFile(content) {
  const path = 'src/_data/bookData.json';
  if (!fs.existsSync(path)) {
    console.log(`${path} already exists`);
  }
  try {
    console.log(`Writing data file to ${path}`);
    fs.writeFileSync(path, JSON.stringify(content));
    console.log(`Finished writing data file`);
  } catch (err) {
    console.log(`Error writing data file: ${err}`);
  }
}

init();

// UTILITY FUNCTIONS

function getTitleAndAuthor(fileName) {
  const splitName = fileName.replace('.pdf', '').split(' - ');
  const title = splitName[0];
  const author = splitName[1];
  return { title, author };
}

function trimFileName(fileName) {
  return fileName.replace('.pdf', '').replace(/[^0-9a-z]/gi, '');
}

// NOT USING

/**
 * Downloads the files to a local directory
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
// async function downloadFiles(auth, files) {
//   const drive = google.drive({ version: 'v3', auth });

//   const downloadFile = async (file) => {
//     let trimmedFileName = removeSpacesAndSymbols(cleanupFileName(file.name));
//     if (fs.existsSync(`static/pdfs/${trimmedFileName}`)) {
//       console.log(`${trimmedFileName} already exists`);
//       return;
//     }
//     const dest = fs.createWriteStream(`static/pdfs/${trimmedFileName}`);
//     try {
//       const res = await drive.files.get(
//         { fileId: file.id, alt: 'media' },
//         { responseType: 'stream' }
//       );
//       res.data
//         .on('end', function () {
//           console.log(`Downloading ${trimmedFileName}...`);
//         })
//         .on('error', function (err) {
//           console.log('Error during download', err);
//         })
//         .pipe(dest);
//     } catch (err) {
//       console.log(`Download error: ${err}`);
//     }
//   };
//   files.map(downloadFile);
// }

// async function getFiles(files) {
// const drive = google.drive({ version: 'v3', auth });
//   const getFile = async (file) => {
//     try {
//       const res = await drive.files.get({
//         fileId: file.id,
//         fields: '*',
//       });
//       const formattedFileName = res.data.name.includes('.')
//         ? removeFileExtension(res.data.name)
//         : res.data.name;
//       return {
//         title: cleanupFileName(formattedFileName),
//         fileName: removeSpacesAndSymbols(cleanupFileName(res.data.name)),
//         link: res.data.webViewLink,
//         downloadLink: res.data.webContentLink,
//         previewLink: res.data.webViewLink.replace(
//           'view?usp=drivesdk',
//           'preview'
//         ),
//       };
//     } catch (err) {
//       console.log(`The API returned an error: ${err}`);
//     }
//   };
//   return Promise.all(files.map(getFile));
// }
