import { useNode } from '@craftjs/core';
import BlockContent from '../BlockContent';
import { makeDefaultBlockContent } from '../editorUtils';
import MoveableWrapper from './MoveableWrapper';
import EditableText from './EditableText';

export default function SplitBannerBlock({ content, blockType, id, order }) {
  const {
    actions: { setProp },
  } = useNode();

  const block = {
    id,
    type: blockType || 'split-banner',
    content: content || {},
    order,
  };

  return (
    <MoveableWrapper>
      <BlockContent
        block={block}
        EditableText={EditableText}
        EditableButton={({ text, href, onChange, className }) => (
          <button type="button" className={className} onClick={() => onChange?.({ text, href })}>
            {text || 'Button'}
          </button>
        )}
        EditableImage={({ src, onChange, className, style }) => (
          <img src={src || ''} alt="" className={className} style={style} onClick={() => onChange?.(src)} />
        )}
        onUpdateContent={(updates) =>
          setProp((props) => {
            props.content = { ...(props.content || {}), ...updates };
          })
        }
        onUpdateBlock={(updates) =>
          setProp((props) => {
            Object.assign(props, updates);
          })
        }
      />
    </MoveableWrapper>
  );
}

SplitBannerBlock.craft = {
  displayName: 'SplitBannerBlock',
  props: {
    content: makeDefaultBlockContent('split-banner'),
    blockType: 'split-banner',
    id: '',
    order: 0,
  },
  rules: {
    canDrag: () => true,
  },
};