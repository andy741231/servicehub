/**
 * Shared API surface for Craft.js components to reach WebEditor actions.
 * Used because Craft.js Frame does not preserve React context across its
 * internal render boundary. WebCraftRoot updates this ref; SectionBlock and
 * other Craft components can read it synchronously inside event handlers.
 */
export const craftEditorApiRef = {
  current: {
    onAddSectionBelow: () => {},
    onAddBlock: () => {},
    onDeleteSection: () => {},
    onDuplicateSection: () => {},
  },
};

export const setCraftEditorApi = (api) => {
  craftEditorApiRef.current = { ...craftEditorApiRef.current, ...api };
};

export const getCraftEditorApi = () => craftEditorApiRef.current;
