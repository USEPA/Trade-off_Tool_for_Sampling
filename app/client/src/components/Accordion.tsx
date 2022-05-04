/** @jsxImportSource @emotion/react */

import React, { ReactNode, useEffect, useState } from 'react';
import { css } from '@emotion/react';

// --- styles (AccordionList) ---
const accordionListContainer = css`
  border-bottom: 1px solid #d8dfe2;
`;

// --- components (AccordionList) ---
type AccordionListProps = {
  children: ReactNode;
};

function AccordionList({ children }: AccordionListProps) {
  return <div css={accordionListContainer}>{children}</div>;
}

// --- styles (AccordionItem) ---
const accordionItemContainer = css`
  border-top: 1px solid #d8dfe2;
`;

const headerStyles = css`
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  justify-content: space-between;
  padding: 0.75em 0.875em;
  cursor: pointer;

  &:hover,
  &:focus {
    background-color: #f0f6f9;
  }

  .fa-angle-down {
    margin-right: 0.75em;
  }

  .fa-angle-right {
    margin-right: 0.875em;
  }
`;

const textStyles = css`
  flex: 1;
  padding-bottom: 0;
  word-break: break-word;
`;

const arrow = css`
  font-size: 1.25em;
  color: #526571;
`;

// --- components (AccordionItem) ---
type AccordionItemProps = {
  title: ReactNode;
  initiallyExpanded?: boolean;
  isOpenParam?: boolean;
  onChange?: (isOpen: boolean) => void;
  children: ReactNode;
};

function AccordionItem({
  title,
  initiallyExpanded = false,
  isOpenParam,
  onChange = () => {},
  children,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(initiallyExpanded);

  useEffect(() => {
    if (isOpenParam === undefined || isOpen === isOpenParam) return;

    setIsOpen(isOpenParam);
  }, [isOpen, isOpenParam]);

  return (
    <div css={accordionItemContainer}>
      <header
        tabIndex={0}
        css={headerStyles}
        onClick={(ev) => {
          const newIsOpen = !isOpen;
          setIsOpen(newIsOpen);
          onChange(newIsOpen);
        }}
        onKeyUp={(ev) => {
          if (ev.key === 'Enter') {
            const newIsOpen = !isOpen;
            setIsOpen(newIsOpen);
            onChange(newIsOpen);
          }
        }}
      >
        <i css={arrow} className={`fa fa-angle-${isOpen ? 'down' : 'right'}`} />
        <span css={textStyles}>{title}</span>
      </header>

      {isOpen && children}
    </div>
  );
}

export { AccordionList, AccordionItem };
