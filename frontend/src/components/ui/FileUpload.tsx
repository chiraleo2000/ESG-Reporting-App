import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Download,
  Trash2,
  ZoomIn,
} from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

// Types
interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface FileUploadProps {
  onUpload?: (files: File[]) => Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  maxFiles?: number;
  showPreview?: boolean;
  className?: string;
}

// File type icons
const getFileIcon = (type: string) => {
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
    return FileSpreadsheet;
  }
  if (type.includes('image')) {
    return FileImage;
  }
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) {
    return FileText;
  }
  return File;
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  accept = '.xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg',
  multiple = true,
  maxSize = 10, // 10MB default
  maxFiles = 10,
  showPreview = true,
  className = '',
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFiles = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles: FileItem[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        if (files.length + newFiles.length >= maxFiles) {
          break;
        }

        const file = selectedFiles[i];

        // Validate file size
        if (file.size > maxSize * 1024 * 1024) {
          newFiles.push({
            id: generateId(),
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'error',
            progress: 0,
            error: `File exceeds ${maxSize}MB limit`,
          });
          continue;
        }

        // Create preview for images
        let preview: string | undefined;
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
        }

        newFiles.push({
          id: generateId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview,
          status: 'uploading',
          progress: 0,
        });
      }

      setFiles((prev) => [...prev, ...newFiles]);

      // Simulate upload with progress
      for (const fileItem of newFiles) {
        if (fileItem.status === 'error') continue;

        // Simulate progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id ? { ...f, progress } : f
            )
          );
        }

        // Mark as success
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f
          )
        );
      }

      // Call onUpload callback
      if (onUpload) {
        const validFiles = newFiles
          .filter((f) => f.status !== 'error')
          .map((f) => f.file);
        if (validFiles.length > 0) {
          await onUpload(validFiles);
        }
      }
    },
    [files.length, maxFiles, maxSize, onUpload]
  );

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // Remove file
  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  // Clear all files
  const clearAll = () => {
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
  };

  return (
    <div className={className}>
      {/* Drop Zone */}
      <motion.div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300
          ${isDragging
            ? 'border-grass-500 bg-grass-50 dark:bg-grass-900/20'
            : 'border-earth-200 dark:border-earth-600 hover:border-grass-400 hover:bg-grass-50/50 dark:hover:bg-grass-900/10'
          }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center text-center">
          <motion.div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-4
              ${isDragging
                ? 'bg-grass-500 text-white'
                : 'bg-grass-100 dark:bg-earth-700 text-grass-600 dark:text-grass-400'
              }`}
            animate={isDragging ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: isDragging ? Infinity : 0, duration: 0.8 }}
          >
            <Upload className="w-8 h-8" />
          </motion.div>

          <h3 className="text-lg font-semibold text-earth-800 dark:text-earth-100 mb-2">
            {isDragging ? 'Drop files here' : 'Upload Files'}
          </h3>
          <p className="text-earth-500 dark:text-earth-400 mb-4">
            Drag and drop files here, or click to browse
          </p>

          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            Browse Files
          </Button>

          <p className="text-xs text-earth-400 dark:text-earth-500 mt-4">
            Supported: Excel, CSV, PDF, Images • Max {maxSize}MB per file • Up to {maxFiles} files
          </p>
        </div>
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-earth-700 dark:text-earth-300">
                {files.length} file{files.length > 1 ? 's' : ''} uploaded
              </span>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            </div>

            <div className="space-y-2">
              {files.map((fileItem) => (
                <FileItemCard
                  key={fileItem.id}
                  fileItem={fileItem}
                  showPreview={showPreview}
                  onRemove={() => removeFile(fileItem.id)}
                  onPreview={() => setPreviewFile(fileItem)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.name || 'File Preview'}
        size="lg"
      >
        {previewFile?.preview ? (
          <div className="flex items-center justify-center p-4">
            <img
              src={previewFile.preview}
              alt={previewFile.name}
              className="max-w-full max-h-[60vh] rounded-lg shadow-lg"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-earth-500">
            <FileText className="w-16 h-16 mb-4" />
            <p>Preview not available for this file type</p>
            <p className="text-sm mt-2">{previewFile?.name}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

// File Item Card Component
interface FileItemCardProps {
  fileItem: FileItem;
  showPreview: boolean;
  onRemove: () => void;
  onPreview: () => void;
}

const FileItemCard: React.FC<FileItemCardProps> = ({
  fileItem,
  showPreview,
  onRemove,
  onPreview,
}) => {
  const Icon = getFileIcon(fileItem.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex items-center gap-4 p-3 rounded-xl border transition-all
        ${fileItem.status === 'error'
          ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          : 'bg-white dark:bg-earth-800 border-earth-200 dark:border-earth-700'
        }`}
    >
      {/* Thumbnail/Icon */}
      <div className="flex-shrink-0">
        {showPreview && fileItem.preview ? (
          <div className="relative group">
            <img
              src={fileItem.preview}
              alt={fileItem.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <button
              onClick={onPreview}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
          </div>
        ) : (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center
            ${fileItem.status === 'error'
              ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
              : 'bg-grass-100 text-grass-600 dark:bg-grass-900/30 dark:text-grass-400'
            }`}
          >
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-earth-800 dark:text-earth-100 truncate">
            {fileItem.name}
          </p>
          {fileItem.status === 'success' && (
            <CheckCircle className="w-4 h-4 text-grass-500 flex-shrink-0" />
          )}
          {fileItem.status === 'error' && (
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-earth-500 dark:text-earth-400">
            {formatFileSize(fileItem.size)}
          </span>
          {fileItem.status === 'error' && fileItem.error && (
            <span className="text-xs text-red-500">{fileItem.error}</span>
          )}
        </div>

        {/* Progress Bar */}
        {fileItem.status === 'uploading' && (
          <div className="mt-2">
            <div className="h-1.5 bg-earth-200 dark:bg-earth-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-grass-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${fileItem.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {fileItem.status === 'uploading' ? (
          <Loader2 className="w-5 h-5 text-grass-500 animate-spin" />
        ) : (
          <>
            {showPreview && fileItem.preview && (
              <button
                onClick={onPreview}
                className="p-2 rounded-lg hover:bg-earth-100 dark:hover:bg-earth-700 transition-colors"
              >
                <Eye className="w-4 h-4 text-earth-500 dark:text-earth-400" />
              </button>
            )}
            <button
              onClick={onRemove}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <X className="w-4 h-4 text-earth-500 hover:text-red-500" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};

// Export compact file preview list for use elsewhere
export const FilePreviewList: React.FC<{
  files: { name: string; size: number; type: string; url?: string }[];
  onRemove?: (index: number) => void;
  onView?: (file: { name: string; url?: string }) => void;
}> = ({ files, onRemove, onView }) => {
  return (
    <div className="space-y-2">
      {files.map((file, index) => {
        const Icon = getFileIcon(file.type);
        return (
          <div
            key={index}
            className="flex items-center gap-3 p-2 rounded-lg bg-earth-50 dark:bg-earth-800 border border-earth-200 dark:border-earth-700"
          >
            <div className="w-8 h-8 rounded-lg bg-grass-100 dark:bg-grass-900/30 flex items-center justify-center">
              <Icon className="w-4 h-4 text-grass-600 dark:text-grass-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-earth-700 dark:text-earth-200 truncate">
                {file.name}
              </p>
              <p className="text-xs text-earth-500 dark:text-earth-400">
                {formatFileSize(file.size)}
              </p>
            </div>
            {onView && file.url && (
              <button
                onClick={() => onView(file)}
                className="p-1.5 rounded hover:bg-earth-200 dark:hover:bg-earth-600 transition-colors"
              >
                <Eye className="w-4 h-4 text-earth-500" />
              </button>
            )}
            {onRemove && (
              <button
                onClick={() => onRemove(index)}
                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <X className="w-4 h-4 text-earth-500 hover:text-red-500" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FileUpload;
