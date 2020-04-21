require('dotenv').config();

module.exports = {
  installed: {
    client_id:
      '541226931195-9kc03rq5tgrrgvat5vc5e931kmfigfnj.apps.googleusercontent.com',
    project_id: 'quickstart-1587241294960',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_secret: process.env.CLIENT_SECRET,
    redirect_uris: ['urn:ietf:wg:oauth:2.0:oob', 'http://localhost'],
  },
};
