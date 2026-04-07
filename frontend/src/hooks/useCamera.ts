import { useCallback } from 'react';

/**
 * Détecter si on est sur un appareil mobile
 */
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Hook pour utiliser l'API Camera
 */
export function useCamera() {
  /**
   * Prendre une photo avec l'appareil photo
   * Sur mobile : utilise l'attribut capture pour ouvrir directement la caméra
   * Sur desktop : utilise getUserMedia pour accéder à la caméra web
   */
  const takePhoto = useCallback((): Promise<File | null> => {
    // Sur mobile/tablette, utiliser l'input file avec capture
    if (isMobileDevice()) {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment'; // Utiliser la caméra arrière sur mobile
        
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          resolve(file || null);
        };
        
        input.oncancel = () => {
          resolve(null);
        };
        
        input.click();
      });
    }

    // Sur desktop, utiliser getUserMedia pour accéder à la caméra web
    return new Promise((resolve) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback : ouvrir le sélecteur de fichier
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          resolve(file || null);
        };
        
        input.oncancel = () => {
          resolve(null);
        };
        
        input.click();
        return;
      }

      // Créer un élément video temporaire pour afficher le flux de la caméra
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.style.position = 'fixed';
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.zIndex = '9999';
      video.style.objectFit = 'cover';
      video.style.backgroundColor = '#000';

      // Créer un bouton pour capturer la photo
      const captureButton = document.createElement('button');
      captureButton.textContent = '📷 Capturer';
      captureButton.style.position = 'fixed';
      captureButton.style.bottom = '20px';
      captureButton.style.left = '50%';
      captureButton.style.transform = 'translateX(-50%)';
      captureButton.style.zIndex = '10000';
      captureButton.style.padding = '15px 30px';
      captureButton.style.fontSize = '18px';
      captureButton.style.backgroundColor = '#1976d2';
      captureButton.style.color = 'white';
      captureButton.style.border = 'none';
      captureButton.style.borderRadius = '8px';
      captureButton.style.cursor = 'pointer';
      captureButton.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';

      // Créer un bouton pour annuler
      const cancelButton = document.createElement('button');
      cancelButton.textContent = '✕ Annuler';
      cancelButton.style.position = 'fixed';
      cancelButton.style.top = '20px';
      cancelButton.style.right = '20px';
      cancelButton.style.zIndex = '10000';
      cancelButton.style.padding = '10px 20px';
      cancelButton.style.fontSize = '16px';
      cancelButton.style.backgroundColor = '#d32f2f';
      cancelButton.style.color = 'white';
      cancelButton.style.border = 'none';
      cancelButton.style.borderRadius = '8px';
      cancelButton.style.cursor = 'pointer';

      const cleanup = () => {
        video.srcObject = null;
        video.remove();
        captureButton.remove();
        cancelButton.remove();
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      let stream: MediaStream | null = null;

      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((mediaStream) => {
          stream = mediaStream;
          video.srcObject = mediaStream;
          document.body.appendChild(video);
          document.body.appendChild(captureButton);
          document.body.appendChild(cancelButton);

          captureButton.onclick = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  const file = new File([blob], `photo-${Date.now()}.jpg`, {
                    type: 'image/jpeg',
                  });
                  cleanup();
                  resolve(file);
                } else {
                  cleanup();
                  resolve(null);
                }
              }, 'image/jpeg', 0.9);
            }
          };

          cancelButton.onclick = () => {
            cleanup();
            resolve(null);
          };
        })
        .catch((error) => {
          console.error('Erreur d\'accès à la caméra:', error);
          cleanup();
          // Fallback : ouvrir le sélecteur de fichier
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            resolve(file || null);
          };
          
          input.oncancel = () => {
            resolve(null);
          };
          
          input.click();
        });
    });
  }, []);

  /**
   * Importer une photo depuis la galerie
   */
  const importFromGallery = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = false; // Une seule photo à la fois
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        resolve(file || null);
      };
      
      input.oncancel = () => {
        resolve(null);
      };
      
      input.click();
    });
  }, []);

  /**
   * Vérifier si l'API Camera est disponible
   */
  const isCameraAvailable = useCallback((): boolean => {
    return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
  }, []);

  return {
    takePhoto,
    importFromGallery,
    isCameraAvailable: isCameraAvailable(),
  };
}

