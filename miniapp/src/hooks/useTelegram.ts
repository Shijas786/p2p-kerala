import { useEffect, useCallback } from 'react';
import { getTelegramWebApp, type TelegramWebApp } from '../lib/telegram';

export function useTelegram() {
    const webapp = getTelegramWebApp();

    const showBackButton = useCallback((onBack: () => void) => {
        if (!webapp) return;
        webapp.BackButton.show();
        webapp.BackButton.onClick(onBack);
        return () => {
            webapp.BackButton.offClick(onBack);
            webapp.BackButton.hide();
        };
    }, [webapp]);

    const hideBackButton = useCallback(() => {
        webapp?.BackButton.hide();
    }, [webapp]);

    const showMainButton = useCallback((text: string, onClick: () => void) => {
        if (!webapp) return;
        webapp.MainButton.setText(text);
        webapp.MainButton.color = '#84cc16';
        webapp.MainButton.textColor = '#050505';
        webapp.MainButton.onClick(onClick);
        webapp.MainButton.show();
        return () => {
            webapp.MainButton.offClick(onClick);
            webapp.MainButton.hide();
        };
    }, [webapp]);

    const hideMainButton = useCallback(() => {
        webapp?.MainButton.hide();
    }, [webapp]);

    const haptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection') => {
        if (!webapp) return;
        if (type === 'selection') {
            webapp.HapticFeedback.selectionChanged();
        } else if (['success', 'error', 'warning'].includes(type)) {
            webapp.HapticFeedback.notificationOccurred(type as any);
        } else {
            webapp.HapticFeedback.impactOccurred(type as any);
        }
    }, [webapp]);

    const close = useCallback(() => {
        webapp?.close();
    }, [webapp]);

    return {
        webapp,
        showBackButton,
        hideBackButton,
        showMainButton,
        hideMainButton,
        haptic,
        close,
        platform: webapp?.platform ?? 'unknown',
        isExpanded: webapp?.isExpanded ?? false,
    };
}
