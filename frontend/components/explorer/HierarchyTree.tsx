'use client';

import { useState } from 'react';
import { TreeNode } from './explorerUtils';

const TYPE_ICON: Record<string, string> = {
  IfcProject: '◆',
  IfcSite: '⬢',
  IfcBuilding: '▣',
  IfcBuildingStorey: '▤',
  IfcSpace: '▢',
};

interface HierarchyTreeProps {
  root: TreeNode | null;
  activeStoreyId: string;
  activeSpaceId: string;
  onSelectStorey: (id: string) => void;
  onSelectSpace: (id: string) => void;
}

export function HierarchyTree({
  root,
  activeStoreyId,
  activeSpaceId,
  onSelectStorey,
  onSelectSpace,
}: HierarchyTreeProps) {
  if (!root) {
    return <div className="tree-empty">Hiérarchie indisponible.</div>;
  }

  return (
    <div className="tree-root">
      <TreeItem
        node={root}
        depth={0}
        activeStoreyId={activeStoreyId}
        activeSpaceId={activeSpaceId}
        onSelectStorey={onSelectStorey}
        onSelectSpace={onSelectSpace}
      />
    </div>
  );
}

function TreeItem({
  node,
  depth,
  activeStoreyId,
  activeSpaceId,
  onSelectStorey,
  onSelectSpace,
}: {
  node: TreeNode;
  depth: number;
  activeStoreyId: string;
  activeSpaceId: string;
  onSelectStorey: (id: string) => void;
  onSelectSpace: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  const isSelected =
    (node.ifc_type === 'IfcBuildingStorey' && activeStoreyId === node.id) ||
    (node.ifc_type === 'IfcSpace' && activeSpaceId === node.id);

  const handleClick = () => {
    if (node.ifc_type === 'IfcBuildingStorey') {
      onSelectStorey(activeStoreyId === node.id ? 'all' : node.id);
      onSelectSpace('all');
    } else if (node.ifc_type === 'IfcSpace') {
      onSelectSpace(activeSpaceId === node.id ? 'all' : node.id);
    } else if (hasChildren) {
      setExpanded((v) => !v);
    }
  };

  return (
    <div className="tree-node">
      <button
        type="button"
        className={`tree-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <span
            className="tree-caret"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? '▾' : '▸'}
          </span>
        ) : (
          <span className="tree-caret tree-caret-empty" />
        )}
        <span className="tree-icon">{TYPE_ICON[node.ifc_type] || '•'}</span>
        <span className="tree-label">{node.name}</span>
      </button>
      {hasChildren && expanded && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeStoreyId={activeStoreyId}
              activeSpaceId={activeSpaceId}
              onSelectStorey={onSelectStorey}
              onSelectSpace={onSelectSpace}
            />
          ))}
        </div>
      )}
    </div>
  );
}
