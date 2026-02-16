import imageCompression from 'browser-image-compression';

/**
 * Options de compression par défaut
 */
const DEFAULT_OPTIONS = {
  maxSizeMB: 0.5, // Taille maximale en MB (500KB)
  maxWidthOrHeight: 1920, // Résolution maximale
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.8,
};

/**
 * Compresser une image avant stockage
 * @param file Fichier image à compresser
 * @returns Fichier compressé
 */
export async function compressImage(file: File): Promise<File> {
  try {
    const compressedFile = await imageCompression(file, DEFAULT_OPTIONS);
    return compressedFile;
  } catch (error) {
    console.error('Erreur lors de la compression:', error);
    throw error;
  }
}

/**
 * Convertir un fichier image en base64
 * @param file Fichier image
 * @returns String base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compresser et convertir une image en base64
 * @param file Fichier image
 * @returns String base64 de l'image compressée
 */
export async function compressAndConvertToBase64(file: File): Promise<string> {
  const compressedFile = await compressImage(file);
  return await fileToBase64(compressedFile);
}




