import { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  listSavedConfigs,
  deleteFromLocalStorage,
  renameInLocalStorage
} from '../utils/chartBuilderUtils';

const StyledOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const StyledModalContent = styled.div<{ $large?: boolean }>`
  background: var(--card-bg, #fff);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: ${(p) => (p.$large ? '800px' : '600px')};
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const StyledModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
`;

const StyledModalHeaderH2 = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-color, #333);
`;

const StyledModalClose = styled.button`
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-color, #f5f5f5);
    color: var(--text-color, #333);
  }
`;

const StyledModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const StyledModalSearch = styled.input`
  width: 100%;
  padding: 0.5rem;
  font-size: 0.9rem;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  margin-bottom: 1rem;
  background: var(--card-bg, #fff);
  color: var(--text-color, #333);

  &:focus {
    outline: none;
    border-color: var(--primary-color, #007aff);
    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
  }
`;

const StyledModalEmpty = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary, #666);
`;

const StyledModalList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const StyledModalListItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  margin-bottom: 0.5rem;
  background: var(--card-bg, #fff);
`;

const StyledModalListItemInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StyledModalListItemName = styled.span`
  font-weight: 500;
  color: var(--text-color, #333);
`;

const StyledModalListItemDate = styled.span`
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
`;

const StyledModalListItemActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const StyledModalActionBtn = styled.button<{ $danger?: boolean }>`
  background: var(--card-bg, #fff);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-color, #f5f5f5);
    border-color: var(--primary-color, #007aff);
  }

  ${(p) =>
    p.$danger &&
    `
    &:hover {
      background: #ff3b30;
      border-color: #ff3b30;
      color: white;
    }
  `}
`;

const StyledModalRename = styled.div`
  display: flex;
  gap: 0.5rem;
  width: 100%;
`;

const StyledModalRenameInput = styled.input`
  flex: 1;
  padding: 0.5rem;
  font-size: 0.9rem;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  background: var(--card-bg, #fff);
  color: var(--text-color, #333);
`;

const StyledModalRenameBtn = styled.button`
  padding: 0.5rem;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  background: var(--card-bg, #fff);
  color: var(--text-color, #333);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-color, #f5f5f5);
    border-color: var(--primary-color, #007aff);
  }
`;

interface SavedConfigsModalProps {
  onClose: () => void;
  onLoad: (name: string) => void;
}

export function SavedConfigsModal({ onClose, onLoad }: SavedConfigsModalProps) {
  const [configs, setConfigs] = useState<Array<{ name: string; savedAt: string }>>(listSavedConfigs);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const handleLoad = useCallback((name: string) => {
    onLoad(name);
  }, [onLoad]);

  const handleDelete = useCallback((name: string) => {
    if (confirm(`Удалить конфигурацию "${name}"?`)) {
      try {
        deleteFromLocalStorage(name);
        setConfigs(listSavedConfigs());
      } catch (error) {
        alert(`Ошибка удаления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    }
  }, []);

  const handleRename = useCallback((oldName: string) => {
    setEditingName(oldName);
    setNewName(oldName);
  }, []);

  const handleSaveRename = useCallback(() => {
    if (editingName && newName && newName !== editingName) {
      try {
        renameInLocalStorage(editingName, newName);
        setConfigs(listSavedConfigs());
        setEditingName(null);
        setNewName('');
      } catch (error) {
        alert(`Ошибка переименования: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    }
  }, [editingName, newName]);

  const handleCancelRename = useCallback(() => {
    setEditingName(null);
    setNewName('');
  }, []);

  const filteredConfigs = configs.filter(config =>
    config.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <StyledOverlay onClick={onClose}>
      <StyledModalContent onClick={(e) => e.stopPropagation()}>
        <StyledModalHeader>
          <StyledModalHeaderH2>Сохраненные конфигурации</StyledModalHeaderH2>
          <StyledModalClose type="button" onClick={onClose}>×</StyledModalClose>
        </StyledModalHeader>
        <StyledModalBody>
          <StyledModalSearch
            type="text"
            placeholder="Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {filteredConfigs.length === 0 ? (
            <StyledModalEmpty>
              {searchTerm ? 'Ничего не найдено' : 'Нет сохраненных конфигураций'}
            </StyledModalEmpty>
          ) : (
            <StyledModalList>
              {filteredConfigs.map((config) => (
                <StyledModalListItem key={config.name}>
                  {editingName === config.name ? (
                    <StyledModalRename>
                      <StyledModalRenameInput
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        autoFocus
                      />
                      <StyledModalRenameBtn type="button" onClick={handleSaveRename}>
                        ✓
                      </StyledModalRenameBtn>
                      <StyledModalRenameBtn type="button" onClick={handleCancelRename}>
                        ✕
                      </StyledModalRenameBtn>
                    </StyledModalRename>
                  ) : (
                    <>
                      <StyledModalListItemInfo>
                        <StyledModalListItemName>{config.name}</StyledModalListItemName>
                        {config.savedAt && (
                          <StyledModalListItemDate>
                            {new Date(config.savedAt).toLocaleString()}
                          </StyledModalListItemDate>
                        )}
                      </StyledModalListItemInfo>
                      <StyledModalListItemActions>
                        <StyledModalActionBtn
                          type="button"
                          onClick={() => handleLoad(config.name)}
                          title="Загрузить"
                        >
                          📂
                        </StyledModalActionBtn>
                        <StyledModalActionBtn
                          type="button"
                          onClick={() => handleRename(config.name)}
                          title="Переименовать"
                        >
                          ✏️
                        </StyledModalActionBtn>
                        <StyledModalActionBtn
                          type="button"
                          $danger
                          onClick={() => handleDelete(config.name)}
                          title="Удалить"
                        >
                          🗑️
                        </StyledModalActionBtn>
                      </StyledModalListItemActions>
                    </>
                  )}
                </StyledModalListItem>
              ))}
            </StyledModalList>
          )}
        </StyledModalBody>
      </StyledModalContent>
    </StyledOverlay>
  );
}
