/**
 * Ícones de traço, em SVG.
 *
 * Substituem os emoji que estavam no cabeçalho. Emoji parece atalho
 * barato e cobra caro: cada sistema desenha o seu (o 👤 sai azul no
 * iOS e cinza no Android), não obedecem currentColor, têm pesos de
 * traço diferentes entre si, e não dá para alinhar opticamente um
 * conjunto que nem foi desenhado junto. No print do celular o ícone
 * de conta aparecia azul no meio de uma paleta âmbar e navy.
 *
 * Traço de 1.7 e caixa de 24 para todos: é o que faz os três lerem
 * como uma família.
 */

type Props = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false as const,
});

export function IconMenu({ size = 22, className }: Props) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
    </svg>
  );
}

export function IconUser({ size = 21, className }: Props) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20c.7-3.7 3.7-5.8 7.2-5.8s6.5 2.1 7.2 5.8" />
    </svg>
  );
}

export function IconHeart({ size = 21, className, filled = false }: Props & { filled?: boolean }) {
  return (
    <svg {...base(size)} className={className} fill={filled ? "currentColor" : "none"}>
      <path d="M12 20.2s-7.4-4.4-7.4-9.4A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.4 3.2c0 5-7.4 9.4-7.4 9.4Z" />
    </svg>
  );
}

export function IconCart({ size = 21, className }: Props) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2.8 3.6h2.3l2.2 10.6h9.6l2.1-7.5H6.2" />
      <circle cx="9.4" cy="19" r="1.5" />
      <circle cx="16.6" cy="19" r="1.5" />
    </svg>
  );
}

export function IconSearch({ size = 20, className }: Props) {
  return (
    <svg {...base(size)} className={className} strokeWidth={2}>
      <circle cx="10.6" cy="10.6" r="6.4" />
      <path d="m15.4 15.4 4.3 4.3" />
    </svg>
  );
}

export function IconClose({ size = 18, className }: Props) {
  return (
    <svg {...base(size)} className={className} strokeWidth={2}>
      <path d="m5.5 5.5 13 13M18.5 5.5l-13 13" />
    </svg>
  );
}

export function IconTrash({ size = 17, className }: Props) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.5 6.6h15M9.4 6.6V4.8h5.2v1.8M6.6 6.6l.9 12.1h9l.9-12.1M10.3 10v5.4M13.7 10v5.4" />
    </svg>
  );
}

/** Âncora da marca. Fica aqui para o logotipo ter uma casa só. */
export function IconAnchor({ size = 21, className }: Props) {
  return (
    <svg {...base(size)} className={className} strokeWidth={1.9}>
      <path d="M12 6.4v13.2M12 6.4a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM7.6 9.2h8.8M4 13.4c0 4 3.6 6.2 8 6.2s8-2.2 8-6.2M4 13.4H6.6M20 13.4h-2.6" />
    </svg>
  );
}
