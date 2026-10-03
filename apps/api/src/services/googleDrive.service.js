const crypto = require('crypto');
const { Readable } = require('stream');
const { google } = require('googleapis');
const GoogleDriveConnection = require('../models/googleDriveConnection.model');
const GoogleOAuthState = require('../models/googleOAuthState.model');
const { encryptSecret, decryptSecret } = require('./secureToken.service');

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const ROOT_FOLDER_NAME = 'Sania Clothing Invoice Archives';

function oauthClient() {
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI } =
    process.env;
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !GOOGLE_OAUTH_REDIRECT_URI) {
    const error = new Error('Google Drive OAuth is not configured on the server');
    error.statusCode = 503;
    error.code = 'GOOGLE_DRIVE_NOT_CONFIGURED';
    throw error;
  }
  return new google.auth.OAuth2(
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URI
  );
}

function hashState(state) {
  return crypto.createHash('sha256').update(state).digest('hex');
}

async function createAuthorizationUrl(userId) {
  const state = crypto.randomBytes(32).toString('base64url');
  await GoogleOAuthState.create({
    stateHash: hashState(state),
    requestedBy: userId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  return oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [DRIVE_SCOPE],
    state,
    include_granted_scopes: false,
  });
}

async function consumeOAuthState(state, stateModel = GoogleOAuthState) {
  if (!state || typeof state !== 'string') return null;
  return stateModel.findOneAndUpdate(
    { stateHash: hashState(state), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true }
  );
}

async function findOrCreateRootFolder(drive) {
  const response = await drive.files.list({
    q: "appProperties has { key='saniaInvoiceArchiveRoot' and value='true' } and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: 'files(id,name,webViewLink)',
    spaces: 'drive',
    pageSize: 10,
  });
  const existing = response.data.files?.[0];
  if (existing) return existing;
  const created = await drive.files.create({
    requestBody: {
      name: ROOT_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      appProperties: { saniaInvoiceArchiveRoot: 'true' },
    },
    fields: 'id,name,webViewLink',
  });
  return created.data;
}

async function completeAuthorization({ code, state }) {
  const stateRecord = await consumeOAuthState(state);
  if (!stateRecord) {
    const error = new Error('Google authorization state is invalid, expired, or already used');
    error.statusCode = 400;
    error.code = 'INVALID_OAUTH_STATE';
    throw error;
  }
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    const error = new Error('Google did not return offline access; reconnect and grant consent');
    error.statusCode = 400;
    error.code = 'REFRESH_TOKEN_MISSING';
    throw error;
  }
  client.setCredentials(tokens);
  const drive = google.drive({ version: 'v3', auth: client });
  const [about, folder] = await Promise.all([
    drive.about.get({ fields: 'user(emailAddress)' }),
    findOrCreateRootFolder(drive),
  ]);
  return GoogleDriveConnection.findOneAndUpdate(
    { provider: 'google-drive' },
    {
      $set: {
        encryptedRefreshToken: encryptSecret(tokens.refresh_token),
        accountEmail: about.data.user?.emailAddress || '',
        folderId: folder.id,
        folderUrl: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
        connectedBy: stateRecord.requestedBy,
        connectedAt: new Date(),
        lastVerifiedAt: new Date(),
        lastError: '',
        revokedAt: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function authorizedDrive() {
  const connection = await GoogleDriveConnection.findOne({
    provider: 'google-drive',
    revokedAt: null,
  }).select('+encryptedRefreshToken');
  if (!connection) {
    const error = new Error('Google Drive is not connected');
    error.statusCode = 409;
    error.code = 'GOOGLE_DRIVE_NOT_CONNECTED';
    throw error;
  }
  const client = oauthClient();
  client.setCredentials({ refresh_token: decryptSecret(connection.encryptedRefreshToken) });
  return { connection, drive: google.drive({ version: 'v3', auth: client }) };
}

async function connectionStatus({ verify = false } = {}) {
  const connection = await GoogleDriveConnection.findOne({ provider: 'google-drive' });
  if (!connection || connection.revokedAt) {
    return { connected: false, configured: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID) };
  }
  if (verify) {
    try {
      const { drive } = await authorizedDrive();
      await drive.files.get({ fileId: connection.folderId, fields: 'id,trashed' });
      connection.lastVerifiedAt = new Date();
      connection.lastError = '';
      await connection.save();
    } catch (error) {
      connection.lastError = 'Google Drive authorization must be renewed';
      await connection.save();
    }
  }
  return {
    connected: !connection.lastError,
    configured: true,
    accountEmail: connection.accountEmail,
    folderUrl: connection.folderUrl,
    lastVerifiedAt: connection.lastVerifiedAt,
    error: connection.lastError || undefined,
  };
}

async function disconnect() {
  const connection = await GoogleDriveConnection.findOne({ provider: 'google-drive' }).select(
    '+encryptedRefreshToken'
  );
  if (!connection) return;
  try {
    const client = oauthClient();
    client.setCredentials({ refresh_token: decryptSecret(connection.encryptedRefreshToken) });
    await client.revokeToken(decryptSecret(connection.encryptedRefreshToken));
  } catch (_) {
    // Local revocation still prevents further use when Google is unavailable/already revoked.
  }
  connection.revokedAt = new Date();
  connection.encryptedRefreshToken = undefined;
  await connection.deleteOne();
}

async function createArchiveFolder(drive, rootFolderId, archiveId) {
  const result = await drive.files.create({
    requestBody: {
      name: archiveId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
      appProperties: { saniaArchiveId: archiveId },
    },
    fields: 'id,webViewLink',
  });
  return result.data;
}

async function uploadBuffer(drive, folderId, { name, mimeType, buffer }) {
  const result = await drive.files.create({
    requestBody: { name, parents: [folderId], appProperties: { saniaManaged: 'true' } },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id,name,size,webViewLink',
  });
  return result.data;
}

async function downloadBuffer(drive, fileId) {
  const result = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return Buffer.from(result.data);
}

module.exports = {
  DRIVE_SCOPE,
  createAuthorizationUrl,
  completeAuthorization,
  connectionStatus,
  disconnect,
  authorizedDrive,
  createArchiveFolder,
  uploadBuffer,
  downloadBuffer,
  hashState,
  consumeOAuthState,
};
