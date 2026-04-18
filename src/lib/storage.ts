import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: number;
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const uploadAttachment = async (
  file: File,
  syncId: string,
  taskId: string
): Promise<Attachment> => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 10MB.');
  }
  
  const id = crypto.randomUUID();
  const extension = file.name.split('.').pop() || '';
  const fileName = `${id}.${extension}`;
  
  const storageRef = ref(storage, `attachments/${syncId}/${taskId}/${fileName}`);
  
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  
  return {
    id,
    name: file.name,
    url,
    type: file.type,
    size: file.size,
    uploadedAt: Date.now(),
  };
};

export const deleteAttachment = async (
  syncId: string,
  taskId: string,
  attachmentId: string,
  fileName: string
): Promise<void> => {
  const storageRef = ref(storage, `attachments/${syncId}/${taskId}/${fileName}`);
  await deleteObject(storageRef);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const isImageFile = (type: string): boolean => {
  return type.startsWith('image/');
};

export const isPdfFile = (type: string): boolean => {
  return type === 'application/pdf';
};