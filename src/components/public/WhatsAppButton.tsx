import { useEffect, useState } from "react";
import iconWhatsapp from "@/assets/whatsapp-svgrepo-com.svg";
import { WheatIcon } from "lucide-react";

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

  const estiloBotao: React.CSSProperties = {
    width: '1.75rem',
    height: '1.75rem',
    filter: 'invert(100%)'
  }

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
      <img src={iconWhatsapp} alt="" style={estiloBotao} />
    </a>
  );
};

export default WhatsAppButton;