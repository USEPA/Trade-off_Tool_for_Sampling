/** @jsxImportSource @emotion/react */

import React, { ReactNode } from 'react';
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
  children: ReactNode;
};

function AccordionItem({
  title,
  initiallyExpanded = false,
  children,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = React.useState(initiallyExpanded);

  return (
    <div css={accordionItemContainer}>
      <header
        tabIndex={0}
        css={headerStyles}
        onClick={(ev) => {
          setIsOpen(!isOpen);
        }}
        onKeyUp={(ev) => {
          if (ev.key === 'Enter') {
            setIsOpen(!isOpen);
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
