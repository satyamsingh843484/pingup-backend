// packages/mobile/src/utils/avatarUtils.ts
export const AVATAR_COLORS = ['#4DACFF', '#9B59B6', '#FF6B6B', '#4DFFB8', '#FFB800', '#FF9F43'];

export const getAvatarColor = (name: string) => {
  if (!name) return AVATAR_COLORS[0];
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};