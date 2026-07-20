import { useRef, useEffect, useState } from 'react';
import Moveable from 'react-moveable';
import { useNode } from '@craftjs/core';

/**
 * MoveableWrapper — wraps a Craft.js block with react-moveable resize handles.
 * Only shows resize handles when the node is selected.
 *
 * Usage:
 *   <MoveableWrapper>
 *     <BlockContent ... />
 *   </MoveableWrapper>
 */
export default function MoveableWrapper({ children, resizable = true }) {
  const {
    connectors: { connect, drag },
    actions: { setProp },
    selected,
    hovered,
  } = useNode((node) => ({
    selected: node.events.selected,
    hovered: node.events.hovered,
  }));

  const targetRef = useRef(null);
  const [targetEl, setTargetEl] = useState(null);

  useEffect(() => {
    if (targetRef.current && selected) {
      setTargetEl(targetRef.current);
    } else {
      setTargetEl(null);
    }
  }, [selected]);

  return (
    <div
      ref={(ref) => connect(drag(ref))}
      className={`relative outline-none ${selected ? 'ring-2 ring-primary' : hovered ? 'ring-1 ring-primary/40' : ''}`}
    >
      <div ref={targetRef} style={{ width: '100%' }}>
        {children}
      </div>
      {targetEl && resizable && (
        <Moveable
          target={targetEl}
          resizable
          keepRatio={false}
          throttleResize={0}
          renderDirections={['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']}
          onResizeStart={(e) => {
            e.setMin([50, 20]);
          }}
          onResize={(e) => {
            const el = e.target;
            el.style.width = `${e.width}px`;
            el.style.height = `${e.height}px`;
          }}
          onResizeEnd={(e) => {
            const el = e.target;
            const w = parseFloat(el.style.width) || el.offsetWidth;
            const h = parseFloat(el.style.height) || el.offsetHeight;
            setProp((props) => {
              if (!props.content) props.content = {};
              props.content._width = w;
              props.content._height = h;
            });
          }}
        />
      )}
    </div>
  );
}
