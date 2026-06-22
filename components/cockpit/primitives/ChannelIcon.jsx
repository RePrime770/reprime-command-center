import React from 'react';
import { MessageCircle, MessageSquare, Smartphone, Mail, Phone } from 'lucide-react';
import { channel as CH } from '../lib/colors.js';

/**
 * Small generic channel-type icon. LEFT edge in RTL too (Doc D 2.2).
 * No color tinting on the icon — channel color carries via row stripe/avatar ring.
 *
 * Props:
 *   channel — '305-WA' | '305-SMS' | '718-WA' | '718-SMS' | '718-iM' | 'email' | 'phone'
 *   size    — px (default 22)
 */
const map = {
  '305-WA': MessageCircle,
  '305-SMS': MessageSquare,
  '718-WA': MessageCircle,
  '718-SMS': MessageSquare,
  '718-iM': Smartphone,
  email: Mail,
  phone: Phone
};

export default function ChannelIcon({ channel: ch, size = 22 }) {
  const Icon = map[ch] || MessageCircle;
  const hex = CH[ch]?.hex || '#5A4A3A';
  return (
    <Icon
      size={size}
      strokeWidth={2}
      color={hex}
      style={{ flexShrink: 0 }}
      aria-label={CH[ch]?.label || ch}
    />
  );
}
