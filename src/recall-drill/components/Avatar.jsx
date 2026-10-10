// A Google profile picture (loaded straight from Google, so no referrer), or the initial of the name when there isn't one
export default function Avatar({ user, size }) {
  const cls = "avatar" + (size ? " " + size : "");
  const name = user?.name || "?";
  return user?.image ? (
    <img className={cls} src={user.image} alt="" referrerPolicy="no-referrer" />
  ) : (
    <span className={cls} aria-hidden="true">
      {name[0].toUpperCase()}
    </span>
  );
}
