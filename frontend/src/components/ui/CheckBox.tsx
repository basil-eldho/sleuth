interface CheckBoxProps {
  checked: boolean;
  onChange: () => void;
}

export function CheckBox({ checked, onChange }: CheckBoxProps) {
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={[
        'inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm cursor-pointer shrink-0',
        'text-2xs leading-none border transition-colors duration-100',
        checked
          ? 'bg-green border-green text-bg'
          : 'bg-transparent border-border3 text-transparent',
      ].join(' ')}
    >
      {checked ? '✓' : ''}
    </span>
  );
}
