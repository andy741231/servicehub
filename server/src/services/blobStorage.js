import {
  BlobServiceClient,
} from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'uploads';

let blobServiceClient = null;

function getClient() {
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set. Configure it in .env');
  }
  if (!blobServiceClient) {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
}

export async function uploadBlob(buffer, filename, mimeType) {
  const client = getClient();
  const containerClient = client.getContainerClient(containerName);

  const blobName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${filename}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  return {
    blobName,
    url: blockBlobClient.url,
  };
}

export async function deleteBlob(blobName) {
  const client = getClient();
  const containerClient = client.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}
