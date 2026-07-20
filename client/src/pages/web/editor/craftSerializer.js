/**
 * craftSerializer.js - DB shape <-> Craft.js serialized nodes
 * Craft.js node.type is { resolvedName: "ComponentName" }.
 */

function typeName(blockType) {
  if (!blockType) return "TextBlock";
  const pascal = String(blockType)
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  return pascal.endsWith("Block") ? pascal : pascal + "Block";
}

function resolved(name) {
  return { resolvedName: name };
}

function readResolved(type) {
  if (!type) return "";
  if (typeof type === "string") return type;
  return type.resolvedName || "";
}

export function fromDb(pageData) {
  const sections = pageData.sections || [];
  const nodes = {};
  const rootChildren = [];

  sections.forEach((section, sIdx) => {
    const sectionNodeId = section.id || ("section-" + sIdx);
    const blockChildren = [];

    (section.blocks || []).forEach((block, bIdx) => {
      const blockNodeId = block.id || ("block-" + sIdx + "-" + bIdx);
      blockChildren.push(blockNodeId);
      nodes[blockNodeId] = {
        type: resolved(typeName(block.type)),
        isCanvas: false,
        props: {
          content: block.content || {},
          blockType: block.type,
          id: block.id,
          order: bIdx,
        },
        parent: sectionNodeId,
        displayName: block.type,
        custom: {},
        hidden: false,
        nodes: [],
        linkedNodes: {},
      };
    });

    rootChildren.push(sectionNodeId);
    nodes[sectionNodeId] = {
      type: resolved("SectionBlock"),
      isCanvas: true,
      props: {
        id: section.id,
        columns: section.columns || 1,
        gap: section.gap ?? 24,
        paddingTop: section.paddingTop ?? 48,
        paddingBottom: section.paddingBottom ?? 48,
        paddingLeft: section.paddingLeft ?? 0,
        paddingRight: section.paddingRight ?? 0,
        marginTop: section.marginTop ?? 0,
        marginBottom: section.marginBottom ?? 0,
        backgroundColor: section.backgroundColor || "",
        backgroundImage: section.backgroundImage || "",
        minHeight: section.minHeight || "",
        order: sIdx,
      },
      parent: "ROOT",
      displayName: "Section " + (sIdx + 1),
      custom: {},
      hidden: false,
      nodes: blockChildren,
      linkedNodes: {},
    };
  });

  nodes.ROOT = {
    type: resolved("Document"),
    isCanvas: true,
    props: {},
    parent: null,
    displayName: "Document",
    custom: {},
    hidden: false,
    nodes: rootChildren,
    linkedNodes: {},
  };

  return nodes;
}

export function toDb(craftNodes) {
  const rootNode = craftNodes.ROOT;
  if (!rootNode) return { sections: [] };

  const sections = (rootNode.nodes || [])
    .map(function (sectionNodeId, sIdx) {
      const sectionNode = craftNodes[sectionNodeId];
      if (!sectionNode) return null;

      const blocks = (sectionNode.nodes || [])
        .map(function (blockNodeId, bIdx) {
          const blockNode = craftNodes[blockNodeId];
          if (!blockNode) return null;
          const resolvedType = readResolved(blockNode.type);
          const fromName = resolvedType
            .replace(/Block$/, "")
            .replace(/([a-z])([A-Z])/g, "$1-$2")
            .toLowerCase();

          return {
            id: (blockNode.props && blockNode.props.id) || blockNodeId,
            type: (blockNode.props && blockNode.props.blockType) || fromName,
            order: bIdx,
            content: (blockNode.props && blockNode.props.content) || {},
          };
        })
        .filter(Boolean);

      const p = sectionNode.props || {};
      return {
        id: p.id || sectionNodeId,
        columns: p.columns || 1,
        gap: p.gap ?? 24,
        paddingTop: p.paddingTop ?? 48,
        paddingBottom: p.paddingBottom ?? 48,
        paddingLeft: p.paddingLeft ?? 0,
        paddingRight: p.paddingRight ?? 0,
        marginTop: p.marginTop ?? 0,
        marginBottom: p.marginBottom ?? 0,
        backgroundColor: p.backgroundColor || null,
        backgroundImage: p.backgroundImage || "",
        minHeight: p.minHeight || "",
        order: sIdx,
        blocks: blocks,
      };
    })
    .filter(Boolean);

  return { sections: sections };
}