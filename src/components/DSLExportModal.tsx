import { useCallback } from 'react';
import styled from 'styled-components';

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

const StyledModalContent = styled.div`
  background: var(--card-bg, #fff);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: 800px;
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

const StyledExportActions = styled.div`
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-end;
`;

const StyledExportPrimaryBtn = styled.button`
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  border: 1px solid var(--primary-color, #007aff);
  border-radius: 4px;
  background: var(--primary-color, #007aff);
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #0056b3;
  }
`;

const StyledExportCode = styled.pre`
  background: var(--code-bg, #1e1e1e);
  color: var(--code-color, #d4d4d4);
  padding: 1.5rem;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
  max-height: 60vh;
  overflow-y: auto;

  code {
    color: inherit;
    font-family: inherit;
  }
`;

interface DSLExportModalProps {
  code: string;
  onClose: () => void;
}

export function DSLExportModal({ code, onClose }: DSLExportModalProps) {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      alert('Код скопирован в буфер обмена');
    }).catch(() => {
      alert('Не удалось скопировать код');
    });
  }, [code]);

  return (
    <StyledOverlay onClick={onClose}>
      <StyledModalContent onClick={(e) => e.stopPropagation()}>
        <StyledModalHeader>
          <StyledModalHeaderH2>Экспорт DSL кода</StyledModalHeaderH2>
          <StyledModalClose type="button" onClick={onClose}>×</StyledModalClose>
        </StyledModalHeader>
        <StyledModalBody>
          <StyledExportActions>
            <StyledExportPrimaryBtn type="button" onClick={handleCopy}>
              📋 Копировать
            </StyledExportPrimaryBtn>
          </StyledExportActions>
          <StyledExportCode>
            <code>{code}</code>
          </StyledExportCode>
        </StyledModalBody>
      </StyledModalContent>
    </StyledOverlay>
  );
}
