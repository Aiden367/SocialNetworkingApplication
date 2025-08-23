import { Storage } from '@google-cloud/storage';
import path from 'path';

// Path to your JSON key
const keyPath = path.join(__dirname, 'keys', 'social-application-project-da6debcdf063.json');

const storage = new Storage({
  keyFilename: keyPath,
  projectId: 'social-application-project',
});

const bucketName = 'my-app-profile-images';
const bucket = storage.bucket(bucketName);

export default bucket;
