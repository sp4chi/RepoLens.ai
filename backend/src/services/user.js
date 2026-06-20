import User from '../models/User.js';

export async function findOrCreateOAuthUser(profile) {
  const idField = profile.provider === 'github' ? 'githubId' : 'googleId';

  let user = await User.findOne({ [idField]: profile.providerId });

  if (user) {
    user.name = profile.name || user.name;
    user.avatar = profile.avatar || user.avatar;
    user.provider = profile.provider;
    await user.save();
    return user;
  }

  user = await User.findOne({ email: profile.email });

  if (user) {
    user[idField] = profile.providerId;
    user.name = profile.name || user.name;
    user.avatar = profile.avatar || user.avatar;
    user.provider = profile.provider;
    await user.save();
    return user;
  }

  return User.create({
    email: profile.email,
    name: profile.name,
    avatar: profile.avatar,
    provider: profile.provider,
    [idField]: profile.providerId,
  });
}

export function serializeUser(user) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    provider: user.provider,
  };
}
