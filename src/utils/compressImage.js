/**
 * Compresse une image côté client avant upload.
 * - Max 1200px (largeur ou hauteur)
 * - Qualité JPEG 0.85
 * - Ignoré si < 300 Ko ou si c'est un PDF
 * @param {File} file
 * @returns {Promise<File>} fichier compressé (ou original si pas d'image)
 */
export async function compressImage(file) {
    // Ne pas toucher aux PDF ou aux fichiers déjà petits
    if (!file.type.startsWith('image/') || file.size < 300 * 1024) return file;

    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            const MAX = 1200;
            let { width, height } = img;

            // Redimensionnement proportionnel
            if (width > MAX || height > MAX) {
                if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
                else                { width  = Math.round((width  * MAX) / height); height = MAX; }
            }

            const canvas = document.createElement('canvas');
            canvas.width  = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob || blob.size >= file.size) {
                        resolve(file); // si la compression est inutile, garder l'original
                        return;
                    }
                    const compressed = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                    console.debug(`[compressImage] ${file.name} : ${(file.size / 1024).toFixed(0)} Ko → ${(compressed.size / 1024).toFixed(0)} Ko`);
                    resolve(compressed);
                },
                'image/jpeg',
                0.85
            );
        };

        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });
}
