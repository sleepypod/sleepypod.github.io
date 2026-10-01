const paths = {
  right: 'M5 12h14M13 6l6 6-6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  external: 'M7 17 17 7M8 7h9v9',
}

export type LinkArrowDirection = keyof typeof paths

export function LinkArrow({ direction = 'right' }: { direction?: LinkArrowDirection }) {
  return (
    <svg
      className="link-arrow"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[direction]} />
    </svg>
  )
}
