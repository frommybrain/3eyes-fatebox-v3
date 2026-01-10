'use client';

import DegenCard from './DegenCard';
import DegenButton from './DegenButton';

export default function DegenEmptyState({
    icon = null,
    title,
    description,
    action = null,
    actionHref,
    actionOnClick,
    className = '',
}) {
    return (
        <DegenCard variant="default" padding="lg" className={`text-center ${className}`}>
            {icon && (
                <div className="text-4xl mb-3">{icon}</div>
            )}
            <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-2">
                {title}
            </h2>
            {description && (
                <p className="text-degen-text-muted text-sm mb-4">
                    {description}
                </p>
            )}
            {action && (
                <DegenButton
                    variant="primary"
                    href={actionHref}
                    onClick={actionOnClick}
                >
                    {action}
                </DegenButton>
            )}
        </DegenCard>
    );
}
