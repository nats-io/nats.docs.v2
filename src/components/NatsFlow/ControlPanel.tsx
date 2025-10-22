import React from 'react';
import type { ControlButton } from './types';
import styles from './NatsFlow.module.css';

interface ControlPanelProps {
  buttons: ControlButton[];
  title?: string;
  description?: string;
}

const getButtonClass = (variant?: string): string => {
  switch (variant) {
    case 'primary':
      return styles.btnPrimary;
    case 'secondary':
      return styles.btnSecondary;
    case 'success':
      return styles.btnSuccess;
    case 'danger':
      return styles.btnDanger;
    default:
      return styles.btnPrimary;
  }
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  buttons,
  title,
  description,
}) => {
  return (
    <div className={styles.controlPanel}>
      {title && <h4 className={styles.controlTitle}>{title}</h4>}
      {description && <p className={styles.controlDescription}>{description}</p>}
      <div className={styles.controlButtons}>
        {buttons.map((button, index) => (
          <button
            key={index}
            className={`${styles.controlButton} ${getButtonClass(button.variant)}`}
            onClick={button.action}
          >
            {button.icon && <span className={styles.buttonIcon}>{button.icon}</span>}
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
};
