// @flow

import ReactSwitch from 'react-switch';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
  ariaLabel: string;
  onColor?: string;
  onHandleColor?: string;
  offColor?: string;
  offHandleColor?: string;
};

function Switch({
  checked = false,
  onChange = () => {},
  disabled = false,
  ariaLabel = '',
  onColor = '#38a6ee',
  onHandleColor = '#0071bb',
  offColor = '#888',
  offHandleColor = '#fff',
}: Props) {
  return (
    <ReactSwitch
      checked={checked}
      onChange={onChange}
      onColor={onColor}
      onHandleColor={onHandleColor}
      offColor={offColor}
      offHandleColor={offHandleColor}
      handleDiameter={18}
      uncheckedIcon={false}
      checkedIcon={false}
      boxShadow="0 1px 5px rgba(0, 0, 0, 0.6)"
      activeBoxShadow="0 0 1px 10px rgba(0, 0, 0, 0.2)"
      width={32}
      height={12}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-checked={checked}
    />
  );
}

// all default prop are set here just to satisfy flow,
// even though they’re all passed as a default function params
Switch.defaultProps = {
  checked: false,
  onChange: () => {},
  disabled: false,
};

export default Switch;
