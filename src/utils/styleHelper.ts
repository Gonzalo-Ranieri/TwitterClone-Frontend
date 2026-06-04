import React from 'react';

export const getAvatarStyle = (avatarValue?: string): React.CSSProperties => {
  const trimmed = avatarValue?.trim();
  if (!trimmed) {
    return { background: 'linear-gradient(135deg, #a855f7, var(--primary))' };
  }
  if (
    trimmed.startsWith('linear-gradient') ||
    trimmed.startsWith('rgba') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('rgb')
  ) {
    return { background: trimmed };
  }
  // Otherwise treat as image URL
  return {
    backgroundImage: `url(${trimmed})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: 'transparent', // hide initials when image is shown
  };
};

export const getBannerStyle = (bannerValue?: string): React.CSSProperties => {
  const trimmed = bannerValue?.trim();
  if (!trimmed) {
    return { background: 'linear-gradient(135deg, var(--primary), #a855f7, #ec4899)' };
  }
  if (
    trimmed.startsWith('linear-gradient') ||
    trimmed.startsWith('rgba') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('rgb')
  ) {
    return { background: trimmed };
  }
  // Otherwise treat as image URL
  return {
    backgroundImage: `url(${trimmed})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
};

export const shouldShowInitials = (avatarValue?: string): boolean => {
  const trimmed = avatarValue?.trim();
  if (!trimmed) return true; // Show initials with default gradient
  if (
    trimmed.startsWith('linear-gradient') ||
    trimmed.startsWith('rgba') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('rgb')
  ) {
    return true; // Show initials with preset gradient/color
  }
  return false; // Otherwise it's a photo URL, so hide initials
};

