import axios from './axios-instance';

interface UploadImageResponse {
  url: string;
  filename: string;
}

export const uploadService = {
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return (response as unknown as { data: UploadImageResponse }).data.url;
  },
};
