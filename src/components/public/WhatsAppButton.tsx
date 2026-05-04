import { useEffect, useState } from "react";

type Props = { phone?: string; message?: string };

// TODO: trocar pelo número oficial. Formato internacional, sem +, espaços ou traços.
const DEFAULT_PHONE = "5547999999999";

export const WhatsAppButton = ({
  phone = DEFAULT_PHONE,
  message = "Olá! Gostaria de falar com a Lange Construções.",
}: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 240);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className={`fixed bottom-6 right-6 z-[60] flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-elevated transition-all duration-500 hover:scale-110 hover:shadow-glow focus:outline-none focus:ring-4 focus:ring-[#25D366]/40 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-30" aria-hidden="true" />
      <svg viewBox="0 0 32 32" className="relative size-7" fill="currentColor" aria-hidden="true">
        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.345 0 1.318-.03 1.318-.5 0-.43-.616-.688-.974-.688-.158 0-.302.043-.487.043-.158 0-.158-.057-.158-.072-.014.014-.014-.014-.014-.014-.072.014-.072 0-.072 0-.014.014-.014.014 0 0zM16.001 6.5c-5.247 0-9.5 4.253-9.5 9.5 0 1.795.5 3.474 1.367 4.906L6.5 25.5l4.79-1.255A9.46 9.46 0 0 0 16 25.5c5.247 0 9.5-4.253 9.5-9.5S21.247 6.5 16 6.5zm5.586 13.527c-.236.66-1.388 1.262-1.94 1.346-.495.075-1.123.107-1.812-.114-.418-.133-.954-.31-1.64-.605-2.886-1.246-4.77-4.151-4.913-4.343-.143-.193-1.171-1.557-1.171-2.97 0-1.412.74-2.106 1.003-2.395.262-.288.572-.36.763-.36.19 0 .381.002.547.01.176.008.41-.066.642.49.236.572.804 1.978.873 2.122.07.143.117.31.024.503-.094.193-.142.31-.28.477-.14.166-.293.371-.418.498-.14.14-.285.29-.122.57.163.28.726 1.198 1.56 1.94 1.071.957 1.974 1.253 2.255 1.392.282.14.446.117.61-.07.165-.187.703-.82.89-1.103.187-.282.374-.235.63-.14.257.094 1.624.766 1.903.906.28.14.466.21.535.327.07.117.07.679-.166 1.339z" />
      </svg>
    </a>
  );
};

export default WhatsAppButton;