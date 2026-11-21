/**
 * Ultra-lightweight client-side image compressor using HTML5 Canvas.
 * Shrinks 3MB-8MB mobile screenshots to ~25KB-40KB while keeping text & UTR digits crystal-clear.
 * Prevents database bloat and ensures fast uploads on mobile networks.
 */
export const compressImage = (file, maxDimension = 720, quality = 0.65) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.onload = () => {
        let { width, height } = img;

        // Downscale while preserving aspect ratio
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
          return reject(new Error('Could not initialize canvas context'));
        }

        // Fill background white in case of transparent PNG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer WebP for superior compression, fallback to JPEG
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Calculate size in bytes
        const head = dataUrl.indexOf(',');
        const b64 = head === -1 ? dataUrl : dataUrl.slice(head + 1);
        const compressedSize = Math.round((b64.length * 3) / 4);

        const originalSize = file.size;
        const reductionPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

        resolve({
          dataUrl,
          width,
          height,
          originalSize,
          compressedSize,
          reductionPercent,
          formattedOriginal: formatBytes(originalSize),
          formattedCompressed: formatBytes(compressedSize)
        });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default compressImage;
