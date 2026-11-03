import { createContext } from 'react';

/**
 * When true (exam figures), on-frame labels, panels and badges are hidden so a
 * frame can be used as a question figure without giving the answer away.
 */
export const CleanFrameContext = createContext(false);
