import React, { useCallback } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { motion } from 'motion/react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (
          file.type ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel' ||
          file.name.endsWith('.xlsx') ||
          file.name.endsWith('.xls')
        ) {
          onFileUpload(file);
        } else {
          alert('Por favor, sube un archivo Excel (.xlsx o .xls)');
        }
      }
    },
    [onFileUpload]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer bg-white dark:bg-slate-900 shadow-sm"
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".xlsx, .xls"
          onChange={handleFileSelect}
        />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-full mb-4">
            <FileSpreadsheet className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Sube tu planilla Excel
          </h3>
          <p className="text-slate-50 dark:text-slate-400 mb-6 max-w-sm mx-auto">
            Arrastra y suelta tu archivo aquí, o haz clic para seleccionar.
            Soportamos formatos .xlsx y .xls
          </p>
          <span className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            <Upload className="w-4 h-4 mr-2" />
            Seleccionar Archivo
          </span>
        </label>
      </div>
    </motion.div>
  );
};
