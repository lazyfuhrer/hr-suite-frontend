import { useState, useEffect } from 'react';
import { getUserInitials } from '../../utils/userAvatar';

const SIZE_CLASSES = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-8 h-8 text-[10px]',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-14 h-14 text-lg',
};

const SHAPE_CLASSES = {
  circle: 'rounded-full',
  rounded: 'rounded-xl',
};

const DEFAULT_FALLBACK =
  'bg-[var(--brand-primary)] text-white font-semibold flex items-center justify-center flex-shrink-0';

const UserAvatar = ({
  imageUrl,
  fullName,
  firstName,
  lastName,
  size = 'md',
  shape = 'circle',
  className = '',
  fallbackClassName,
  alt = '',
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const initials = getUserInitials({ fullName, firstName, lastName });
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const shapeClass = SHAPE_CLASSES[shape] || SHAPE_CLASSES.circle;
  const baseClass = `${sizeClass} ${shapeClass} ${className}`.trim();
  const fallbackClass = fallbackClassName || DEFAULT_FALLBACK;

  const showImage = imageUrl && !imageFailed;

  if (showImage) {
    return (
      <img
        src={imageUrl}
        alt={alt || fullName || 'Profile'}
        className={`${baseClass} object-cover`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className={`${baseClass} ${fallbackClass}`}>
      {initials}
    </div>
  );
};

export default UserAvatar;
