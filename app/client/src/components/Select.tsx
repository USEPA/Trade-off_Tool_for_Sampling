import ReactSelect, { Props } from 'react-select';

// --- components (Publish) ---
function Select({ ...props }: Props) {
  return (
    <ReactSelect
      {...props}
      // ensures the entire select menu is visible and closes open
      // select menus when the user scrolls any parent components
      classNamePrefix="select"
      menuPosition="fixed"
      closeMenuOnScroll={(e: any) =>
        !e?.target?.classList?.contains?.('select__menu-list')
      }
    />
  );
}

export default Select;
