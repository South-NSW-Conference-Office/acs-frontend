'use client';

import React, { ReactNode, useState } from 'react';
import Modal, { ModalBody, ModalFooter, useModalTheme } from './Modal';
import { ModalThemeName } from '../lib/modalThemes';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => unknown;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmButtonColor?: 'red' | 'blue' | 'green' | 'orange';
  icon?: ReactNode;
  children?: ReactNode;
  theme?: ModalThemeName;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmButtonColor = 'red',
  icon,
  children,
  theme = 'default'
}: ConfirmationModalProps) {
  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700 disabled:bg-red-400',
    blue: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400',
    green: 'bg-green-600 hover:bg-green-700 disabled:bg-green-400',
    orange: 'bg-[#F25F29] hover:bg-[#F23E16] disabled:bg-orange-300'
  };

  const iconColorClasses = {
    red: 'bg-red-100',
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    orange: 'bg-orange-100'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="md"
      showCloseButton={false}
      theme={theme}
    >
      <ConfirmationContent
        icon={icon}
        iconColorClass={iconColorClasses[confirmButtonColor]}
        title={title}
        message={message}
        onClose={onClose}
        onConfirm={onConfirm}
        cancelLabel={cancelLabel}
        confirmLabel={confirmLabel}
        confirmButtonClass={colorClasses[confirmButtonColor]}
      >
        {children}
      </ConfirmationContent>
    </Modal>
  );
}

function ConfirmationContent({
  icon,
  iconColorClass,
  title,
  message,
  onClose,
  onConfirm,
  cancelLabel,
  confirmLabel,
  confirmButtonClass,
  children
}: {
  icon?: ReactNode;
  iconColorClass: string;
  title: string;
  message: ReactNode;
  onClose: () => void;
  onConfirm: () => unknown;
  cancelLabel: string;
  confirmLabel: string;
  confirmButtonClass: string;
  children?: ReactNode;
}) {
  const theme = useModalTheme();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ModalBody className="text-center">
        {icon && (
          <div className={`flex items-center justify-center w-12 h-12 mx-auto ${iconColorClass} rounded-full mb-4`}>
            {icon}
          </div>
        )}
        <h3 className={`text-lg font-medium ${theme?.textColor || 'text-gray-900'} mb-2`}>
          {title}
        </h3>
        <p className={`text-sm ${theme?.messageColor || 'text-gray-500'} mb-6`}>
          {message}
        </p>
        {children}
      </ModalBody>

      <ModalFooter>
        <button
          onClick={onClose}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium ${theme?.cancelButtonColor || 'text-gray-700 hover:text-gray-500'} disabled:opacity-50`}
        >
          {cancelLabel}
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-colors ${confirmButtonClass} disabled:cursor-not-allowed`}
        >
          {loading && (
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? 'Processing…' : confirmLabel}
        </button>
      </ModalFooter>
    </>
  );
}
