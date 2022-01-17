import { storage } from 'lib/firebase';
import mime from 'mime-types';

export const handleUploadFiles = (
  file: File,
  path: string,
  addExtension = true
): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file) resolve('');
    const filePath = addExtension
      ? `${path}.${mime.extension(file.type)}`
      : path;
    const storageRef = storage.ref();
    const uploadTask = storageRef.child(filePath).put(file);
    uploadTask
      .then(async () => {
        // const photoUrl = await storageRef.child(filePath).getDownloadURL();
        // await storageRef.child(filePath).updateMetadata({
        //   cacheControl: 'private,max-age=31536000',
        // });
        resolve(filePath);
      })
      .catch((err) => {
        console.error(err.message);
        reject(new Error());
      });
  });
