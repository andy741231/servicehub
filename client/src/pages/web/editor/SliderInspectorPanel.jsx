import { useEditor } from '@craftjs/core';
import { X, SlidersHorizontal } from 'lucide-react';
import { SliderBlockEditor } from './editorComponents';

/**
 * SliderInspectorPanel — right-hand inspector that shows the slider block's
 * settings when a slider block is selected in the Craft.js canvas.
 *
 * Lives inside <WebCraftRoot> so it can use the Craft.js useEditor hook.
 * When no slider is selected, the panel renders nothing.
 */
export default function SliderInspectorPanel() {
  const { selectedNodeId, actions, query } = useEditor((state) => ({
    selectedNodeId: state.events.selected.values().next().value || null,
  }));

  const selectedNodeData = (() => {
    if (!selectedNodeId) return null;
    try {
      const node = query.node(selectedNodeId).get();
      return node?.data || null;
    } catch {
      return null;
    }
  })();

  const isSelectedSlider = (() => {
    if (!selectedNodeData) return false;
    return selectedNodeData.name === 'SliderBlock' ||
      selectedNodeData.displayName === 'SliderBlock' ||
      selectedNodeData.type?.displayName === 'SliderBlock';
  })();

  const selectedContent = selectedNodeData?.props?.content || null;

  const handleChange = (updates) => {
    if (!selectedNodeId) return;
    actions.setProp(selectedNodeId, (props) => {
      props.content = { ...(props.content || {}), ...updates };
    });
  };

  const handleClose = () => {
    if (selectedNodeId) actions.selectNode(null);
  };

  if (!isSelectedSlider) return null;

  const slideCount = selectedContent?.slides?.length || 1;

  return (
    <aside
      aria-label="Slider block settings"
      className="w-[380px] shrink-0 border-l border-border bg-surface h-screen sticky top-0 overflow-y-auto shadow-card-sm"
    >
      <div className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-text-base">Slider inspector</h2>
            <p className="text-xs text-subtle">{slideCount} slide{slideCount === 1 ? '' : 's'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close inspector"
          title="Close inspector"
          className="p-2 rounded-base hover:bg-surface-raised transition-colors text-muted hover:text-text-base"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        <SliderBlockEditor
          block={{ type: 'slider', content: selectedContent || {} }}
          onChange={handleChange}
        />
      </div>
    </aside>
  );
}
