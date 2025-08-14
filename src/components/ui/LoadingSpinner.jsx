import React from 'react';
import { motion } from 'framer-motion';
import { CpuChipIcon } from '@heroicons/react/24/outline';

export default function LoadingSpinner({
    message = '로딩 중...',
    size = 'medium',
    showIcon = true
}) {
    const sizeClasses = {
        small: 'w-5 h-5',
        medium: 'w-8 h-8',
        large: 'w-12 h-12'
    };

    const containerSizeClasses = {
        small: 'text-sm',
        medium: 'text-base',
        large: 'text-lg'
    };

    return (
        <div className={`flex flex-col items-center justify-center space-y-3 ${containerSizeClasses[size]}`}>
            {showIcon && (
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className={`${sizeClasses[size]} text-crypto-primary-500`}
                >
                    <CpuChipIcon className="w-full h-full" />
                </motion.div>
            )}

            <div className="flex items-center space-x-1">
                <span className="text-crypto-neutral-700">{message}</span>
                <div className="flex space-x-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                delay: i * 0.2
                            }}
                            className="w-1 h-1 bg-crypto-primary-500 rounded-full"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
