'use client';

import { createContext, useContext, useState, useCallback } from 'react';

// Context for transaction status
const TransactionContext = createContext(null);

/**
 * Transaction status overlay provider
 * Wraps the app to provide transaction status updates
 */
export function TransactionProvider({ children }) {
    const [isVisible, setIsVisible] = useState(false);
    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState('idle'); // 'idle' | 'pending' | 'success' | 'error'

    const startTransaction = useCallback((initialMessage = 'Starting transaction...') => {
        setLogs([{ text: initialMessage, timestamp: Date.now(), type: 'info' }]);
        setStatus('pending');
        setIsVisible(true);
    }, []);

    const addLog = useCallback((text, type = 'info') => {
        setLogs(prev => [...prev, { text, timestamp: Date.now(), type }]);
    }, []);

    const endTransaction = useCallback((success = true, finalMessage = null) => {
        const message = finalMessage || (success ? 'Transaction complete!' : 'Transaction failed');
        setLogs(prev => [...prev, { text: message, timestamp: Date.now(), type: success ? 'success' : 'error' }]);
        setStatus(success ? 'success' : 'error');

        // Auto-hide after delay
        setTimeout(() => {
            setIsVisible(false);
            setLogs([]);
            setStatus('idle');
        }, success ? 0 : 400);
    }, []);

    const hideOverlay = useCallback(() => {
        setIsVisible(false);
        setLogs([]);
        setStatus('idle');
    }, []);

    return (
        <TransactionContext.Provider value={{ startTransaction, addLog, endTransaction, hideOverlay, isVisible, status }}>
            {children}
            {isVisible && <TransactionOverlay logs={logs} status={status} onClose={hideOverlay} />}
        </TransactionContext.Provider>
    );
}

/**
 * Hook to use transaction status
 */
export function useTransaction() {
    const context = useContext(TransactionContext);
    if (!context) {
        throw new Error('useTransaction must be used within a TransactionProvider');
    }
    return context;
}

/**
 * Transaction overlay component - terminal-style status display
 */
function TransactionOverlay({ logs, status, onClose }) {
    return (
        <div
            className="fixed inset-0 bg-white/90 z-50 pointer-events-auto"
            onClick={(e) => {
                // Only close if clicking the backdrop, not the content
                if (e.target === e.currentTarget && status !== 'pending') {
                    onClose();
                }
            }}
        >
            <div className="pt-2 px-2 w-full">
                <div className="font-mono text-sm space-y-0.5">
                    {logs.map((log, index) => (
                        <div
                            key={index}
                            className={`
                                ${log.type === 'error' ? 'text-red-400' : ''}
                                ${log.type === 'success' ? 'text-green-400' : ''}
                                ${log.type === 'info' ? 'text-degen-blue' : ''}
                                ${log.type === 'warning' ? 'text-yellow-400' : ''}
                            `}
                        >
                            <span className="text-black mr-2">
                                {new Date(log.timestamp).toLocaleTimeString('en-US', {
                                    hour12: false,
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                })}
                            </span>
                            {log.type === 'error' && <span className="mr-1">[ERROR]</span>}
                            {log.type === 'success' && <span className="mr-1">[OK]</span>}
                            {log.text}
                        </div>
                    ))}
                    {status === 'pending' && (
                        <div className="text-degen-blue animate-pulse">
                            <span className="text-gray-500 mr-2">
                                {new Date().toLocaleTimeString('en-US', {
                                    hour12: false,
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                })}
                            </span>
                            Processing...
                        </div>
                    )}
                </div>

                {/* Close hint */}
                {status !== 'pending' && (
                    <div className="mt-2 text-gray-500 text-xs font-mono">
                        Click anywhere to dismiss
                    </div>
                )}
            </div>
        </div>
    );
}

export default TransactionOverlay;
