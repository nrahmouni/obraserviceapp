/**
 * Compresses and resizes a camera or gallery image file on the client using HTML5 Canvas
 * so that the resulting JPEG Data URL is compact (~40KB - 110KB) and syncs rapidly with Cloud Firestore.
 */
export async function compressWorksitePhoto(
  file: File,
  maxDimension = 720,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar el procesador de imagen'));
          return;
        }

        // Fill white background in case of transparent PNG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Add subtle timestamp & ObraService watermark bar at bottom-right
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen seleccionada'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error leyendo el archivo de cámara'));
    reader.readAsDataURL(file);
  });
}
