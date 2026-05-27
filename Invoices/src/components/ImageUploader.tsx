import React, { useRef, useState } from 'react';
import { Trash2, Upload, Loader2, FileUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL  } from '../services/api';



const SERVER_BASE_URL = import.meta.env.VITE_API_BS_URL || 'http://localhost:5000';

// Helper function to convert relative paths to absolute URLs
const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  
  // Se a URL já começar com http ou https, ela é externa (GCS ou outra CDN)
  // Não adicionamos o SERVER_BASE_URL
  if (imagePath.startsWith('http')) return imagePath; 
  
  // Se for um caminho relativo antigo (ex: /uploads/images/...), 
  // mantemos o comportamento para compatibilidade com imagens antigas
  return `${SERVER_BASE_URL}${imagePath}`; 
};

interface ImageUploaderProps {
  itemId: string;
itemType?: 'service' | 'product' | 'bundle' | 'proposal' | 'variant' | 'portal-content';// ← novo tipo 'variant'
section?: 'hero' | 'about';
  existingImages?: string[];
  onImagesUpdated?: (images: string[]) => void;
  maxFiles?: number; // Default: 5 for service/product, 1 for bundle
  acceptAnyFile?: boolean;           // ← NOVA PROP
  accept?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  itemId,
  itemType,
  existingImages = [],
  onImagesUpdated,
  maxFiles,
  section,
  acceptAnyFile = false,
  accept = acceptAnyFile ? "*/*" : "image/*",
  ...props
}) => {
  // Convert existing images to absolute URLs on initialization
  const initialImages = existingImages.map(getImageUrl);
  const [images, setImages] = useState<string[]>(initialImages);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxFilesAllowed = maxFiles || (itemType === 'bundle' ? 1 : 5);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

const uploadFiles = async (files: FileList) => {
  if (!files || files.length === 0) return;

  if (images.length >= maxFilesAllowed) {
    toast.error(
      `Máximo de ${maxFilesAllowed} ${acceptAnyFile ? 'ficheiro' : 'imagem'}${maxFilesAllowed > 1 ? 's' : ''} permitido${maxFilesAllowed > 1 ? 's' : ''}`
    );
    return;
  }

  const formData = new FormData();
  const filesToUpload = Array.from(files).slice(0, maxFilesAllowed - images.length);

  let invalidFiles = 0;

  filesToUpload.forEach((file) => {
    // Validação diferente dependendo do modo
    if (acceptAnyFile) {
      // Modo proposal: aceita qualquer ficheiro, só verifica tamanho
      if (file.size > 10 * 1024 * 1024) { // 10MB para propostas (ajusta se quiser)
        toast.error(`${file.name} é muito grande (máx. 10MB)`);
        invalidFiles++;
        return;
      }
    } else {
      // Modo normal (imagens): valida tipo e tamanho
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} não é uma imagem válida`);
        invalidFiles++;
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} é muito grande (máximo 5MB)`);
        invalidFiles++;
        return;
      }
    }

    // Nome do campo compatível com o teu parseMultipart (aceita 'file' ou 'files')
    const fieldName = (acceptAnyFile || itemType === 'portal-content') 
  ? 'file' 
  : (itemType === 'bundle' ? 'image' : 'images');
    formData.append(fieldName, file);
  });

  // Se todos os ficheiros foram inválidos → sai
  if (invalidFiles === filesToUpload.length) {
    return;
  }

  try {
    setIsLoading(true);
    const token = localStorage.getItem('accessToken');

    // ── Escolher o endpoint correto ───────────────────────────────────────
    let uploadUrl: string;

    if (acceptAnyFile && itemType === 'proposal') {
        uploadUrl = `${API_BASE_URL}/proposals/temp-attachments`;
      } else if (itemType === 'variant') {
        uploadUrl = `${API_BASE_URL}/admin/builtin-variants/${encodeURIComponent(itemId)}/images`;
       } else if (itemType === 'portal-content') {
  // NOVO: portal público dinâmico
  const sectionParam = section ? `?section=${section}` : '?section=hero';
  uploadUrl = `${API_BASE_URL}/company/portal-content/upload${sectionParam}`;
} else if (itemType === 'bundle') {
        uploadUrl = `${API_BASE_URL}/${itemType}s/${itemId}/image`;
      } else {
        uploadUrl = `${API_BASE_URL}/${itemType}s/${itemId}/images`;
      }

    console.log('[DEBUG] Iniciando upload para:', uploadUrl); // ← ajuda a depurar

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    console.log('[DEBUG] Status da resposta:', response.status); // ← depuração

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || `Erro ${response.status}`);
    }

    const data = await response.json();

    console.log('[DEBUG] Resposta completa do servidor:', data); // ← muito útil agora!

    // ── Processar resposta dependendo do endpoint ────────────────────────
   let uploadedUrls: string[] = [];

if (acceptAnyFile && itemType === 'proposal') {
  if (data.success && Array.isArray(data.files)) {
    uploadedUrls = data.files
      .map((f: any) => f.publicUrl)
      .filter((url: string) => typeof url === 'string' && url.startsWith('http'));
  } else if (data.publicUrl) {
    uploadedUrls = [data.publicUrl];
  }
} else if (itemType === 'variant') {
  uploadedUrls = data.url ? [getImageUrl(data.url)] : (data.images ? data.images.map(getImageUrl) : []);
} else if (itemType === 'bundle') {
  uploadedUrls = data.image ? [getImageUrl(data.image)] : [];
} else {
  uploadedUrls = data.images ? data.images.map(getImageUrl) : [];
}

if (uploadedUrls.length === 0) {
  throw new Error('Nenhuma URL pública retornada pelo servidor');
}

    const updatedImages = [...images, ...uploadedUrls];
    setImages(updatedImages);
    onImagesUpdated?.(updatedImages);

    toast.success(
      `${uploadedUrls.length} ${acceptAnyFile ? 'ficheiro' : 'imagem'}${uploadedUrls.length > 1 ? 's' : ''} enviada${uploadedUrls.length > 1 ? 's' : ''} com sucesso!`
    );
  } catch (error: any) {
    console.error('Upload error:', error);
    toast.error(error.message || 'Erro ao fazer upload');
  } finally {
    setIsLoading(false);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
  }
};

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(e.target.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const deleteImage = async (imageUrl: string) => {
  const previousImages = [...images];
  
  try {
    const token = localStorage.getItem('accessToken');
    
    // Optimistic update
    const updatedImages = images.filter(img => img !== imageUrl);
    setImages(updatedImages);
    onImagesUpdated?.(updatedImages);

    let url: string;
  let body: any = { imageUrl };

  if (itemType === 'portal-content') {
    url = `${API_BASE_URL}/company/portal-content/upload?section=${section || 'hero'}`;
  } else if (itemType === 'bundle') {
    url = `${API_BASE_URL}/${itemType}s/${itemId}/image`;
  } else {
    url = `${API_BASE_URL}/${itemType}s/${itemId}/images`;
  }

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      // Enviamos a URL completa, pois agora é um recurso externo (GCS)
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Erro ao deletar imagem');
    }

    toast.success('Imagem removida com sucesso');
  } catch (error) {
    console.error('Delete error:', error);
    setImages(previousImages);
    onImagesUpdated?.(previousImages);
    toast.error('Erro ao remover imagem');
  }
};

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={itemType !== 'bundle'}
          accept={accept}
          onChange={handleFileChange}
          disabled={isLoading || images.length >= maxFilesAllowed}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-blue-600 font-medium">Enviando...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Upload className="w-5 h-5" />
            <div>
              <p className="font-medium">
                Arraste imagens ou clique para selecionar
              </p>
              <p className="text-sm text-gray-500">
              {acceptAnyFile
                ? `Máximo ${maxFilesAllowed} ficheiro${maxFilesAllowed > 1 ? 's' : ''} (qualquer tipo)`
                : itemType === 'bundle'
                  ? 'Máximo 1 imagem (5MB)'
                  : `Máximo ${maxFilesAllowed} imagens (5MB cada)`}
            </p>
            </div>
          </div>
        )}
      </div>

      {/* Existing Images Grid */}
    {images.map((url, index) => {
    const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    return (
      <div key={`${url}-${index}`} className="relative group">
        {isImage ? (
          <img
            src={url}
            alt={`Anexo ${index + 1}`}
            className="w-full h-24 object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
            <FileUp size={32} />
            <span className="ml-2 text-sm truncate">{url.split('/').pop()}</span>
          </div>
        )}
        <button
          onClick={() => deleteImage(url)}
          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  })}
    </div>
  );
};
