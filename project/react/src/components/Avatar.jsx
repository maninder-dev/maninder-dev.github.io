import { imageUrl } from '../api';

export default function Avatar({ user, large = false }) {
  const cls = `avatar${large ? ' avatar-lg' : ''}`;
  if (user?.avatar) return <img className={cls} src={imageUrl(user.avatar)} alt={user.name} />;
  return <span className={`${cls} placeholder`}>{user?.name?.[0]?.toUpperCase() || '?'}</span>;
}
