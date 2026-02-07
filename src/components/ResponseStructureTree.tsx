import { useState } from 'react';
import styled from 'styled-components';
import { themeColors, type ThemeName } from '../constants/themeColors';

const MAX_DEPTH = 5;

const StyledTree = styled.div<{ $theme: ThemeName }>`
  font-size: 0.85rem;
  font-family: ui-monospace, monospace;
  background: ${(p) => themeColors[p.$theme].bg};
  border: 1px solid ${(p) => themeColors[p.$theme].borderColor};
  border-radius: 6px;
  padding: 0.5rem;
  max-height: 280px;
  overflow-y: auto;
`;

const StyledRow = styled.button<{ $theme: ThemeName; $depth: number }>`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  padding: 0.2rem 0.4rem;
  padding-left: ${(p) => p.$depth * 12 + 4}px;
  text-align: left;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${(p) => themeColors[p.$theme].text};
  cursor: pointer;

  &:hover {
    background: ${(p) => themeColors[p.$theme].primary};
    color: white;

    .type-badge {
      opacity: 0.9;
    }
  }
`;

const TypeBadge = styled.span<{ $theme: ThemeName }>`
  font-size: 0.7rem;
  padding: 0 4px;
  border-radius: 3px;
  background: ${(p) => themeColors[p.$theme].borderColor};
  color: ${(p) => themeColors[p.$theme].textSecondary};
  margin-left: auto;
  flex-shrink: 0;
`;

const ExpandIcon = styled.span<{ $open: boolean }>`
  display: inline-block;
  width: 14px;
  text-align: center;
  transform: ${(p) => (p.$open ? 'rotate(90deg)' : 'none')};
`;

interface ResponseStructureTreeProps {
  data: unknown;
  theme: ThemeName;
  onSelectPath: (path: string) => void;
}

function getTypeLabel(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') return 'Object';
  return typeof value;
}

function TreeNode({
  name,
  path,
  value,
  depth,
  theme,
  onSelectPath
}: {
  name: string;
  path: string;
  value: unknown;
  depth: number;
  theme: ThemeName;
  onSelectPath: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isExpandable =
    (Array.isArray(value) && value.length > 0) ||
    (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value as object).length > 0);
  const typeLabel = getTypeLabel(value);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const clickedExpand = (e.target as HTMLElement).closest('.expand');
    if (isExpandable && clickedExpand) {
      setOpen((o) => !o);
    } else {
      onSelectPath(displayPath || name);
    }
  };

  if (depth > MAX_DEPTH) return null;

  const displayPath = path || name;

  return (
    <div>
      <StyledRow $theme={theme} $depth={depth} type="button" onClick={handleClick} title={`Путь: ${displayPath || name}`}>
        {isExpandable ? (
          <ExpandIcon className="expand" $open={open}>
            ▶
          </ExpandIcon>
        ) : (
          <span style={{ width: 14, display: 'inline-block' }} />
        )}
        <span style={{ fontWeight: 600 }}>{name}</span>
        <TypeBadge className="type-badge" $theme={theme}>
          {typeLabel}
        </TypeBadge>
      </StyledRow>
      {open && isExpandable && (
        <div style={{ marginLeft: 8 }}>
          {Array.isArray(value) ? (
            value.slice(0, 3).map((item, i) => (
              <TreeNode
                key={i}
                name={`[${i}]`}
                path={`${path}[${i}]`}
                value={item}
                depth={depth + 1}
                theme={theme}
                onSelectPath={onSelectPath}
              />
            ))
          ) : typeof value === 'object' && value !== null ? (
            Object.entries(value as Record<string, unknown>).map(([k, v]) => (
              <TreeNode
                key={k}
                name={k}
                path={path ? `${path}.${k}` : k}
                value={v}
                depth={depth + 1}
                theme={theme}
                onSelectPath={onSelectPath}
              />
            ))
          ) : null}
          {Array.isArray(value) && value.length > 3 && (
            <StyledRow $theme={theme} $depth={depth + 1} type="button" style={{ cursor: 'default', fontWeight: 400 }}>
              … ещё {value.length - 3}
            </StyledRow>
          )}
        </div>
      )}
    </div>
  );
}

export function ResponseStructureTree({ data, theme, onSelectPath }: ResponseStructureTreeProps) {
  if (data === null || data === undefined) {
    return (
      <StyledTree $theme={theme}>
        <div style={{ color: themeColors[theme].textSecondary }}>Нет данных</div>
      </StyledTree>
    );
  }

  if (typeof data !== 'object') {
    return (
      <StyledTree $theme={theme}>
        <div style={{ color: themeColors[theme].textSecondary }}>Примитив: {String(data)}</div>
      </StyledTree>
    );
  }

  const entries = Array.isArray(data)
    ? data.map((item, i) => ({ key: `[${i}]`, path: `[${i}]`, value: item }))
    : Object.entries(data as Record<string, unknown>).map(([key, value]) => ({ key, path: key, value }));

  return (
    <StyledTree $theme={theme}>
      <div style={{ marginBottom: 4, color: themeColors[theme].textSecondary, fontSize: '0.8rem' }}>
        Клик по полю — подставить путь в маппинг
      </div>
      {entries.map(({ key, path, value }) => (
        <TreeNode
          key={key}
          name={key}
          path={path}
          value={value}
          depth={0}
          theme={theme}
          onSelectPath={onSelectPath}
        />
      ))}
    </StyledTree>
  );
}
