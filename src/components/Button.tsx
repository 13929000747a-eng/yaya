import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline';
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    fullWidth = false,
    className = '',
    children,
    ...props
}) => {
    return (
        <button
            className={`btn btn-${variant} ${fullWidth ? 'btn-full' : ''} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
